"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import TiltedCard from "./TiltedCard";
import { useMagicBento } from "./useMagicBento";
import "./MagicBento.css";

interface HeroProtocolShowcaseProps {
  videoSrc: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  liveLabel: string;
}

export function HeroProtocolShowcase({
  videoSrc,
  title,
  description,
  href,
  ctaLabel,
  liveLabel,
}: HeroProtocolShowcaseProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { cardRef, className: magicClassName, style: magicStyle } = useMagicBento({
    enableStars: true,
    enableSpotlight: true,
    enableBorderGlow: true,
    enableTilt: false, // TiltedCard already handles tilt
    enableMagnetism: false, // Disable to avoid conflict with TiltedCard
    clickEffect: true,
    spotlightRadius: 400,
    particleCount: 16,
    glowColor: "255, 117, 0", // Orange color matching protocol-card-glow (HSL 23 100% 50%)
    useAccentColor: false
  });

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <Link href={href} className="block no-underline group" id="hero-protocol">
      <TiltedCard
        containerHeight="340px"
        containerWidth="100%"
        imageHeight="340px"
        imageWidth="100%"
        rotateAmplitude={2}
        scaleOnHover={1.02}
        showMobileWarning={false}
        showTooltip={false}
        displayOverlayContent={false}
      >
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`relative w-full h-full overflow-hidden rounded-2xl border border-primary/30 protocol-card-glow magic-particle-container ${magicClassName}`}
          style={magicStyle}
        >
          {/* Video Background */}
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              src={videoSrc}
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700 scale-105 group-hover:scale-100 transition-transform"
            />
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-10" style={{ minHeight: "340px" }}>
            {/* LIVE Badge */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6">
              <span className="inline-flex items-center gap-2 bg-primary/15 text-primary border border-primary/30 px-3 py-1.5 text-xs font-mono rounded-full backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-primary live-dot" />
                {liveLabel}
              </span>
            </div>

            <div className="max-w-2xl space-y-4">
              {/* Eyebrow */}
              <span className="inline-block text-xs font-mono uppercase tracking-[0.2em] text-primary/80">
                {">"} Featured Protocol
              </span>

              {/* Title */}
              <h2 className="text-3xl md:text-5xl font-bold font-mono text-foreground uppercase tracking-wide leading-tight">
                {title}
              </h2>

              {/* Description */}
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg">
                {description}
              </p>

              {/* CTA */}
              <div className="pt-2">
                <span className="protocol-cta inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 font-mono text-sm md:text-base font-bold uppercase tracking-wider rounded-lg group-hover:bg-primary/90 transition-colors">
                  {ctaLabel}
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </div>
            </div>
          </div>

          {/* Shimmer overlay */}
          <div className="card-shimmer absolute inset-0 pointer-events-none" />
        </motion.div>
      </TiltedCard>
    </Link>
  );
}
