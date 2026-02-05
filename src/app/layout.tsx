import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DashboardLayout } from "@/components/layout";
import { SessionProvider } from "@/contexts/SessionContext";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "RAIS - Rejection Analysis & Intelligence System",
  description: "Manufacturing quality dashboard for rejection analysis, batch risk monitoring, and AI-powered insights",
  keywords: ["manufacturing", "quality control", "rejection analysis", "batch monitoring", "AI insights"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <SessionProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
