"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  src: string;
  className?: string;
}

export function VideoPreview({ src, className }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented
        });
      }
    } else if (!isMobile && videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    }
  }, [isMobile]);

  const handleMouseEnter = () => {
    if (!isMobile && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div 
        className="absolute inset-0 w-full h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
    >
        <video
          ref={videoRef}
          src={src}
          loop
          muted
          playsInline
          className={cn("w-full h-full object-cover", className)}
        />
    </div>
  );
}
