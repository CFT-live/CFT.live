import { useRef, useEffect, useCallback, useState } from 'react';
import { gsap } from 'gsap';

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '132, 0, 255';
const MOBILE_BREAKPOINT = 768;

/**
 * Convert HSL color string to RGB format for use in rgba()
 * @param hsl HSL string like "190 95% 55%" (without hsl() wrapper)
 * @returns RGB string like "0, 255, 200" (without rgb() wrapper)
 */
function hslToRgb(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length !== 3) return DEFAULT_GLOW_COLOR;

  const h = Number.parseFloat(parts[0]) / 360;
  const s = Number.parseFloat(parts[1]) / 100;
  const l = Number.parseFloat(parts[2]) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
}

/**
 * Extract accent color from CSS variable and convert to RGB
 * @param element The element to extract the accent color from
 * @returns RGB string like "0, 255, 200"
 */
function getAccentColorAsRgb(element: HTMLElement | null): string {
  if (!element) return DEFAULT_GLOW_COLOR;

  const accentColor = getComputedStyle(element).getPropertyValue('--protocol-accent').trim();
  if (!accentColor) return DEFAULT_GLOW_COLOR;

  return hslToRgb(accentColor);
}

interface MagicBentoOptions {
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  particleSize?: number; // Size of particles in pixels
  borderGlowWidth?: number; // Width of border glow in pixels
  glowColor?: string;
  useAccentColor?: boolean; // Auto-detect and use CSS --protocol-accent variable
}

const createParticleElement = (x: number, y: number, color: string = DEFAULT_GLOW_COLOR, size: number = 6): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'magic-particle';
  const glowSize = size * 1.5;
  el.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 ${glowSize}px rgba(${color}, 0.8), 0 0 ${size * 0.7}px rgba(${color}, 1);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const updateCardGlowProperties = (
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  glow: number,
  radius: number
) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

export function useMagicBento({
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  enableTilt = false,
  enableMagnetism = true,
  clickEffect = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  particleSize = 6,
  borderGlowWidth = 6,
  glowColor = DEFAULT_GLOW_COLOR,
  useAccentColor = false,
}: MagicBentoOptions = {}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);
  const colorInitialized = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const [resolvedGlowColor, setResolvedGlowColor] = useState(glowColor);

  // Detect accent color from CSS variable if requested
  // Use a callback ref to ensure we detect the color after the element is mounted and styled
  const setCardRef = useCallback((node: HTMLDivElement | null) => {
    cardRef.current = node;
    
    // Only initialize color once
    if (useAccentColor && node && !colorInitialized.current) {
      colorInitialized.current = true;
      // Use requestAnimationFrame to ensure CSS is computed
      requestAnimationFrame(() => {
        if (cardRef.current) {
          const accentRgb = getAccentColorAsRgb(cardRef.current);
          setResolvedGlowColor(accentRgb);
          // Reset particles when color changes
          particlesInitialized.current = false;
          memoizedParticles.current = [];
        }
      });
    }
  }, [useAccentColor]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const shouldDisableAnimations = disableAnimations || isMobile;

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, resolvedGlowColor, particleSize)
    );
    particlesInitialized.current = true;
  }, [particleCount, resolvedGlowColor, particleSize]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();

    particlesRef.current.forEach(particle => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          particle.remove();
        }
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true) as HTMLDivElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: 'none',
          repeat: -1,
          yoyo: true
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true
        });
      }, index * 100);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (shouldDisableAnimations || !cardRef.current) return;

    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      if (enableStars) {
        animateParticles();
      }

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: 'power2.out',
          transformPerspective: 1000
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      if (enableStars) {
        clearAllParticles();
      }

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }

      if (enableMagnetism) {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism && !enableSpotlight) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: 'power2.out',
          transformPerspective: 1000
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.05;
        const magnetY = (y - centerY) * 0.05;

        magnetismAnimationRef.current = gsap.to(element, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: 'power2.out'
        });
      }

      if (enableSpotlight && enableBorderGlow) {
        updateCardGlowProperties(element, e.clientX, e.clientY, 1, spotlightRadius);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${resolvedGlowColor}, 0.4) 0%, rgba(${resolvedGlowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;

      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        {
          scale: 0,
          opacity: 1
        },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => ripple.remove()
        }
      );
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      clearAllParticles();
    };
  }, [
    animateParticles,
    clearAllParticles,
    shouldDisableAnimations,
    enableTilt,
    enableMagnetism,
    clickEffect,
    resolvedGlowColor,
    enableStars,
    enableSpotlight,
    enableBorderGlow,
    spotlightRadius
  ]);

  return {
    cardRef: setCardRef,
    className: enableBorderGlow ? 'magic-bento-card--border-glow' : '',
    style: {
      '--glow-x': '50%',
      '--glow-y': '50%',
      '--glow-intensity': '0',
      '--glow-radius': `${spotlightRadius}px`,
      '--glow-color': resolvedGlowColor,
      '--border-glow-width': `${borderGlowWidth}px`
    } as React.CSSProperties
  };
}
