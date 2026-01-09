"use client";

import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type MaskedRevealImageProps = {
  baseSrc: string;
  revealSrc: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  placeholder?: "empty" | "blur";
};

export function MaskedRevealImage({
  baseSrc,
  revealSrc,
  alt,
  width,
  height,
  className,
  imageClassName,
  priority,
  placeholder = "empty",
}: Readonly<MaskedRevealImageProps>) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const [isHovering, setIsHovering] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const updatePointerVars = React.useCallback((event: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    el.style.setProperty("--reveal-x", `${x}px`);
    el.style.setProperty("--reveal-y", `${y}px`);
  }, []);

  const setRevealPosition = React.useCallback((x: number, y: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty("--reveal-x", `${x}px`);
    el.style.setProperty("--reveal-y", `${y}px`);
  }, []);

  const pickRandomPoint = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0, ok: false as const };

    const rect = el.getBoundingClientRect();
    const padding = Math.min(rect.width, rect.height) * 0.15;

    const x = padding + Math.random() * Math.max(1, rect.width - padding * 2);
    const y = padding + Math.random() * Math.max(1, rect.height - padding * 2);
    return { x, y, ok: true as const };
  }, []);

  const easeInOutQuad = React.useCallback((t: number) => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }, []);

  const isIdleSpotlight = !isHovering && !isPressed;
  const isRevealing = isHovering || isPressed || isIdleSpotlight;

  React.useEffect(() => {
    if (!isIdleSpotlight) return;

    const el = containerRef.current;
    if (!el) return;

    let rafId = 0;
    let segmentStart = performance.now();
    let segmentDuration = 1000 + Math.random() * 500;

    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const parseVar = (val: string, size: number) => {
      const v = val.trim();
      if (v.endsWith("%")) {
        const p = Number.parseFloat(v);
        return size * (Number.isNaN(p) ? 0.5 : p / 100);
      }
      const p = Number.parseFloat(v);
      return Number.isNaN(p) ? size * 0.5 : p;
    };
    let fromX = parseVar(style.getPropertyValue("--reveal-x"), rect.width);
    let fromY = parseVar(style.getPropertyValue("--reveal-y"), rect.height);
    const firstTarget = pickRandomPoint();
    let toX = firstTarget.ok ? firstTarget.x : fromX;
    let toY = firstTarget.ok ? firstTarget.y : fromY;

    const step = (now: number) => {
      if (!containerRef.current) return;
      if (!isIdleSpotlight) return;

      const rawT = (now - segmentStart) / segmentDuration;
      const t = Math.min(1, Math.max(0, rawT));
      const eased = easeInOutQuad(t);

      const x = fromX + (toX - fromX) * eased;
      const y = fromY + (toY - fromY) * eased;
      setRevealPosition(x, y);

      if (t >= 1) {
        fromX = toX;
        fromY = toY;
        const nextTarget = pickRandomPoint();
        if (nextTarget.ok) {
          toX = nextTarget.x;
          toY = nextTarget.y;
        }
        segmentStart = now;
        segmentDuration = 900 + Math.random() * 900;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [easeInOutQuad, isIdleSpotlight, pickRandomPoint, setRevealPosition]);

  const onPointerEnter = React.useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      setIsHovering(true);
      updatePointerVars(event);
    },
    [updatePointerVars]
  );

  const onPointerLeave = React.useCallback((event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    setIsHovering(false);
  }, []);

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === "mouse" || isPressed) {
        updatePointerVars(event);
      }
    },
    [isPressed, updatePointerVars]
  );

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent) => {
      setIsPressed(true);
      updatePointerVars(event);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [updatePointerVars]
  );

  const onPointerUp = React.useCallback((event: React.PointerEvent) => {
    setIsPressed(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }, []);

  const onPointerCancel = React.useCallback(() => {
    setIsPressed(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", className)}
      style={
        {
          "--reveal-x": "50%",
          "--reveal-y": "50%",
          "--reveal-radius": isRevealing ? "100px" : "0px",
          touchAction: "none",
        } as React.CSSProperties
      }
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <Image
        src={baseSrc}
        alt={alt}
        width={width}
        height={height}
        placeholder={placeholder}
        className={cn("block w-full h-auto select-none", imageClassName)}
        priority={priority}
        draggable={false}
      />

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-150",
          isRevealing ? "opacity-100" : "opacity-0"
        )}
      >
        <Image
          src={revealSrc}
          alt={alt}
          width={width}
          height={height}
          placeholder={placeholder}
          className={cn("block w-full h-auto select-none", imageClassName)}
          draggable={false}
          style={
            {
              WebkitMaskImage:
                "radial-gradient(circle var(--reveal-radius) at var(--reveal-x) var(--reveal-y), rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0) 95%)",
              maskImage:
                "radial-gradient(circle var(--reveal-radius) at var(--reveal-x) var(--reveal-y), rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0) 95%)",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}
