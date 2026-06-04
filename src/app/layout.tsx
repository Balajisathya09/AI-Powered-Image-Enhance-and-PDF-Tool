import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PixelBoost AI | Enhance, Upscale & Convert",
  description: "Professional AI-powered image enhancement, upscaling, background removal, and PDF tools. Completely free and no signup required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col antialiased bg-background text-foreground`}>
        <LanguageProvider>
          <Navbar />
          <main className="flex-1 flex flex-col relative overflow-hidden">
            {/* Dynamic Animated Glows (Professional, low-opacity accent background for all pages) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none">
              <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-primary/8 dark:bg-primary/5 blur-[100px] animate-glow-1" />
              <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] rounded-full bg-indigo-500/8 dark:bg-indigo-500/4 blur-[120px] animate-glow-2" />
            </div>
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
