// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {ScalarPredictionMarket} from "../src/ScalarPredictionMarket.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DeployScalar
/// @notice SCALAR: Deploy `ScalarPredictionMarket` on Arc Testnet (chain id 5042002).
/// @dev Confirm USDC address on https://docs.arc.network/arc/references/contract-addresses
contract DeployScalar is Script {
    // SCALAR: Default Arc Testnet USDC interface (6 decimals per Arc docs).
    address internal constant ARC_TESTNET_USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        // SCALAR: Override with `ARC_TESTNET_USDC` if the canonical address changes.
        address usdc = vm.envOr("ARC_TESTNET_USDC", ARC_TESTNET_USDC);

        vm.startBroadcast(pk);

        ScalarPredictionMarket market = new ScalarPredictionMarket(IERC20(usdc), deployer);

        vm.stopBroadcast();

        console2.log("============================================================");
        console2.log("  SCALAR - ScalarPredictionMarket deploy");
        console2.log("============================================================");
        console2.log("Arc Testnet chain id:        ", uint256(5042002));
        console2.log("Owner:                       ", deployer);
        console2.log("USDC:                        ", usdc);
        console2.log("Contract:                    ", address(market));
        console2.log("============================================================");
    }
}
