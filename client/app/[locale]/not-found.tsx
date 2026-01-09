import { Link } from "@/i18n/routing";
import { Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute -inset-1 bg-primary/20 rounded-full blur opacity-75 animate-pulse" />
            <div className="relative bg-background border border-primary/50 p-4 rounded-full">
              <Terminal className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold font-mono text-primary tracking-wider">
            404_ERROR
          </h1>
          <p className="text-muted-foreground font-mono">
            The requested resource could not be found in the decentralized network.
          </p>
        </div>

        <div className="pt-4">
          <Link 
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-primary/50 text-primary hover:bg-primary/10 font-mono text-sm rounded transition-colors duration-200 group"
          >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">{"<"}</span>
            RETURN_TO_BASE
          </Link>
        </div>
      </div>
    </div>
  );
}
