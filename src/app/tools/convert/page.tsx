"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { FileUploader } from "@/components/ui/FileUploader";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function ConvertPage() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [targetFormat, setTargetFormat] = useState("png");
  const [resultDataUrl, setResultDataUrl] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', targetFormat);

      const res = await fetch('/api/process/convert', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Conversion failed');
      
      const data = await res.json();
      setResultDataUrl(data.dataUrl);
      setResultReady(true);
    } catch (error) {
      console.error(error);
      alert("Failed to convert image");
    } finally {
      setIsProcessing(false);
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
            <ImageIcon className="w-8 h-8 text-primary" />
            {t.tools.converter}
          </h1>
          <p className="text-muted-foreground mt-1">
            Convert images between JPG, PNG, WEBP, AVIF, and HEIC instantly.
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
            <div className="flex justify-center items-center gap-4 text-sm font-medium">
              <span>Convert to:</span>
              <select 
                className="bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="webp">WEBP</option>
              </select>
            </div>
            <FileUploader onFileSelect={handleFileSelect} isProcessing={isProcessing} maxSize={Infinity} />
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 text-center"
          >
            <div className="bg-card border border-border rounded-2xl p-12 shadow-sm">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.25 }}
                    d="M20 6L9 17L4 12"
                  />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-semibold mb-2">Conversion Complete!</h2>
              <p className="text-muted-foreground">Your image has been converted to .{targetFormat.toUpperCase()}</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full font-medium" onClick={() => {
                if (resultDataUrl) {
                  const a = document.createElement('a');
                  a.href = resultDataUrl;
                  a.download = `converted.${targetFormat}`;
                  a.click();
                }
              }}>
                <Download className="mr-2 w-5 h-5" />
                Download Image
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={() => { setResultReady(false); setIsProcessing(false); }}>
                Convert Another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
