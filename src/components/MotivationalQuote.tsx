import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { motivationalMessages } from "@/lib/mockData";

export function MotivationalQuote({ interval = 6000 }: { interval?: number }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * motivationalMessages.length));

  useEffect(() => {
    const id = setInterval(
      () => setI((prev) => (prev + 1) % motivationalMessages.length),
      interval,
    );
    return () => clearInterval(id);
  }, [interval]);

  return (
    <div className="rounded-3xl bg-gradient-soft border border-border p-4 flex items-start gap-3 overflow-hidden animate-[slide-up_0.5s_ease-out]">
      <div className="size-9 shrink-0 rounded-2xl bg-card flex items-center justify-center text-primary shadow-card">
        <Sparkles className="size-4" />
      </div>
      <div key={i} className="min-w-0 animate-[fade-in_0.5s_ease-out]">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Daily motivation
        </p>
        <p className="font-gu text-sm font-medium leading-snug mt-0.5">
          “{motivationalMessages[i]}”
        </p>
      </div>
    </div>
  );
}
