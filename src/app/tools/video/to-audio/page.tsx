"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileAudio, FileVideo, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function VideoToAudioPage() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
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

  const handleExtract = async () => {
    if (!file) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/process/video/to-audio', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract audio');
      }

      const data = await res.json();
      setResultUrl(data.resultUrl);
      setResultReady(true);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to extract audio.");
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
      a.download = `extracted_audio_${file?.name.replace(/\.[^/.]+$/, "") || 'audio'}.mp3`;
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
            <FileAudio className="w-8 h-8 text-primary" />
            Video to Audio
          </h1>
          <p className="text-muted-foreground mt-1">
            Instantly extract high-quality MP3 audio from any video.
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
                htmlFor="video-audio-input"
                className={`block border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 ${
                  isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"
                } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input id="video-audio-input" type="file" accept="video/*" className="hidden" onChange={handleFileChange} disabled={isProcessing} />

                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="font-semibold text-lg">Extracting Audio...</p>
                    <p className="text-xs text-muted-foreground">This will only take a moment.</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <FileVideo className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{file.name}</p>
                      <p className="text-muted-foreground text-sm mt-1">Ready to extract</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <FileVideo className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Drop your video here</p>
                      <p className="text-muted-foreground text-sm mt-1">Supports MP4, WebM, MOV, and more (up to 50MB).</p>
                    </div>
                  </div>
                )}
              </label>

              {file && !isProcessing && (
                <div className="mt-8 flex justify-center border-t pt-8">
                  <Button size="lg" className="h-12 px-12 rounded-full text-lg font-semibold" onClick={handleExtract}>
                    Extract Audio (MP3)
                  </Button>
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
              <h2 className="text-2xl font-bold mb-6">Extraction Complete!</h2>
              
              <div className="w-full max-w-md bg-muted/50 rounded-2xl p-8 flex flex-col items-center justify-center border border-border mb-8">
                <FileAudio className="w-16 h-16 text-primary mb-4" />
                <p className="text-lg font-semibold text-center mb-1">Your high-quality MP3 is ready.</p>
                <audio controls src={resultUrl || undefined} className="w-full mt-4" />
              </div>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full font-bold text-lg" onClick={handleDownload}>
                  <Download className="mr-2 w-5 h-5" />
                  Download MP3
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={resetState}>
                  Extract Another
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
