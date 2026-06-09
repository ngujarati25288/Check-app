import { GraduationCap } from "lucide-react";

export function Logo({ size = 72 }: { size?: number }) {
  return (
    <div
      className="rounded-3xl gradient-primary shadow-float flex items-center justify-center text-primary-foreground"
      style={{ width: size, height: size }}
    >
      <GraduationCap style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.2} />
    </div>
  );
}
