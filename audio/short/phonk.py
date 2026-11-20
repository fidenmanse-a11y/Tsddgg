"""Eigener Slowed-Phonk-Beat für den Revanchie-Short (keine fremden Samples).

Wird mit 132,35 BPM produziert und dann auf 85 % "geslowed" (Tempo + Tonhöhe
gemeinsam, wie bei echten Slowed-Edits) -> 112,5 BPM = 32 Frames/Beat @ 60 fps.

Schreibt: audio/short/music/phonk_slowed.wav
"""
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from dsp import (SR, Bus, additive_saw, bp, exp_dec, fade, hp, kick, lp, midi, noise, note_hz,  # noqa: E402
                 reverb, reverse_cymbal, riser, saturate, sec, stereo)

SLOW = 0.85
BPM_TARGET = 112.5
BPM = BPM_TARGET / SLOW
B = 60 / BPM            # Beat (vor dem Slowen)
S16 = B / 4

INTRO = 8               # Beats bis zum Drop
TOTAL = 42              # Beats gesamt
DROP = INTRO


def tb(beat):
    return beat * B


def cowbell(m, dur=0.32, bright=1.0):
    """808-Cowbell, tonal gespielt: zwei Rechtecke im Verhältnis 1:1.48."""
    n = sec(dur)
    t = np.arange(n) / SR
    f1 = note_hz(m)
    f2 = f1 * 1.48
    x = np.sign(np.sin(2 * np.pi * f1 * t)) + np.sign(np.sin(2 * np.pi * f2 * t)) * 0.8
    x = bp(x, 500, 4200 * bright)
    e = 0.65 * np.exp(-t * 55) + 0.35 * np.exp(-t * 7.5)
    return saturate(x * e * 0.6, 1.4)


def k808(m, dur, glide_from=None):
    n = sec(dur + 0.1)
    t = np.arange(n) / SR
    f = np.full(n, note_hz(m))
    if glide_from is not None:
        f = note_hz(m) + (note_hz(glide_from) - note_hz(m)) * np.exp(-t * 14)
    f = f * (1 + 0.7 * np.exp(-t * 40))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.25 * np.sin(2 * ph)
    e = np.minimum(1, t / 0.004) * np.exp(-t * 0.9)
    rel = sec(0.07)
    e[-rel:] *= np.linspace(1, 0, rel)
    # Phonk: hart übersteuert, dann wieder etwas gezähmt
    y = saturate(x * e * 1.0, 4.5)
    return lp(y, 2600) * 0.75


def snare_phonk():
    n = sec(0.42)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 210 * t) * np.exp(-t * 26) * 0.6
    nz = bp(noise(n), 1200, 9000) * (0.7 * np.exp(-t * 30) + 0.3 * np.exp(-t * 9))
    clap = bp(noise(n), 900, 3500)
    ce = sum(np.where(t >= o, np.exp(-(t - o) * 110), 0) for o in (0, 0.009, 0.018))
    return saturate(body + nz + clap * ce * 0.6, 1.8) * 0.85


def hat(open_=False):
    n = sec(0.28 if open_ else 0.05)
    t = np.arange(n) / SR
    return hp(noise(n), 8000, 4) * np.exp(-t * (12 if open_ else 90)) * 0.5


KICK = saturate(kick(1.1, 0.42) * 1.2, 1.6)
SNARE = snare_phonk()
HAT = hat()
OHAT = hat(True)

# Tonart fis-Moll. Riff über 2 Takte (32 Sechzehntel): (Schritt, MIDI)
RIFF = [
    (0, "F#5"), (3, "F#5"), (6, "A5"), (8, "G#5"), (10, "F#5"), (12, "E5"), (14, "F#5"),
    (16, "F#5"), (19, "F#5"), (22, "A5"), (24, "C#6"), (26, "B5"), (28, "A5"), (29, "G#5"), (30, "E5"),
]
BASS = ["F#1", "F#1", "D1", "E1"]  # pro Takt


def place_riff(bus, b0, b1, gain=1.0, octave=0, bright=1.0):
    b = b0
    while b < b1:
        for step, name in RIFF:
            t = tb(b) + step * S16
            if t >= tb(b1):
                break
            bus.add(cowbell(midi(name) + octave, 0.3, bright), t, 0.42 * gain, -0.15 if step % 2 else 0.15)
        b += 8


