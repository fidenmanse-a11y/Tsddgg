"""Wählt pro Voiceover-Zeile den besten TTS-Take und erzeugt Wort-Timings.

Ablauf: jeden Take trimmen -> Whisper (faster-whisper, medium, de) ->
Ähnlichkeit zum Skript + Pausen-/Längen-Checks -> bester Take.
Die Whisper-Wörter werden per DP-Alignment auf die Skript-Tokens gemappt.

Aufruf:  python select_vo.py <takes_dir> <out_dir>
"""
import glob
import json
import os
import re
import sys
import unicodedata
from difflib import SequenceMatcher

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

TOKENS = {
    "L01": ["okay", "okay", "okay"],
    "L02": ["was", "ist", "das", "denn"],
    "L03": ["dieser", "typ", "spielt", "minecraft", "nicht", "einfach", "nur"],
    "L04": ["der", "macht", "aus", "jedem", "server", "ein", "komplettes", "chaos"],
    "L05": ["opitems", "check"],
    "L06": ["komplett", "verrückte", "pvpstrategien", "check"],
    "L07": ["und", "absolut", "normale", "smpmitspieler"],
    "L08": ["okay", "vergessen", "wir", "das"],
    "L09": ["hahahaha", "nein", "nein", "nein", "nein"],
    "L10": ["wie", "kann", "das", "bitte", "funktionieren"],
    "L11": ["von", "unmöglichen", "strategien", "bis", "zu", "den", "verrücktesten", "smpgeschichten"],
    "L1213": ["das", "ist", "revanchie"],
    "L14": ["und", "glaub", "mir"],
    "L15": ["das", "war", "erst", "der", "anfang"],
}
# Zeilen, in denen Pausen gewollt sind ("…")
PAUSE_OK = {"L01": 0.9, "L11": 1.2, "L08": 0.9, "L1213": 1.2}

# Manuelle Regie-Entscheidungen nach Prüfung des Reports (takes_report.json):
#  L02/L04/L11/L15: kürzester, druckvollster Take bei gleicher Erkennung
#  L08: Take mit natürlicher Deadpan-Pause nach "Okay,"
#  L06: Neuaufnahme mit Schreibweise "Pe-Vau-Pe" (sonst "PP"/"PVB")
#  L14: "Und glaub mir ..." – ruhiger, kürzer
#  L1213: "Das ist... Revanchie!" am Stück erzeugt (Einzelwort klingt zerhackt),
#         danach in der Pause geschnitten -> L12 + L13
OVERRIDES = {
    "L02": "L02_t0.wav",
    "L04": "L04_t1.wav",
    "L06": "L06_t1.wav",
    "L08": "L08_t1.wav",
    "L11": "L11_t1.wav",
    "L14": "L14_t1.wav",
    "L15": "L15_t2.wav",
    "L1213": "L1213_t1.wav",
}
SPLITS = {"L1213": ("L12", "L13", 2)}  # neue Zeile ab Token-Index 2

# Sprechtempo (ffmpeg atempo, tonhöhenneutral): echte Creator reden schneller als TTS.
# Deadpan (L08) und Trailer-Zeilen bleiben natürlich.
TEMPO = {"L01": 1.08, "L02": 1.1, "L03": 1.15, "L04": 1.12, "L05": 1.15, "L06": 1.2,
         "L07": 1.15, "L09": 1.1, "L10": 1.1, "L11": 1.05}


def stretch(audio, sr, rate):
    import subprocess
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        sf.write(f"{d}/i.wav", audio, sr)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{d}/i.wav", "-filter:a", f"atempo={rate}", f"{d}/o.wav"], check=True)
        out, _ = sf.read(f"{d}/o.wav", dtype="float32")
    return out
