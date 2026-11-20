"""Kleine DSP-/Synth-Bibliothek für den Revanchie-Promo-Soundtrack.

Alles wird hier selbst synthetisiert (keine fremden Musik-Samples) – plus
originale Minecraft-Sounds aus dem offiziellen Asset-Index.
"""
from __future__ import annotations

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

SR = 48000
RNG = np.random.default_rng(7)


def sec(x: float) -> int:
    return int(round(x * SR))


def note_hz(name_or_midi) -> float:
    if isinstance(name_or_midi, (int, float)):
        m = name_or_midi
    else:
        names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
                 "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
        n = name_or_midi[:-1]
        o = int(name_or_midi[-1])
        m = 12 * (o + 1) + names[n]
    return 440.0 * 2 ** ((m - 69) / 12)


def midi(name: str) -> int:
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
             "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    return 12 * (int(name[-1]) + 1) + names[name[:-1]]


# ---------------------------------------------------------------- Filter

def lp(x, fc, order=2):
    sos = butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos")
    return sosfilt(sos, x, axis=-1)


def hp(x, fc, order=2):
    sos = butter(order, max(fc, 10), "high", fs=SR, output="sos")
    return sosfilt(sos, x, axis=-1)


def bp(x, lo, hi, order=2):
    sos = butter(order, [max(lo, 10), min(hi, SR * 0.45)], "band", fs=SR, output="sos")
    return sosfilt(sos, x, axis=-1)


def peak_eq(x, f0, gain_db, q=1.0):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / (2 * q)
    b0, b1, b2 = 1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A
    a0, a1, a2 = 1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A
    sos = np.array([[b0 / a0, b1 / a0, b2 / a0, 1, a1 / a0, a2 / a0]])
    return sosfilt(sos, x, axis=-1)


def svf_sweep(x, fc_curve, q=0.8, mode="bp"):
    """Zustandsvariables Filter mit zeitvariabler Grenzfrequenz (Chamberlin, 2x oversampled)."""
    fc_curve = np.broadcast_to(fc_curve, x.shape[-1:])
    y = np.zeros_like(x)
    mono = x.ndim == 1
    xs = x[None, :] if mono else x
    ys = y[None, :] if mono else y
    damp = 1.0 / q
    for ch in range(xs.shape[0]):
        low = band = 0.0
        xc = xs[ch]
        out = ys[ch]
        f_arr = 2 * np.sin(np.pi * np.clip(fc_curve, 20, SR * 0.22) / (SR * 2))
        for i in range(xc.shape[0]):
            f = f_arr[i]
            for _ in range(2):
                high = xc[i] - low - damp * band
                band += f * high
                low += f * band
            out[i] = band if mode == "bp" else (low if mode == "lp" else high)
    return y


# ---------------------------------------------------------------- Hüllkurven & Utils

def env_adsr(n, a=0.005, d=0.1, s=0.7, r=0.1, total=None):
    total = n if total is None else total
    t = np.arange(n) / SR
    e = np.ones(n) * s
    an = sec(a)
    dn = sec(d)
    rn = sec(r)
    e[:an] = np.linspace(0, 1, an, endpoint=False) if an else e[:an]
    if dn:
        seg = slice(an, min(n, an + dn))
        e[seg] = 1 - (1 - s) * np.linspace(0, 1, seg.stop - seg.start)
    if rn and n > rn:
        e[-rn:] *= np.linspace(1, 0, rn)
    return e


