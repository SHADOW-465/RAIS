import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RAIS - Manufacturing Quality Dashboard",
  description: "Executive-grade Manufacturing Quality & Rejection Statistics Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <div style={{
            flex: 1,
            marginLeft: 'var(--sidebar-width, 260px)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--color-bg-secondary)'
          }}>
            <TopNav />
            <main style={{
              flex: 1,
              padding: '24px 32px',
              maxWidth: '100%',
              overflowX: 'hidden'
            }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
