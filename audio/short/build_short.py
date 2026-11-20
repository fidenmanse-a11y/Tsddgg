"""Audio + Beat-Raster für den Revanchie-Phonk-Short.

Musik-Quelle (src/short/config.json -> "musicFile"):
  * leer / nicht vorhanden  -> eigener Beat audio/short/music/phonk_slowed.wav (Raster bekannt)
  * z. B. "audio/short/music/medusa.mp3" -> Beats + Drop werden automatisch erkannt (librosa).
    Optional "dropAt": Sekunde des Drops im Song, falls die Erkennung danebenliegt.

Schreibt: public/audio/short.wav, src/short/beats.json
Aufruf:   python audio/short/build_short.py
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
from dsp import SR, Bus, fade, impact, load, lp, reverb, sec, stereo, whoosh  # noqa: E402

CFG = json.load(open(f"{ROOT}/src/short/config.json"))
FPS = CFG["fps"]
DROP = CFG["dropBeat"]
TOTAL = CFG["totalBeats"]


def load_music(path):
    """Audio- ODER Videodatei (z. B. Bildschirmaufnahme .mp4/.mov) -> Stereo 48 kHz."""
    if os.path.splitext(path)[1].lower() not in (".wav", ".flac", ".ogg"):
        import subprocess
        import tempfile
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
if music_file and os.path.exists(music_path):
    import librosa

    song = load_music(music_path)
    mono = song.mean(0).astype(np.float32)
    y22 = librosa.resample(mono, orig_sr=SR, target_sr=22050)
    tempo, frames = librosa.beat.beat_track(y=y22, sr=22050, units="frames", tightness=120)
    beat_t = librosa.frames_to_time(frames, sr=22050)
    # Energie im Bassbereich pro Beat -> Drop = größter Energiesprung
    S = np.abs(librosa.stft(y22, n_fft=2048, hop_length=512))
    freqs = librosa.fft_frequencies(sr=22050, n_fft=2048)
    low = S[freqs < 150].sum(0)
    bt_frames = librosa.time_to_frames(beat_t, sr=22050, hop_length=512)
    e = np.array([low[a:b].mean() if b > a else 0 for a, b in zip(bt_frames[:-1], bt_frames[1:])])
    if CFG.get("dropAt") is not None:
        di = int(np.argmin(np.abs(beat_t - CFG["dropAt"])))
    else:
        # nur Drops, nach denen noch genug Song für den ganzen Edit kommt
        room = TOTAL - DROP
        score = [e[i:i + 8].mean() - e[max(0, i - 8):i].mean() if i >= DROP and i + room < len(beat_t) and i + 8 < len(e) else -1e9 for i in range(len(e))]
        di = int(np.argmax(score))
    start_i = di - DROP
    if start_i < 0 or start_i + TOTAL >= len(beat_t):
        raise SystemExit(f"Song zu kurz/Drop zu früh für {TOTAL} Beats (Drop-Beat {di}).")
    beats_s = beat_t[start_i: start_i + TOTAL + 1] - beat_t[start_i]
    music = song[:, sec(beat_t[start_i]): sec(beat_t[start_i + TOTAL]) + sec(0.5)]
    bpm = float(np.atleast_1d(tempo)[0])
    source = os.path.basename(music_file)
    print(f"Song: {source}, {bpm:.1f} BPM, Drop bei {beat_t[di]:.2f}s, Ausschnitt ab {beat_t[start_i]:.2f}s")
else:
    music = load(f"{HERE}/music/phonk_slowed.wav")
    bpm = CFG["bpm"]
    beats_s = np.arange(TOTAL + 1) * 60 / bpm
    source = "phonk_slowed.wav (eigener Beat)"
    print("Eigener Phonk-Beat,", bpm, "BPM")

length_s = float(beats_s[-1])
music = music[:, : sec(length_s)]
# Endet die Musik bei TOTAL hart, sanft ausblenden
music = fade(music, 0.005, 0.5)

beat = lambda i: float(np.interp(i, np.arange(len(beats_s)), beats_s))  # noqa: E731 (auch halbe Beats)

vox = Bus(length_s + 2)
sfx = Bus(length_s + 2)


def vo(path):
    a, sr = sf.read(path, dtype="float64")
    if a.ndim > 1:
        a = a.mean(1)
    if sr != SR:
        a = resample_poly(a, SR, sr)
    a = a / np.max(np.abs(a)) * 0.75
    return fade(a, 0.004, 0.03)


# Intro-Satz endet knapp vor dem Drop
intro = vo(f"{ROOT}/audio/short/vo/intro.wav")
intro_start = max(0.15, beat(DROP) - 0.3 - len(intro) / SR)
vox.add(reverb(stereo(intro), 0.8, 0.12, 7000, 4), intro_start, 1.0)
# Outro: "Das ist …" / "Revanchie!" auf den Endcard-Beat
O0 = DROP + 28
das = vo(f"{ROOT}/audio/vo/L12.wav")
rev = vo(f"{ROOT}/audio/vo/L13.wav")
vox.add(reverb(stereo(das), 2.0, 0.2, 5000, 4), beat(O0 + 0.5), 1.0)
logo_t = beat(O0 + 2.5)
vox.add(reverb(stereo(rev), 2.0, 0.2, 5000, 4), logo_t - 0.03, 1.1)

# SFX – sparsam, nur wo das Bild "einschlägt"
mc = lambda n, g=1.0: load(f"{ROOT}/audio/mc/{n}.ogg", g)  # noqa: E731
sfx.add(impact(1.4, 2.4), beat(DROP), 0.75)
sfx.add(mc("item_mace_smash_ground_heavy"), beat(DROP), 0.7)
sfx.add(whoosh(0.35, 250, 6000, -0.6, 0.6, 51), beat(DROP + 12) - 0.25, 0.45)
sfx.add(whoosh(0.3, 300, 7000, 0.6, -0.6, 52), beat(DROP + 20) - 0.2, 0.45)
sfx.add(impact(1.2, 2.0), beat(O0), 0.5)
sfx.add(mc("item_mace_smash_ground_heavy"), logo_t, 0.6)
sfx.add(mc("item_totem_use_totem"), logo_t + 0.05, 0.35)
sub_t = beat(O0 + 4.5)
click = lp(np.random.default_rng(1).standard_normal(sec(0.03)), 6000) * np.exp(-np.arange(sec(0.03)) / SR * 300) * 0.5
sfx.add(stereo(click), sub_t, 0.9)
sfx.add(mc("block_bell_bell_use01"), sub_t + 0.03, 0.45)

# Mix: Musik weicht der Stimme etwas aus
n = sec(length_s)
mus = np.zeros((2, n))
mus[:, : min(n, music.shape[1])] = music[:, :n]
venv = lp(np.abs(vox.x[:, :n]).max(0), 20, 1)
mus *= 1 - 0.45 * np.clip(venv / 0.1, 0, 1)
mix = mus * 0.9 + sfx.x[:, :n] * 0.7 + vox.x[:, :n] * 1.2

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

out = {
    "source": source,
    "bpm": round(bpm, 2),
    "dropBeat": DROP,
    "totalBeats": TOTAL,
    "beats": [round(float(t) * FPS, 2) for t in beats_s],  # Frames (Dezimal), Index = Beat
    "introVo": [round(intro_start * FPS, 1), round((intro_start + len(intro) / SR) * FPS, 1)],
    # "was" beginnt in intro.wav bei ~0,97 s (Whisper) -> Untertitel-Wechsel
    "introSplit": round((intro_start + CFG.get("introSplitSec", 0.97)) * FPS, 1),
    "logo": round(logo_t * FPS, 1),
    "subscribe": round(sub_t * FPS, 1),
    "durationInFrames": int(round(length_s * FPS)),
}
json.dump(out, open(f"{ROOT}/src/short/beats.json", "w"), indent=1)
print("OK", round(length_s, 2), "s,", out["durationInFrames"], "Frames")
