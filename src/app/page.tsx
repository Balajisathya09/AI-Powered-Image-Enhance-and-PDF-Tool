"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { BeforeAfterSlider } from "@/components/ui/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Upload, ImageIcon, Sparkles, Scissors, Image as ImageIconOutline, Settings, FileText, Wrench, Wand2, Film, AudioLines, Headphones, ScanText } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const toolCategories = [
  { id: "enhance", icon: Sparkles, path: "/tools/enhance" },
  { id: "upscale", icon: ImageIconOutline, path: "/tools/upscale" },
  { id: "remove-bg", icon: Scissors, path: "/tools/remove-background" },
  { id: "restore", icon: Wand2, path: "/tools/restore-photo" },
  { id: "convert", icon: ImageIcon, path: "/tools/convert" },
  { id: "compress", icon: Settings, path: "/tools/compress" },
  { id: "pdf", icon: FileText, path: "/tools/pdf" },
  { id: "utility", icon: Wrench, path: "/tools/utility" },
  { id: "video-compress", icon: Film, path: "/tools/video/compress" },
  { id: "video-to-text", icon: AudioLines, path: "/tools/video/to-text" },
  { id: "video-to-audio", icon: Headphones, path: "/tools/video/to-audio" },
  { id: "image-to-text", icon: ScanText, path: "/tools/image-to-text" },
];

export default function Home() {
  const { t, language } = useLanguage();

  const toolNames = {
    "enhance": t.tools.enhancer,
    "upscale": t.tools.upscaler,
    "remove-bg": t.tools.bgRemover,
    "restore": t.tools.restore,
    "convert": t.tools.converter,
    "compress": t.tools.compressor,
    "pdf": t.tools.pdfToolkit,
    "utility": t.tools.utility,
    "video-compress": "Video Compressor",
    "video-to-text": "Video to Text",
    "video-to-audio": "Video to Audio",
    "image-to-text": "Image to Text (OCR)",
  };

  return (
    <div className="flex-1 flex flex-col items-center relative w-full overflow-hidden">
      {/* Decorative Dynamic/Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none">
        <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-cyan-300/20 to-blue-400/20 dark:from-cyan-900/10 dark:to-blue-900/10 blur-[130px] animate-glow-1" />
        <div className="absolute top-[35%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-pink-300/20 to-purple-400/20 dark:from-pink-900/10 dark:to-purple-900/10 blur-[150px] animate-glow-2" />
        <div className="absolute -bottom-[10%] left-[20%] w-[550px] h-[550px] rounded-full bg-gradient-to-r from-amber-200/15 to-rose-300/15 dark:from-amber-900/5 dark:to-rose-900/5 blur-[120px] animate-glow-1" />
        
        {/* Technical dot grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02]"
          style={{
            backgroundImage: "radial-gradient(circle, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="w-full min-h-[calc(100vh-64px)] flex flex-col lg:flex-row items-center justify-center py-10 px-4 sm:px-6 lg:px-8 text-center max-w-7xl mx-auto gap-8 lg:gap-12 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 space-y-6 text-left"
        >
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              {t.hero.headline}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl">
              {t.hero.subheadline}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link href="/tools/enhance" className="w-full sm:w-auto">
              <Button size="lg" className="w-full h-14 px-8 text-lg rounded-full">
                <Upload className="mr-2 w-5 h-5" />
                {t.hero.uploadCta}
              </Button>
            </Link>
            <Link href="#tools" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full h-14 px-8 text-lg rounded-full">
                {t.hero.exploreCta}
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 w-full max-w-lg lg:max-w-2xl relative group"
        >
          {/* Rotating Gradient Aura behind the Image Slider */}
          <div className="absolute inset-0 -m-2 rounded-[24px] bg-gradient-to-tr from-cyan-400 via-pink-500 to-amber-400 opacity-40 blur-2xl group-hover:opacity-60 transition-opacity duration-500 animate-[spin_12s_linear_infinite]" />
          
          {/* Sleek rotating border outline container */}
          <div className="relative rounded-[22px] p-[2.5px] overflow-hidden bg-muted shadow-2xl">
            <div className="absolute inset-0 w-[200%] h-[200%] top-[-50%] left-[-50%] bg-[conic-gradient(from_0deg,transparent_20%,#06b6d4,#ec4899,#f59e0b,transparent_80%)] animate-[spin_5s_linear_infinite]" />
            <div className="relative rounded-[20px] bg-background overflow-hidden">
              <BeforeAfterSlider 
                beforeImage="https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&q=40&w=800&blur=10"
                afterImage="https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&q=100&w=800"
                height="420px"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Tools Grid Section */}
      <section id="tools" className="w-full flex flex-col justify-start bg-muted/20 pt-8 lg:pt-12 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12 w-full">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{t.nav.tools}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {toolCategories.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <Link href={tool.path} className="block h-full outline-none">
                    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 bg-background/50 backdrop-blur-sm cursor-pointer">
                      <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0 w-full">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-base font-semibold text-left">{toolNames[tool.id as keyof typeof toolNames]}</CardTitle>
                      </CardHeader>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
