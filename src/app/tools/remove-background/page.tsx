"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Download, ArrowLeft, Scissors, Loader2, Upload,
  CheckCircle, Eraser, RotateCcw, Paintbrush, ImageIcon, Undo2,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const BG_PRESETS = [
  { label: "Transparent", value: "transparent" },
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
  { label: "Sky Blue", value: "#87CEEB" },
  { label: "Soft Pink", value: "#FFB6C1" },
  { label: "Forest", value: "#228B22" },
  { label: "Sunset", value: "linear-gradient(135deg,#f97316,#ec4899)" },
  { label: "Ocean", value: "linear-gradient(135deg,#0ea5e9,#6366f1)" },
  { label: "Gold", value: "linear-gradient(135deg,#fbbf24,#f59e0b)" },
];

export default function RemoveBgPage() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [resultReady, setResultReady] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [removedBgImage, setRemovedBgImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedBg, setSelectedBg] = useState("transparent");
  const [brushSize, setBrushSize] = useState(20);
  const [eraseMode, setEraseMode] = useState<"erase" | "restore">("erase");
  const [canUndo, setCanUndo] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isCursorOnCanvas, setIsCursorOnCanvas] = useState(false);

  // Keep a ref of selectedBg to avoid triggering useEffects on bg change
  const selectedBgRef = useRef(selectedBg);
  useEffect(() => {
    selectedBgRef.current = selectedBg;
    drawComposite();
  }, [selectedBg]);

  // Use refs so paint() always gets latest values without stale closures
  const isDrawingRef = useRef(false);
  const eraseModeRef = useRef<"erase" | "restore">("erase");
  const brushSizeRef = useRef(20);

  const setEraseModeWithRef = (mode: "erase" | "restore") => {
    eraseModeRef.current = mode;
    setEraseMode(mode);
  };
  const setBrushSizeWithRef = (size: number) => {
    brushSizeRef.current = size;
    setBrushSize(size);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null); // removed-bg image (transparent)
  const originalImgRef = useRef<HTMLImageElement | null>(null); // original photo (with background)
  // Undo history stack — stores ImageData snapshots of the overlay canvas
  const historyRef = useRef<ImageData[]>([]);

  // Save current overlay state to history before a stroke
  const saveHistory = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, overlay.width, overlay.height);
    historyRef.current.push(snapshot);
    // Keep max 30 steps
    if (historyRef.current.length > 30) historyRef.current.shift();
    setCanUndo(true);
  }, []);

  // Undo last brush stroke
  const handleUndo = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay || historyRef.current.length === 0) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    const previous = historyRef.current.pop();
    if (previous) {
      ctx.putImageData(previous, 0, 0);
      drawComposite();
    }
    setCanUndo(historyRef.current.length > 0);
  }, []); // drawComposite defined below

  // Draw the composited result onto the main canvas
  const drawComposite = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay || !imgRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bg = selectedBgRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (bg === "transparent") {
      const size = 20;
      for (let x = 0; x < canvas.width; x += size) {
        for (let y = 0; y < canvas.height; y += size) {
          ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? "#d0d0d0" : "#f0f0f0";
          ctx.fillRect(x, y, size, size);
        }
      }
    } else if (bg.startsWith("linear-gradient")) {
      const match = bg.match(/#[0-9a-fA-F]{6}/g);
      if (match && match.length >= 2) {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, match[0]);
        grad.addColorStop(1, match[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw the subject from the overlay canvas (which has the mask)
    ctx.drawImage(overlay, 0, 0);
  }, []);

  // Patch handleUndo to call drawComposite
  const undoWithRedraw = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay || historyRef.current.length === 0) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    const previous = historyRef.current.pop();
    if (previous) {
      ctx.putImageData(previous, 0, 0);
      drawComposite();
    }
    setCanUndo(historyRef.current.length > 0);
  }, [drawComposite]);

  // When the overlay canvas physically mounts, initialize the images.
  // This fixes the race condition with Framer Motion's exit animations.
  const setOverlayRef = useCallback((node: HTMLCanvasElement | null) => {
    overlayRef.current = node;
    if (node && removedBgImage) {
      const ctx = node.getContext("2d");
      if (!ctx) return;
      
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        node.width = img.width;
        node.height = img.height;
        if (canvasRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
        }
        ctx.clearRect(0, 0, node.width, node.height);
        ctx.drawImage(img, 0, 0);
        // Clear history on new image
        historyRef.current = [];
        setCanUndo(false);
        drawComposite();
      };
      img.src = removedBgImage;
    }
  }, [removedBgImage, drawComposite]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = overlayRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    saveHistory(); // Save state BEFORE stroke for undo
    isDrawingRef.current = true;
    doPaint(e);
  };

  const doPaint = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const overlay = overlayRef.current;
    if (!overlay || !imgRef.current) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    const radius = brushSizeRef.current;
    const mode = eraseModeRef.current;

    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    } else {
      // Restore: paint from ORIGINAL photo (with background) so original bg comes back
      const srcImg = originalImgRef.current || imgRef.current;
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.clip();
      if (srcImg) ctx.drawImage(srcImg, 0, 0, overlay.width, overlay.height);
      ctx.restore();
    }
    drawComposite();
  };

  const stopDrawing = () => { isDrawingRef.current = false; };

  const handleReset = () => {
    const overlay = overlayRef.current;
    if (!overlay || !imgRef.current) return;
    saveHistory(); // save before reset so user can undo the reset
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.drawImage(imgRef.current, 0, 0);
    drawComposite();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = selectedBg === "transparent" ? "no_bg_image.png" : "bg_replaced_image.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleStartOver = () => {
    setResultReady(false);
    setIsProcessing(false);
    setOriginalImage(null);
    setRemovedBgImage(null);
    setSelectedBg("transparent");
    historyRef.current = [];
    setCanUndo(false);
    imgRef.current = null;
  };

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { alert("Please upload an image file."); return; }
    setIsProcessing(true);
    setProgress(0);
    setProgressMsg("Loading AI model...");
    const objectUrl = URL.createObjectURL(file);
    setOriginalImage(objectUrl);

    // Pre-load original image into ref for restore brush
    const origImg = new Image();
    origImg.src = objectUrl;
    origImg.onload = () => { originalImgRef.current = origImg; };

    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const resultBlob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          setProgress(pct);
          if (key.includes("fetch")) setProgressMsg("Downloading AI model (first time only)...");
          else if (key.includes("compute")) setProgressMsg("Removing background...");
          else setProgressMsg("Processing...");
        },
      });
      setRemovedBgImage(URL.createObjectURL(resultBlob));
      setResultReady(true);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to remove background.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

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

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Scissors className="w-8 h-8 text-primary" />
            {t.tools.bgRemover}
          </h1>
          <p className="text-muted-foreground mt-1">Remove background · Erase / Restore · Change background · Undo · Download</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!resultReady ? (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <label
              htmlFor="bg-file-input"
              className={`block border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 ${isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"} ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input id="bg-file-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isProcessing} />
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  {originalImage && <img src={originalImage} className="w-32 h-32 object-cover rounded-xl mb-2 shadow" alt="preview" />}
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="font-semibold text-lg">{progressMsg}</p>
                  <div className="w-64 bg-muted rounded-full h-3 overflow-hidden">
                    <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                  <p className="text-muted-foreground text-sm">{progress}% complete</p>
                  <p className="text-xs text-muted-foreground mt-1">First run downloads AI model (~40MB). Subsequent runs are instant.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Drop your image here</p>
                    <p className="text-muted-foreground text-sm mt-1">or click to browse · PNG, JPG, WEBP</p>
                  </div>
                  <div className="flex gap-2 mt-2 justify-center">
                    {["People", "Products", "Logos", "Objects"].map((tag) => (
                      <span key={tag} className="text-xs px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              {[{ icon: "🤖", title: "Local AI", desc: "Runs in your browser" }, { icon: "🖌️", title: "Erase & Restore", desc: "Manual brush + Undo" }, { icon: "🎨", title: "Add Background", desc: "Colors & gradients" }].map((f, i) => (
                <motion.div
                  key={f.title}
                  whileHover={{ y: -6, scale: 1.03, boxShadow: "0 10px 25px -10px rgba(0,0,0,0.08)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 16 }}
                  className="bg-card border border-border/80 rounded-2xl p-5 hover:border-primary/30 relative overflow-hidden group cursor-default"
                >
                  {/* Subtle top gradient glow on hover */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="text-3xl mb-2.5 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6 inline-block">
                    {f.icon}
                  </div>
                  <p className="font-bold text-sm text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="flex items-center gap-2 text-green-500 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Background removed! Erase, restore, change background, then download.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Canvas Editor */}
              <div className="lg:col-span-2 space-y-3">
                <div
                  ref={containerRef}
                  className="relative rounded-2xl overflow-hidden border border-border shadow-sm"
                >
                  <canvas ref={canvasRef} className="w-full block" />
                  {/* Visible round brush cursor */}
                  {isCursorOnCanvas && cursorPos && canvasRef.current && (
                    <div
                      className="absolute pointer-events-none rounded-full border-2 border-white mix-blend-difference"
                      style={{
                        width: brushSize * (canvasRef.current.clientWidth / canvasRef.current.width) * 2,
                        height: brushSize * (canvasRef.current.clientWidth / canvasRef.current.width) * 2,
                        left: cursorPos.x - (brushSize * (canvasRef.current.clientWidth / canvasRef.current.width)),
                        top: cursorPos.y - (brushSize * (canvasRef.current.clientWidth / canvasRef.current.width)),
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                      }}
                    />
                  )}
                  <canvas
                    ref={setOverlayRef}
                    className="absolute inset-0 w-full h-full opacity-0"
                    style={{ cursor: "none" }}
                    onMouseEnter={() => setIsCursorOnCanvas(true)}
                    onMouseLeave={() => { setIsCursorOnCanvas(false); stopDrawing(); }}
                    onMouseMove={(e) => {
                      // Track cursor position relative to container for the visible brush
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                      doPaint(e);
                    }}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={doPaint}
                    onTouchEnd={stopDrawing}
                  />
                </div>

                {/* Brush Toolbar */}
                <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
                  {/* Erase / Restore */}
                  <div className="flex gap-2">
                    <Button size="sm" variant={eraseMode === "erase" ? "default" : "outline"} onClick={() => setEraseModeWithRef("erase")} className="rounded-full gap-1">
                      <Eraser className="w-4 h-4" /> Erase
                    </Button>
                    <Button size="sm" variant={eraseMode === "restore" ? "default" : "outline"} onClick={() => setEraseModeWithRef("restore")} className="rounded-full gap-1">
                      <Paintbrush className="w-4 h-4" /> Restore
                    </Button>
                  </div>

                  {/* Brush size */}
                  <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Brush Size:</span>
                    <input type="range" min={5} max={300} value={brushSize} onChange={(e) => setBrushSizeWithRef(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-8">{brushSize}px</span>
                  </div>

                  {/* Undo */}
                  <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={undoWithRedraw} disabled={!canUndo} title="Undo last brush stroke">
                    <Undo2 className="w-4 h-4" /> Undo
                  </Button>

                  {/* Reset to original AI result */}
                  <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" /> Reset
                  </Button>
                </div>
              </div>

              {/* Right Panel */}
              <div className="space-y-4">
                {/* Background selector */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" /> Background
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {BG_PRESETS.map((bg) => (
                      <button
                        key={bg.value}
                        onClick={() => setSelectedBg(bg.value)}
                        className={`h-12 rounded-lg border-2 transition-all text-xs font-medium overflow-hidden ${selectedBg === bg.value ? "border-primary scale-105 shadow-md" : "border-border hover:border-primary/50"}`}
                        style={
                          bg.value === "transparent"
                            ? { backgroundImage: "linear-gradient(45deg, #d0d0d0 25%, transparent 25%, transparent 75%, #d0d0d0 75%)", backgroundSize: "10px 10px", backgroundColor: "#f0f0f0" }
                            : bg.value.startsWith("linear-gradient")
                            ? { backgroundImage: bg.value }
                            : { backgroundColor: bg.value }
                        }
                        title={bg.label}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Custom color:</label>
                    <input
                      type="color"
                      className="w-10 h-8 rounded cursor-pointer border border-border"
                      onChange={(e) => setSelectedBg(e.target.value)}
                    />
                  </div>
                </div>

                {/* Original preview */}
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Original</p>
                  <img src={originalImage || ""} alt="Original" className="w-full rounded-lg object-contain max-h-40" />
                </div>

                {/* Actions */}
                <Button className="w-full h-12 rounded-full font-medium gap-2" onClick={handleDownload}>
                  <Download className="w-5 h-5" /> Download PNG
                </Button>
                <Button variant="outline" className="w-full rounded-full" onClick={handleStartOver}>
                  Remove Another Image
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
