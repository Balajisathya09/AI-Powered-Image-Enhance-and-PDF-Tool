"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Wrench, Crop, Pipette, Type, SlidersHorizontal,
  Download, Copy, Check, Upload, RotateCcw, Zap, Eye,
  ChevronDown, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";

/* ══════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════ */
type EditorState = {
  exposure: number;    // -100 to +100
  contrast: number;   // -100 to +100
  highlights: number; // -100 to +100
  shadows: number;    // -100 to +100
  saturation: number; // -100 to +100
  vibrance: number;   // -100 to +100
  hue: number;        // -180 to +180
  clarity: number;    //    0 to +100
  sharpness: number;  //    0 to +100
  noise: number;      //    0 to +20
  vignette: number;   //    0 to +100
  sepia: number;      //    0 to +100
  grayscale: number;  //    0 to +100
  invert: number;     //    0 to +100
};

type SliderDef = {
  key: keyof EditorState;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  default: number;
  color: string;
  bipolar: boolean;
};

type SliderGroup = {
  id: string;
  label: string;
  emoji: string;
  sliders: SliderDef[];
};

/* ══════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════ */
const defaultEditor: EditorState = {
  exposure: 0, contrast: 0, highlights: 0, shadows: 0,
  saturation: 0, vibrance: 0, hue: 0,
  clarity: 0, sharpness: 0, noise: 0,
  vignette: 0, sepia: 0, grayscale: 0, invert: 0,
};

const sliderGroups: SliderGroup[] = [
  {
    id: "light", label: "LIGHT", emoji: "☀️",
    sliders: [
      { key: "exposure",   label: "Exposure",   min: -100, max: 100, step: 1,   unit: "", default: 0, color: "#fbbf24", bipolar: true },
      { key: "contrast",   label: "Contrast",   min: -100, max: 100, step: 1,   unit: "", default: 0, color: "#6366f1", bipolar: true },
      { key: "highlights", label: "Highlights", min: -100, max: 100, step: 1,   unit: "", default: 0, color: "#fde68a", bipolar: true },
      { key: "shadows",    label: "Shadows",    min: -100, max: 100, step: 1,   unit: "", default: 0, color: "#818cf8", bipolar: true },
    ],
  },
  {
    id: "color", label: "COLOR", emoji: "🎨",
    sliders: [
      { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1,   unit: "", default: 0, color: "#ec4899", bipolar: true },
      { key: "vibrance",   label: "Vibrance",   min: -100, max: 100, step: 1,   unit: "", default: 0, color: "#f97316", bipolar: true },
      { key: "hue",        label: "Hue",        min: -180, max: 180, step: 1,   unit: "°", default: 0, color: "#22d3ee", bipolar: true },
    ],
  },
  {
    id: "detail", label: "DETAIL", emoji: "🔍",
    sliders: [
      { key: "clarity",   label: "Clarity",          min: 0, max: 100, step: 1,   unit: "", default: 0, color: "#34d399", bipolar: false },
      { key: "sharpness", label: "Sharpness",         min: 0, max: 100, step: 1,   unit: "", default: 0, color: "#86efac", bipolar: false },
      { key: "noise",     label: "Noise Reduction",   min: 0, max: 20,  step: 0.1, unit: "px", default: 0, color: "#67e8f9", bipolar: false },
    ],
  },
  {
    id: "effects", label: "EFFECTS", emoji: "✨",
    sliders: [
      { key: "vignette",  label: "Vignette",  min: 0, max: 100, step: 1, unit: "", default: 0, color: "#c084fc", bipolar: false },
      { key: "sepia",     label: "Sepia",     min: 0, max: 100, step: 1, unit: "", default: 0, color: "#a78bfa", bipolar: false },
      { key: "grayscale", label: "Grayscale", min: 0, max: 100, step: 1, unit: "", default: 0, color: "#94a3b8", bipolar: false },
      { key: "invert",    label: "Invert",    min: 0, max: 100, step: 1, unit: "", default: 0, color: "#f87171", bipolar: false },
    ],
  },
];

