import { Terminal } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute -inset-1 bg-primary/20 rounded-full blur opacity-75 animate-pulse" />
          <div className="relative bg-background border border-primary/50 p-4 rounded-full">
            <Terminal className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-1 text-primary font-mono text-sm tracking-widest">
          <span>INITIALIZING</span>
          <span className="animate-[bounce_1s_infinite_0ms]">.</span>
          <span className="animate-[bounce_1s_infinite_200ms]">.</span>
          <span className="animate-[bounce_1s_infinite_400ms]">.</span>
        </div>
      </div>
    </div>
  );
}
