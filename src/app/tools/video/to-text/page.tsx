"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, FileText, FileVideo, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function VideoToTextPage() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleTranscribe = async () => {
    if (!file) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/process/video/to-text', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to transcribe video');
      }

      const data = await res.json();
      setTranscription(data.text);
      setResultReady(true);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to transcribe video.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetState = () => {
    setResultReady(false);
    setFile(null);
    setTranscription("");
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
            <FileText className="w-8 h-8 text-primary" />
            Video to Text
          </h1>
          <p className="text-muted-foreground mt-1">
            Extract and transcribe spoken audio from your videos using advanced AI.
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
                htmlFor="video-text-input"
                className={`block border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 ${
                  isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"
                } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input id="video-text-input" type="file" accept="video/*,audio/*" className="hidden" onChange={handleFileChange} disabled={isProcessing} />

                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="font-semibold text-lg">AI is transcribing...</p>
                    <p className="text-xs text-muted-foreground">Extracting audio and sending to Whisper model.</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <FileVideo className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{file.name}</p>
                      <p className="text-muted-foreground text-sm mt-1">Ready to transcribe</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <FileVideo className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Drop your video here</p>
                      <p className="text-muted-foreground text-sm mt-1">Supports MP4, WebM, MP3, WAV and more.</p>
                    </div>
                  </div>
                )}
              </label>

              {file && !isProcessing && (
                <div className="mt-8 flex justify-center border-t pt-8">
                  <Button size="lg" className="h-12 px-12 rounded-full text-lg font-semibold" onClick={handleTranscribe}>
                    Transcribe Video
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
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Transcription Result</h3>
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Text"}
                </Button>
              </div>
              
              <div className="bg-muted/30 border border-border rounded-xl p-6 min-h-[200px] whitespace-pre-wrap leading-relaxed text-foreground">
                {transcription}
              </div>

              <div className="mt-8 flex justify-center">
                <Button variant="outline" className="h-12 px-8 rounded-full" onClick={resetState}>
                  Transcribe Another Video
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
