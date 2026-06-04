"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FilePlus, Trash2, ArrowUp, ArrowDown, FileText, Download } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";

interface SelectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

export default function MergePdfPage() {
  const { t } = useLanguage();
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedBlobUrl, setMergedBlobUrl] = useState<string | null>(null);
  const [mergedFileName, setMergedFileName] = useState("merged.pdf");

  const onDrop = (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === files.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newFiles = [...files];
    const temp = newFiles[index];
    newFiles[index] = newFiles[newIndex];
    newFiles[newIndex] = temp;
    setFiles(newFiles);
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);

    try {
      // Initialize a new PDFDocument
      const mergedPdf = await PDFDocument.create();

      for (const selectedFile of files) {
        const fileBytes = await selectedFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(fileBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // Serialize the PDFDocument to bytes (a Uint8Array)
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setMergedBlobUrl(url);
    } catch (error) {
      console.error("PDF Merge error:", error);
      alert("Failed to merge PDF files. Make sure they are not password protected.");
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
            <FilePlus className="w-8 h-8 text-primary" />
            Merge PDF
          </h1>
          <p className="text-muted-foreground mt-1">
            Combine multiple PDF files into a single document in any order you want.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!mergedBlobUrl ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Dropzone */}
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
                  <FilePlus className="w-8 h-8" />
                </div>
                <p className="text-lg font-medium text-foreground mb-1">
                  Drag & drop PDF files here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">Supports PDF files only</p>
              </div>
            </div>

            {/* Selected files list */}
            {files.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center justify-between border-b border-border pb-3">
                  <span>Selected Files ({files.length})</span>
                  {files.length >= 2 && (
                    <Button 
                      disabled={isProcessing}
                      onClick={handleMerge}
                      className="px-6 rounded-full"
                    >
                      {isProcessing ? "Merging..." : "Merge PDFs"}
                    </Button>
                  )}
                </h3>
                
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {files.map((file, index) => (
                    <div 
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-muted/40 hover:bg-muted/80 rounded-xl border border-border/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-primary/5 text-primary rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-xs sm:max-w-md">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          disabled={index === 0 || isProcessing}
                          onClick={() => moveFile(index, "up")}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          disabled={index === files.length - 1 || isProcessing}
                          onClick={() => moveFile(index, "down")}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                          disabled={isProcessing}
                          onClick={() => removeFile(file.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
              <h2 className="text-2xl font-semibold mb-2">Merge Complete!</h2>
              <p className="text-muted-foreground mb-6">Your PDF documents have been successfully combined into a single file.</p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full font-medium" onClick={() => {
                  if (mergedBlobUrl) {
                    const a = document.createElement('a');
                    a.href = mergedBlobUrl;
                    a.download = mergedFileName;
                    a.click();
                  }
                }}>
                  <Download className="mr-2 w-5 h-5" />
                  Download PDF
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={() => { setMergedBlobUrl(null); setFiles([]); }}>
                  Merge More
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
