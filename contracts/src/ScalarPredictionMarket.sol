// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ScalarPredictionMarket
/// @notice SCALAR: Minimal Yes/No parimutuel markets collateralized in USDC (Arc Testnet).
contract ScalarPredictionMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- SCALAR: custom errors (cheap reverts) ---

    error Scalar__ZeroAddress();
    error Scalar__EmptyQuestion();
    error Scalar__InvalidEndTime();
    error Scalar__MarketDoesNotExist();
    error Scalar__MarketAlreadyResolved();
    error Scalar__MarketNotResolved();
    error Scalar__BettingClosed();
    error Scalar__TradingNotClosed();
    error Scalar__InvalidAmount();
    error Scalar__AlreadyClaimed();
    error Scalar__NothingToClaim();

    // --- SCALAR: USDC + fee parameters (10 USDC assumes 6 decimals) ---

    IERC20 public immutable USDC;
    uint256 public constant CREATION_FEE = 10 * 1_000_000;
    uint256 public constant PLATFORM_FEE_BPS = 150; // SCALAR: 1.5% → owner at resolution
    uint256 public constant BPS_DENOM = 10_000;

    // --- SCALAR: one struct per market (single shared pot per id) ---

    struct Market {
        string question;
        uint256 endTime;
        string category;
        address creator;
        bool resolved;
        bool outcomeIsYes;
        uint256 totalYes;
        uint256 totalNo;
    }

    Market[] private _markets;

    mapping(uint256 marketId => mapping(address user => uint256)) public yesBet;
    mapping(uint256 marketId => mapping(address user => uint256)) public noBet;
    mapping(uint256 marketId => mapping(address user => bool)) public claimed;

    // --- SCALAR: events (one clear signal per user-facing action) ---

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        uint256 endTime,
        string category
    );
    event CreationFeeCollected(uint256 indexed marketId, address indexed creator, uint256 amount);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 usdcAmount);
    event MarketResolved(
        uint256 indexed marketId,
        bool winningOutcome,
        uint256 totalPot,
        uint256 platformFee,
        uint256 winningPool,
        uint256 winningSideTotal
    );
    event FeeCollected(uint256 indexed marketId, uint256 amount, address indexed recipient);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    // --- SCALAR: wire USDC + owner (owner receives fees and resolves markets) ---

    constructor(IERC20 usdc_, address initialOwner) Ownable(initialOwner) {
        if (address(usdc_) == address(0)) revert Scalar__ZeroAddress();
        USDC = usdc_;
    }

    // --- SCALAR: views ---

    /// @notice SCALAR: How many markets exist (ids `0` … `marketCount() - 1`).
    function marketCount() external view returns (uint256) {
        return _markets.length;
    }

    function getMarket(uint256 marketId) external view returns (Market memory) {
        if (marketId >= _markets.length) revert Scalar__MarketDoesNotExist();
        return _markets[marketId];
    }

    function getUserBet(uint256 marketId, address user) external view returns (uint256 yesAmount, uint256 noAmount) {
        if (marketId >= _markets.length) revert Scalar__MarketDoesNotExist();
        yesAmount = yesBet[marketId][user];
        noAmount = noBet[marketId][user];
    }

    /// @notice SCALAR: USDC still claimable by `user` after resolution (0 if resolved+claimed, wrong side, or unresolved).
    function pendingWinnings(address user, uint256 marketId) external view returns (uint256) {
        if (marketId >= _markets.length) revert Scalar__MarketDoesNotExist();
        return _payoutOf(user, marketId);
    }

    // --- SCALAR: create — spam guard via 10 USDC to `owner()` ---

    /// @dev SCALAR: CEI — push market (effects), then `transferFrom` (interaction); tx reverts if allowance/balance missing.
    function createMarket(string calldata question, uint256 endTime, string calldata category)
        external
        nonReentrant
        returns (uint256 marketId)
    {
        if (bytes(question).length == 0) revert Scalar__EmptyQuestion();
        if (endTime <= block.timestamp) revert Scalar__InvalidEndTime();

        marketId = _markets.length;
        _markets.push(
            Market({
                question: question,
                endTime: endTime,
                category: category,
                creator: msg.sender,
                resolved: false,
                outcomeIsYes: false,
                totalYes: 0,
                totalNo: 0
            })
        );

        address recipient = owner();
        USDC.safeTransferFrom(msg.sender, recipient, CREATION_FEE);

        emit CreationFeeCollected(marketId, msg.sender, CREATION_FEE);
        emit MarketCreated(marketId, msg.sender, question, endTime, category);
    }

    // --- SCALAR: bet — parimutuel pool until `endTime` ---

    /// @dev SCALAR: CEI — update stakes, then pull USDC into this contract.
    function bet(uint256 marketId, bool isYes, uint256 usdcAmount) external nonReentrant {
        if (marketId >= _markets.length) revert Scalar__MarketDoesNotExist();
        Market storage m = _markets[marketId];
        if (m.resolved) revert Scalar__MarketAlreadyResolved();
        if (block.timestamp > m.endTime) revert Scalar__BettingClosed();
        if (usdcAmount == 0) revert Scalar__InvalidAmount();

        if (isYes) {
            yesBet[marketId][msg.sender] += usdcAmount;
            m.totalYes += usdcAmount;
        } else {
            noBet[marketId][msg.sender] += usdcAmount;
            m.totalNo += usdcAmount;
        }

        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);

        emit BetPlaced(marketId, msg.sender, isYes, usdcAmount);
    }

    // --- SCALAR: resolve — only after trading ends; 1.5% to owner, rest claimable by winners (98.5%) ---

    /// @dev SCALAR: CEI — flip `resolved` first, then push USDC to `owner()`. If no one won that side, sweep pool to owner.
    function resolveMarket(uint256 marketId, bool winningOutcome) external onlyOwner nonReentrant {
        if (marketId >= _markets.length) revert Scalar__MarketDoesNotExist();
        Market storage m = _markets[marketId];
        if (m.resolved) revert Scalar__MarketAlreadyResolved();
        if (block.timestamp <= m.endTime) revert Scalar__TradingNotClosed();

        uint256 totalPot = m.totalYes + m.totalNo;
        uint256 platformFee = (totalPot * PLATFORM_FEE_BPS) / BPS_DENOM;
        uint256 winningPool = totalPot - platformFee;
        uint256 winTotal = winningOutcome ? m.totalYes : m.totalNo;
        address recipient = owner();

        m.resolved = true;
        m.outcomeIsYes = winningOutcome;

        if (platformFee > 0) {
            USDC.safeTransfer(recipient, platformFee);
            emit FeeCollected(marketId, platformFee, recipient);
        }

        if (winTotal == 0 && winningPool > 0) {
            USDC.safeTransfer(recipient, winningPool);
            emit FeeCollected(marketId, winningPool, recipient);
        }

        emit MarketResolved(marketId, winningOutcome, totalPot, platformFee, winningPool, winTotal);
    }

    // --- SCALAR: claim — pro-rata share of `winningPool` for winning-side stakers ---

    /// @dev SCALAR: CEI — mark claimed, then transfer payout.
    function claimWinnings(uint256 marketId) external nonReentrant {
        if (marketId >= _markets.length) revert Scalar__MarketDoesNotExist();
        Market storage m = _markets[marketId];
        if (!m.resolved) revert Scalar__MarketNotResolved();
        if (claimed[marketId][msg.sender]) revert Scalar__AlreadyClaimed();

        uint256 payout = _payoutOf(msg.sender, marketId);
        if (payout == 0) revert Scalar__NothingToClaim();

        claimed[marketId][msg.sender] = true;

        USDC.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    // --- SCALAR: payout math (must match `resolveMarket` fee + pool split) ---

    function _payoutOf(address user, uint256 marketId) internal view returns (uint256) {
        if (marketId >= _markets.length) return 0;
        Market storage m = _markets[marketId];
        if (!m.resolved || claimed[marketId][user]) return 0;

        uint256 totalPot = m.totalYes + m.totalNo;
        uint256 platformFee = (totalPot * PLATFORM_FEE_BPS) / BPS_DENOM;
        uint256 winningPool = totalPot - platformFee;

        uint256 winTotal = m.outcomeIsYes ? m.totalYes : m.totalNo;
        if (winTotal == 0) return 0;

        uint256 userStake = m.outcomeIsYes ? yesBet[marketId][user] : noBet[marketId][user];
        if (userStake == 0) return 0;

        return (userStake * winningPool) / winTotal;
    }
}
