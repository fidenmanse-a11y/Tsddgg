"""Audio + Beat-Raster für den Revanchie-Phonk-Short.

src/short/config.json:
  musicFile   leer -> eigener Beat (audio/short/music/phonk_slowed.wav)
              sonst Audio- ODER Videodatei (z. B. Bildschirmaufnahme .mp4); Beats werden erkannt (librosa)
  unit        "seconds" (Zeiten im Song / in der Aufnahme) oder "beats" (Index der erkannten Beats)
  sections    [[Art, Start], ...]  Art: intro | A (Schnitt alle 2 Beats) | R (jeder Beat) | S (3D-Karte) | O (Logo/Endcard)
  steps       Schnitt-Abstand in Beats je Art
  end         Ende (gleiche Einheit), optional
  ownBeatSections / ownBeatEnd   Abschnitte für den eigenen Beat (in Beats)

Schreibt: public/audio/short.wav, src/short/beats.json
Aufruf:   python audio/short/build_short.py
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
from dsp import SR, Bus, fade, impact, load, lp, reverb, sec, stereo, whoosh  # noqa: E402

CFG = json.load(open(f"{ROOT}/src/short/config.json"))
FPS = CFG["fps"]


def load_music(path):
    """Audio- ODER Videodatei -> Stereo 48 kHz."""
    if os.path.splitext(path)[1].lower() not in (".wav", ".flac", ".ogg"):
        tmp = os.path.join(tempfile.mkdtemp(), "music.wav")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-vn", "-ac", "2", "-ar", str(SR), tmp], check=True)
        path = tmp
    a, sr = sf.read(path, dtype="float64", always_2d=True)
    a = a.T
    if a.shape[0] == 1:
        a = np.vstack([a, a])
    if sr != SR:
        a = resample_poly(a, SR, sr, axis=1)
    return a


music_file = CFG.get("musicFile") or ""
music_path = music_file if os.path.isabs(music_file) else f"{ROOT}/{music_file}"
real_song = bool(music_file) and os.path.exists(music_path)

if real_song:
    import librosa

    song = load_music(music_path)
    y22 = librosa.resample(song.mean(0).astype(np.float32), orig_sr=SR, target_sr=22050)
    tempo, frames = librosa.beat.beat_track(y=y22, sr=22050, units="frames", tightness=120)
    beat_t = librosa.frames_to_time(frames, sr=22050)
    bpm = float(np.atleast_1d(tempo)[0])
    source = os.path.basename(music_file)
    song_len = song.shape[1] / SR
    # Zeiten (Sekunden im Song) auf den nächsten erkannten Beat einrasten
    snap = lambda s: int(np.argmin(np.abs(beat_t - s)))  # noqa: E731
    as_idx = (lambda v: snap(v)) if CFG.get("unit", "seconds") == "seconds" else (lambda v: int(v))
    secs = [[e[0], as_idx(e[1])] + list(e[2:]) for e in CFG["sections"]]
    first = secs[0][1]
    end_i = as_idx(CFG["end"]) if CFG.get("end") else len(beat_t) - 1
    t0 = beat_t[first]
    beats_s = beat_t[first: end_i + 1] - t0
    print(f"Song: {source} · {bpm:.1f} BPM · Ausschnitt ab {t0:.2f}s · Abschnitte (Song-Sek.): "
          + ", ".join(f"{e[0]}@{beat_t[e[1]]:.2f}" for e in secs))
    secs = [[e[0], e[1] - first] + list(e[2:]) for e in secs]
    end_s = min(beats_s[-1] + 0.25, song_len - t0)
    music = song[:, sec(t0): sec(t0 + end_s)]
else:
    music = load(f"{HERE}/music/phonk_slowed.wav")
    bpm = 112.5
    n = int(CFG.get("ownBeatEnd", 42))
    beats_s = np.arange(n + 1) * 60 / bpm
    secs = [[e[0], int(e[1])] + list(e[2:]) for e in CFG.get("ownBeatSections", [["intro", 0], ["A", 8], ["S", 20], ["R", 28], ["O", 36]])]
    end_s = beats_s[-1]
    source = "phonk_slowed.wav (eigener Beat)"
    print("Eigener Phonk-Beat,", bpm, "BPM")

n_beats = len(beats_s) - 1
bounds = [e[1] for e in secs] + [n_beats]
steps = CFG.get("steps", {"intro": 4, "A": 2, "R": 1, "S": 4})
if not real_song:
    steps = CFG.get("ownBeatSteps", {"intro": 8, "A": 1, "R": 0.5, "S": 2})
sections = [{"kind": e[0], "from": e[1], "to": bounds[j + 1], "step": e[2] if len(e) > 2 else steps.get(e[0], 1)} for j, e in enumerate(secs)]


def beat(i):
    return float(np.interp(i, np.arange(len(beats_s)), beats_s))


def sect(kind):
    return next((s for s in sections if s["kind"] == kind), None)


music = fade(music[:, : sec(end_s)], 0.005, 0.35)
length_s = music.shape[1] / SR
vox = Bus(length_s + 2)
sfx = Bus(length_s + 2)


def vo(path):
    a, sr = sf.read(path, dtype="float64")
    if a.ndim > 1:
        a = a.mean(1)
    if sr != SR:
        a = resample_poly(a, SR, sr)
    return fade(a / np.max(np.abs(a)) * 0.75, 0.004, 0.03)


sfx_gain = 0.5 if real_song else 0.75

USE_VOICE = CFG.get("voice", True)
USE_SFX = CFG.get("sfx", True)
# Intro-Satz: bei langem Intro gleich am Anfang, sonst knapp vor dem ersten Drop
intro = vo(f"{ROOT}/audio/short/vo/intro.wav")
first_cut = beat(sections[1]["from"])
intro_start = 0.25 if first_cut > 5 else max(0.15, first_cut - 0.3 - len(intro) / SR)
if USE_VOICE:
    vox.add(reverb(stereo(intro), 0.8, 0.12, 7000, 4), intro_start, 1.0)

# Outro: "Das ist …" endet knapp vor dem Logo, "Revanchie!" auf dem Logo-Beat
O = sect("O")
logo_t = beat(O["from"])
das = vo(f"{ROOT}/audio/vo/L12.wav")
rev = vo(f"{ROOT}/audio/vo/L13.wav")
das_t = logo_t - 0.12 - len(das) / SR
if USE_VOICE:
    vox.add(reverb(stereo(das), 2.0, 0.2, 5000, 4), das_t, 1.0)
    vox.add(reverb(stereo(rev), 2.0, 0.2, 5000, 4), logo_t - 0.03, 1.1)
sub_t = min(beat(O["from"] + 3), length_s - 0.5)

# SFX – sparsam, der Song soll tragen
mc = lambda n, g=1.0: load(f"{ROOT}/audio/mc/{n}.ogg", g)  # noqa: E731
A = sect("A")
sfx.add(impact(1.4, 2.4), beat(A["from"]), 0.9 * sfx_gain)
sfx.add(mc("item_mace_smash_ground_heavy"), beat(A["from"]), 0.9 * sfx_gain)
for k in ("R", "S"):
    s = sect(k)
    if s:
        sfx.add(whoosh(0.35, 250, 6000, -0.6, 0.6, 50 + int(s["from"])), beat(s["from"]) - 0.25, 0.6 * sfx_gain)
sfx.add(impact(1.6, 2.0), logo_t, 0.8 * sfx_gain)
sfx.add(mc("item_mace_smash_ground_heavy"), logo_t, 0.9 * sfx_gain)
sfx.add(mc("item_totem_use_totem"), logo_t + 0.05, 0.5 * sfx_gain)
click = lp(np.random.default_rng(1).standard_normal(sec(0.03)), 6000) * np.exp(-np.arange(sec(0.03)) / SR * 300) * 0.5
sfx.add(stereo(click), sub_t, 0.9)
sfx.add(mc("block_bell_bell_use01"), sub_t + 0.03, 0.5)

if not USE_SFX:
    sfx.x[:] = 0

# Mix
n = music.shape[1]
venv = lp(np.abs(vox.x[:, :n]).max(0), 20, 1)
mus = music * (1 - 0.4 * np.clip(venv / 0.1, 0, 1))
mix = mus * 0.9 + sfx.x[:, :n] * 0.7 + vox.x[:, :n] * 1.25
try:
    import pyloudnorm as pyln

    loud = pyln.Meter(SR).integrated_loudness(mix.T)
    mix *= 10 ** ((-14 - loud) / 20)
except Exception:
    mix = mix / np.max(np.abs(mix)) * 0.8
ceil = 10 ** (-1.2 / 20)
mix = np.tanh(mix / ceil) * ceil
os.makedirs(f"{ROOT}/public/audio", exist_ok=True)
sf.write(f"{ROOT}/public/audio/short.wav", mix.T, SR, subtype="PCM_24")

def envelopes(x):
    """Kick- (<120 Hz) und Snare/Clap-Hüllkurve (1,5–6 kHz) pro Video-Frame, 0..1."""
    from scipy.signal import butter, sosfilt
    mono = x.mean(0)
    hop = SR // FPS
    nfr = mono.shape[0] // hop
    out = {}
    for name, sos in (("kick", butter(4, 120, "low", fs=SR, output="sos")),
                      ("snare", butter(4, [1500, 6000], "band", fs=SR, output="sos"))):
        band = sosfilt(sos, mono)
        e = np.sqrt(np.add.reduceat(band[: nfr * hop] ** 2, np.arange(0, nfr * hop, hop)) / hop)
        on = np.maximum(0, np.diff(e, prepend=e[0]))           # Anstieg = Onset
        on = on / (np.percentile(on, 99.5) + 1e-9)
        env = np.zeros(nfr)
        acc = 0.0
        for i in range(nfr):                                   # sofortiger Attack, exponentieller Release
            acc = max(on[i], acc * np.exp(-1 / 6))
            env[i] = min(1.0, acc)
        out[name] = [round(float(v), 3) for v in env]
    return out


f = lambda s: round(s * FPS, 1)  # noqa: E731
out = {
    "source": source,
    "bpm": round(bpm, 2),
    "beats": [round(float(t) * FPS, 2) for t in beats_s],
    "sections": sections,
    "introVo": [f(intro_start), f(intro_start + len(intro) / SR)],
    "introSplit": f(intro_start + CFG.get("introSplitSec", 0.97)),
    "dasIst": [f(das_t), f(das_t + len(das) / SR)],
    "logo": f(logo_t),
    "subscribe": f(sub_t),
    "durationInFrames": int(round(length_s * FPS)),
    "voice": USE_VOICE,
    "env": envelopes(music),
}
# Clip-Edit: Abfolge aus Thumbnails + Gameplay-Clips auf Beats legen
def place(items, start_beat, limit):
    res = []
    b = start_beat
    for it in items:
        n = float(it.get("beats", 2))
        if b + n > limit + 1e-6:
            print("WARNUNG: Abfolge länger als Platz bis Beat", limit, "– Rest weggelassen")
            break
        res.append(dict(it, **{"from": b, "to": b + n}))
        b += n
    if b < limit - 1e-6:
        print(f"Hinweis: Abfolge endet bei Beat {b}, Platz bis {limit}")
    return res


if CFG.get("edit"):
    intro_s = sections[0]
    drop_b = sections[1]["from"]
    out["introItems"] = place(CFG.get("introEdit", []), intro_s["from"], drop_b)
    out["items"] = place(CFG["edit"], drop_b, O["from"])
    out["dropBeat"] = drop_b
    out["outBeat"] = O["from"]
    auto_path = f"{ROOT}/src/short/clips_auto.json"
    out["clips"] = json.load(open(auto_path)) if os.path.exists(auto_path) else {}

json.dump(out, open(f"{ROOT}/src/short/beats.json", "w"), indent=1)
print("OK", round(length_s, 2), "s,", out["durationInFrames"], "Frames ·", [(s["kind"], s["from"], s["to"], s["step"]) for s in sections])
