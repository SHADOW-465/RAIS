import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RAIS - Minimal GM Dashboard",
  description: "Manufacturing Quality Dashboard",
};

import Sidebar from "@/components/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <main style={{ flex: 1, marginLeft: '240px', minHeight: '100vh', backgroundColor: '#F7F8FA' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
