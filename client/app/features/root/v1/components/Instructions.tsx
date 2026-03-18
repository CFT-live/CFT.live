"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstructionsProps {
  instructions: string[];
  title?: string;
  className?: string;
  toggleOpenLabel?: string;
  toggleCloseLabel?: string;
  footerLeftLabel?: string;
  footerRightLabel?: string;
}

export const Instructions = ({ 
  instructions, 
  title = "MANUAL.TXT", 
  className,
  toggleOpenLabel = "READ_FILE",
  toggleCloseLabel = "CLOSE_FILE",
  footerLeftLabel = "END_OF_FILE",
  footerRightLabel,
}: InstructionsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("w-full max-w-3xl mx-auto my-4 sm:my-8", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full group flex items-center justify-between bg-card/50 border border-border hover:border-primary/50 px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-200 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
          <span className="font-mono text-xs sm:text-sm text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wider truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground/50 group-hover:text-primary/50 uppercase hidden sm:inline-block">
            {isOpen ? toggleCloseLabel : toggleOpenLabel}
            </span>
            <ChevronDown 
                className={cn(
                "w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-primary transition-transform duration-200",
                isOpen && "rotate-180"
                )} 
            />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-x border-b border-border bg-black/40 backdrop-blur-md"
          >
            <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 font-mono text-xs sm:text-sm text-muted-foreground">
              {instructions.map((instruction, index) => (
                <div key={instruction} className="flex gap-2 sm:gap-4 group/item">
                  <span className="text-primary/40 select-none group-hover/item:text-primary transition-colors shrink-0">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <p className="leading-relaxed text-left">
                    {instruction}
                  </p>
                </div>
              ))}
              <div className="pt-3 sm:pt-4 mt-4 sm:mt-6 border-t border-border/30 flex justify-between items-center text-[10px] sm:text-xs text-primary/30 select-none">
                <span>{footerLeftLabel}</span>
                <span>{footerRightLabel ?? `${instructions.length} LINES`}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
