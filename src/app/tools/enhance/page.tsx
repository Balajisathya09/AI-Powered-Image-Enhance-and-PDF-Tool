"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { FileUploader } from "@/components/ui/FileUploader";
import { BeforeAfterSlider } from "@/components/ui/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EnhancePage() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const [scale, setScale] = useState("1x");

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setOriginalImage(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tool', `enhance_${scale}`);

      const res = await fetch('/api/process/ai', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to process image');
      }
      
      const data = await res.json();
      setResultImage(data.resultUrl);
      setResultReady(true);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to process image. Please check API keys.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enhanced_${scale}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      window.open(resultImage, '_blank');
    }
  };

  const handleReset = () => {
    setResultReady(false);
    setIsProcessing(false);
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            {t.tools.enhancer}
          </h1>
          <p className="text-muted-foreground mt-1">
            Improve image quality, reduce noise, and recover details instantly.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!resultReady ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-center">
              <Tabs defaultValue="1x" onValueChange={setScale} className="w-[400px]">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="1x">Original Size</TabsTrigger>
                  <TabsTrigger value="2x">2X Enhance</TabsTrigger>
                  <TabsTrigger value="4x">4X Enhance</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <FileUploader 
              onFileSelect={handleFileSelect} 
              isProcessing={isProcessing} 
              maxSize={Infinity}
            />
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <BeforeAfterSlider 
                beforeImage={originalImage || ''} 
                afterImage={resultImage || ''} 
                height="500px" 
              />
              <div className="mt-4 flex justify-between text-sm text-muted-foreground px-2">
                <span>Original Image</span>
                <span>Enhanced ({scale})</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full font-medium" onClick={handleDownload}>
                <Download className="mr-2 w-5 h-5" />
                {t.upload.download}
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={handleReset}>
                Process Another Image
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