def place_drums(bus, b0, b1, gain=1.0, dense=False, half=False):
    b = b0
    while b < b1:
        bar = int((b - DROP) // 4)
        for step in range(16):
            t = tb(b) + step * S16
            if t >= tb(b1):
                break
            if half:
                if step == 0:
                    bus.add(KICK, t, 0.9 * gain)
                if step == 8 and bar % 2 == 1:
                    bus.add(SNARE, t, 0.6 * gain)
                continue
            if step in (0, 6, 10) or (dense and step == 13):
                bus.add(KICK, t, 0.95 * gain)
            if step == 8:
                bus.add(SNARE, t, 0.85 * gain)
            # Memphis-Hats: 8tel, am Ende jedes 2. Takts Triolen-Roll
            if bar % 2 == 1 and step >= 12:
                if step == 12:
                    for k in range(6):
                        bus.add(HAT, t + k * (B / 3) * 0.5, 0.3 * gain, 0.3)
            elif step % 2 == 0 or dense:
                bus.add(HAT, t, (0.34 if step % 4 == 2 else 0.24) * gain, 0.3)
            if step == 14 and bar % 2 == 0:
                bus.add(OHAT, t, 0.22 * gain, -0.3)
        b += 4


def place_bass(bus, b0, b1, gain=1.0, long_=False):
    b = b0
    while b < b1:
        bar = int((b - DROP) // 4)
        root = midi(BASS[bar % 4]) + 12
        if long_:
            bus.add(k808(root, 4 * B), tb(b), 0.8 * gain)
        else:
            bus.add(k808(root, 1.4 * B), tb(b), 0.85 * gain)
            bus.add(k808(root, 0.9 * B, glide_from=root + 12), tb(b) + 6 * S16, 0.7 * gain)
            bus.add(k808(root, 0.8 * B), tb(b) + 10 * S16, 0.6 * gain)
        b += 4


def main():
    total_s = tb(TOTAL) + 3
    drums = Bus(total_s)
    bass = Bus(total_s)
    melo = Bus(total_s)
    fx = Bus(total_s)

    # Abschnitte (in Beats, siehe src/short/config.json)
    A0, A1 = DROP, DROP + 12        # Drop: volle Energie
    S0, S1 = DROP + 12, DROP + 20   # "Slow"-Teil: halbe Drums, lange 808
    R0, R1 = DROP + 20, DROP + 28   # Rapid: alles dichter
    O0 = DROP + 28                  # Outro / Endcard

    # Intro: Riff gefiltert + Vinyl, Riser in den Drop
    intro = Bus(total_s)
    place_riff(intro, 0, DROP, 0.9, 0, 0.6)
    intro.x = lp(intro.x, 1100)
    melo.x += intro.x
    fx.add(riser(tb(3), 180, 2200, 21), tb(DROP - 3), 0.35)
    fx.add(reverse_cymbal(tb(2)), tb(DROP - 2), 0.5)

    place_riff(melo, A0, R1, 1.0)
    place_riff(melo, R0, R1, 0.45, 12)
    place_drums(drums, A0, A1)
    place_drums(drums, S0, S1, half=True)
    place_drums(drums, R0, R1, dense=True)
    place_bass(bass, A0, A1)
    place_bass(bass, S0, S1, long_=True)
    place_bass(bass, R0, R1)

    # Outro: Riff gefiltert, ein langer 808, Ausklang
    outro = Bus(total_s)
    place_riff(outro, O0, TOTAL, 0.8, 0, 0.5)
    outro.x = lp(outro.x, 900)
    melo.x += outro.x
    bass.add(k808(midi("F#1") + 12, 6 * B), tb(O0), 0.9)
    drums.add(KICK, tb(O0), 1.0)

    # Stille-Lücke direkt vor dem Drop (halber Beat)
    g0, g1 = sec(tb(DROP - 0.5)), sec(tb(DROP))
    for bus_ in (melo, drums, bass):
        bus_.x[:, g0:g1] *= np.linspace(1, 0, g1 - g0) ** 3

    # Sidechain: Melodie atmet mit der Kick
    env = np.abs(drums.x).max(0)
    duck = 1 - 0.35 * np.clip(lp(env, 12, 1) / 0.4, 0, 1)
    melo.x *= duck

    mix = drums.x * 0.9 + bass.x * 0.95 + reverb(melo.x, 1.8, 0.35, 5000, 3)[:, : drums.x.shape[1]] * 0.85 + fx.x * 0.8
    mix = saturate(mix * 0.9, 1.2)

    # --- SLOWED + REVERB
    slowed = resample_poly(mix, 20, 17, axis=1)          # 85 % Tempo und Tonhöhe
    slowed = reverb(slowed, 2.6, 0.32, 6500, 7)
    slowed = lp(slowed, 11000)
    crackle = (np.random.default_rng(3).random(slowed.shape[1]) > 0.9993) * np.random.default_rng(4).standard_normal(slowed.shape[1]) * 0.08
    slowed += np.stack([crackle, np.roll(crackle, 300)]) + 0.004 * lp(noise(slowed.shape[1]), 3000)
    length = sec(TOTAL * 60 / BPM_TARGET)
    slowed = slowed[:, :length]
    slowed = fade(slowed, 0.01, 0.6)
    slowed = slowed / np.max(np.abs(slowed)) * 0.89
    os.makedirs(f"{HERE}/music", exist_ok=True)
    sf.write(f"{HERE}/music/phonk_slowed.wav", slowed.T, SR, subtype="PCM_24")
    print("phonk_slowed.wav", round(slowed.shape[1] / SR, 2), "s @", BPM_TARGET, "BPM")


if __name__ == "__main__":
    main()
