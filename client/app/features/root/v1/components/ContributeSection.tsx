import React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  AwardIcon,
  CodeIcon,
  CoinsIcon,
  FileTextIcon,
  Gamepad2Icon,
  LineChartIcon,
  MegaphoneIcon,
  MonitorIcon,
  PenToolIcon,
  SearchIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import { TokenPriceWidget } from "./TokenPriceWidget";

const earningFlow = [
  {
    step: "01",
    title: "Pick Tasks",
    description: "Browse live features and claim work that matches your skill set.",
    icon: SearchIcon,
  },
  {
    step: "02",
    title: "Earn CP",
    description: "Complete tasks and accumulate Contribution Points on each feature.",
    icon: AwardIcon,
  },
  {
    step: "03",
    title: "Receive CFT",
    description: "Your CP share determines how much of the feature reward you receive.",
    icon: CoinsIcon,
  },
  {
    step: "04",
    title: "Convert to USDC",
    description: "Cash out your CFT at the visible market price whenever you want.",
    icon: WalletIcon,
  },
];

const taskTypes = [
  { label: "Smart Contract Dev", icon: CodeIcon },
  { label: "Frontend Development", icon: MonitorIcon },
  { label: "UI / Design", icon: PenToolIcon },
  { label: "Marketing Campaigns", icon: MegaphoneIcon },
  { label: "Financial Modeling", icon: LineChartIcon },
  { label: "Documentation", icon: FileTextIcon },
  { label: "Security Reviews", icon: ShieldCheckIcon },
];

const valueLoop = [
  {
    title: "Users interact with CFT.live contracts",
    icon: Gamepad2Icon,
  },
  {
    title: "Platform generates revenue",
    icon: TrendingUpIcon,
  },
  {
    title: "Revenue feeds the CFT pool",
    icon: CoinsIcon,
  },
  {
    title: "Contributor rewards gain backing",
    icon: WalletIcon,
  },
];

const stats = [
  { value: "142+", label: "Contributors" },
  { value: "1,847", label: "Tasks Completed" },
  { value: "520K", label: "CFT Distributed" },
];

