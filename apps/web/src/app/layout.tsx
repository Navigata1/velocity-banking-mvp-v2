import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ThemeProvider from "@/components/ThemeProvider";
import IntroModal from "@/components/IntroModal";
import PreAppPreview from "@/components/PreAppPreview";
import { ToastProvider } from "@/components/ui/Toast";
import AuthModal from "@/components/auth/AuthModal";
import SyncBridge from "@/components/SyncBridge";
import GamificationBridge from "@/components/GamificationBridge";

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
      <body className="antialiased">
        <ToastProvider>
          <ThemeProvider>
            <div className="flex flex-col md:flex-row min-h-screen">
              <Navigation />
              <main className="flex-1 pb-20 md:pb-0">
                <SyncBridge />
                <GamificationBridge />
                <IntroModal />
                <PreAppPreview />
                <AuthModal />
                {children}
              </main>
            </div>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
