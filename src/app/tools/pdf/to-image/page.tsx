"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileImage, FileText, Download } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function PdfToImagePage() {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<{ name: string; url: string }[] | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Dynamically load PDF.js from CDN to avoid Next.js SSR/worker configuration issues
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfjsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfjsLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Clean up script if unmounted
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setSelectedFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
    disabled: !pdfjsLoaded,
  });

  const handleConvertToImages = async () => {
    if (!selectedFile || !pdfjsLoaded) return;
    setIsProcessing(true);

    try {
      const fileReader = new FileReader();
      fileReader.onload = async function () {
        try {
          const typedarray = new Uint8Array(this.result as ArrayBuffer);
          const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
          const numPages = pdf.numPages;
          const renderedImages: { name: string; url: string }[] = [];

          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for high quality

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
              await page.render({
                canvasContext: context,
                viewport: viewport,
              }).promise;

              const dataUrl = canvas.toDataURL("image/png");
              renderedImages.push({
                name: `${selectedFile.name.replace(".pdf", "")}_page_${i}.png`,
                url: dataUrl,
              });
            }
          }

          setImages(renderedImages);
          setSelectedIndices(renderedImages.map((_, idx) => idx));
        } catch (err) {
          console.error("Error reading pages:", err);
          alert("Error parsing pages from PDF document.");
        } finally {
          setIsProcessing(false);
        }
      };
      fileReader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error("PDF to image error:", error);
      alert("Failed to render PDF pages.");
      setIsProcessing(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const downloadSelected = () => {
    if (!images || selectedIndices.length === 0) return;
    selectedIndices.forEach((idx, i) => {
      setTimeout(() => {
        const img = images[idx];
        const a = document.createElement("a");
        a.href = img.url;
        a.download = img.name;
        a.click();
      }, i * 200);
    });
  };

  const toggleAll = () => {
    if (!images) return;
    if (selectedIndices.length === images.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(images.map((_, idx) => idx));
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
            <FileImage className="w-8 h-8 text-primary" />
            PDF to Image
          </h1>
          <p className="text-muted-foreground mt-1">
            Convert your PDF document pages into high-quality PNG images instantly.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!images ? (
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
                  ${!pdfjsLoaded || isProcessing ? "pointer-events-none opacity-80" : ""}
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center text-center p-6">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                    <FileImage className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-1">
                    {!pdfjsLoaded ? "Loading dependencies..." : "Drag & drop a PDF file here, or click to browse"}
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

                <div className="flex justify-end pt-2">
                  <Button 
                    size="lg" 
                    onClick={handleConvertToImages}
                    disabled={isProcessing || !pdfjsLoaded}
                    className="px-8 rounded-full"
                  >
                    {isProcessing ? "Rendering Pages..." : "Convert to PNG"}
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
              <h2 className="text-2xl font-semibold mb-2">Rendering Complete!</h2>
              <div className="flex justify-between items-center mb-4 text-sm font-medium">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleAll}
                  className="text-primary hover:bg-primary/5"
                >
                  {selectedIndices.length === images.length ? "Deselect All" : "Select All"}
                </Button>
                <span className="text-muted-foreground text-xs">
                  {selectedIndices.length} of {images.length} pages selected
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto mb-8 text-left p-1">
                {images.map((img, idx) => {
                  const isChecked = selectedIndices.includes(idx);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleSelect(idx)}
                      className={`flex flex-col bg-muted/40 border rounded-xl p-3 relative cursor-pointer select-none transition-all hover:bg-muted/80
                        ${isChecked ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50'}
                      `}
                    >
                      <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => toggleSelect(idx)}
                          className="w-4.5 h-4.5 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                        />
                      </div>
                      <div className="aspect-video relative rounded-lg overflow-hidden bg-background border border-border/30 mb-2 mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={img.url} 
                          alt={img.name} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-semibold text-xs truncate mb-2 block">{img.name}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          const a = document.createElement("a");
                          a.href = img.url;
                          a.download = img.name;
                          a.click();
                        }}
                        className="w-full h-8"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download Page
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button 
                  size="lg" 
                  onClick={downloadSelected}
                  disabled={selectedIndices.length === 0}
                  className="w-full sm:w-auto h-12 px-8 rounded-full font-semibold"
                >
                  <Download className="mr-2 w-5 h-5" />
                  {selectedIndices.length === images.length 
                    ? "Download All Images" 
                    : `Download Selected (${selectedIndices.length})`}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto h-12 px-8 rounded-full" 
                  onClick={() => { setImages(null); setSelectedFile(null); setSelectedIndices([]); }}
                >
                  Convert Another
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
