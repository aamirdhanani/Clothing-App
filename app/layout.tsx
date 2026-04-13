import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { PWARegister } from "@/components/pwa-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Closet Atlas",
  description: "Private wardrobe platform for your clothing archive.",
  manifest: "/manifest.webmanifest",
  applicationName: "Closet Atlas",
  appleWebApp: {
    capable: true,
    title: "Closet Atlas",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#d8b46a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable}`}>
        <div className="page-orb page-orb-left" />
        <div className="page-orb page-orb-right" />
        <div className="page-orb page-orb-center" />
        <div className="app-shell">
          <TopNav />
          <main className="page-container">{children}</main>
        </div>
        <PWARegister />
      </body>
    </html>
  );
}