function CtaLink({
  className = "",
}: Readonly<{ className?: string }>) {
  return (
    <Link
      href="/contribute"
      className={[
        "group inline-flex items-center justify-center gap-2 rounded border border-primary bg-primary px-8 py-4",
        "font-mono text-sm font-bold tracking-wide text-primary-foreground transition-all duration-200",
        "hover:bg-primary/90 glow-orange-strong",
        className,
      ].join(" ")}
    >
      Contribute
      <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function IconChip({
  icon: Icon,
  className = "",
}: Readonly<{
  icon: LucideIcon;
  className?: string;
}>) {
  return (
    <div
      className={[
        "flex h-11 w-11 items-center justify-center rounded-lg border border-primary/40 bg-background/80 text-primary",
        "shadow-[0_0_20px_hsl(var(--primary)/0.08)]",
        className,
      ].join(" ")}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function IconTextCard({
  icon,
  text,
}: Readonly<{
  icon: LucideIcon;
  text: string;
}>) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/70 bg-card/50 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-card">
      <IconChip
        icon={icon}
        className="h-10 w-10 shrink-0 border-border/80 bg-black/40 group-hover:border-primary/40"
      />
      <p className="min-w-0 wrap-break-word text-sm font-medium leading-5 text-foreground">
        {text}
      </p>
    </div>
  );
}

export function ContributeSection() {
  return (
    <section className="flex w-full items-center justify-center bg-background">
      <div className="glow-orange relative mx-auto w-full max-w-8xl overflow-hidden rounded-lg border border-border bg-card/50 p-6 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_42%)]" />

        <div className="relative">
          {/* Terminal Header Bar */}
          <div className="mb-8 flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
              <span className="font-mono text-sm text-muted-foreground">
                ./CONTRIBUTE
              </span>
            </div>
          </div>

          {/* Hero Block */}
          <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)] lg:items-start">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.22em] text-primary">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span>Contributor Economy</span>
              </div>

              <div className="space-y-4">
                <h2 className="font-mono text-4xl font-bold text-primary text-glow-orange md:text-6xl">
                  $ CONTRIBUTE & EARN
                </h2>
                <p className="max-w-2xl text-base leading-7 text-foreground md:text-lg">
                  Help build the world&apos;s largest smart contract hub. Complete
                  tasks, earn CFT tokens, and convert them to USDC.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <CtaLink className="w-full sm:w-auto" />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-1">
              <div className="rounded-lg border border-primary/30 bg-black/30 p-4 backdrop-blur-sm">
                <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  What you can do
                </div>
                <div className="text-sm text-foreground">
                  Code, design, docs, growth, analytics, and security tasks.
                </div>
              </div>
              <div className="rounded-lg border border-primary/30 bg-black/30 p-4 backdrop-blur-sm">
                <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  How you earn
                </div>
                <div className="text-sm text-foreground">
                  Complete tasks, earn CP, receive CFT, convert to USDC.
                </div>
              </div>
              <div className="rounded-lg border border-primary/30 bg-black/30 p-4 backdrop-blur-sm">
                <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Why it has value
                </div>
                <div className="text-sm text-foreground">
                  Platform revenue feeds the token pool backing contributor rewards.
                </div>
              </div>
            </div>
          </div>

          <TokenPriceWidget />

          {/* Visual Earning Flow Diagram */}
          <div className="mb-8 rounded-2xl border border-border/60 bg-black/25 p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-mono text-xl font-bold text-primary md:text-2xl">
                  How you earn
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick work, build, receive CFT rewards, and cash out in USDC.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {earningFlow.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.step} className="relative h-full">
                    <div className="h-full rounded-xl border border-primary/20 bg-card/60 p-4 transition-colors duration-200 hover:border-primary/50 hover:bg-card">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <IconChip icon={Icon} />
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.step}
                        </span>
                      </div>
                      <h4 className="mb-2 font-mono text-base font-bold text-primary">
                        {item.title}
                      </h4>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flow CTA + Reward Snapshot */}
          <div className="mb-10 grid gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
            <div className="space-y-2">
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Reward snapshot
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">Example:</span>{" "}
                a feature pays <span className="font-mono text-primary">100 CFT</span>.
                If your completed tasks earn <span className="font-mono text-primary">60% CP</span>,
                you receive <span className="font-mono text-primary">60 CFT</span>{" "}
                <span className="text-foreground">≈ $13.80 USDC</span> at the current price.
              </p>
            </div>
            <CtaLink className="w-full md:w-auto" />
          </div>

          {/* Task Type Preview */}
          <div className="mb-10 rounded-2xl border border-border/60 bg-black/25 p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="font-mono text-xl font-bold text-primary md:text-2xl">
                  What kind of work is available
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contributors can jump in across product, protocol, growth, and research.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {taskTypes.map((task) => (
                <IconTextCard key={task.label} icon={task.icon} text={task.label} />
              ))}
            </div>
          </div>

          {/* Value Loop */}
          <div className="mb-10 rounded-2xl border border-border/60 bg-black/25 p-5 md:p-6">
            <div className="mb-5">
              <h3 className="font-mono text-xl font-bold text-primary md:text-2xl">
                Where the value comes from
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A transparent reward loop connects platform activity to contributor upside.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {valueLoop.map((item) => (
                <IconTextCard key={item.title} icon={item.icon} text={item.title} />
              ))}
            </div>

            <p className="mt-5 border-t border-border/50 pt-5 text-sm leading-6 text-muted-foreground">
              All revenue generated by CFT.live feeds the CFT token pool,
              increasing the value backing contributor rewards over time.
            </p>
          </div>

          {/* Social Proof */}
          <div className="mb-10 grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/60 bg-card/40 px-5 py-4 text-center"
              >
                <div className="font-mono text-3xl font-bold text-primary text-glow-orange">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Final CTA Block */}
          <div className="rounded-2xl border border-primary/30 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),transparent_60%)] px-5 py-8 text-center md:px-8">
            <div className="mx-auto max-w-2xl">
              <div className="mb-2 font-mono text-xs uppercase tracking-[0.22em] text-primary">
                Where to start
              </div>
              <h3 className="font-mono text-2xl font-bold text-primary md:text-3xl">
                Open the contribute board and implement a task.
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
                Open to developers, designers, marketers and more.
              </p>
              <div className="mt-6 flex justify-center">
                <CtaLink className="w-full sm:w-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
