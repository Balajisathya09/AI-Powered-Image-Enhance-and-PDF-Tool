"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, FileText, Image as ImageIcon, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Tesseract from "tesseract.js";

export default function ImageToTextPage() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFileSelection(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) processFileSelection(selectedFile);
  };

  const processFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleExtract = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setStatusText("Initializing AI Engine...");

    try {
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setStatusText("Scanning for text...");
              setProgress(Math.floor(m.progress * 100));
            } else {
              setStatusText(m.status);
            }
          }
        }
      );

      setExtractedText(result.data.text);
      setResultReady(true);
    } catch (error: any) {
      console.error("Tesseract error:", error);
      alert("Failed to extract text. Please try a clearer image.");
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy text", e);
    }
  };

  const resetState = () => {
    setResultReady(false);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setExtractedText("");
    setProgress(0);
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
            Image to Text (OCR)
          </h1>
          <p className="text-muted-foreground mt-1">
            Instantly extract written text from any image, document, or screenshot. Runs securely in your browser.
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
                htmlFor="image-text-input"
                className={`block border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                  isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"
                } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input id="image-text-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isProcessing} />

                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="font-semibold text-lg">{statusText}</p>
                    <div className="w-full max-w-xs bg-muted rounded-full h-2.5 overflow-hidden">
                      <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xs font-bold">{progress}%</p>
                  </div>
                ) : file && previewUrl ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-48 h-48 rounded-xl overflow-hidden border shadow-sm relative group">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-medium text-sm">Click to change</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{file.name}</p>
                      <p className="text-muted-foreground text-sm mt-1">Ready to scan</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                      <ImageIcon className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">Drop an image here</p>
                      <p className="text-muted-foreground mt-2 text-sm">Supports PNG, JPG, WEBP, and Screenshots.</p>
                    </div>
                  </div>
                )}
              </label>

              {file && !isProcessing && (
                <div className="mt-8 flex justify-center border-t pt-8">
                  <Button size="lg" className="h-12 px-12 rounded-full text-lg font-semibold shadow-lg hover:scale-105 transition-transform" onClick={handleExtract}>
                    Extract Text
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
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Check className="w-6 h-6 text-success" />
                Text Extracted Successfully
              </h2>
              
              <div className="relative mb-8">
                <textarea
                  readOnly
                  value={extractedText}
                  className="w-full h-64 p-6 bg-muted/50 rounded-xl border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground leading-relaxed"
                  placeholder="Extracted text will appear here..."
                />
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute top-4 right-4 rounded-xl shadow-sm hover:bg-background"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row justify-end items-center gap-4 w-full border-t pt-6">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full font-bold" onClick={handleCopy}>
                  {copied ? <Check className="mr-2 w-5 h-5 text-success-foreground" /> : <Copy className="mr-2 w-5 h-5" />}
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={resetState}>
                  Scan Another Image
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