# Gleichwertige Schreibweisen, die Whisper ausgeben darf
ALIASES = {
    "opitems": ["opitems", "ohpeeitems", "opeeitems", "ohpitems", "opi"],
    "smpmitspieler": ["smpmitspieler", "essemmpehmitspieler", "smpmitspiele"],
    "smpgeschichten": ["smpgeschichten", "essemmpehgeschichten"],
    "revanchie": ["revanchie", "rewanschi", "rewanschie", "revanche", "revanchi", "rewanchi"],
    "hahahaha": ["hahahaha", "hahaha", "haha", "hahahahaha"],
    "pvpstrategien": ["pvpstrategien", "pvp", "pvpstrategie"],
    "check": ["check", "tschäck", "scheck", "tschek"],
}


def norm(s: str) -> str:
    s = s.lower()
    s = unicodedata.normalize("NFC", s)
    return re.sub(r"[^a-zäöüß]", "", s)


def tok_sim(token: str, word: str) -> float:
    cands = ALIASES.get(token, [token])
    return max(SequenceMatcher(None, c, word).ratio() for c in cands)


def align(tokens, words):
    """DP: jedes Skript-Token absorbiert 0..4 aufeinanderfolgende ASR-Wörter."""
    n, m = len(tokens), len(words)
    INF = -1e9
    dp = np.full((n + 1, m + 1), INF)
    bt = {}
    dp[0, 0] = 0
    for j in range(1, m + 1):  # führende Extra-Wörter
        dp[0, j] = dp[0, j - 1] - 0.6
        bt[(0, j)] = ("skip", 0, j - 1)
    for i in range(1, n + 1):
        for j in range(0, m + 1):
            best = dp[i - 1, j] - 0.9  # Token fehlt
            arg = ("miss", i - 1, j)
            for k in range(1, 5):
                if j - k < 0:
                    break
                cat = "".join(norm(w["w"]) for w in words[j - k:j])
                sc = dp[i - 1, j - k] + tok_sim(tokens[i - 1], cat) * 2 - 1
                if sc > best:
                    best, arg = sc, ("take", i - 1, j - k)
            if j > 0 and dp[i, j - 1] - 0.6 > best:
                best, arg = dp[i, j - 1] - 0.6, ("skip", i, j - 1)
            dp[i, j] = best
            bt[(i, j)] = arg
    # Pfad zurückverfolgen
    i, j = n, m
    spans = [None] * n
    while i > 0 or j > 0:
        kind, pi, pj = bt[(i, j)]
        if kind == "take":
            spans[i - 1] = (pj, j)
        i, j = pi, pj
    return spans, dp[n, m]


def trim(a, sr):
    env = np.abs(a)
    th = max(1e-4, 0.03 * env.max())
    idx = np.where(env > th)[0]
    s = max(0, idx[0] - int(0.03 * sr))
    e = min(len(a), idx[-1] + int(0.12 * sr))
    return a[s:e]


