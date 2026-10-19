import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MOCK EXAM",
  description:
    "MOCK EXAM Platform — check in and sit your exam once approved by an administrator.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
};

/**
 * Root layout.
 *
 * Chrome lives in the route-group layouts: `(app)` renders the site navigation,
 * while `(exam)` renders a distraction-free shell for sitting an exam.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
