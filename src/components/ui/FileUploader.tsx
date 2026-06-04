"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number; // in bytes
  isProcessing?: boolean;
}

export function FileUploader({ 
  onFileSelect, 
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.avif', '.heic']
  },
  maxSize = 20 * 1024 * 1024, // 20MB
  isProcessing = false
}: FileUploaderProps) {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: isProcessing
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        {...getRootProps()}
        className={`relative flex flex-col items-center justify-center w-full min-h-[300px] border-2 border-dashed rounded-2xl transition-all duration-300 ease-in-out cursor-pointer overflow-hidden
          ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
          ${isProcessing ? 'pointer-events-none opacity-80' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div 
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-primary"
            >
              <Loader2 className="w-12 h-12 mb-4 animate-spin" />
              <p className="text-lg font-medium">{t.upload.processing}</p>
            </motion.div>
          ) : selectedFile ? (
            <motion.div 
              key="selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center p-6"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                <FileIcon className="w-8 h-8" />
              </div>
              <p className="font-semibold text-foreground truncate max-w-xs">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-6 z-10 relative" 
                onClick={removeFile}
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center p-6"
            >
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-xl font-medium text-foreground mb-2">
                {t.upload.drag}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports JPG, PNG, WEBP, HEIC up to 20MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
