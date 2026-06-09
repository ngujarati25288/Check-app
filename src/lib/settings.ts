import { useSyncExternalStore } from "react";

export type Settings = {
  theme: "light" | "dark";
  sound: boolean;
  avatar: string;
};

const KEY = "dle:settings";
const DEFAULTS: Settings = { theme: "light", sound: true, avatar: "📚" };

let state: Settings = DEFAULTS;
const listeners = new Set<() => void>();

function applyTheme(theme: Settings["theme"]) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function loadFromStorage(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function initSettings() {
  if (typeof window === "undefined") return;
  state = loadFromStorage();
  applyTheme(state.theme);
  listeners.forEach((l) => l());
}

export function setSettings(patch: Partial<Settings>) {
  state = { ...state, ...patch };
  if (patch.theme) applyTheme(patch.theme);
  persist();
  listeners.forEach((l) => l());
}

export function toggleTheme() {
  setSettings({ theme: state.theme === "dark" ? "light" : "dark" });
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => DEFAULTS,
  );
}

// ---- Lightweight sound effects (no assets, WebAudio only) ----
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur = 0.15, type: OscillatorType = "sine", vol = 0.08, delay = 0) {
  if (!state.sound) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  correct() {
    tone(660, 0.12, "sine", 0.08);
    tone(880, 0.18, "sine", 0.08, 0.08);
  },
  wrong() {
    tone(220, 0.18, "triangle", 0.07);
  },
  achievement() {
    tone(523, 0.12, "triangle", 0.08);
    tone(659, 0.12, "triangle", 0.08, 0.1);
    tone(784, 0.22, "triangle", 0.08, 0.2);
  },
  tap() {
    tone(520, 0.05, "sine", 0.04);
  },
};
