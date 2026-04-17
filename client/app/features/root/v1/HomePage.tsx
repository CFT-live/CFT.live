import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Terminal, Target, Ticket, Code, Shield } from "lucide-react";

import { Typewriter } from "@/app/features/root/v1/components/Typewriter";
import { VideoPreview } from "@/app/features/root/v1/components/VideoPreview";
import { ConnectionStatusText } from "@/app/features/root/v1/components/ConnectionStatusText";
import { MaskedRevealImage } from "@/app/features/root/v1/components/MaskedRevealImage";
import { AddCftToWallet } from "@/app/features/root/v1/components/AddCftToWallet";
import { CftTokenSection } from "@/app/features/root/v1/components/CftTokenSection";
import { HeroProtocolShowcase } from "@/app/features/root/v1/components/HeroProtocolShowcase";
import { ProtocolCard } from "@/app/features/root/v1/components/ProtocolCard";
import { fetchTokenLogoMap } from "@/app/features/approval-manager/v1/api/actions";

import { version } from "../../../../package.json";

const ARB_TOKEN_ADDRESS = "0x912ce59144191c1204e64559fe8253a0e49e6548";

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

  const [t, tokenLogos] = await Promise.all([
    getTranslations("home"),
    fetchTokenLogoMap(),
  ]);
  const arbLogoUrl = tokenLogos[ARB_TOKEN_ADDRESS];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] -z-10" />

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* ═══════════════════════════════════════════════════════════════
            HERO SECTION — Compact logo + Featured Protocol
            ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col items-center text-center mb-8 space-y-4">
          <div className="relative group">
            <MaskedRevealImage
              baseSrc="/ascii_logo.png"
              revealSrc="/ascii_logo_2.png"
              alt="CFT.LIVE"
              width={600}
              height={150}
              placeholder="empty"
              className="w-full max-w-md mx-auto relative"
              priority
            />
          </div>

          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-center">
              <h1 className="sr-only">{t("title")}</h1>
              <h2 className="text-sm md:text-base font-mono text-muted-foreground">
                <span className="text-primary mr-2">{">"}</span>
                <Typewriter text={t("intro")} speed={15} delay={300} />
              </h2>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            FEATURED PROTOCOL — Full-width hero showcase
            ═══════════════════════════════════════════════════════════════ */}
        <div className="mb-10 mt-6">
          <HeroProtocolShowcase
            videoSrc={predictionVideo}
            title={t("Prediction_Market")}
            description={t("Prediction_Market_Description")}
            href="/prediction"
            ctaLabel={t("Featured_CTA")}
            liveLabel={t("LIVE")}
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PROTOCOL GRID — All live protocols with unique accents
            ═══════════════════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-primary font-mono">
              <span className="text-muted-foreground">{">"}</span> {t("Games")}
            </h2>
            <div className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
            {/* Hash Roulette */}
            <Link href="/roulette" className="block h-full no-underline">
              <ProtocolCard
                title={t("Hash_Roulette")}
                description={t("Hash_Roulette_Description")}
                ctaLabel={t("Enter_Roulette")}
                accent="roulette"
                liveLabel={t("LIVE")}
                icon={<Target className="w-4 h-4" />}
                index={0}
              >
                <VideoPreview
                  src={rouletteVideo}
                  className="opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                />
              </ProtocolCard>
            </Link>

            {/* Lotto Pool */}
            <Link href="/lotto" className="block h-full no-underline">
              <ProtocolCard
                title={t("Lotto_Pool")}
                description={t("Lotto_Pool_Description")}
                ctaLabel={t("Enter_Lotto")}
                accent="lotto"
                liveLabel={t("LIVE")}
                icon={<Ticket className="w-4 h-4" />}
                index={1}
              >
                <VideoPreview
                  src={lottoVideo}
                  className="opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                />
              </ProtocolCard>
            </Link>

            {/* Sandbox */}
            <Link href="/sandbox" className="block h-full no-underline">
              <ProtocolCard
                title={t("Sandbox")}
                description={t("Sandbox_Description")}
                ctaLabel={t("Enter_Sandbox")}
                accent="sandbox"
                liveLabel={t("LIVE")}
                icon={<Code className="w-4 h-4" />}
                index={2}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(270_70%_65%/0.15)_0%,transparent_70%)] animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-15 font-mono text-[hsl(270_70%_65%)]">
                  {"</>"}
                </div>
              </ProtocolCard>
            </Link>

            {/* Approval Manager */}
            <Link href="/approval-manager" className="block h-full no-underline">
              <ProtocolCard
                title={t("Revoke_Approvals")}
                description={t("Revoke_Approvals_Description")}
                ctaLabel={t("Enter_Approvals")}
                accent="approvals"
                liveLabel={t("LIVE")}
                icon={<Shield className="w-4 h-4" />}
                index={3}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(155_75%_50%/0.08)_0%,transparent_70%)]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 font-mono text-xs select-none pointer-events-none">
                  <span className="text-muted-foreground/40">{"// ERC-20 APPROVAL AUDIT"}</span>
                  <span className="text-[hsl(155_75%_50%/0.5)]">{">"} scanning approvals...</span>
                  <span className="text-destructive/70">{">"} <span className="text-orange-400/70">42 HIGH RISK</span> found</span>
                  <span className="text-[hsl(155_75%_50%/0.6)]">{">"} approve(spender, <span className="text-green-500/70">0</span>)</span>
                  <span className="text-[hsl(155_75%_50%)] animate-pulse">{">"} ✓ revoked</span>
                </div>
              </ProtocolCard>
            </Link>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            COMING SOON — Asteroid Dash teaser (compact)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="relative overflow-hidden rounded-xl border border-yellow-500/20 bg-card/30 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative w-full md:w-48 aspect-video md:aspect-square rounded-lg overflow-hidden bg-black/50 shrink-0">
                <VideoPreview
                  src={asteroidVideo}
                  className="opacity-60 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 text-[10px] font-mono rounded-full">
                    {t("COMING_SOON")}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground/80 font-mono flex items-center gap-2 mb-1">
                  <Terminal className="w-4 h-4 text-yellow-500/60" />
                  {t("Asteroid_Dash")}
                </h3>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">
                  {t("Asteroid_Dash_Description")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            ECOSYSTEM SECTION — Contribute + CFT Token + Redeem (compact)
            ═══════════════════════════════════════════════════════════════ */}
        <div className="mb-16 space-y-6">
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-primary font-mono">
              <span className="text-muted-foreground">{">"}</span> Ecosystem
            </h2>
            <div className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
          </div>

          {/* Contribute + Redeem row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Contribute */}
            <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card/30 p-5 md:p-6">
              <div className="space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/70">
                  {t("Contribute_Status")}
                </div>
                <h3 className="font-mono text-lg font-bold text-foreground md:text-xl">
                  {t("Contribute_Title")}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  {t("Contribute_Intro")}
                </p>
                <Link
                  href="/contribute"
                  className="group inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-5 py-2.5 font-mono text-xs font-bold tracking-wide text-primary transition-all duration-200 hover:bg-primary/20 hover:border-primary/60 no-underline"
                >
                  {t("Contribute_CTA")}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Redeem */}
            <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card/30 p-5 md:p-6">
              <div className="space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/70">
                  {t("Redeem_Status")}
                </div>
                <h3 className="font-mono text-lg font-bold text-foreground md:text-xl">
                  {t("Redeem_Title")}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  {t("Redeem_Description")}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/redeem"
                    className="group inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-5 py-2.5 font-mono text-xs font-bold tracking-wide text-primary transition-all duration-200 hover:bg-primary/20 hover:border-primary/60 no-underline"
                  >
                    {t("Redeem_CTA")}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <AddCftToWallet
                    copy={{
                      title: t("Wallet_Asset_Title"),
                      description: t("Wallet_Asset_Description"),
                      actionLabel: t("Wallet_Add_CTA"),
                      pendingLabel: t("Wallet_Add_Pending"),
                      successLabel: t("Wallet_Add_Success"),
                      unsupportedLabel: t("Wallet_Add_Unsupported"),
                      rejectedLabel: t("Wallet_Add_Rejected"),
                      switchNetworkLabel: t("Wallet_Switch_Network"),
                      copyAddressLabel: t("Wallet_Copy_Address"),
                      copiedLabel: t("Wallet_Copied"),
                      viewContractLabel: t("Wallet_View_Contract"),
                      configMissingLabel: t("Wallet_Config_Missing"),
                      connectLabel: t("Connect_Wallet"),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CFT Token Section */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg md:text-xl font-bold text-primary/80 font-mono">
                <span className="text-muted-foreground">{">"}</span> {t("CFT_Token")}
              </h2>
              <div className="h-px flex-1 bg-linear-to-r from-border/50 to-transparent" />
            </div>
            <CftTokenSection />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            LEGAL DISCLAIMER
            ═══════════════════════════════════════════════════════════════ */}
        <div className="mb-12 mx-auto">
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

        {/* ═══════════════════════════════════════════════════════════════
            FOOTER STATUS
            ═══════════════════════════════════════════════════════════════ */}
        <div className="border-t border-border pt-8 pb-16 flex flex-col md:flex-row justify-between items-center text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />{" "}
              {t("SYSTEM_ONLINE")}
            </span>
            <span className="text-muted-foreground/60">|</span>
            <a
              href="https://arbitrum.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              {arbLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={arbLogoUrl}
                  alt="Arbitrum One"
                  className="w-4 h-4 rounded-full shrink-0"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-mono font-bold text-primary shrink-0">
                  AR
                </div>
              )}
              Powered by Arbitrum One
            </a>
            <span className="text-muted-foreground/60">|</span>
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
