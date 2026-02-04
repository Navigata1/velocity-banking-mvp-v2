import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InterestShield - Financial Empowerment",
  description: "Truth-first, hope-forward financial empowerment through Velocity Banking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900 text-slate-100`}
      >
        <div className="flex flex-col md:flex-row min-h-screen">
          <Navigation />
          <main className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