def exp_dec(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def stereo(x, pan=0.0, width=0.0):
    """pan -1..1 (gleichleistungs), width: Haas-Verzögerung in ms auf eine Seite"""
    if x.ndim == 2:
        return x
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    L = x * l * 1.4142
    R = x * r * 1.4142
    if width > 0:
        d = sec(width / 1000)
        R = np.concatenate([np.zeros(d), R[:-d]]) if d < len(R) else R
    return np.stack([L, R])


def saturate(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


def noise(n):
    return RNG.standard_normal(n)


def fade(x, fin=0.002, fout=0.01):
    x = x.copy()
    a = min(sec(fin), x.shape[-1])
    b = min(sec(fout), x.shape[-1])
    if a:
        x[..., :a] *= np.linspace(0, 1, a)
    if b:
        x[..., -b:] *= np.linspace(1, 0, b)
    return x


def load(path, gain=1.0):
    a, sr = sf.read(path, dtype="float64", always_2d=True)
    a = a.T
    if sr != SR:
        a = resample_poly(a, SR, sr, axis=-1)
    if a.shape[0] == 1:
        a = np.vstack([a, a])
    return a * gain


def pitch_resample(x, ratio):
    """Tonhöhe per Resampling (ändert auch Länge) – wie ein Sampler."""
    from fractions import Fraction
    fr = Fraction(1 / ratio).limit_denominator(400)
    return resample_poly(x, fr.numerator, fr.denominator, axis=-1)


# ---------------------------------------------------------------- Reverb

def _ir(seconds, damp_hz=6000, seed=1, predelay=0.012):
    rng = np.random.default_rng(seed)
    n = sec(seconds)
    t = np.arange(n) / SR
    env = np.exp(-6.9 * t / seconds)
    ir = np.stack([rng.standard_normal(n) * env, rng.standard_normal(n) * env])
    ir = lp(ir, damp_hz, 1)
    pd = sec(predelay)
    ir = np.concatenate([np.zeros((2, pd)), ir], axis=1)
    ir[:, pd] += 0.0
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


_IR_CACHE: dict = {}


def reverb(x, seconds=1.6, mix=0.25, damp=6000, seed=1):
    key = (seconds, damp, seed)
    if key not in _IR_CACHE:
        _IR_CACHE[key] = _ir(seconds, damp, seed)
    ir = _IR_CACHE[key]
    xs = stereo(x) if x.ndim == 1 else x
    wet = np.stack([fftconvolve(xs[0], ir[0]), fftconvolve(xs[1], ir[1])])
    out = np.zeros_like(wet)
    out[:, : xs.shape[1]] += xs * (1 - mix * 0.5)
    out += wet * mix * 0.35
    return out


# ---------------------------------------------------------------- Oszillatoren

def additive_saw(freq, n, cutoff=None, detune_cents=(0,), max_h=60, phase_seed=0):
    """Bandbegrenzter Sägezahn mit (optional zeitvariabler) Tiefpass-Hüllkurve über Harmonische."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    rng = np.random.default_rng(phase_seed)
    for dc in detune_cents:
        f = freq * 2 ** (dc / 1200)
        H = int(min(max_h, (SR * 0.45) // f))
        ph0 = rng.uniform(0, 2 * np.pi)
        for k in range(1, H + 1):
            g = 1.0 / k
            if cutoff is not None:
                g = g / (1 + (k * f / cutoff) ** 4)
            if np.max(np.atleast_1d(g)) < 1e-4:
                break
            out += g * np.sin(2 * np.pi * k * f * t + ph0 * k)
    return out / len(detune_cents)


def sine_sweep(f0, f1, n, curve="exp"):
    t = np.linspace(0, 1, n)
    f = f0 * (f1 / f0) ** t if curve == "exp" else f0 + (f1 - f0) * t
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph)


# ---------------------------------------------------------------- Drums

def kick(punch=1.0, length=0.45):
    n = sec(length)
    t = np.arange(n) / SR
    f = 48 + 120 * np.exp(-t * 32) * punch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = hp(noise(n), 3000) * np.exp(-t * 380) * 0.35
    return saturate(body + click, 1.6)


def k808(freq, dur, glide_from=None, drive=2.2):
    n = sec(dur + 0.08)
    t = np.arange(n) / SR
    if glide_from:
        f = freq + (glide_from - freq) * np.exp(-t * 18)
    else:
        f = np.full(n, freq)
    f = f * (1 + 0.9 * np.exp(-t * 45))  # Attack-Pitch
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.18 * np.sin(2 * ph)
    e = np.minimum(1, t / 0.004) * np.exp(-t * 1.1)
    rel = sec(0.06)
    e[-rel:] *= np.linspace(1, 0, rel)
    return saturate(x * e, drive) * 0.9


def clap():
    n = sec(0.5)
    t = np.arange(n) / SR
    nz = bp(noise(n), 900, 4200)
    e = np.zeros(n)
    for o in (0.0, 0.011, 0.022):
        e += np.where(t >= o, np.exp(-(t - o) * 90), 0)
    e += np.where(t >= 0.03, np.exp(-(t - 0.03) * 16) * 0.6, 0)
    return nz * e * 0.9


def snare():
    n = sec(0.35)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28) * 0.7
    nz = bp(noise(n), 1500, 9000) * np.exp(-t * 18)
    return saturate(tone + nz, 1.3) * 0.8


def hat(open_=False):
    n = sec(0.32 if open_ else 0.06)
    t = np.arange(n) / SR
    x = hp(noise(n), 7500, 4) * np.exp(-t * (11 if open_ else 75))
    return x * 0.55


def tom_taiko(freq=62):
    n = sec(1.4)
    t = np.arange(n) / SR
    f = freq + 60 * np.exp(-t * 20)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    skin = lp(noise(n), 900) * np.exp(-t * 30) * 0.8
    return saturate(body * 1.2 + skin, 1.8)


# ---------------------------------------------------------------- Cinematic SFX

def impact(size=1.0, length=2.6):
    n = sec(length)
    t = np.arange(n) / SR
    sub = sine_sweep(120, 26, n) * np.exp(-t * (1.6 / size)) * 1.1
    crack = hp(noise(n), 1800) * np.exp(-t * 40) * 0.7
    body = lp(noise(n), 400) * np.exp(-t * 9) * 0.9
    x = saturate(sub + crack + body, 1.8)
    return reverb(x, 2.8, 0.35, 4500, seed=3)


def whoosh(dur=0.5, lo=250, hi=5000, pan_from=-0.8, pan_to=0.8, seed=0):
    n = sec(dur)
    u = np.linspace(0, 1, n)
    bell = np.sin(np.pi * u) ** 2.2
    fc = lo + (hi - lo) * np.sin(np.pi * np.clip(u * 1.1, 0, 1)) ** 1.5
    x = svf_sweep(np.random.default_rng(seed).standard_normal(n), fc, q=1.6, mode="bp") * bell
    x = x / (np.max(np.abs(x)) + 1e-9)
    # Pan-Bewegung
    pan = pan_from + (pan_to - pan_from) * u
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l, x * r]) * 1.2


def riser(dur=3.0, f0=180, f1=2400, seed=4):
    n = sec(dur)
    u = np.linspace(0, 1, n)
    fc = 300 * (9000 / 300) ** (u ** 1.3)
    nz = svf_sweep(np.random.default_rng(seed).standard_normal(n), fc, q=1.2, mode="bp")
    nz /= np.max(np.abs(nz)) + 1e-9
    tone = np.zeros(n)
    for d in (-12, 0, 9):
        f = f0 * 2 ** (d / 1200) * (f1 / f0) ** (u ** 1.6)
        ph = 2 * np.pi * np.cumsum(f) / SR
        tone += np.sign(np.sin(ph)) * 0.15 + np.sin(2 * ph) * 0.1
    tone = lp(tone, 5000)
    amp = u ** 2.2
    x = (nz * 0.7 + tone * 0.4) * amp
    return stereo(x, 0, 12)


def reverse_cymbal(dur=1.2):
    n = sec(dur)
    u = np.linspace(0, 1, n)
    x = hp(noise(n), 4500, 2) * (np.exp(u * 5) - 1) / (np.e ** 5 - 1)
    x = np.stack([x, np.roll(x, 37)])
    return x * 0.8


def braam(root="F1", dur=3.5, open_time=0.25):
    n = sec(dur)
    t = np.arange(n) / SR
    cutoff = 120 + 2600 * (1 - np.exp(-t / open_time)) * np.exp(-t / (dur * 0.55))
    x = np.zeros(n)
    r = note_hz(root)
    for mult, g in ((1, 1.0), (2, 0.8), (3, 0.45), (4, 0.3)):
        x += additive_saw(r * mult, n, cutoff, detune_cents=(-11, 0, 9), max_h=40, phase_seed=mult) * g
    x *= np.minimum(1, t / 0.02) * np.exp(-t / (dur * 0.6))
    x = saturate(x * 0.9, 2.6)
    return reverb(stereo(x, 0, 14), 3.2, 0.4, 3500, seed=5) * 0.9


def heartbeat():
    a = lp(kick(0.4, 0.4), 200) * 1.1
    out = np.zeros(sec(0.75))
    out[: len(a)] += a
    out[sec(0.22): sec(0.22) + len(a)] += a * 0.7
    return out


def mouse_click():
    n = sec(0.03)
    t = np.arange(n) / SR
    return hp(noise(n), 2000) * np.exp(-t * 400) * 0.6 + np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 600) * 0.3


# ---------------------------------------------------------------- Mix-Helfer

class Bus:
    def __init__(self, total_s):
        self.n = sec(total_s)
        self.x = np.zeros((2, self.n))

    def add(self, sig, t, gain=1.0, pan=0.0):
        s = stereo(sig, pan) if sig.ndim == 1 else sig
        i = sec(t)
        if i >= self.n:
            return
        if i < 0:
            s = s[:, -i:]
            i = 0
        m = min(s.shape[1], self.n - i)
        self.x[:, i:i + m] += s[:, :m] * gain


def tape_stop(seg, dur=0.45):
    """Bandstopp: Wiedergabegeschwindigkeit fällt auf 0."""
    n_out = sec(dur)
    u = np.linspace(0, 1, n_out)
    rate = (1 - u) ** 1.6
    pos = np.cumsum(rate)
    pos = pos / pos[-1] * min(seg.shape[1] - 2, np.sum(rate))
    out = np.stack([np.interp(pos, np.arange(seg.shape[1]), seg[c]) for c in range(2)])
    out *= np.linspace(1, 0.0, n_out) ** 0.5
    return lp(out, 6000)


def stutter(seg, slice_s=0.045, reps=6):
    sl = seg[:, : sec(slice_s)]
    sl = fade(sl, 0.001, 0.004)
    return np.concatenate([sl] * reps, axis=1)


def bitcrush(x, bits=6, down=6):
    q = 2 ** bits
    y = np.round(x * q) / q
    y = np.repeat(y[:, ::down], down, axis=1)[:, : x.shape[1]]
    return y
