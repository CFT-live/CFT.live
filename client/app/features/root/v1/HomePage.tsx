import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Terminal } from "lucide-react";

import { TerminalCard } from "@/app/features/root/v1/components/TerminalCard";
import { Typewriter } from "@/app/features/root/v1/components/Typewriter";
import { VideoPreview } from "@/app/features/root/v1/components/VideoPreview";
import { ConnectionStatusText } from "@/app/features/root/v1/components/ConnectionStatusText";
import { MaskedRevealImage } from "@/app/features/root/v1/components/MaskedRevealImage";

import { version } from "../../../../package.json";
import { ContributeSection } from "./components/ContributeSection";

const predictionVideo = "/assets/prediction.mp4";
const rouletteVideo = "/assets/roulette.mp4";
const lottoVideo = "/assets/lotto.mp4";
const asteroidVideo = "/assets/asteroid.mp4";

export default async function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CFT.live",
    url: "https://www.cft.live",
    description:
      "Open smart contract hub for safe Web3 interactions. Explore and interact with verified protocols on Arbitrum One.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.cft.live/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const t = await getTranslations("home");

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] -z-10" />

      <div className="container mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-20 space-y-8">
          <div className="relative group">
            <div className="absolute -inset-1" />
            <MaskedRevealImage
              baseSrc="/ascii_logo.png"
              revealSrc="/ascii_logo_2.png"
              alt="CFT.LIVE"
              width={600}
              height={150}
              placeholder="empty"
              className="w-full max-w-2xl mx-auto relative"
              priority
            />
          </div>

          <div className="max-w-2xl mx-auto space-y-4">
            <div className="h-24 md:h-16 flex items-center justify-center">
              <h1 className="sr-only">{t("title")}</h1>
              <h2 className="text-lg md:text-xl font-mono text-muted-foreground">
                <span className="text-primary mr-2">{">"}</span>
                <Typewriter text={t("intro")} speed={20} delay={500} />
              </h2>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="mb-20">
          <div className="mb-8 flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-primary font-mono">
              <span className="text-muted-foreground">{">"}</span> {t("Tools")}
            </h2>
            <div className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Sandbox */}
            <Link href="/sandbox" className="block h-full no-underline">
              <TerminalCard title="sandbox" status="online" className="h-full">
                <div className="relative aspect-video w-full overflow-hidden bg-black border-b border-border group-hover:border-primary/50 transition-colors">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.2)_0%,transparent_70%)] animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20 font-mono text-primary">
                    {"</>"}
                  </div>
                  <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent opacity-60 pointer-events-none" />
                  <div className="absolute bottom-3 right-3 pointer-events-none">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 text-xs font-mono rounded backdrop-blur-sm">
                      {t("LIVE")}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> {t("Sandbox")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("Sandbox_Description")}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground group-hover:text-primary transition-colors">
                    <span>{t("EXECUTE_PROTOCOL")}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </TerminalCard>
            </Link>
          </div>
        </div>

        {/* Protocols Section */}
        <div className="mb-20">
          <div className="mb-8 flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-primary font-mono">
              <span className="text-muted-foreground">{">"}</span> {t("Games")}
            </h2>
            <div className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Prediction Market */}
            <Link href="/prediction" className="block h-full no-underline">
              <TerminalCard
                title="prediction"
                status="online"
                className="h-full"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-black border-b border-border group-hover:border-primary/50 transition-colors">
                  <VideoPreview
                    src={predictionVideo}
                    className="mix-blend-screen opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent opacity-60 pointer-events-none" />
                  <div className="absolute bottom-3 right-3 pointer-events-none">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 text-xs font-mono rounded backdrop-blur-sm">
                      {t("LIVE")}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> {t("Prediction_Market")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("Prediction_Market_Description")}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground group-hover:text-primary transition-colors">
                    <span>{t("EXECUTE_PROTOCOL")}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </TerminalCard>
            </Link>

            {/* Hash Roulette */}
            <Link href="/roulette" className="block h-full no-underline">
              <TerminalCard title="roulette" status="online" className="h-full">
                <div className="relative aspect-video w-full overflow-hidden bg-black border-b border-border group-hover:border-primary/50 transition-colors">
                  <VideoPreview
                    src={rouletteVideo}
                    className="mix-blend-luminosity opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent opacity-60 pointer-events-none" />
                  <div className="absolute bottom-3 right-3 pointer-events-none">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 text-xs font-mono rounded backdrop-blur-sm">
                      {t("LIVE")}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> {t("Hash_Roulette")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("Hash_Roulette_Description")}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground group-hover:text-primary transition-colors">
                    <span>{t("EXECUTE_PROTOCOL")}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </TerminalCard>
            </Link>

            {/* Lotto Pool */}
            <Link href="/lotto" className="block h-full no-underline">
              <TerminalCard title="lotto" status="online" className="h-full">
                <div className="relative aspect-video w-full overflow-hidden bg-black border-b border-border group-hover:border-primary/50 transition-colors">
                  <VideoPreview
                    src={lottoVideo}
                    className="opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent opacity-60 pointer-events-none" />
                  <div className="absolute bottom-3 right-3 pointer-events-none">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 text-xs font-mono rounded backdrop-blur-sm">
                      {t("LIVE")}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> {t("Lotto_Pool")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("Lotto_Pool_Description")}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground group-hover:text-primary transition-colors">
                    <span>{t("EXECUTE_PROTOCOL")}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </TerminalCard>
            </Link>

            {/* Asteroid dash*/}
            <div className="block h-full">
              <TerminalCard
                title="Asteroid dash"
                status="offline"
                className="h-full"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-black border-b border-border group-hover:border-primary/50 transition-colors">
                  <VideoPreview
                    src={asteroidVideo}
                    className="opacity-80 group-hover:opacity-100 transition-opacity duration-500 mix-blend-luminosity"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent opacity-60 pointer-events-none" />
                  <div className="absolute bottom-3 right-3 pointer-events-none">
                    <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-1 text-xs font-mono rounded backdrop-blur-sm">
                      {t("COMING_SOON")}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> {t("Asteroid_Dash")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("Asteroid_Dash_Description")}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground group-hover:text-primary transition-colors">
                    <span>{t("EXECUTE_PROTOCOL")}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </TerminalCard>
            </div>
          </div>
        </div>

        {/* Contribution Section */}
        <div className="mb-20">
          <div className="mb-8 flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-primary font-mono">
              <span className="text-muted-foreground">{">"} </span>{" "}
              {t("Contribute")}
            </h2>
            <div className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
          </div>

          <ContributeSection />
        </div>

        <div className="mb-20">
          <div className="mb-8 flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-primary font-mono">
              <span className="text-muted-foreground">{">"}</span> {t("Redeem")}
            </h2>
            <div className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
          </div>

          <div className="glow-orange relative overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),transparent_65%)] p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_38%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <div className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
                  {t("Redeem_Status")}
                </div>
                <h3 className="font-mono text-2xl font-bold text-primary md:text-3xl">
                  {t("Redeem_Title")}
                </h3>
                <p className="text-sm leading-7 text-muted-foreground md:text-base">
                  {t("Redeem_Description")}
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  href="/redeem"
                  className="group inline-flex items-center justify-center gap-2 rounded border border-primary bg-primary px-8 py-4 font-mono text-sm font-bold tracking-wide text-primary-foreground transition-all duration-200 hover:bg-primary/90 glow-orange-strong"
                >
                  {t("Redeem_CTA")}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-16  mx-auto">
          <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <span className="text-yellow-500 text-lg">⚠</span>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wide">
                  {t("Legal_Disclaimer")}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("Legal_Disclaimer_Text")}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("Legal_Disclaimer_Text_2")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Status */}
        <div className="mt-12 border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />{" "}
              {t("SYSTEM_ONLINE")}
            </span>
            <span>v{version}</span>
          </div>
          <div className="mt-4 md:mt-0 hidden md:block">
            <ConnectionStatusText />
          </div>
        </div>
      </div>
    </div>
  );
}
