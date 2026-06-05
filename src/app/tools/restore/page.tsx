"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { FileUploader } from "@/components/ui/FileUploader";
import { BeforeAfterSlider } from "@/components/ui/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function RestorePage() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setOriginalImage(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tool', 'restore');

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
      alert(error.message || "Failed to process image.");
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
      a.download = 'restored_photo.png';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      window.open(resultImage, '_blank');
    }
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
            <Settings className="w-8 h-8 text-primary" />
            {t.tools.restore}
          </h1>
          <p className="text-muted-foreground mt-1">
            Remove scratches, restore colors, and bring old photos back to life.
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
          >
            <FileUploader onFileSelect={handleFileSelect} isProcessing={isProcessing} maxSize={Infinity} />
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <BeforeAfterSlider beforeImage={originalImage || ''} afterImage={resultImage || ''} height="500px" />
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full font-medium" onClick={handleDownload}>
                <Download className="mr-2 w-5 h-5" />
                {t.upload.download}
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={() => { setResultReady(false); setIsProcessing(false); }}>
                Process Another Image
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
