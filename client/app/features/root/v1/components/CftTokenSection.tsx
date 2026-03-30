import { getTranslations } from "next-intl/server";
import { ExternalLink, Coins, BarChart3, Users, ArrowDown } from "lucide-react";
import { isAddress } from "viem";

import { TokenPriceWidget } from "@/app/features/root/v1/components/TokenPriceWidget";
import {
  CFT_TOKEN_ADDRESS,
  CFT_REDEMPTION_POOL_ADDRESS,
  CONTRIBUTOR_DISTRIBUTOR_ADDRESS,
} from "@/app/lib/contracts";

const ARBISCAN_BASE = "https://arbiscan.io";

type ContractInfo = {
  label: string;
  address: string;
  icon: React.ReactNode;
};

function ContractBadge({ contract, viewLabel }: Readonly<{ contract: ContractInfo; viewLabel: string }>) {
  const valid = isAddress(contract.address);
  const url = valid ? `${ARBISCAN_BASE}/address/${contract.address}` : null;

  if (!valid || !url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1.5 rounded border border-border/50 bg-muted/20 px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
    >
      <span className="text-primary">{contract.icon}</span>
      <span>{contract.label}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className="group-hover:text-primary transition-colors">{viewLabel}</span>
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

type StepProps = {
  number: number;
  title: string;
  description: string;
  contracts: ContractInfo[];
  viewLabel: string;
  showArrow?: boolean;
};

function FlowStep({ number, title, description, contracts, viewLabel, showArrow = true }: Readonly<StepProps>) {
  return (
    <>
      <div className="rounded-lg border border-border/40 bg-card/30 p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-xs font-bold text-primary">
            {number}
          </span>
          <div className="space-y-2">
            <h4 className="font-mono text-sm font-bold text-primary">{title}</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {contracts.map((c) => (
                <ContractBadge key={c.label} contract={c} viewLabel={viewLabel} />
              ))}
            </div>
          </div>
        </div>
      </div>
      {showArrow && (
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-primary/40" />
        </div>
      )}
    </>
  );
}

export async function CftTokenSection() {
  const t = await getTranslations("home");
  const viewLabel = t("CFT_View_Contract");

  const cftToken: ContractInfo = {
    label: t("CFT_Contract_Title"),
    address: CFT_TOKEN_ADDRESS,
    icon: <Coins className="w-3.5 h-3.5" />,
  };

  const distributor: ContractInfo = {
    label: t("CFT_Distributor_Title"),
    address: CONTRIBUTOR_DISTRIBUTOR_ADDRESS,
    icon: <Users className="w-3.5 h-3.5" />,
  };

  const pool: ContractInfo = {
    label: t("CFT_Pool_Title"),
    address: CFT_REDEMPTION_POOL_ADDRESS,
    icon: <BarChart3 className="w-3.5 h-3.5" />,
  };

  return (
    <div className="glow-orange relative overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),transparent_65%)] p-6 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_38%)]" />

      <div className="relative space-y-6">
        {/* Live Price */}
        <TokenPriceWidget />

        {/* Token Economics */}
        <div className="space-y-4">
          <div className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            {t("CFT_Value_Label")}
          </div>
          <h3 className="font-mono text-2xl font-bold text-primary md:text-3xl">
            {t("CFT_Value_Title")}
          </h3>
        </div>

        {/* Step-by-step flow */}
        <div className="space-y-0">
          <FlowStep
            number={1}
            title={t("CFT_Step1_Title")}
            description={t("CFT_Step1_Description")}
            contracts={[cftToken, distributor]}
            viewLabel={viewLabel}
          />
          <FlowStep
            number={2}
            title={t("CFT_Step2_Title")}
            description={t("CFT_Step2_Description")}
            contracts={[pool]}
            viewLabel={viewLabel}
          />
          <FlowStep
            number={3}
            title={t("CFT_Step3_Title")}
            description={t("CFT_Step3_Description")}
            contracts={[]}
            viewLabel={viewLabel}
            showArrow={false}
          />
        </div>

        {/* Formula */}
        <div className="rounded border border-primary/20 bg-primary/5 px-4 py-3 font-mono text-sm text-center text-primary">
          {t("CFT_Formula")}
        </div>

        <p className="text-sm leading-7 text-muted-foreground md:text-base">
          {t("CFT_Value_Description")}
        </p>
      </div>
    </div>
  );
}
