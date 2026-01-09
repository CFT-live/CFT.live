"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TerminalCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  status?: "online" | "offline" | "maintenance";
}

export function TerminalCard({ title, children, className, status = "online" }: TerminalCardProps) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn("border border-border bg-card/50 backdrop-blur-sm text-card-foreground overflow-hidden group relative flex flex-col h-full", className)}
    >
      {/* Terminal Header */}
      <div className="bg-muted/80 px-3 py-2 border-b border-border flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full animate-pulse", 
            status === "online" ? "bg-green-500" : 
            status === "offline" ? "bg-red-500" : "bg-yellow-500"
          )} />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            ./{title}
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-sm" />
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-sm" />
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-sm" />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-0 flex-1 flex flex-col relative">
        {children}
        
        {/* Scanline overlay (subtle) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-20 pointer-events-none bg-[length:100%_2px,3px_100%] opacity-20" />
      </div>
    </motion.div>
  );
}
