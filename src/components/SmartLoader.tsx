import { BookOpen } from "lucide-react";

interface SmartLoaderProps {
  messageGu?: string;
  message?: string;
}

export function SmartLoader({
  messageGu = "તમારી પ્રગતિ લોડ થઈ રહી છે...",
  message = "Preparing your learning...",
}: SmartLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="relative size-24 mb-5">
        <div className="absolute inset-0 rounded-full gradient-soft animate-[pulse-soft_2s_ease-in-out_infinite]" />
        <div className="absolute inset-3 rounded-full bg-card border border-border shadow-card flex items-center justify-center animate-[float_3s_ease-in-out_infinite]">
          <BookOpen className="size-9 text-primary" />
        </div>
        <span className="absolute -top-1 -right-1 text-xl animate-[float_2.6s_ease-in-out_infinite]">✨</span>
      </div>
      <p className="font-gu font-semibold text-base leading-snug">{messageGu}</p>
      <p className="text-xs text-muted-foreground mt-1">{message}</p>
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-primary"
            style={{ animation: `pulse-soft 1.1s ease-in-out ${i * 0.18}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
