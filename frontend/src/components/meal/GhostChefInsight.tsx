import React, { useState, useEffect, useMemo } from 'react';

type InsightCategory = 'VITALITY' | 'MASTERY' | 'RITUAL' | 'LOGISTICS';

interface Insight {
  text: string;
  category: InsightCategory;
  persona?: string;
}

const INSIGHTS: Insight[] = [
  { category: 'MASTERY',   text: "You can skip any meal before its cutoff — no charge for skipped meals.", persona: "Tip" },
  { category: 'VITALITY',  text: "Streaks unlock rewards at 7, 14, and 30 days. Maintain your momentum.", persona: "Tip" },
  { category: 'MASTERY',   text: "Tap any dish to explore alternatives.", persona: "Tip" },
  { category: 'LOGISTICS', text: "Deselect all meals for a day to claim it as a full Day-Off.", persona: "Tip" },
  { category: 'RITUAL',    text: "Cutoffs: Breakfast 10am, Lunch 1pm, Dinner 6pm.", persona: "Tip" },
];

const STATUS_INSIGHTS: Record<string, string[]> = {
  preparing:        ["Your meal is being freshly prepared right now."],
  out_for_delivery: ["Your meal is on its way. Keep your OTP ready."],
  delivered:        ["Enjoy your meal! Drop a quick rating — it helps us a lot."],
};

interface GhostChefInsightProps {
  status?: string;
}

export const GhostChefInsight: React.FC<GhostChefInsightProps> = ({ status }) => {
  const [index, setIndex] = useState(0);

  const pool = useMemo(() => {
    if (status && STATUS_INSIGHTS[status]) {
      return STATUS_INSIGHTS[status].map(text => ({ text, category: 'LOGISTICS' as InsightCategory, persona: 'Update' }));
    }
    return INSIGHTS;
  }, [status]);

  const current = pool[index % pool.length];

  useEffect(() => {
    const t = setInterval(() => setIndex(p => (p + 1) % pool.length), 10000);
    return () => clearInterval(t);
  }, [pool.length]);

  return (
    <div
      onClick={() => setIndex(p => (p + 1) % pool.length)}
      className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 flex items-start gap-3"
    >
      <span className="text-base shrink-0 mt-0.5">💡</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
          {current.persona} · {current.category}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{current.text}</p>
      </div>
      <span className="text-[10px] text-[var(--color-text-faint)] self-center shrink-0">tap →</span>
    </div>
  );
};
