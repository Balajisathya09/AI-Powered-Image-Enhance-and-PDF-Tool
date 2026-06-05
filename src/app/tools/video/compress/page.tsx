"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileVideo, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function VideoCompressorPage() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [targetSize, setTargetSize] = useState<string>("25");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<{ originalSize: number; newSize: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleCompress = async () => {
    if (!file) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetSizeMB', targetSize);

      const res = await fetch('/api/process/video/compress', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to compress video');
      }

      const data = await res.json();
      setResultUrl(data.resultUrl);
      setStats({
        originalSize: data.originalSize,
        newSize: data.newSize,
      });
      setResultReady(true);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to compress video.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed_${targetSize}MB_${file?.name || 'video.mp4'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      window.open(resultUrl, '_blank');
    }
  };

  const resetState = () => {
    setResultReady(false);
    setFile(null);
    setResultUrl(null);
    setStats(null);
  };

  const formatBytes = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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
            <FileVideo className="w-8 h-8 text-primary" />
            Video Compressor
          </h1>
          <p className="text-muted-foreground mt-1">
            Compress your videos to an exact target file size without massive quality loss.
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
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <label
                htmlFor="video-file-input"
                className={`block border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 ${
                  isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"
                } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input id="video-file-input" type="file" accept="video/*" className="hidden" onChange={handleFileChange} disabled={isProcessing} />

                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="font-semibold text-lg">Compressing Video...</p>
                    <p className="text-xs text-muted-foreground">This may take a few minutes depending on the length of the video.</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <FileVideo className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{file.name}</p>
                      <p className="text-muted-foreground text-sm mt-1">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <FileVideo className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Drop your video here</p>
                      <p className="text-muted-foreground text-sm mt-1">Supports MP4, WebM, MOV, and more.</p>
                    </div>
                  </div>
                )}
              </label>

              {file && !isProcessing && (
                <div className="mt-8 flex flex-col items-center gap-4 border-t pt-8">
                  <div className="w-full max-w-sm space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold block text-center">Target File Size (MB)</label>
                      <input 
                        type="number" 
                        value={targetSize}
                        onChange={(e) => setTargetSize(e.target.value)}
                        className="w-full h-12 bg-background border border-border rounded-xl px-4 text-center text-lg font-medium"
                        placeholder="e.g. 25"
                      />
                      <p className="text-xs text-muted-foreground text-center">For Discord, use 25. For email, use 10-25.</p>
                    </div>
                    <Button size="lg" className="w-full h-12 rounded-full text-lg font-semibold" onClick={handleCompress}>
                      Compress Video
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center">
              <h2 className="text-2xl font-bold mb-6">Compression Complete!</h2>
              
              <div className="grid grid-cols-2 gap-8 w-full max-w-lg mb-8">
                <div className="bg-muted/50 rounded-2xl p-6 flex flex-col items-center justify-center border border-border">
                  <p className="text-sm text-muted-foreground mb-2">Original Size</p>
                  <p className="text-2xl font-bold line-through text-red-500/80">{stats ? formatBytes(stats.originalSize) : '-'}</p>
                </div>
                <div className="bg-primary/5 rounded-2xl p-6 flex flex-col items-center justify-center border border-primary/20">
                  <p className="text-sm text-primary/80 mb-2 font-semibold">New Size</p>
                  <p className="text-3xl font-black text-primary">{stats ? formatBytes(stats.newSize) : '-'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full font-bold text-lg" onClick={handleDownload}>
                  <Download className="mr-2 w-5 h-5" />
                  Download Compressed Video
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={resetState}>
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
