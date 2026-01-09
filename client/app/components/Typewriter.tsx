"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  delay?: number;
}

export function Typewriter({ text, speed = 30, className, delay = 0 }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStarted(true);
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        const nextChar = text.charAt(i);
        i += 1;
        setDisplayedText((prev) => prev + nextChar);
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, started]);

  return (
    <span className={className}>
      {displayedText}
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="inline-block w-[0.5em] h-[1em] bg-primary align-middle ml-1"
      />
    </span>
  );
}
