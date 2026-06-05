"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image as ImageIconOutline, Wand2, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface RestoreResult {
  resultUrl: string;
  result2xUrl?: string;
  result4xUrl?: string;
}

export default function RestorePhotoPage() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  const checkIsGrayscale = (imgUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(false); return; }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let isColor = false;
        for (let i = 0; i < data.length; i += 400) {
          const r = data[i], g = data[i+1], b = data[i+2];
          if (Math.abs(r - g) > 15 || Math.abs(r - b) > 15 || Math.abs(g - b) > 15) {
            isColor = true;
            break;
          }
        }
        resolve(!isColor);
      };
      img.src = imgUrl;
    });
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { alert("Please upload an image file."); return; }

    setIsProcessing(true);
    setProgressMsg("Analyzing image...");
    const objectUrl = URL.createObjectURL(file);
    setOriginalImage(objectUrl);

    try {
      const isGrayscale = await checkIsGrayscale(objectUrl);

      if (isGrayscale) {
        setProgressMsg("Black & White detected! Colorizing + Upscaling...");
        const msgs = [
          "AI is colorizing your image...",
          "Generating 2× enhanced version...",
          "Generating 4× ultra-HD version...",
          "Almost done — polishing final output...",
        ];
        let seconds = 0;
        const progressTimer = setInterval(() => {
          seconds++;
          const msgIdx = Math.min(Math.floor(seconds / 10), msgs.length - 1);
          setProgressMsg(`[${seconds}s] ${msgs[msgIdx]}`);
        }, 1000);

        try {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/process/colorize', {
            method: 'POST',
            body: formData,
          });

          clearInterval(progressTimer);

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Colorization failed. Please try again.");
          }

          const data = await res.json();
          setResult({
            resultUrl: data.resultUrl,
            result2xUrl: data.result2xUrl,
            result4xUrl: data.result4xUrl,
          });
        } catch (err) {
          clearInterval(progressTimer);
          throw err;
        }
      } else {
        setProgressMsg("Color image detected! Enhancing & Upscaling...");
        const msgs = [
          "Applying professional color correction...",
          "Boosting vibrance & saturation...",
          "Generating 2× enhanced version...",
          "Generating 4× ultra-HD version...",
        ];
        let seconds = 0;
        const progressTimer = setInterval(() => {
          seconds++;
          const msgIdx = Math.min(Math.floor(seconds / 8), msgs.length - 1);
          setProgressMsg(`[${seconds}s] ${msgs[msgIdx]}`);
        }, 1000);

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('mode', 'enhance');

          const res = await fetch('/api/process/colorize', {
            method: 'POST',
            body: formData,
          });

          clearInterval(progressTimer);

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Enhancement failed. Please try again.");
          }

          const data = await res.json();
          setResult({
            resultUrl: data.resultUrl,
            result2xUrl: data.result2xUrl,
            result4xUrl: data.result4xUrl,
          });
        } catch (err) {
          clearInterval(progressTimer);
          throw err;
        }
      }

      setResultReady(true);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to process image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const bestUrl = (r: RestoreResult | null) => r?.result4xUrl || r?.result2xUrl || r?.resultUrl || '';

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch {
      window.open(url, '_blank');
    }
  };

  const resetState = () => {
    setResultReady(false);
    setOriginalImage(null);
    setResult(null);
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8 flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wand2 className="w-8 h-8 text-primary" />
              AI Photo Restorer
            </h1>
            <p className="text-muted-foreground mt-1">
              Colorize B&W photos · Premium color restoration · Upscale to 2× & 4× HD
            </p>
          </div>
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
            <label
              htmlFor="photo-file-input"
              className={`block border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 ${
                isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"
              } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input id="photo-file-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isProcessing} />

              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  {originalImage && <img src={originalImage} className="w-32 h-32 object-cover rounded-xl mb-2 shadow" alt="preview" />}
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="font-semibold text-lg">{progressMsg}</p>
                  <p className="text-xs text-muted-foreground">Generating 1× · 2× · 4× versions...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ImageIconOutline className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Drop your photo here</p>
                    <p className="text-muted-foreground text-sm mt-1">B&W → Auto-colorized · Color → Premium cinematic restoration · All upscaled to 2× & 4× HD</p>
                  </div>
                </div>
              )}
            </label>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              {/* Before / After */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Original Photo</h3>
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img src={originalImage!} alt="Original" className="w-full h-auto object-contain" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-primary">Restored Photo (Preview)</h3>
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img src={result!.resultUrl} alt="Restored" className="w-full h-auto object-contain" />
                  </div>
                </div>
              </div>

              {/* Single best-quality download */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  className="gap-2 px-8 bg-black hover:bg-neutral-800 text-white font-semibold"
                  onClick={() => downloadImage(bestUrl(result), 'restored_photo.jpg')}
                >
                  <Download className="w-5 h-5" />
                  Download
                </Button>
              </div>

              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={resetState}>
                  Restore Another Photo
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