/* ══════════════════════════════════════════════
   FILTER BUILDER
══════════════════════════════════════════════ */
function buildFilter(e: EditorState): string {
  const brightness = Math.max(0, 100 + e.exposure + e.highlights * 0.2 + e.shadows * 0.15);
  const contrast   = Math.max(0, (100 + e.contrast + e.clarity * 0.6) * (1 + e.highlights * 0.001));
  const sat        = Math.max(0, (100 + e.saturation + e.vibrance * 0.4) * (1 + e.clarity * 0.003));
  const warmSepia  = Math.max(0, e.vibrance > 0 ? e.vibrance * 0.25 : 0);
  const totalSepia = Math.min(100, e.sepia + warmSepia);
  return [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${sat}%)`,
    `hue-rotate(${e.hue}deg)`,
    `blur(${e.noise}px)`,
    `sepia(${totalSepia}%)`,
    `grayscale(${e.grayscale}%)`,
    `invert(${e.invert}%)`,
  ].join(" ");
}

/* ══════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════ */
export default function UtilityToolsPage() {
  useLanguage();

  const [activeTab, setActiveTab] = useState<"resize" | "color" | "meme" | "editor">("resize");
  const [imageSrc, setImageSrc]   = useState<string | null>(null);
  const [fileName, setFileName]   = useState("image.png");

  /* ── Resize ── */
  const [width, setWidth]               = useState(300);
  const [height, setHeight]             = useState(300);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [aspectRatio, setAspectRatio]   = useState(1);

  /* ── Color Picker ── */
  const [hoverColor, setHoverColor]     = useState("#ffffff");
  const [selectedColor, setSelectedColor] = useState("#4f46e5");
  const [copiedColor, setCopiedColor]   = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /* ── Meme ── */
  const [topText, setTopText]         = useState("TOP TEXT");
  const [bottomText, setBottomText]   = useState("BOTTOM TEXT");
  const [fontSize, setFontSize]       = useState(40);
  const [textColor, setTextColor]     = useState("#ffffff");
  const [fontFamily, setFontFamily]   = useState("Impact");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [isUppercase, setIsUppercase] = useState(true);
  const [fontStyle, setFontStyle]     = useState<"bold"|"italic"|"normal">("bold");
  const [topOffset, setTopOffset]     = useState(15);
  const [bottomOffset, setBottomOffset] = useState(15);
  const [topAlignment, setTopAlignment]     = useState<"left"|"center"|"right">("center");
  const [bottomAlignment, setBottomAlignment] = useState<"left"|"center"|"right">("center");
  const memeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const slsConfig = [
    { label: "Top Offset",    val: topOffset,    set: setTopOffset,    unit: "" },
    { label: "Bottom Offset", val: bottomOffset, set: setBottomOffset, unit: "" },
  ];

  /* ── Editor ── */
  const [editor, setEditor]       = useState<EditorState>(defaultEditor);
  const editorRef                 = useRef<EditorState>(defaultEditor);
  const [showOriginal, setShowOriginal] = useState(false);
  const [openGroups, setOpenGroups]     = useState<Set<string>>(new Set(["light","color","detail","effects"]));
  const [histData, setHistData]         = useState<number[]>([]);
  const previewImgRef   = useRef<HTMLImageElement | null>(null);
  const histCanvasRef   = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  /* ── Font loading ── */
  useEffect(() => {
    if (typeof document !== "undefined" && (document as any).fonts) {
      (document as any).fonts.ready.then(() => setFontSize(p => p));
    }
  }, [fontFamily]);

  const insertEmoji = (target: "top"|"bottom", emoji: string) => {
    if (target === "top") setTopText(p => p + emoji);
    else setBottomText(p => p + emoji);
  };

  /* ── Compute histogram ── */
  const computeHistogram = (src: string) => {
    const cvs = document.createElement("canvas");
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 300 / Math.max(img.width, img.height));
      cvs.width = img.width * scale;
      cvs.height = img.height * scale;
      ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      const data = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
      const bins = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
        bins[lum]++;
      }
      setHistData(bins);
    };
    img.src = src;
  };

  /* ── Draw histogram ── */
  useEffect(() => {
    if (!histCanvasRef.current || !histData.length) return;
    const cvs = histCanvasRef.current;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0, 0, W, H);
    const max = Math.max(...histData) || 1;

    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0,   "rgba(99,102,241,0.7)");
    grad.addColorStop(0.5, "rgba(167,139,250,0.7)");
    grad.addColorStop(1,   "rgba(255,255,255,0.85)");
    ctx.fillStyle = grad;
    for (let i = 0; i < 256; i++) {
      const x = (i / 256) * W;
      const barH = (histData[i] / max) * H;
      ctx.fillRect(x, H - barH, Math.ceil(W / 256), barH);
    }
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "8px system-ui";
    ctx.fillText("SHADOWS", 4, H - 2);
    ctx.textAlign = "right";
    ctx.fillText("HIGHLIGHTS", W - 4, H - 2);
    ctx.textAlign = "left";
  }, [histData]);

  /* ── Drop ── */
  const onDrop = (files: File[]) => {
    if (!files.length) return;
    const file = files[0];
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (!src) return;
      setImageSrc(src);
      const img = new Image();
      img.onload = () => {
        setWidth(img.width);
        setHeight(img.height);
        setAspectRatio(img.width / img.height);
        computeHistogram(src);
      };
      img.src = src;
      const reset = { ...defaultEditor };
      editorRef.current = reset;
      setEditor(reset);
      setShowOriginal(false);
      if (previewImgRef.current) previewImgRef.current.style.filter = buildFilter(reset);
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg",".jpg",".png",".webp",".gif",".bmp",".heic",".heif"] },
    multiple: false,
  });

  /* ── Resize ── */
  const handleWidthChange = (v: number) => {
    setWidth(v);
    if (maintainAspect && aspectRatio) setHeight(Math.round(v / aspectRatio));
  };
  const handleHeightChange = (v: number) => {
    setHeight(v);
    if (maintainAspect && aspectRatio) setWidth(Math.round(v * aspectRatio));
  };
  const downloadResized = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement("canvas");
      cvs.width = width; cvs.height = height;
      const ctx = cvs.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const a = document.createElement("a");
        a.href = cvs.toDataURL("image/png");
        a.download = `resized_${fileName}`;
        a.click();
      }
    };
    img.src = imageSrc;
  };

  /* ── Color canvas ── */
  useEffect(() => {
    if (activeTab !== "color" || !imageSrc || !canvasRef.current) return;
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 500 / img.width);
      cvs.width = img.width * scale; cvs.height = img.height * scale;
      ctx?.drawImage(img, 0, 0, cvs.width, cvs.height);
    };
    img.src = imageSrc;
  }, [activeTab, imageSrc]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const r = cvs.getBoundingClientRect();
    try {
      const px = ctx.getImageData(Math.round(e.clientX - r.left), Math.round(e.clientY - r.top), 1, 1).data;
      setHoverColor("#" + [px[0],px[1],px[2]].map(x => x.toString(16).padStart(2,"0")).join(""));
    } catch {}
  };

  /* ── Meme canvas ── */
  useEffect(() => {
    if (activeTab !== "meme" || !imageSrc || !memeCanvasRef.current) return;
    const cvs = memeCanvasRef.current;
    const ctx = cvs.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 500 / img.width);
      cvs.width = img.width * scale; cvs.height = img.height * scale;
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      ctx.fillStyle = textColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.round((fontSize * scale) / 8);
      const sp = fontStyle === "normal" ? "" : `${fontStyle} `;
      ctx.font = `${sp}${fontSize * scale}px "${fontFamily}", Impact, sans-serif`;
      const render = (t: string) => isUppercase ? t.toUpperCase() : t;

      ctx.textBaseline = "top";
      ctx.textAlign = topAlignment;
      const tx = topAlignment === "center" ? cvs.width/2 : topAlignment === "left" ? 20 : cvs.width-20;
      ctx.strokeText(render(topText), tx, topOffset * scale);
      ctx.fillText(render(topText), tx, topOffset * scale);

      ctx.textBaseline = "bottom";
      ctx.textAlign = bottomAlignment;
      const bx = bottomAlignment === "center" ? cvs.width/2 : bottomAlignment === "left" ? 20 : cvs.width-20;
      ctx.strokeText(render(bottomText), bx, cvs.height - bottomOffset * scale);
      ctx.fillText(render(bottomText), bx, cvs.height - bottomOffset * scale);
    };
    img.src = imageSrc;
  }, [activeTab, imageSrc, topText, bottomText, fontSize, textColor, fontFamily, strokeColor, isUppercase, fontStyle, topOffset, bottomOffset, topAlignment, bottomAlignment]);

  const downloadMeme = () => {
    const cvs = memeCanvasRef.current;
    if (!cvs) return;
    const a = document.createElement("a");
    a.href = cvs.toDataURL("image/png");
    a.download = `meme_${fileName}`;
    a.click();
  };

  /* ══════════════════════════════════════════════
     EDITOR HANDLERS — instant zero-lag via DOM ref
  ══════════════════════════════════════════════ */
  const applyFilter = useCallback((e: EditorState, originalMode = false) => {
    if (previewImgRef.current) {
      previewImgRef.current.style.filter = originalMode ? "none" : buildFilter(e);
    }
  }, []);

  const handleEditorChange = useCallback((key: keyof EditorState, val: number) => {
    const next = { ...editorRef.current, [key]: val };
    editorRef.current = next;
    setEditor(next);          // React state (UI display)
    applyFilter(next);        // Direct DOM (zero-lag)
  }, [applyFilter]);

  const resetSlider = (key: keyof EditorState, def: number) => handleEditorChange(key, def);

  const resetAll = () => {
    editorRef.current = { ...defaultEditor };
    setEditor({ ...defaultEditor });
    applyFilter(defaultEditor);
  };

  /* ── Before/After (hold to see original) ── */
  const handleOriginalStart = () => {
    setShowOriginal(true);
    applyFilter(editorRef.current, true);
  };
  const handleOriginalEnd = () => {
    setShowOriginal(false);
    applyFilter(editorRef.current, false);
  };

  /* ── Auto Enhance ── */
  const autoEnhance = () => {
    if (!imageSrc) return;
    const cvs = document.createElement("canvas");
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 100 / Math.max(img.width, img.height));
      cvs.width = img.width * scale; cvs.height = img.height * scale;
      ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      const data = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
      let sumLum = 0, sumSat = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]/255, g = data[i+1]/255, b = data[i+2]/255;
        const lum = 0.299*r + 0.587*g + 0.114*b;
        const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
        sumLum += lum;
        sumSat += mx === 0 ? 0 : (mx - mn) / mx;
        n++;
      }
      const avgLum = sumLum / n;
      const avgSat = sumSat / n;
      let variance = 0;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299*(data[i]/255) + 0.587*(data[i+1]/255) + 0.114*(data[i+2]/255);
        variance += (lum - avgLum) ** 2;
      }
      variance /= n;

      const auto: EditorState = {
        ...defaultEditor,
        exposure:   Math.max(-60, Math.min(60, Math.round((0.45 - avgLum) * 120))),
        contrast:   Math.max(-30, Math.min(40, Math.round((0.035 - variance) * 400))),
        saturation: Math.max(-20, Math.min(50, Math.round((0.35 - avgSat) * 80))),
        clarity:    18,
        shadows:    avgLum < 0.3 ? 20 : 0,
        highlights: avgLum > 0.7 ? -20 : 0,
      };

      editorRef.current = auto;
      setEditor(auto);
      applyFilter(auto);
    };
    img.src = imageSrc;
  };

  /* ── Download edited ── */
  const downloadEdited = () => {
    if (!imageSrc || !exportCanvasRef.current) return;
    const cvs = exportCanvasRef.current;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      cvs.width = img.width; cvs.height = img.height;
      ctx.filter = buildFilter(editorRef.current);
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";

      // Clarity: high-pass overlay
      if (editorRef.current.clarity > 0) {
        const off = document.createElement("canvas");
        off.width = cvs.width; off.height = cvs.height;
        const offCtx = off.getContext("2d");
        if (offCtx) {
          offCtx.filter = `blur(${Math.max(2, cvs.width * 0.015)}px)`;
          offCtx.drawImage(cvs, 0, 0);
          ctx.globalAlpha = (editorRef.current.clarity / 100) * 0.45;
          ctx.globalCompositeOperation = "overlay";
          ctx.drawImage(off, 0, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
      }

      // Sharpness overlay
      if (editorRef.current.sharpness > 0) {
        ctx.globalAlpha = (editorRef.current.sharpness / 100) * 0.3;
        ctx.globalCompositeOperation = "overlay";
        ctx.drawImage(img, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      // Vignette
      if (editorRef.current.vignette > 0) {
        const grad = ctx.createRadialGradient(
          cvs.width/2, cvs.height/2, Math.min(cvs.width, cvs.height)*0.3,
          cvs.width/2, cvs.height/2, Math.max(cvs.width, cvs.height)*0.75
        );
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(0,0,0,${(editorRef.current.vignette/100)*0.75})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cvs.width, cvs.height);
      }

      const a = document.createElement("a");
      a.href = cvs.toDataURL("image/png");
      a.download = `edited_${fileName}`;
      a.click();
    };
    img.src = imageSrc;
  };

  /* ── Track fill calculation ── */
  const getTrackFill = (def: SliderDef, val: number) => {
    if (def.bipolar) {
      const center = ((0 - def.min) / (def.max - def.min)) * 100;
      const pct = ((val - def.min) / (def.max - def.min)) * 100;
      return val >= 0
        ? { left: `${center}%`, width: `${pct - center}%` }
        : { left: `${pct}%`, width: `${center - pct}%` };
    }
    const pct = ((val - def.min) / (def.max - def.min)) * 100;
    return { left: "0%", width: `${pct}%` };
  };

  /* ── Drop zone JSX helper (not a component – avoids remount issues) ── */
  const dropZoneJSX = (
    <div
      {...getRootProps()}
      className={`relative flex flex-col items-center justify-center w-full min-h-[320px] border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer ${
        isDragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center text-center p-8">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Upload className="w-10 h-10" />
        </div>
        <p className="text-xl font-bold mb-1">Drop your image here</p>
        <p className="text-sm text-muted-foreground">or click to browse — JPG, PNG, WEBP, HEIC and more</p>
      </div>
    </div>
  );

  const tabs = [
    { id: "resize", label: "Resize & Scale", icon: <Crop className="w-4 h-4" /> },
    { id: "color",  label: "Color Picker",   icon: <Pipette className="w-4 h-4" /> },
    { id: "meme",   label: "Meme Generator", icon: <Type className="w-4 h-4" /> },
    { id: "editor", label: "Image Editor",   icon: <SlidersHorizontal className="w-4 h-4" /> },
  ] as const;

  const isEditor = activeTab === "editor";

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 flex flex-col min-h-0 relative">
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Press+Start+2P&family=Pacifico&family=Bangers&family=Righteous&display=swap" rel="stylesheet" />

      {/* Page header */}
      <div className="mb-4 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Wrench className="w-8 h-8 text-primary" /> Utility Tools
          </h1>
          <p className="text-muted-foreground mt-1">
            Resize, pick colors, create memes, or edit images with professional Lightroom-style controls.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-4 overflow-x-auto gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════
          IMAGE EDITOR (full-width layout)
      ══════════════════════════════════════ */}
      {isEditor && (
        <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 340px)", minHeight: "450px" }}>
          {/* Top action bar */}
          {imageSrc && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <button
                onMouseDown={handleOriginalStart}
                onMouseUp={handleOriginalEnd}
                onMouseLeave={handleOriginalEnd}
                onTouchStart={handleOriginalStart}
                onTouchEnd={handleOriginalEnd}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold border border-border rounded-xl hover:bg-muted/40 transition-colors select-none cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Hold to see Original
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={autoEnhance}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-colors"
                  style={{ borderColor: "#fbbf2466", color: "#fbbf24", background: "#fbbf2411" }}
                >
                  <Zap className="w-3.5 h-3.5" /> Auto Enhance
                </button>
                <button
                  onClick={resetAll}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset All
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
            {/* Left: Image Preview */}
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <div
                className="rounded-2xl overflow-hidden border border-border/40 flex items-center justify-center h-full"
                style={{ background: "#080808" }}
              >
                {!imageSrc ? (
                  <div className="w-full p-8">
                    {dropZoneJSX}
                  </div>
                ) : (
                  <div className="relative w-full flex flex-col items-center gap-4 p-4">
                    {showOriginal && (
                      <div className="absolute top-6 left-6 z-20 bg-black/70 text-white text-[11px] px-3 py-1 rounded-full font-bold tracking-widest border border-white/20">
                        ORIGINAL
                      </div>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={previewImgRef}
                      src={imageSrc}
                      alt="Editor preview"
                      style={{ filter: buildFilter(editor), transition: "filter 0ms" }}
                      className="max-h-[380px] max-w-full rounded-xl object-contain shadow-2xl"
                    />
                    <canvas ref={exportCanvasRef} className="hidden" />
                    <button
                      onClick={() => { setImageSrc(null); setHistData([]); }}
                      className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-1"
                    >
                      Change Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Editor Controls — single scrollable box */}
            <div className="lg:col-span-4 flex flex-col min-h-0">
              <div
                className="flex-1 overflow-y-auto space-y-3 pr-1 rounded-2xl"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
              >
              {/* Histogram */}
              {histData.length > 0 && (
                <div className="rounded-2xl overflow-hidden border border-border/30" style={{ background: "#0d0d0d" }}>
                  <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground/60">HISTOGRAM</span>
                  </div>
                  <canvas
                    ref={histCanvasRef}
                    width={400}
                    height={64}
                    className="w-full h-16 block"
                  />
                </div>
              )}

              {/* If no image yet, show dropzone placeholder on right */}
              {!imageSrc && (
                <div className="rounded-2xl border border-border/30 p-6 text-center" style={{ background: "#0d0d0d" }}>
                  <p className="text-sm text-muted-foreground">Upload an image on the left to start editing.</p>
                </div>
              )}

              {/* Slider Groups */}
              {imageSrc && sliderGroups.map((group) => {
                const isOpen = openGroups.has(group.id);
                // Check if any slider in this group is non-default
                const hasChanges = group.sliders.some(s => editor[s.key] !== s.default);

                return (
                  <div
                    key={group.id}
                    className="rounded-2xl border overflow-hidden"
                    style={{ background: "#0d0d0d", borderColor: hasChanges ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)" }}
                  >
                    {/* Group Header */}
                    <button
                      onClick={() => setOpenGroups(prev => {
                        const next = new Set(prev);
                        next.has(group.id) ? next.delete(group.id) : next.add(group.id);
                        return next;
                      })}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-base">{group.emoji}</span>
                        <span className="text-[11px] font-black tracking-[0.18em] text-white/60">{group.label}</span>
                        {hasChanges && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                      </span>
                      {isOpen
                        ? <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                        : <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                      }
                    </button>

                    {/* Sliders */}
                    {isOpen && (
                      <div className="px-4 pb-5 space-y-5 border-t border-white/5 pt-4">
                        {group.sliders.map((def) => {
                          const val = editor[def.key];
                          const isDefault = val === def.default;
                          const fill = getTrackFill(def, val);
                          const displayVal = def.bipolar && val > 0 ? `+${val}` : `${val}`;

                          return (
                            <div key={def.key}>
                              {/* Label row */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold" style={{ color: def.color }}>{def.label}</span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-[11px] font-black tabular-nums min-w-[32px] text-right"
                                    style={{ color: isDefault ? "rgba(255,255,255,0.3)" : def.color }}
                                  >
                                    {displayVal}{def.unit}
                                  </span>
                                  {!isDefault && (
                                    <button
                                      onClick={() => resetSlider(def.key, def.default)}
                                      title="Reset"
                                      className="text-white/20 hover:text-white/60 transition-colors text-sm leading-none"
                                    >
                                      ↺
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Custom track */}
                              <div className="relative h-[3px] w-full rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                                {/* Center tick for bipolar */}
                                {def.bipolar && (
                                  <div
                                    className="absolute top-[-3px] bottom-[-3px] w-px"
                                    style={{ left: "50%", background: "rgba(255,255,255,0.15)" }}
                                  />
                                )}
                                {/* Fill bar */}
                                {!isDefault && (
                                  <div
                                    className="absolute top-0 h-full rounded-full"
                                    style={{ left: fill.left, width: fill.width, background: def.color, opacity: 0.9 }}
                                  />
                                )}
                                {/* Thumb dot */}
                                <div
                                  className="absolute top-[-4px] w-[11px] h-[11px] rounded-full border-2 shadow-lg"
                                  style={{
                                    left: `calc(${((val - def.min) / (def.max - def.min)) * 100}% - 5.5px)`,
                                    background: isDefault ? "rgba(255,255,255,0.25)" : def.color,
                                    borderColor: isDefault ? "rgba(255,255,255,0.15)" : def.color,
                                    boxShadow: isDefault ? "none" : `0 0 8px ${def.color}66`,
                                    pointerEvents: "none",
                                  }}
                                />
                              </div>

                              {/* Invisible range input on top for interaction */}
                              <input
                                type="range"
                                min={def.min}
                                max={def.max}
                                step={def.step}
                                value={val}
                                onChange={(e) => handleEditorChange(def.key, parseFloat(e.target.value))}
                                className="w-full h-5 mt-[-14px] opacity-0 cursor-pointer relative z-10 touch-pan-x"
                                style={{ WebkitAppearance: "none", appearance: "none" }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Download */}
              {imageSrc && (
                <div
                  className="rounded-2xl border border-border/30 p-4 space-y-2"
                  style={{ background: "#0d0d0d" }}
                >
                  <Button
                    className="w-full h-12 rounded-xl font-bold text-sm"
                    onClick={downloadEdited}
                  >
                    <Download className="mr-2 w-4 h-4" /> Export Edited Image
                  </Button>
                  <p className="text-[10px] text-white/20 text-center">
                    Exports at full original resolution · PNG format
                  </p>
                </div>
              )}
              </div>{/* end scrollable wrapper */}
            </div>{/* end right col */}
          </div>{/* end grid */}
        </div>
      )}

      {/* ══════════════════════════════════════
          OTHER TABS (Resize, Color, Meme)
      ══════════════════════════════════════ */}
      {!isEditor && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-card border border-border rounded-2xl p-6 min-h-[360px]">
            {!imageSrc ? (
              dropZoneJSX
            ) : (
              <div className="w-full flex flex-col items-center gap-4">
                {activeTab === "resize" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageSrc} alt="Source" className="max-h-[420px] rounded-xl object-contain border border-border/50 shadow-sm" />
                )}
                {activeTab === "color" && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-muted-foreground">Hover and click the image to pick a color.</p>
                    <canvas
                      ref={canvasRef}
                      onMouseMove={handleCanvasMouseMove}
                      onClick={() => setSelectedColor(hoverColor)}
                      className="max-h-[420px] rounded-xl cursor-crosshair border border-border/50 shadow-sm"
                    />
                  </div>
                )}
                {activeTab === "meme" && (
                  <canvas ref={memeCanvasRef} className="max-h-[420px] rounded-xl border border-border/50 shadow-sm" />
                )}
                <Button variant="outline" size="sm" onClick={() => setImageSrc(null)} className="mt-1 text-xs">
                  Change Image
                </Button>
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="lg:col-span-5 space-y-4">

            {/* ── RESIZE ── */}
            {activeTab === "resize" && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-lg">Resize Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Width (px)</label>
                    <input type="number" value={width} onChange={e => handleWidthChange(parseInt(e.target.value)||0)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Height (px)</label>
                    <input type="number" value={height} onChange={e => handleHeightChange(parseInt(e.target.value)||0)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" checked={maintainAspect} onChange={e => setMaintainAspect(e.target.checked)} className="w-4 h-4 rounded" />
                  Maintain Aspect Ratio
                </label>
                <Button className="w-full h-12 rounded-xl font-semibold" disabled={!imageSrc} onClick={downloadResized}>
                  <Download className="mr-2 w-5 h-5" /> Download Resized PNG
                </Button>
              </div>
            )}

            {/* ── COLOR PICKER ── */}
            {activeTab === "color" && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <h3 className="font-bold text-lg">Color Information</h3>
                <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border/50">
                  <div className="w-12 h-12 rounded-lg border border-border shadow-sm shrink-0" style={{ backgroundColor: hoverColor }} />
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Hovered Color</p>
                    <p className="font-mono text-base font-bold">{hoverColor.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="w-16 h-16 rounded-xl border border-border shadow-sm shrink-0" style={{ backgroundColor: selectedColor }} />
                  <div className="flex-1">
                    <p className="text-xs text-primary font-bold">Selected</p>
                    <p className="font-mono text-lg font-extrabold truncate">{selectedColor.toUpperCase()}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(selectedColor.toUpperCase()); setCopiedColor(true); setTimeout(() => setCopiedColor(false), 2000); }} className="rounded-full">
                    {copiedColor ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            )}

            {/* ── MEME ── */}
            {activeTab === "meme" && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-lg">Meme Text Controls</h3>

                {["top","bottom"].map((pos) => (
                  <div key={pos} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-muted-foreground capitalize">{pos} Text</label>
                      <div className="flex gap-0.5">
                        {["😂","😭","💀","🤡","🔥","💯","👀","🫡","😤","🤣"].map(e => (
                          <button key={e} type="button" onClick={() => insertEmoji(pos as any, e)} className="hover:scale-125 transition-transform text-sm px-0.5">{e}</button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={pos === "top" ? topText : bottomText}
                      onChange={e => pos === "top" ? setTopText(e.target.value) : setBottomText(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Font</label>
                    <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-background border border-border rounded-xl px-2 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="Impact">Impact</option>
                      <option value="Anton">Anton</option>
                      <option value="Bebas Neue">Bebas Neue</option>
                      <option value="Bangers">Bangers</option>
                      <option value="Righteous">Righteous</option>
                      <option value="Pacifico">Pacifico</option>
                      <option value="Press Start 2P">Pixel</option>
                      <option value="Comic Sans MS">Comic Sans</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Size (px)</label>
                    <input type="number" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value)||20)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-center font-medium h-[38px] focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Text Color</label>
                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full h-[38px] bg-background border border-border rounded-xl px-2 py-1 cursor-pointer" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Outline</label>
                    <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} className="w-full h-[38px] bg-background border border-border rounded-xl px-2 py-1 cursor-pointer" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Top Align</label>
                    <select value={topAlignment} onChange={e => setTopAlignment(e.target.value as any)} className="w-full bg-background border border-border rounded-xl px-2 py-2 text-sm font-medium focus:outline-none">
                      <option value="center">Center</option><option value="left">Left</option><option value="right">Right</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Bottom Align</label>
                    <select value={bottomAlignment} onChange={e => setBottomAlignment(e.target.value as any)} className="w-full bg-background border border-border rounded-xl px-2 py-2 text-sm font-medium focus:outline-none">
                      <option value="center">Center</option><option value="left">Left</option><option value="right">Right</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Style</label>
                    <select value={fontStyle} onChange={e => setFontStyle(e.target.value as any)} className="w-full bg-background border border-border rounded-xl px-2 py-2 text-sm font-medium focus:outline-none">
                      <option value="bold">Bold</option><option value="italic">Italic</option><option value="normal">Normal</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer select-none">
                      <input type="checkbox" checked={isUppercase} onChange={e => setIsUppercase(e.target.checked)} className="w-4 h-4 rounded" />
                      UPPERCASE
                    </label>
                  </div>
                </div>

                {slsConfig.map(sl => (
                  <div key={sl.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>{sl.label}</span><span>{sl.val}px {sl.unit}</span>
                    </div>
                    <input type="range" min="5" max="200" value={sl.val} onChange={e => sl.set(parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                ))}

                <div className="pt-2 border-t border-border">
                  <Button className="w-full h-12 rounded-xl font-semibold" disabled={!imageSrc} onClick={downloadMeme}>
                    <Download className="mr-2 w-5 h-5" /> Download Meme PNG
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
