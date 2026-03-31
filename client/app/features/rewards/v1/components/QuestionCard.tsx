"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RewardQuestion } from "../hooks/useRewards";

type Props = {
  question: RewardQuestion;
  tokenAmount: number;
  alreadyAnswered: boolean;
  onRefetch: () => void;
};

export default function QuestionCard({ question, tokenAmount, alreadyAnswered, onRefetch }: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const answer = question.options ? selected : freeText.trim();
    if (!answer) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/rewards/questions/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question_id: question.id, answer }),
      });

      if (res.ok || res.status === 409) {
        setSubmitted(true);
        queryClient.invalidateQueries({ queryKey: ["my-rewards"] });
        onRefetch();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadyAnswered || submitted) {
    return (
      <div className="rounded-xl border p-4 opacity-60">
        <p className="font-medium text-sm">{question.question_text}</p>
        <p className="text-xs text-green-600 mt-1 font-medium">Answered · +{tokenAmount} CFT earned</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium text-sm">{question.question_text}</p>
        <span className="text-sm font-bold shrink-0">+{tokenAmount} CFT</span>
      </div>

      {question.options ? (
        <div className="grid gap-1.5">
          {question.options.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className={`text-left rounded-md px-3 py-2 text-sm border transition-colors ${
                selected === opt ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="Your answer…"
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || (question.options ? !selected : !freeText.trim())}
        className="rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50"
      >
        {isSubmitting ? "Submitting…" : "Submit Answer"}
      </button>
    </div>
  );
}
