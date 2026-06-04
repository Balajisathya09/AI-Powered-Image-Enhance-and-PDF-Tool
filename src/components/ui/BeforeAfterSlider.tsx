"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoveHorizontal } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  width?: string | number;
  height?: string | number;
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  width = "100%",
  height = "400px",
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const position = ((clientX - left) / width) * 100;
    setSliderPosition(Math.min(Math.max(position, 0), 100));
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const stopDragging = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", stopDragging);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", stopDragging);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stopDragging);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl select-none group border border-border bg-muted shadow-sm"
      style={{ width, height }}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* Before Image (Background) */}
      <div
        className="absolute inset-0 bg-contain bg-no-repeat bg-center"
        style={{ backgroundImage: `url(${beforeImage})` }}
      />
      
      {/* After Image (Clipped) */}
      <div
        className="absolute inset-0 bg-contain bg-no-repeat bg-center border-r-2 border-primary/80"
        style={{
          backgroundImage: `url(${afterImage})`,
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
        }}
      />
      
      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center -ml-0.5"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 bg-white text-primary rounded-full shadow-lg flex items-center justify-center transition-transform group-hover:scale-110">
          <MoveHorizontal className="w-5 h-5" />
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded backdrop-blur-md">
        Original
      </div>
      <div className="absolute top-4 right-4 bg-primary text-white text-xs font-medium px-2 py-1 rounded shadow-sm">
        Enhanced
      </div>
    </div>
  );
}
