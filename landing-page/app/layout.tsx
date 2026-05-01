import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono, Patrick_Hand } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});

const patrickHand = Patrick_Hand({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Code Forge Hub - Cloud Native IDE",
  description: "Instant dev environments in your browser. Powered by real Linux kernels, secured by Docker containers, and synchronized with your Git workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} ${patrickHand.variable} antialiased bg-background-dark text-slate-300 font-display selection:bg-primary selection:text-white overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}
