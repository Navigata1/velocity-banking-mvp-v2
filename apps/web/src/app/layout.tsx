import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ThemeProvider from "@/components/ThemeProvider";
import IntroModal from "@/components/IntroModal";
import PreAppPreview from "@/components/PreAppPreview";

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
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: { url: '/icon-192.png', sizes: '192x192' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-emerald-500 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white/80"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <div className="flex flex-col md:flex-row min-h-screen">
            <Navigation />
            <main
              id="main-content"
              tabIndex={-1}
              aria-label="Main content"
              className="min-w-0 flex-1 pb-20 md:pb-0"
            >
              <IntroModal />
              <PreAppPreview />
              {children}
              <p className="px-4 pb-6 pt-2 text-center text-xs text-gray-500 md:hidden">
                Educational tool. Not financial advice.
              </p>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
