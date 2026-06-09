import { useMemo } from "react";

interface ConfettiProps {
  count?: number;
}

const PIECES = ["🎉", "🎊", "⭐", "✨", "🌟", "🏆", "💫"];
const COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
];

export function Confetti({ count = 36 }: ConfettiProps) {
  const items = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.4 + Math.random() * 1.8,
      drift: (Math.random() - 0.5) * 120,
      rotate: Math.random() * 720 - 360,
      size: 10 + Math.random() * 14,
      isEmoji: Math.random() > 0.55,
      emoji: PIECES[i % PIECES.length],
      color: COLORS[i % COLORS.length],
    }));
  }, [count]);

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translate(0, -10vh) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--drift, 0px), 110vh) rotate(var(--rotate, 360deg)); opacity: 0.9; }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        {items.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 select-none"
            style={{
              left: `${p.left}%`,
              fontSize: p.isEmoji ? `${p.size + 6}px` : undefined,
              width: p.isEmoji ? undefined : `${p.size}px`,
              height: p.isEmoji ? undefined : `${p.size * 0.5}px`,
              background: p.isEmoji ? undefined : p.color,
              borderRadius: 2,
              ["--drift" as string]: `${p.drift}px`,
              ["--rotate" as string]: `${p.rotate}deg`,
              animation: `confetti-fall ${p.duration}s cubic-bezier(0.22, 1, 0.36, 1) ${p.delay}s forwards`,
            }}
          >
            {p.isEmoji ? p.emoji : null}
          </span>
        ))}
      </div>
    </>
  );
}