def main():
    from faster_whisper import WhisperModel

    takes_dirs, out_dir = sys.argv[1:-1], sys.argv[-1]
    os.makedirs(out_dir, exist_ok=True)
    model = WhisperModel("medium", device="cpu", compute_type="int8")
    report = {}
    result = {}
    for lid, tokens in TOKENS.items():
        cands = []
        paths = sorted(p for d in takes_dirs for p in glob.glob(f"{d}/{lid}_t*.wav"))
        if lid in OVERRIDES:
            # neuere Takes-Ordner überschreiben ältere
            paths = [p for p in paths if os.path.basename(p) == OVERRIDES[lid]][-1:]
        for p in paths:
            a, sr = sf.read(p, dtype="float32")
            if a.ndim > 1:
                a = a.mean(1)
            a = trim(a, sr)
            a16 = resample_poly(a, 16000, sr).astype(np.float32)
            segs, _ = model.transcribe(a16, language="de", word_timestamps=True, beam_size=5)
            words = [{"w": w.word.strip(), "s": w.start, "e": w.end} for s in segs for w in s.words]
            text = " ".join(w["w"] for w in words)
            spans, al = align(tokens, words)
            matched = sum(1 for s in spans if s)
            # längste interne Pause
            gaps = [words[k + 1]["s"] - words[k]["e"] for k in range(len(words) - 1)]
            maxgap = max(gaps) if gaps else 0
            dur = len(a) / sr
            # Tail-Check: Audio deutlich länger als letztes Wort -> Artefakt
            tail = dur - (words[-1]["e"] if words else 0)
            score = al + matched * 0.5
            if maxgap > PAUSE_OK.get(lid, 0.55):
                score -= (maxgap - PAUSE_OK.get(lid, 0.55)) * 4
            if tail > 0.7:
                score -= (tail - 0.7) * 3
            cands.append(dict(path=p, text=text, score=score, dur=dur, maxgap=maxgap, tail=tail, words=words, spans=spans, audio=a, sr=sr))
        if not cands:
            continue
        cands.sort(key=lambda c: -c["score"])
        best = cands[0]
        report[lid] = [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in c.items() if k in ("path", "text", "score", "dur", "maxgap", "tail")} for c in cands]
        # Wort-Timings auf Tokens mappen
        tw = []
        for ti, sp in enumerate(best["spans"]):
            if sp:
                ws_ = best["words"][sp[0]:sp[1]]
                tw.append({"w": tokens[ti], "s": ws_[0]["s"], "e": ws_[-1]["e"]})
            else:
                tw.append({"w": tokens[ti], "s": None, "e": None})
        # Lücken interpolieren
        for ti, w in enumerate(tw):
            if w["s"] is None:
                prev = next((tw[k]["e"] for k in range(ti - 1, -1, -1) if tw[k]["e"] is not None), 0.0)
                nxt = next((tw[k]["s"] for k in range(ti + 1, len(tw)) if tw[k]["s"] is not None), best["dur"])
                w["s"], w["e"] = prev, (prev + nxt) / 2
        take = os.path.basename(best["path"])
        if lid in SPLITS:
            a_id, b_id, k = SPLITS[lid]
            a = best["audio"]
            sr = best["sr"]
            # leisesten Punkt zwischen Ende Token k-1 (Wortbeginn + 0.15 s) und Beginn Token k suchen
            lo = int((tw[k - 1]["s"] + 0.18) * sr)
            hi = int(tw[k]["s"] * sr) + int(0.05 * sr)
            env = np.convolve(np.abs(a), np.ones(int(0.02 * sr)) / int(0.02 * sr), "same")
            cut = lo + int(np.argmin(env[lo:hi])) if hi > lo else int(tw[k]["s"] * sr)
            cut_s = cut / sr
            A, B = trim(a[:cut], sr), a[cut:]
            B = trim(B, sr)
            b_off = cut_s + (np.argmax(np.abs(a[cut:]) > 0.03 * np.abs(a).max()) / sr) - 0.03
            twA = [dict(w, e=min(w["e"], cut_s)) for w in tw[:k]]
            twB = [dict(w, s=max(0.0, w["s"] - b_off), e=w["e"] - b_off) for w in tw[k:]]
            twB[0]["s"] = 0.03  # Whisper hängt die Pause an "ist" – echter Einsatz = Dateianfang
            for nid, aud, t_ in ((a_id, A, twA), (b_id, B, twB)):
                sf.write(f"{out_dir}/{nid}.wav", aud, sr)
                result[nid] = {"file": f"{nid}.wav", "dur": len(aud) / sr, "words": t_, "asr": best["text"], "take": take}
            print(lid, "-> split at", round(cut_s, 2), "s")
        else:
            if lid in TEMPO:
                r = TEMPO[lid]
                best["audio"] = stretch(best["audio"], best["sr"], r)
                best["dur"] = len(best["audio"]) / best["sr"]
                tw = [dict(w, s=w["s"] / r, e=w["e"] / r) for w in tw]
            sf.write(f"{out_dir}/{lid}.wav", best["audio"], best["sr"])
            result[lid] = {"file": f"{lid}.wav", "dur": best["dur"], "words": tw, "asr": best["text"], "take": take}
        print(lid, "->", os.path.basename(best["path"]), "|", best["text"], "| score", round(best["score"], 2), flush=True)
    json.dump(result, open(f"{out_dir}/words.json", "w"), ensure_ascii=False, indent=1)
    json.dump(report, open(f"{out_dir}/takes_report.json", "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
