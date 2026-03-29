import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import { AppProviders } from "./providers";

// SCALAR: clean system-adjacent sans
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SCALAR: design enhancement — product metadata
export const metadata: Metadata = {
  title: "Scalar Market — Prediction markets on Arc",
  description:
    "Scalar Market — premium USDC prediction markets on Arc Testnet. Trade outcomes with clarity.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
        <Toaster
          richColors
          closeButton
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "border border-zinc-800/90 bg-[#0a0a0f] text-zinc-100 shadow-[0_0_40px_-12px_rgba(0,245,255,0.15)]",
            },
          }}
        />
      </body>
    </html>
  );
}
