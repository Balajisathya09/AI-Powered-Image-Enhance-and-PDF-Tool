"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Sparkles, Globe, ChevronDown, ImageIcon, FileText, Film, Wand2, Scissors, Settings, Wrench, ScanText, AudioLines, Headphones, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useState } from "react";

const imageTools = [
  { href: "/tools/upscale",           icon: Zap,        label: "AI Upscaler" },
  { href: "/tools/enhance",           icon: Wand2,       label: "AI Enhancer" },
  { href: "/tools/compress",          icon: Settings,    label: "Image Compressor" },
  { href: "/tools/remove-background", icon: Scissors,    label: "Remove Background" },
  { href: "/tools/image-to-text",     icon: ScanText,    label: "Image to Text (OCR)" },
  { href: "/tools/utility",           icon: Wrench,      label: "Utility Tools" },
  { href: "/tools/convert",           icon: ImageIcon,   label: "Image Converter" },
];

const pdfTools = [
  { href: "/tools/pdf",               icon: FileText,    label: "PDF Toolkit" },
  { href: "/tools/pdf/compress",      icon: Settings,    label: "PDF Compressor" },
  { href: "/tools/pdf/merge",         icon: FileText,    label: "PDF Merger" },
  { href: "/tools/pdf/split",         icon: Scissors,    label: "PDF Splitter" },
  { href: "/tools/pdf/image-to-pdf",  icon: ImageIcon,   label: "Image to PDF" },
];

const videoTools = [
  { href: "/tools/video/compress",    icon: Film,        label: "Video Compressor" },
  { href: "/tools/video/to-text",     icon: AudioLines,  label: "Video to Text" },
  { href: "/tools/video/to-audio",    icon: Headphones,  label: "Video to Audio" },
];

function NavDropdown({ label, items }: { label: string; items: { href: string; icon: any; label: string }[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors outline-none">
        {label}
        <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={12}
        className="w-52 rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl p-1.5"
      >
        {items.map((item) => (
          <DropdownMenuItem key={item.href} className="rounded-xl px-0 py-0 cursor-pointer hover:bg-muted focus:bg-muted">
            <Link href={item.href} className="flex items-center gap-3 w-full px-3 py-2.5">
              <item.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">{t.nav.brand}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <NavDropdown label="Image Tools" items={imageTools} />
          <NavDropdown label="PDF Tools"   items={pdfTools} />
          <NavDropdown label="Video Tools" items={videoTools} />
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "rounded-full" })}>
              <Globe className="w-5 h-5 text-muted-foreground" />
              <span className="sr-only">Switch Language</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'font-bold' : ''}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('ta')} className={language === 'ta' ? 'font-bold' : ''}>
                தமிழ் (Tamil)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
