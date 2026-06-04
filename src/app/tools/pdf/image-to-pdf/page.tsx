"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileImage, Trash2, ArrowUp, ArrowDown, FileText, Download } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";

interface SelectedImage {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
}

export default function ImageToPdfPage() {
  const { t } = useLanguage();
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    try {
      const heic2any = (await import("heic2any")).default;
      const processedImages = await Promise.all(
        acceptedFiles.map(async (file) => {
          let targetFile = file;
          const isHeic = file.name.toLowerCase().endsWith(".heic") || 
                         file.name.toLowerCase().endsWith(".heif") || 
                         file.type === "image/heic" || 
                         file.type === "image/heif";

          if (isHeic) {
            try {
              const convertedBlob = await heic2any({
                blob: file,
                toType: "image/jpeg",
                quality: 0.90,
              });
              const blobArray = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
              targetFile = new File([blobArray], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
                type: "image/jpeg",
              });
            } catch (err) {
              console.error("HEIC conversion failed:", err);
            }
          }

          const previewUrl = URL.createObjectURL(targetFile);

          return {
            id: Math.random().toString(36).substring(2, 9),
            file: targetFile,
            name: targetFile.name,
            size: targetFile.size,
            previewUrl,
          };
        })
      );
      setImages((prev) => [...prev, ...processedImages]);
    } catch (error) {
      console.error("Error processing files:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/heic": [".heic"],
      "image/heif": [".heif"],
    },
    multiple: true,
  });

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === images.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[newIndex];
    newImages[newIndex] = temp;
    setImages(newImages);
  };

  const handleGeneratePdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const img of images) {
        // Render image onto a Canvas first to translate progressive JPEGs/other formats
        // into a standard, clean PNG format that pdf-lib is guaranteed to embed.
        const htmlImg = new Image();
        htmlImg.src = img.previewUrl;
        await new Promise((resolve, reject) => {
          htmlImg.onload = resolve;
          htmlImg.onerror = reject;
        });

        const canvas = document.createElement("canvas");
        canvas.width = htmlImg.naturalWidth;
        canvas.height = htmlImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create canvas context");
        ctx.drawImage(htmlImg, 0, 0);

        const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.90);
        const jpegResponse = await fetch(jpegDataUrl);
        const jpegBytes = await jpegResponse.arrayBuffer();

        const embeddedImage = await pdfDoc.embedJpg(jpegBytes);
        const { width, height } = embeddedImage.scale(1.0);
        
        // Add a page with the same dimensions as the image
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (error) {
      console.error("Image to PDF conversion error:", error);
      alert("Failed to convert images to PDF. Try using standard JPEG or PNG images.");
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
            <FileImage className="w-8 h-8 text-primary" />
            Image to PDF
          </h1>
          <p className="text-muted-foreground mt-1">
            Convert JPG and PNG images into a clean, multi-page PDF document.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!pdfBlobUrl ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
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
                  <FileImage className="w-8 h-8" />
                </div>
                <p className="text-lg font-medium text-foreground mb-1">
                  Drag & drop JPG or PNG images here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">Supports JPG and PNG formats</p>
              </div>
            </div>

            {images.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center justify-between border-b border-border pb-3">
                  <span>Selected Images ({images.length})</span>
                  <Button 
                    disabled={isProcessing}
                    onClick={handleGeneratePdf}
                    className="px-6 rounded-full"
                  >
                    {isProcessing ? "Converting..." : "Generate PDF"}
                  </Button>
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[450px] overflow-y-auto p-1">
                  {images.map((img, index) => (
                    <div 
                      key={img.id}
                      className="group relative flex flex-col bg-muted/40 hover:bg-muted/80 rounded-xl border border-border/50 overflow-hidden p-2 transition-all"
                    >
                      <div className="aspect-square relative rounded-lg overflow-hidden bg-background border border-border/30 mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={img.previewUrl} 
                          alt={img.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="font-medium text-xs text-foreground truncate px-1">
                        {img.name}
                      </p>
                      
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm p-1 rounded-lg border border-border/50">
                        <button
                          className="h-6 w-6 text-foreground hover:text-primary disabled:opacity-30"
                          disabled={index === 0 || isProcessing}
                          onClick={(e) => { e.stopPropagation(); moveImage(index, "up"); }}
                        >
                          <ArrowLeft className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button
                          className="h-6 w-6 text-foreground hover:text-primary disabled:opacity-30"
                          disabled={index === images.length - 1 || isProcessing}
                          onClick={(e) => { e.stopPropagation(); moveImage(index, "down"); }}
                        >
                          <ArrowDown className="w-3.5 h-3.5 rotate-90 mx-auto" />
                        </button>
                        <button
                          className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded"
                          disabled={isProcessing}
                          onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
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
              <h2 className="text-2xl font-semibold mb-2">PDF Generated!</h2>
              <p className="text-muted-foreground mb-6">Your images have been successfully converted into a PDF document.</p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full font-medium" onClick={() => {
                  if (pdfBlobUrl) {
                    const a = document.createElement('a');
                    a.href = pdfBlobUrl;
                    a.download = "images.pdf";
                    a.click();
                  }
                }}>
                  <Download className="mr-2 w-5 h-5" />
                  Download PDF
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={() => { setPdfBlobUrl(null); setImages([]); }}>
                  Convert More
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
