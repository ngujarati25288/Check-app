import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, XCircle, CheckCircle2, BookOpen, Calendar, BookOpenCheck, LayoutGrid, CheckCircle, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/FirebaseProvider";
import { MistakeRepository } from "@/lib/db";
import { StudentMistake } from "@/types";

export const Route = createFileRoute("/mistakes")({
  head: () => ({ meta: [{ title: "My Mistakes" }] }),
  component: MyMistakes,
});

function MyMistakes() {
  const { user } = useAuth();
  const [mistakesList, setMistakesList] = useState<StudentMistake[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced filters state
  const [query, setQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [selectedChapter, setSelectedChapter] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All"); // All, Pending, Mastered
  const [selectedDateRange, setSelectedDateRange] = useState<string>("All"); // All, Today, This Week, Older

  useEffect(() => {
    let active = true;
    async function loadMistakes() {
      if (!user?.uid) return;

      const timeoutId = setTimeout(() => {
        if (active && loading) {
          setLoading(false);
          console.warn("Mistakes loading timed out after 8s");
        }
      }, 8000);

      try {
        setLoading(true);
        const data = await MistakeRepository.getUserMistakes(user.uid);
        if (!active) return;
        setMistakesList(data);
      } catch (e) {
        console.error("Mistakes fetching failed:", e);
      } finally {
        clearTimeout(timeoutId);
        if (active) {
          setLoading(false);
        }
      }
    }
    loadMistakes();

    return () => {
      active = false;
    };
  }, [user?.uid]);

  // Dynamic values parsed from database records
  const subjects = Array.from(new Set(mistakesList.map((m) => m.subjectName || m.subject || "Unknown")));
  const chapters = Array.from(
    new Set(
      mistakesList
        .filter((m) => selectedSubject === "All" || (m.subjectName || m.subject) === selectedSubject)
        .map((m) => m.chapterName || m.chapter || "Unknown")
    )
  );

  // Overall analytics calculation
  const total = mistakesList.length;
  const masteredCount = mistakesList.filter((m) => m.mastered).length;
  const pendingCount = total - masteredCount;

  // Group by subjects
  const subjectList = Array.from(new Set(mistakesList.map((m) => m.subjectName || m.subject || "Unknown")));
  const subjectAnalytics = subjectList.map((sub) => {
    const totalSub = mistakesList.filter((m) => (m.subjectName || m.subject) === sub).length;
    const masteredSub = mistakesList.filter((m) => (m.subjectName || m.subject) === sub && m.mastered).length;
    const guSub = sub === "Science" ? "વિજ્ઞાન" : sub === "Mathematics" ? "ગણિત" : sub === "Social Science" ? "સામાજિક વિજ્ઞાન" : sub;
    return {
      name: sub,
      guName: guSub,
      total: totalSub,
      mastered: masteredSub,
      pending: totalSub - masteredSub,
    };
  });

  // Group by chapters (Top 4 most-mistakes chapters)
  const chapterList = Array.from(new Set(mistakesList.map((m) => m.chapterName || m.chapter || "Unknown")));
  const chapterAnalytics = chapterList
    .map((ch) => {
      const totalCh = mistakesList.filter((m) => (m.chapterName || m.chapter) === ch).length;
      const masteredCh = mistakesList.filter((m) => (m.chapterName || m.chapter) === ch && m.mastered).length;
      return {
        name: ch,
        total: totalCh,
        mastered: masteredCh,
        pending: totalCh - masteredCh,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Filters logic
  const filteredMistakes = mistakesList.filter((m) => {
    const sName = m.subjectName || m.subject || "Unknown";
    const cName = m.chapterName || m.chapter || "Unknown";
    const examDateStr = m.examDate || m.latestExamDate || "";

    const matchesSearch = query === "" || m.question.toLowerCase().includes(query.toLowerCase());
    const matchesSubject = selectedSubject === "All" || sName === selectedSubject;
    const matchesChapter = selectedChapter === "All" || cName === selectedChapter;

    let matchesStatus = true;
    if (selectedStatus === "Pending") matchesStatus = !m.mastered;
    else if (selectedStatus === "Mastered") matchesStatus = m.mastered;

    let matchesDate = true;
    if (selectedDateRange !== "All" && examDateStr) {
      const examTime = new Date(examDateStr).getTime();
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const oneWeekAgo = todayStart - 7 * 24 * 60 * 60 * 1000;

      if (selectedDateRange === "Today") {
        matchesDate = examDateStr === new Date().toISOString().split("T")[0];
      } else if (selectedDateRange === "This Week") {
        matchesDate = examTime >= oneWeekAgo;
      } else if (selectedDateRange === "Older") {
        matchesDate = examTime < oneWeekAgo;
      }
    }

    return matchesSearch && matchesSubject && matchesChapter && matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <AppShell title="My Mistakes" titleGu="મારી ભૂલો" back="/dashboard">
        <div className="flex items-center justify-center min-h-[50dvh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="My Mistakes" titleGu="મારી ભૂલો" back="/dashboard">
      <div className="px-5 py-4 space-y-5 pb-10">
        
        {/* STATS OVERVIEW CARD */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary-soft/45 border border-primary/10 rounded-2xl p-3 text-center">
            <p className="text-2xl font-extrabold text-primary leading-none">{total}</p>
            <p className="text-[10px] uppercase font-gu mt-1 text-primary">કુલ ભૂલો</p>
          </div>
          <div className="bg-success-soft/45 border border-success/10 rounded-2xl p-3 text-center">
            <p className="text-2xl font-extrabold text-success leading-none">{masteredCount}</p>
            <p className="text-[10px] uppercase font-gu mt-1 text-success">સુધારેલ (Mastered)</p>
          </div>
          <div className="bg-warning/10 border border-warning/15 rounded-2xl p-3 text-center">
            <p className="text-2xl font-extrabold text-warning-foreground leading-none">{pendingCount}</p>
            <p className="text-[10px] uppercase font-gu mt-1 text-warning-foreground">બાકી (Pending)</p>
          </div>
        </div>

        {/* ANALYTICS ACCORDION SLIDE */}
        <div className="bg-card border border-border rounded-3xl p-4 shadow-card space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid className="size-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider font-gu">ભૂલો વિશ્લેષણ (Mistake Analytics)</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Subject-Wise */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest font-gu">વિષય મુજબ (Subject Wise)</p>
              {subjectAnalytics.length === 0 ? (
                <p className="text-xs text-muted-foreground italic font-gu">ડેટા ઉપલબ્ધ નથી.</p>
              ) : (
                subjectAnalytics.map((sub) => {
                  const pct = total > 0 ? (sub.total / total) * 100 : 0;
                  return (
                    <div key={sub.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-gu font-medium">{sub.guName} ({sub.name})</span>
                        <span className="text-muted-foreground font-semibold">
                          {sub.total} (સુધરેલ: {sub.mastered})
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-primary transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chapter-Wise Mistakes */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest font-gu">પ્રકરણ મુજબ (Chapter Wise)</p>
              {chapterAnalytics.length === 0 ? (
                <p className="text-xs text-muted-foreground italic font-gu">ડેટા ઉપલબ્ધ નથી.</p>
              ) : (
                chapterAnalytics.slice(0, 3).map((ch) => {
                  const pct = total > 0 ? (ch.total / total) * 100 : 0;
                  return (
                    <div key={ch.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="truncate max-w-[180px] font-semibold text-foreground/95" title={ch.name}>
                          {ch.name}
                        </span>
                        <span className="text-muted-foreground text-[10px] font-mono shrink-0">
                          {ch.total} ભૂલો
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-warning transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* INPUT SEARCH AND INTERACTIVE FILTERS */}
        <div className="bg-card border border-border rounded-3xl p-4 shadow-card space-y-3">
          <div className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-muted/60 border border-border focus-within:border-primary">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="સાચો પ્રશ્ન લખો... (Search question)"
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:font-gu placeholder:text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Subject Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground font-gu">વિષય (Subject)</label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedChapter("All"); // Reset chapter
                }}
                className="w-full text-xs h-9 bg-muted/60 rounded-xl px-2 border border-border font-gu outline-none focus:border-primary"
              >
                <option value="All">તમામ વિષયો (All Subject)</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub === "Science" ? "Science (વિજ્ઞાન)" : sub === "Mathematics" ? "Mathematics (ગણિત)" : sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground font-gu">પ્રકરણ (Chapter)</label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full text-xs h-9 bg-muted/60 rounded-xl px-2 border border-border outline-none focus:border-primary truncate"
              >
                <option value="All">તમામ પ્રકરણો (All Chapter)</option>
                {chapters.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground font-gu">સ્થિતિ (Status)</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs h-9 bg-muted/60 rounded-xl px-2 border border-border font-gu outline-none focus:border-primary"
              >
                <option value="All">બધી ભૂલો (All Status)</option>
                <option value="Pending">સુધારવાની બાકી (Pending)</option>
                <option value="Mastered">સુધારેલ (Mastered)</option>
              </select>
            </div>

            {/* Date filter dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground font-gu">તારીખ (Date Filter)</label>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="w-full text-xs h-9 bg-muted/60 rounded-xl px-2 border border-border font-gu outline-none focus:border-primary"
              >
                <option value="All">બધી તારીખો (All Date)</option>
                <option value="Today">આજે (Today)</option>
                <option value="This Week">આ અઠવાડિયે (This Week)</option>
                <option value="Older">જૂનું (Older)</option>
              </select>
            </div>
          </div>
        </div>

        {/* RESULTS GRID LIST */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider font-gu">ભૂલોની યાદી ({filteredMistakes.length})</h4>
          </div>

          {filteredMistakes.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {filteredMistakes.map((m, i) => {
                const sName = m.subjectName || m.subject || "Unknown";
                const cName = m.chapterName || m.chapter || "Unknown";
                const displayDate = m.latestExamDate || m.examDate || "";
                const displaysSelected = m.lastWrongAttempt || m.selectedAnswer || "Skipped";

                const guSub = sName === "Science" ? "વિજ્ઞાન" : sName === "Mathematics" ? "ગણિત" : sName === "Social Science" ? "સામાજિક વિજ્ઞાન" : sName;
                
                return (
                  <article
                    key={`${m.questionId}_${i}`}
                    className="bg-card border border-border rounded-3xl p-4 shadow-card animate-[slide-up_0.35s_ease-out] relative overflow-hidden"
                    style={{ animationDelay: `${i * 45}ms`, animationFillMode: "backwards" }}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold font-gu text-[9px]">
                        {guSub}
                      </span>
                      <span className="flex items-center gap-1"><BookOpen className="size-3" /> {cName}</span>
                      {displayDate && (
                        <span className="flex items-center gap-1 ml-auto shrink-0 font-sans"><Calendar className="size-3" /> {displayDate}</span>
                      )}
                    </div>
                    
                    {m.mastered && (
                      <span className="absolute top-3 right-3 bg-success-soft text-success text-[8px] font-bold rounded-full px-1.5 py-0.5 uppercase tracking-wide flex items-center gap-0.5">
                        <CheckCircle className="size-2.5" /> Checked / Mastered
                      </span>
                    )}

                    <h3 className="mt-3 font-semibold text-sm leading-snug text-foreground/95">{m.question}</h3>
                    
                    {/* Options Details */}
                    {(m.optionA || m.optionB || m.optionC || m.optionD) && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-muted-foreground font-sans pl-1">
                        <div className={m.correctAnswer === "A" ? "text-success font-semibold" : ""}>A. {m.optionA}</div>
                        <div className={m.correctAnswer === "B" ? "text-success font-semibold" : ""}>B. {m.optionB}</div>
                        <div className={m.correctAnswer === "C" ? "text-success font-semibold" : ""}>C. {m.optionC}</div>
                        <div className={m.correctAnswer === "D" ? "text-success font-semibold" : ""}>D. {m.optionD}</div>
                      </div>
                    )}

                    <div className="mt-3 space-y-2 text-sm font-sans">
                      <div className="flex items-start gap-2 p-2.5 rounded-2xl bg-destructive-soft border border-destructive/10">
                        <XCircle className="size-4 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-destructive font-bold font-sans">Student answer</p>
                          <p className="font-semibold text-foreground">{displaysSelected}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2.5 rounded-2xl bg-success-soft border border-success/10">
                        <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-success font-bold font-sans">Correct answer</p>
                          <p className="font-bold text-success">Option {m.correctAnswer}</p>
                        </div>
                      </div>
                    </div>

                    {m.explanation && (
                      <div className="mt-3 p-2.5 bg-muted/40 rounded-2xl border border-muted-foreground/5 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground font-gu block mb-0.5">ખુલાસો (Explanation):</span>
                        <p className="leading-relaxed font-sans">{m.explanation}</p>
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground font-sans pl-1">
                      <span className="flex items-center gap-0.5"><Clock className="size-3" /> Attempt Count: <strong className="text-foreground">{m.revisionCount || 0}</strong></span>
                      <span className="flex items-center gap-0.5"><BookOpenCheck className="size-3" /> Mastery Count: <strong className="text-success">{m.correctRevisionCount || 0}/3</strong></span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-card border border-border rounded-3xl shadow-card p-6 border-dashed">
      <div className="size-16 mx-auto rounded-full bg-success-soft flex items-center justify-center text-3xl">
        🎉
      </div>
      <h3 className="mt-4 font-semibold font-gu text-base">અભિનંદન!</h3>
      <p className="text-xs text-muted-foreground font-gu mt-1">પસંદ કરેલ ફિલ્ટર્સ સાથે કોઈ ભૂલ નથી.</p>
    </div>
  );
}
