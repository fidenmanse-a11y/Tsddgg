import tl from "./timeline.json";
import voData from "./vo-data.json";
import { b } from "./lib";

// Gemeinsame Zeitachse für Bild UND Ton.
// timeline.json wird auch vom Audio-Build (audio/build_audio.py) gelesen,
// vo-data.json wird von dort mit Wort-genauen Timings (Whisper) erzeugt.

type Sec = keyof typeof tl.sections;
export const SEC = Object.fromEntries(
  Object.entries(tl.sections).map(([k, [s, e]]) => [k, { from: b(s), to: b(e) }]),
) as Record<Sec, { from: number; to: number }>;

export const TOTAL = b(tl.totalBeats);

export type Word = { w: string; s: number; e: number };
export type Line = { id: string; start: number; end: number; words: Word[] };

export const VO = voData.lines as Record<string, Line>;

/** Frame, an dem Wort i der Zeile id beginnt */
export const ws = (id: string, i: number) => {
  const l = VO[id];
  if (!l) return 0;
  const wd = l.words[Math.min(i, l.words.length - 1)];
  return wd ? wd.s : l.start;
};
/** Frame, an dem Wort i der Zeile id endet */
export const we = (id: string, i: number) => {
  const l = VO[id];
  if (!l) return 0;
  const wd = l.words[Math.min(i, l.words.length - 1)];
  return wd ? wd.e : l.end;
};
export const ls = (id: string) => VO[id]?.start ?? 0;
export const le = (id: string) => VO[id]?.end ?? 0;

export const HITS = tl.hits as Record<string, number>;
/** benannter Hit-Point in Frames */
export const hit = (name: string) => b(HITS[name] ?? 0);
