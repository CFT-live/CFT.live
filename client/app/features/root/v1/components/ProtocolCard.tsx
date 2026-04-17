"use client";

import { ReactNode, useRef } from "react";
import { motion, useMotionValue, useSpring, SpringOptions } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMagicBento } from "./useMagicBento";
import "./MagicBento.css";

type ProtocolAccent =
  | "prediction"
  | "roulette"
  | "lotto"
  | "sandbox"
  | "approvals";

interface ProtocolCardProps {
  title: string;
  description: string;
  ctaLabel: string;
  accent: ProtocolAccent;
  liveLabel: string;
  icon?: ReactNode;
  /** Video or visual preview slot */
  children: ReactNode;
  /** Animation delay index */
  index?: number;
}

const springValues: SpringOptions = {
  damping: 30,
  stiffness: 100,
  mass: 2
};

export function ProtocolCard({
  title,
  description,
  ctaLabel,
  accent,
  liveLabel,
  icon,
  children,
  index = 0,
}: ProtocolCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);

  const { cardRef: magicCardRef, className: magicClassName, style: magicStyle } = useMagicBento({
    enableStars: true,
    enableSpotlight: true,
    enableBorderGlow: true,
    enableTilt: false, // ProtocolCard already has its own tilt logic
    enableMagnetism: false, // Disable to avoid conflict with existing tilt
    clickEffect: true,
    spotlightRadius: 250,
    particleCount: 8,
    particleSize: 4, // Thinner particles for ProtocolCard
    borderGlowWidth: 2, // Thinner border glow for ProtocolCard
    useAccentColor: true // Auto-detect accent color from CSS variable
  });

  function handleMouse(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -10;
    const rotationY = (offsetX / (rect.width / 2)) * 10;

    rotateX.set(rotationX);
    rotateY.set(rotationY);
  }

  function handleMouseEnter() {
    scale.set(1.03);
  }

  function handleMouseLeave() {
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <div 
      ref={ref}
      className="h-full"
      style={{ perspective: '800px' }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        ref={magicCardRef}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 + index * 0.08 }}
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d',
          ...magicStyle
        }}
        className={cn(
          "relative flex flex-col rounded-xl border bg-card/60 backdrop-blur-sm group h-full magic-particle-container",
          `protocol-accent-${accent}`,
          "protocol-card-accent-glow",
          magicClassName
        )}
      >
        {/* Video / Visual Preview Area */}
        <div className="relative aspect-video w-full overflow-hidden bg-black/80 rounded-t-xl">
          {children}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-transparent to-transparent opacity-70 pointer-events-none" />

          {/* LIVE Badge */}
          <div className="absolute top-3 right-3 pointer-events-none z-10">
            <span className="inline-flex items-center gap-1.5 bg-black/50 border border-[hsl(var(--protocol-accent)/0.4)] px-2.5 py-1 text-[10px] font-mono font-bold rounded-full backdrop-blur-sm text-[hsl(var(--protocol-accent))]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--protocol-accent))] live-dot" />
              {liveLabel}
            </span>
          </div>

          {/* Accent gradient tint */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--protocol-accent)/0.1),transparent_70%)] pointer-events-none" />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-5 gap-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold font-mono uppercase tracking-wide text-foreground mb-2 flex items-center gap-2 group-hover:text-[hsl(var(--protocol-accent))] transition-colors duration-300">
              {icon}
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-2">
            <span
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3 px-4",
                "rounded-lg border font-mono text-sm font-bold uppercase tracking-wider",
                "border-[hsl(var(--protocol-accent)/0.4)] bg-[hsl(var(--protocol-accent)/0.08)]",
                "text-[hsl(var(--protocol-accent))]",
                "group-hover:bg-[hsl(var(--protocol-accent)/0.15)] group-hover:border-[hsl(var(--protocol-accent)/0.6)]",
                "transition-all duration-300"
              )}
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
