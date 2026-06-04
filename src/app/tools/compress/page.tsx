"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { FileUploader } from "@/components/ui/FileUploader";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Settings2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CompressPage() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [level, setLevel] = useState("medium");
  const [resultData, setResultData] = useState<{dataUrl: string, originalSize: number, compressedSize: number} | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('level', level);

      const res = await fetch('/api/process/compress', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Compression failed');
      
      const data = await res.json();
      setResultData(data);
      setResultReady(true);
    } catch (error) {
      console.error(error);
      alert("Failed to compress image");
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
            <Settings2 className="w-8 h-8 text-primary" />
            {t.tools.compressor}
          </h1>
          <p className="text-muted-foreground mt-1">
            Compress images to reduce file size without significant quality loss.
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
              <Tabs defaultValue="medium" onValueChange={setLevel} className="w-full max-w-md">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="low">Low (High Quality)</TabsTrigger>
                  <TabsTrigger value="medium">Medium</TabsTrigger>
                  <TabsTrigger value="high">High (Smallest)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <FileUploader onFileSelect={handleFileSelect} isProcessing={isProcessing} />
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 text-center"
          >
            <div className="bg-card border border-border rounded-2xl p-12 shadow-sm max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6">Compression Successful!</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">Original Size</p>
                  <p className="text-xl font-medium">
                    {resultData ? (resultData.originalSize / 1024).toFixed(2) : 0} KB
                  </p>
                </div>
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Compressed Size</p>
                  <p className="text-xl font-bold text-primary">
                    {resultData ? (resultData.compressedSize / 1024).toFixed(2) : 0} KB
                  </p>
                </div>
              </div>
              <p className="text-success font-medium mb-6">
                {resultData ? `Saved ${(100 - (resultData.compressedSize / resultData.originalSize) * 100).toFixed(1)}%` : ''}
              </p>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full font-medium" onClick={() => {
                  if (resultData?.dataUrl) {
                    const a = document.createElement('a');
                    a.href = resultData.dataUrl;
                    a.download = `compressed_${level}.jpg`;
                    a.click();
                  }
                }}>
                  <Download className="mr-2 w-5 h-5" />
                  Download
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={() => { setResultReady(false); setIsProcessing(false); }}>
                  Compress Another
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
