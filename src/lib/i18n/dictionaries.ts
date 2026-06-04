export type Language = 'en' | 'ta';

export const dictionaries = {
  en: {
    hero: {
      headline: "Enhance, Upscale, Restore & Convert Files with AI",
      subheadline: "Professional AI-powered image enhancement, upscaling, background removal, and PDF tools. Completely free and no signup required.",
      uploadCta: "Upload Image",
      exploreCta: "Explore Tools"
    },
    nav: {
      brand: "PixelBoost AI",
      tools: "Tools",
      pdf: "PDF Toolkit"
    },
    tools: {
      enhancer: "AI Image Enhancer",
      upscaler: "AI Image Upscaler",
      bgRemover: "AI Background Remover",
      restore: "AI Old Photo Restoration",
      converter: "Image Converter",
      compressor: "Image Compressor",
      pdfToolkit: "PDF Toolkit",
      utility: "Utility Tools"
    },
    footer: {
      copyright: "© 2026 PixelBoost AI. All rights reserved."
    },
    upload: {
      drag: "Drag & drop your image here, or click to browse",
      processing: "Processing with AI...",
      download: "Download"
    }
  },
  ta: {
    hero: {
      headline: "AI மூலம் உங்கள் கோப்புகளை மேம்படுத்தவும், பெரிதாக்கவும் & மாற்றவும்",
      subheadline: "தொழில்முறை AI-அடிப்படையிலான பட மேம்பாடு, பின்னணி நீக்கம் மற்றும் PDF கருவிகள். முற்றிலும் இலவசம், பதிவு தேவையில்லை.",
      uploadCta: "படத்தை பதிவேற்று",
      exploreCta: "கருவிகளை ஆராய்க"
    },
    nav: {
      brand: "PixelBoost AI",
      tools: "கருவிகள்",
      pdf: "PDF கருவிகள்"
    },
    tools: {
      enhancer: "AI பட மேம்படுத்தி",
      upscaler: "AI பட பெரிதாக்கி",
      bgRemover: "AI பின்னணி நீக்கி",
      restore: "AI பழைய புகைப்பட சீரமைப்பு",
      converter: "பட மாற்றி",
      compressor: "பட சுருக்கி",
      pdfToolkit: "PDF கருவிகள்",
      utility: "பயன்பாட்டு கருவிகள்"
    },
    footer: {
      copyright: "© 2026 PixelBoost AI. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை."
    },
    upload: {
      drag: "உங்கள் படத்தை இங்கே இழுத்து விடவும், அல்லது உலாவ கிளிக் செய்யவும்",
      processing: "AI மூலம் செயலாக்கப்படுகிறது...",
      download: "பதிவிறக்கு"
    }
  }
};

export type Dictionary = typeof dictionaries.en;
