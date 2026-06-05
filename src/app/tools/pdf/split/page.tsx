"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, SplitSquareHorizontal, FileText, Download, Check } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";

export default function SplitPdfPage() {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitResult, setSplitResult] = useState<{ name: string; url: string }[] | null>(null);
  const [splitMode, setSplitMode] = useState<"all" | "range">("all");
  const [pagesInput, setPagesInput] = useState("1");

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setSelectedFile(file);
    setIsProcessing(true);

    try {
      const fileBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBytes);
      const count = pdf.getPageCount();
      setPageCount(count);
      setPagesInput(`1-${count}`);
    } catch (error) {
      console.error("Load PDF error:", error);
      alert("Failed to load PDF file. It might be corrupted or password protected.");
      setSelectedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  const handleSplit = async () => {
    if (!selectedFile || pageCount === 0) return;
    setIsProcessing(true);

    try {
      const fileBytes = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(fileBytes);
      const results: { name: string; url: string }[] = [];

      if (splitMode === "all") {
        for (let i = 0; i < pageCount; i++) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(pdf, [i]);
          newPdf.addPage(copiedPage);
        const bytes = await newPdf.save({ useObjectStreams: true });
          const blob = new Blob([bytes as any], { type: "application/pdf" });
          results.push({
            name: `${selectedFile.name.replace(".pdf", "")}_page_${i + 1}.pdf`,
            url: URL.createObjectURL(blob),
          });
        }
      } else {
        const pagesToCopy: number[] = [];
        const parts = pagesInput.split(",");
        for (let part of parts) {
          part = part.trim();
          if (part.includes("-")) {
            const [startStr, endStr] = part.split("-");
            const start = parseInt(startStr.trim());
            const end = parseInt(endStr.trim());
            if (!isNaN(start) && !isNaN(end)) {
              const minVal = Math.min(start, end);
              const maxVal = Math.max(start, end);
              for (let i = minVal; i <= maxVal; i++) {
                if (i >= 1 && i <= pageCount) {
                  pagesToCopy.push(i - 1);
                }
              }
            }
          } else {
            const pageNum = parseInt(part);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pageCount) {
              pagesToCopy.push(pageNum - 1);
            }
          }
        }

        const uniquePages = Array.from(new Set(pagesToCopy)).sort((a, b) => a - b);

        if (uniquePages.length === 0) {
          alert("Please specify valid pages or ranges (e.g. 1-3, 5).");
          setIsProcessing(false);
          return;
        }

        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdf, uniquePages);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const bytes = await newPdf.save({ useObjectStreams: true });
        const blob = new Blob([bytes as any], { type: "application/pdf" });
        let rangeLabel = uniquePages.map((p) => p + 1).join(",");
        if (rangeLabel.length > 20) {
          rangeLabel = "custom_selection";
        }
        results.push({
          name: `${selectedFile.name.replace(".pdf", "")}_pages_${rangeLabel}.pdf`,
          url: URL.createObjectURL(blob),
        });
      }

      setSplitResult(results);
    } catch (error) {
      console.error("PDF Split error:", error);
      alert("Failed to split PDF.");
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
            <SplitSquareHorizontal className="w-8 h-8 text-primary" />
            Split PDF
          </h1>
          <p className="text-muted-foreground mt-1">
            Extract specific pages or split all pages into separate PDF files.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!splitResult ? (
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
                    <SplitSquareHorizontal className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-1">
                    Drag & drop a PDF file here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">Supports PDF files only</p>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
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
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {pageCount} pages
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setSelectedFile(null); setPageCount(0); }}
                  >
                    Change File
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Split Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setSplitMode("all")}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        splitMode === "all"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <p className="font-semibold mb-1">Extract all pages</p>
                      <p className="text-sm text-muted-foreground">Split every page into a separate PDF file.</p>
                    </button>
                    <button
                      onClick={() => setSplitMode("range")}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        splitMode === "range"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <p className="font-semibold mb-1">Custom page selection</p>
                      <p className="text-sm text-muted-foreground">Extract specific pages or custom ranges into a single PDF.</p>
                    </button>
                  </div>

                  {splitMode === "range" && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-2 p-4 bg-muted/30 rounded-xl"
                    >
                      <label className="text-sm font-semibold text-foreground">
                        Pages to extract:
                      </label>
                      <input
                        type="text"
                        value={pagesInput}
                        onChange={(e) => setPagesInput(e.target.value)}
                        placeholder="e.g. 1-3, 5, 7"
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <span className="text-xs text-muted-foreground">
                        Enter page numbers and/or ranges separated by commas (e.g., "1,2,3" or "1-3, 5"). Total pages: {pageCount}
                      </span>
                    </motion.div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button 
                      size="lg" 
                      onClick={handleSplit}
                      disabled={isProcessing}
                      className="px-8 rounded-full"
                    >
                      {isProcessing ? "Processing..." : "Split PDF"}
                    </Button>
                  </div>
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
              <h2 className="text-2xl font-semibold mb-2">Split Complete!</h2>
              <p className="text-muted-foreground mb-6">Your PDF document has been successfully split.</p>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto mb-8 text-left">
                {splitResult.map((res, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/40 border border-border/50 rounded-xl">
                    <span className="font-medium text-sm truncate max-w-xs sm:max-w-md">{res.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = res.url;
                        a.download = res.name;
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-4">
                <Button size="lg" variant="outline" className="px-8 rounded-full" onClick={() => { setSplitResult(null); setSelectedFile(null); }}>
                  Split Another
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
