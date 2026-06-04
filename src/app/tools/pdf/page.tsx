"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, FilePlus, SplitSquareHorizontal, FileDown, FileImage } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const pdfTools = [
  { id: "merge", name: "Merge PDF", icon: FilePlus, path: "/tools/pdf/merge" },
  { id: "split", name: "Split PDF", icon: SplitSquareHorizontal, path: "/tools/pdf/split" },
  { id: "compress", name: "Compress PDF", icon: FileDown, path: "/tools/pdf/compress" },
  { id: "to-image", name: "PDF to Image", icon: FileImage, path: "/tools/pdf/to-image" },
  { id: "image-to-pdf", name: "Image to PDF", icon: FileText, path: "/tools/pdf/image-to-pdf" },
];

export default function PdfToolkitPage() {
  const { t } = useLanguage();

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            {t.tools.pdfToolkit}
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete set of tools to merge, split, compress, and convert PDF files.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pdfTools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link href={tool.path} className="block h-full outline-none">
                <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 bg-background/50 backdrop-blur-sm cursor-pointer p-2">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg font-semibold">{tool.name}</CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  );
}
