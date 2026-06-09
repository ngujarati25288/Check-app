import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily Learning Exam — Gujarat Board" },
      { name: "description", content: "Daily exams and mistake-based revision for Gujarat Board students." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/login" }), 2200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-dvh flex justify-center bg-background">
      <div className="w-full max-w-md min-h-dvh gradient-hero text-primary-foreground flex flex-col items-center justify-between py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-20 -left-20 size-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 -right-10 size-72 rounded-full bg-white/20 blur-3xl" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-[scale-in_0.6s_ease-out]">
          <div className="animate-[float_3.5s_ease-in-out_infinite]">
            <Logo size={96} />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Daily Learning Exam</h1>
            <p className="text-base text-white/90 font-gu">દરરોજ પરીક્ષા, સતત પ્રગતિ</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-2 rounded-full bg-white/90"
                style={{
                  animation: `pulse-soft 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <Link to="/login" className="text-xs text-white/70 underline-offset-4 hover:underline">
            Skip
          </Link>
        </div>
      </div>
    </div>
  );
}
