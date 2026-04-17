"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  src: string;
  className?: string;
  /** If true, video auto-plays when visible in viewport (default: true) */
  autoPlayOnVisible?: boolean;
}

export function VideoPreview({ src, className, autoPlayOnVisible = true }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection Observer — detect when card is in viewport
  useEffect(() => {
    if (!autoPlayOnVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.3 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [autoPlayOnVisible]);

  // Play/pause based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented
        });
      }
    } else {
      video.pause();
    }
  }, [isVisible]);

  const handleMouseEnter = useCallback(() => {
    if (videoRef.current && !isVisible) {
      videoRef.current.play().catch(() => {});
    }
  }, [isVisible]);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current && !isVisible) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isVisible]);

  return (
    <div 
        ref={containerRef}
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
