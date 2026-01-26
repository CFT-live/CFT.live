"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "@/i18n/routing";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string | string[];
}

const faqSections: { title: string; items: FAQItem[] }[] = [
  {
    title: "Getting Started",
    items: [
      {
        question: "What is this CFT.LIVE?",
        answer:
          "CFT.LIVE is a decentralized platform for safely exploring and interacting with verified Web3 smart contracts. It leverages blockchain technology (Arbitrum One) to ensure transparency, security, and fairness in all interactions.",
      },
      {
        question: "How do I connect my wallet?",
        answer:
          "Click the wallet button in the header section. We support various wallet providers through WalletConnect. Make sure you're connected to the correct network (Arbitrum).",
      },
      {
        question: "What tokens do I need?",
        answer:
          "You need USDC to participate in protocols. Make sure you have enough USDC in your wallet to cover your interactions plus ETH for the gas fees for transactions.",
      },
    ],
  },
  {
    title: "Technical Details",
    items: [
      {
        question: "What is the source of Price data?",
        answer: [
          "We use Pyth network as the main source of price data in the contracts. You can always find the exact price feed addresses in the Contract Metadata section.",
        ],
      },
      {
        question: "How are the random numbers generated?",
        answer:
          "We use Chainlink VRF (Verifiable Random Function) to generate secure and verifiable random numbers for demonstrating provably fair outcomes. This ensures that the results are fair and cannot be manipulated.",
      },
      {
        question: "How can I view the smart contract code?",
        answer:
          "You can view the smart contract code on the Arbiscan website by searching for the contract address. The address is displayed in the Contract Metadata section. All our contracts are open-source and verified for transparency.",
      },
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      {
        question: "My transaction failed. What happened?",
        answer: [
          "Common reasons for transaction failures:",
          "• Insufficient USDC balance or gas fees",
          "• Contract state does not allow the action. This can happen e.g. when submitting multiple requests, before the UI is updated.",
          "• Contract is paused. This can happen during maintenance or upgrades (should be very rare).",
          "• Network congestion causing timeouts.",
          "• Temporary network issues on chain or wallet problems.",
          "Check the error message in your wallet for specific details.",
        ],
      },
      {
        question: "Why can't I see updates on UI?",
        answer:
          "Make sure your transaction was confirmed on-chain. Check your wallet for the transaction hash. If confirmed, try refreshing the page or clearing your browser cache. Data may take a few moments to sync from the blockchain. If the transaction is confirmed on your wallet and visible in the contract event logs, you can be sure it was successful even if the UI does not reflect it immediately.",
      },
    ],
  },
];

export default function FaqPage() {
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqSections.flatMap((section) =>
      section.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: Array.isArray(item.answer)
            ? item.answer.join(" ")
            : item.answer,
        },
      })),
    ),
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header */}
        <div className="text-center mb-12 border-b border-border pb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="text-primary">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="1"
              >
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3 uppercase tracking-wider">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto uppercase tracking-wide">
            Everything you need to know about CFT.LIVE
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-foreground uppercase tracking-wider border-b border-primary pb-2">
                  {section.title}
                </h2>
              </div>
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => {
                  const key = `${sectionIndex}-${itemIndex}`;
                  const isOpen = openItems[key];

                  return (
                    <Card
                      key={key}
                      className="border-border bg-secondary hover:border-primary/50 transition-colors"
                    >
                      <Collapsible
                        open={isOpen}
                        onOpenChange={() => toggleItem(key)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-left">
                                {item.question}
                              </h3>
                              <svg
                                className={`w-5 h-5 shrink-0 text-primary transition-transform ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="square"
                                  strokeLinejoin="miter"
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="px-4 pb-4 pt-0">
                            <div className="border-t border-border pt-3">
                              {Array.isArray(item.answer) ? (
                                <div className="space-y-2">
                                  {item.answer.map((line, lineIndex) => (
                                    <p
                                      key={lineIndex}
                                      className="text-sm text-muted-foreground leading-relaxed"
                                    >
                                      {line}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {item.answer}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 border-t border-border pt-8">
          <Card className="border-border bg-secondary">
            <CardContent className="p-6 text-center">
              <h2 className="text-lg font-bold text-foreground mb-3 uppercase tracking-wider">
                Still Have Questions?
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                For additional support or technical issues, please reach out to
                our community or review the smart contract documentation.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline uppercase tracking-wide font-semibold"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back to Home
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
