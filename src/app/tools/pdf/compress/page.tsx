"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, FileText, Download } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";

export default function CompressPdfPage() {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionPercent, setCompressionPercent] = useState<number>(50);
  const [resultData, setResultData] = useState<{
    url: string;
    originalSize: number;
    compressedSize: number;
  } | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setSelectedFile(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  const handleCompress = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("level", compressionPercent.toString());

      const res = await fetch("/api/process/pdf/compress", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Compression failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setResultData({
        url,
        originalSize: selectedFile.size,
        compressedSize: blob.size,
      });
    } catch (error) {
      console.error("PDF compression error:", error);
      alert("Failed to compress PDF. The file may be password protected or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/tools/pdf">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileDown className="w-8 h-8 text-primary" />
            Compress PDF
          </h1>
          <p className="text-muted-foreground mt-1">
            Reduce the file size of your PDF documents while keeping the highest visual quality.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!resultData ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {!selectedFile ? (
              <div
                {...getRootProps()}
                className={`relative flex flex-col items-center justify-center w-full min-h-[220px] border-2 border-dashed rounded-2xl transition-all duration-300 ease-in-out cursor-pointer overflow-hidden
                  ${isDragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/50"}
                  ${isProcessing ? "pointer-events-none opacity-80" : ""}
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center text-center p-6">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                    <FileDown className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-1">
                    Drag & drop a PDF file here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">Supports PDF files only</p>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-primary/5 text-primary rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-xs sm:max-w-md">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={isProcessing}
                    onClick={() => setSelectedFile(null)}
                  >
                    Change File
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm font-semibold text-foreground">
                      <span>Compression Strength:</span>
                      <span className="text-primary font-bold text-base">{compressionPercent}%</span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="90"
                      value={compressionPercent}
                      onChange={(e) => setCompressionPercent(parseInt(e.target.value))}
                      disabled={isProcessing}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                      <span>10% (Low compression, best quality)</span>
                      <span>50% (Recommended)</span>
                      <span>90% (High compression, smallest file)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button 
                    size="lg" 
                    onClick={handleCompress}
                    disabled={isProcessing}
                    className="px-8 rounded-full font-semibold"
                  >
                    {isProcessing ? "Compressing..." : "Compress PDF"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 text-center"
          >
            <div className="bg-card border border-border rounded-2xl p-12 shadow-sm max-w-2xl mx-auto">
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
              <h2 className="text-2xl font-semibold mb-6">Compression Successful!</h2>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-muted/50 rounded-xl text-left">
                  <p className="text-sm text-muted-foreground mb-1">Original Size</p>
                  <p className="text-xl font-medium">
                    {(resultData.originalSize / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-left">
                  <p className="text-sm text-muted-foreground mb-1">Compressed Size</p>
                  <p className="text-xl font-bold text-primary">
                    {(resultData.compressedSize / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {resultData.compressedSize < resultData.originalSize ? (
                <p className="text-success font-medium mb-6">
                  Saved {(100 - (resultData.compressedSize / resultData.originalSize) * 100).toFixed(1)}% of file size
                </p>
              ) : (
                <p className="text-muted-foreground font-medium mb-6">
                  File is already highly optimized.
                </p>
              )}

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full font-medium" onClick={() => {
                  const a = document.createElement('a');
                  a.href = resultData.url;
                  a.download = `compressed_${selectedFile?.name || "document.pdf"}`;
                  a.click();
                }}>
                  <Download className="mr-2 w-5 h-5" />
                  Download PDF
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={() => { setResultData(null); setSelectedFile(null); }}>
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
