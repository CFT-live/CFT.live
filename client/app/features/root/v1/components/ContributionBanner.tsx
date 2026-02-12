import { Link } from "@/i18n/routing";
import { ArrowRight, Search, UserCheck, Award, Coins } from "lucide-react";

interface ContributionBannerProps {
  readonly title: string;
  readonly intro: string;
  readonly cta: string;
  readonly steps: readonly { readonly title: string; readonly desc: string }[];
}

const stepIcons = [Search, UserCheck, Award, Coins];

export function ContributionBanner({
  title,
  intro,
  cta,
  steps,
}: ContributionBannerProps) {
  return (
    <div className="border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Terminal Header */}
      <div className="bg-muted/80 px-3 py-2 border-b border-border flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            ./contribute
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-sm" />
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-sm" />
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-sm" />
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left: Intro + CTA */}
          <div className="p-6 md:p-8 flex flex-col justify-between gap-6 md:border-r border-b md:border-b-0 border-border">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-primary font-mono flex items-center gap-2">
                <span className="text-muted-foreground">$</span> {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {intro}
              </p>
            </div>

            <Link
              href="/contribute"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-primary/50 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider hover:bg-primary/20 hover:border-primary transition-all duration-300 w-fit group/cta"
            >
              <span>{cta}</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover/cta:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Right: Steps */}
          <div className="p-6 md:p-8">
            <div className="space-y-4">
              {steps.map((step, i) => {
                const Icon = stepIcons[i];
                return (
                  <div key={step.title} className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-7 h-7 border border-primary/30 bg-primary/5 text-primary shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-mono font-medium text-primary">
                        {step.title}
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-20 pointer-events-none bg-size-[100%_2px,3px_100%] opacity-20" />
      </div>
    </div>
  );
}
