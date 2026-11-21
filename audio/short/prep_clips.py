"""Bereitet Gameplay-Clips für den Edit vor.

Eingang:  audio/short/clips_in/<name>.(mp4|mov|mkv|webm)
Ausgang:  public/clips/<name>.mp4   – OHNE Ton (Original-Musik/Stimme fliegt raus),
                                     H.264, max. 1080p, 60 fps CFR, kurze GOP für schnelles Seeken
          src/short/clips_auto.json  – pro Clip: Dauer + automatisch gefundene Action-Momente
                                       (Bewegungsenergie + Lautstärke-Spitzen im Originalton,
                                        z. B. Hit-/Explosions-Sounds)

Aufruf: python audio/short/prep_clips.py
"""
import glob
import json
import os
import subprocess

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
IN = f"{HERE}/clips_in"
OUT = f"{ROOT}/public/clips"
os.makedirs(OUT, exist_ok=True)


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height",
                        "-of", "json", path], capture_output=True, text=True, check=True)
    j = json.loads(r.stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    has_a = any(s["codec_type"] == "audio" for s in j["streams"])
    return float(j["format"]["duration"]), v["width"], v["height"], has_a


def motion_curve(path, fps=10):
    """Mittlere Pixeländerung pro Frame (kleine Graustufen-Version)."""
    w, h = 96, 54
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", f"fps={fps},scale={w}:{h},format=gray",
                        "-f", "rawvideo", "-"], capture_output=True, check=True)
    a = np.frombuffer(r.stdout, np.uint8).reshape(-1, h, w).astype(np.float32)
    d = np.abs(np.diff(a, axis=0)).mean(axis=(1, 2))
    return np.concatenate([[0], d]), fps


def loud_curve(path, fps=10):
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
                       capture_output=True, check=True)
    x = np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768
    hop = 8000 // fps
    n = len(x) // hop
    e = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1))
    on = np.maximum(0, np.diff(e, prepend=e[0]))
    return on


auto = {}
for src in sorted(glob.glob(f"{IN}/*")):
    if os.path.splitext(src)[1].lower() not in (".mp4", ".mov", ".mkv", ".webm", ".m4v"):
        continue
    name = os.path.splitext(os.path.basename(src))[0].replace(" ", "_")
    dst = f"{OUT}/{name}.mp4"
    dur, w, h, has_a = probe(src)
    if not os.path.exists(dst):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-an",
                        "-vf", "scale='min(1920,iw)':-2,fps=60", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
                        "-g", "12", "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst], check=True)
    mot, fps = motion_curve(dst)
    score = mot / (np.percentile(mot, 95) + 1e-6)
    if has_a:
        ld = loud_curve(src)
        ld = ld[: len(score)] / (np.percentile(ld, 98) + 1e-6)
        score[: len(ld)] += ld[: len(score)] * 1.2
    # Spitzen mit Mindestabstand 1,2 s
    order = np.argsort(-score)
    picks = []
    for i in order:
        if all(abs(i - p) > 1.2 * fps for p in picks) and 0.6 * fps < i < len(score) - 0.6 * fps:
            picks.append(int(i))
        if len(picks) >= 6:
            break
    auto[name] = {"file": f"clips/{name}.mp4", "duration": round(dur, 2), "size": [w, h],
                  "hits": [round(p / fps, 2) for p in sorted(picks)]}
    print(f"{name}: {dur:.1f}s {w}x{h} · Action-Momente: {auto[name]['hits']}")

json.dump(auto, open(f"{ROOT}/src/short/clips_auto.json", "w"), indent=1)
print(len(auto), "Clips vorbereitet")
