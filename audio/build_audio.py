"""Baut den kompletten Soundtrack (Musik + Voiceover + SFX) und die Wort-Timings.

Liest:   src/timeline.json, audio/vo/words.json, audio/vo/*.wav, audio/mc/*.ogg
Schreibt: public/audio/master.wav, src/vo-data.json

Aufruf (aus dem Repo-Root):  python audio/build_audio.py
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
from dsp import *  # noqa: E402,F403

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(f"{ROOT}/src/timeline.json"))
VOW = json.load(open(f"{ROOT}/audio/vo/words.json"))
FPS = TL["fps"]
BEAT_S = 60 / TL["bpm"]
TOTAL_S = TL["totalBeats"] * BEAT_S


def tb(beats):
    return beats * BEAT_S


def fr(seconds):
    return int(round(seconds * FPS))


SEC = {k: (tb(a), tb(b)) for k, (a, b) in TL["sections"].items()}
HIT = {k: tb(v) for k, v in TL["hits"].items()}

# ------------------------------------------------------------------ VO platzieren
VO = {}
for it in TL["vo"]:
    lid = it["id"]
    w = VOW[lid]
    anchor = w["words"][it["word"]]["s"] if "word" in it else 0.0
    start = tb(it["at"]) - anchor
    VO[lid] = dict(start=start, end=start + w["dur"], words=[dict(w=x["w"], s=start + x["s"], e=start + x["e"]) for x in w["words"]], spec=it)


def ws(lid, i):
    return VO[lid]["words"][i]["s"]


def we(lid, i):
    return VO[lid]["words"][i]["e"]


def ls(lid):
    return VO[lid]["start"]


def le(lid):
    return VO[lid]["end"]


vo_data = {
    "lines": {
        lid: {
            "id": lid,
            "start": fr(v["start"]),
            "end": fr(v["end"]),
            "words": [{"w": x["w"], "s": fr(x["s"]), "e": fr(x["e"])} for x in v["words"]],
        }
        for lid, v in VO.items()
    }
}
json.dump(vo_data, open(f"{ROOT}/src/vo-data.json", "w"), ensure_ascii=False, indent=1)

# ------------------------------------------------------------------ Busse
music = Bus(TOTAL_S + 4)
sfx = Bus(TOTAL_S + 4)
vox = Bus(TOTAL_S + 4)

MC = f"{ROOT}/audio/mc"


def mc(name, gain=1.0):
    return load(f"{MC}/{name}.ogg", gain)


PLING = load(f"{MC}/note_pling.ogg")[0]
BASSNB = load(f"{MC}/note_bass.ogg")[0]


def pling(m, dur=0.5):
    """Notenblock-'Pling' (natives Sample = F#4, MIDI 66)"""
    x = pitch_resample(PLING, 2 ** ((m - 66) / 12))
    x = x[: sec(dur + 0.25)]
    return fade(x, 0.001, 0.12)


def nbass(m, dur=0.4):
    x = pitch_resample(BASSNB, 2 ** ((m - 54) / 12))
    return fade(x[: sec(dur + 0.2)], 0.001, 0.1)


# Akkordfolge f-Moll: i – VI – VII – V
CHORDS = [
    ("F", [midi("F4"), midi("Ab4"), midi("C5")], midi("F1")),
    ("Db", [midi("Db4"), midi("F4"), midi("Ab4")], midi("Db1")),
    ("Eb", [midi("Eb4"), midi("G4"), midi("Bb4")], midi("Eb1")),
    ("C", [midi("C4"), midi("E4"), midi("G4")], midi("C2") - 12),
]
ARP = [0, 2, 1, 2, 3, 2, 1, 2]  # 3 = Grundton +12

KICK = kick()
KICK_SOFT = lp(kick(0.6), 1500)
CLAP = clap()
SNARE = snare()
HAT = hat()
OHAT = hat(True)


def chord_at(bar):
    return CHORDS[bar % 4]


def arp_note(ch, step):
    tones = ch[1]
    i = ARP[step % 8]
    return tones[0] + 12 if i == 3 else tones[i]


# ------------------------------------------------------------------ MUSIK

def groove_trap(b0, b1, energy=1.0, arps=True, octave=0, gain=1.0, start_bar=0):
    """Trap-Groove (Half-Time) zwischen Beat b0 und b1."""
    bar_beats = 4
    b = b0
    while b < b1 - 1e-6:
        bar = int((b - b0) // bar_beats) + start_bar
        ch = chord_at(bar)
        pos = (b - b0) % bar_beats
        t = tb(b)
        # Kick / Clap
        if pos in (0, 1.5) or (pos == 2.75 and bar % 2 == 1):
            music.add(KICK, t, 0.9 * gain)
        if pos == 2:
            music.add(CLAP, t, 0.75 * gain, 0.05)
            music.add(SNARE, t, 0.35 * gain, -0.05)
        # 808
        if pos == 0:
            music.add(k808(note_hz(ch[2] + 12), 1.4 * BEAT_S), t, 0.85 * gain * energy)
        if pos == 2.5:
            music.add(k808(note_hz(ch[2] + 12), 1.2 * BEAT_S, glide_from=note_hz(ch[2] + 19)), t, 0.7 * gain * energy)
        # Hats: 8tel, Rolls am Taktende jedes zweiten Takts
        if bar % 2 == 1 and pos >= 3:
            for k in range(3):
                music.add(HAT, t + k * BEAT_S / 6, 0.32 * gain, 0.35)
        else:
            music.add(HAT, t, (0.42 if pos % 1 == 0.5 else 0.3) * gain, 0.35)
        # Arps
        if arps:
            step = int(round(pos * 2))
            music.add(pling(arp_note(ch, step) + octave, 0.3), t, 0.33 * gain, -0.25 if step % 2 else 0.25)
        b += 0.5


def groove_bounce(b0, b1, gain=1.0, start_bar=0):
    """Leichter Four-on-the-floor für die Checkliste."""
    b = b0
    while b < b1 - 1e-6:
        bar = int((b - b0) // 4) + start_bar
        ch = chord_at(bar)
        pos = (b - b0) % 4
        t = tb(b)
        if pos % 1 == 0:
            music.add(KICK_SOFT, t, 0.75 * gain)
            music.add(nbass(ch[2] + 24, 0.3), t, 0.55 * gain)
        if pos in (1, 3):
            music.add(CLAP, t, 0.45 * gain)
        if pos % 1 == 0.5:
            music.add(HAT, t, 0.35 * gain, 0.3)
            music.add(pling(ch[1][int(pos * 2) % 3] + 12, 0.18), t, 0.25 * gain, -0.3)
        b += 0.5


def groove_double(b0, b1, gain=1.0, start_bar=0):
    """Doppelte Energie für den Chaos-Tunnel."""
    b = b0
    while b < b1 - 1e-6:
        bar = int((b - b0) // 4) + start_bar
        ch = chord_at(bar)
        pos = (b - b0) % 4
        t = tb(b)
        if pos % 1 == 0:
            music.add(KICK, t, 0.95 * gain)
        if pos % 0.5 == 0:
            music.add(k808(note_hz(ch[2] + 12), 0.45 * BEAT_S), t, 0.45 * gain)
        if pos in (1, 3):
            music.add(CLAP, t, 0.8 * gain)
            music.add(SNARE, t, 0.4 * gain)
        music.add(HAT, t, 0.28 * gain, 0.4 if int(pos * 4) % 2 else -0.4)
        step = int(round(pos * 4))
        music.add(pling(arp_note(ch, step) + 12, 0.15), t, 0.28 * gain, 0.3 if step % 2 else -0.3)
        b += 0.25


def strings_ostinato(b0, b1, gain=1.0, start_bar=0, bars_per_chord=2):
    b = b0
    cache = {}
    while b < b1 - 1e-6:
        bar = int((b - b0) // 4) + start_bar
        ch = chord_at(bar // bars_per_chord)
        pos = (b - b0) % 4
        idx = int(round(pos * 4)) % 4
        m = [ch[2] + 24, ch[2] + 31, ch[2] + 36, ch[2] + 31][idx]
        if m not in cache:
            n = sec(0.16)
            x = additive_saw(note_hz(m), n, cutoff=2200, detune_cents=(-6, 6), max_h=30)
            cache[m] = fade(x * env_adsr(n, 0.004, 0.06, 0.5, 0.05), 0.002, 0.03)
        music.add(cache[m], tb(b), 0.22 * gain, -0.3 if idx % 2 else 0.3)
        b += 0.25


def pad(chord_midis, t0, dur, gain=0.3, cutoff=1500):
    n = sec(dur)
    x = np.zeros(n)
    for i, m in enumerate(chord_midis):
        x += additive_saw(note_hz(m), n, cutoff=cutoff, detune_cents=(-9, 0, 8), max_h=24, phase_seed=i)
    x *= env_adsr(n, 0.4, 0.3, 0.8, min(1.2, dur * 0.4))
    music.add(reverb(stereo(x / len(chord_midis), 0, 11), 2.5, 0.45, 4000, seed=9), t0, gain)


def taiko_pattern(b0, b1, gain=1.0):
    T = tom_taiko()
    T2 = tom_taiko(90)
    b = b0
    while b < b1 - 1e-6:
        pos = (b - b0) % 4
        if pos in (0, 1.5, 2):
            sfx_or = T if pos != 1.5 else T2
            music.add(reverb(stereo(sfx_or), 2.2, 0.3, 3000, seed=2), tb(b), 0.85 * gain)
        if pos in (3, 3.5):
            music.add(stereo(T2), tb(b), 0.55 * gain, 0.2)
        b += 0.5


# ---- Abschnitte
O0, O1 = TL["sections"]["open"]
D0, D1 = TL["sections"]["drop"]
C0, C1 = TL["sections"]["check"]
X0, X1 = TL["sections"]["chaos"]
P0, P1 = TL["sections"]["epic"]
F0, F1 = TL["sections"]["final"]
N0, N1 = TL["sections"]["end"]

# OPEN: Musik "läuft im Hintergrund der YouTube-Seite" – gedämpft, öffnet sich bei "WAS IST DAS DENN"
open_bus = Bus(TOTAL_S + 4)
_m = music
music = open_bus
groove_trap(O0, D0, energy=0.5, gain=0.8)
music = _m
seg = open_bus.x[:, : sec(tb(D0))]
cut_open = ls("L02")
fc = np.full(seg.shape[1], 420.0)
i0 = sec(cut_open)
fc[i0:] = 420 * (6500 / 420) ** np.clip((np.arange(seg.shape[1] - i0)) / max(1, sec(tb(D0)) - i0), 0, 1) ** 2
seg = np.stack([svf_sweep(seg[0], fc, 0.7, "lp"), svf_sweep(seg[1], fc, 0.7, "lp")]) * 0.55
# Pre-Drop-Lücke
gap = sec(0.16)
seg[:, -gap:] = 0
music.x[:, : seg.shape[1]] += seg

# DROP: Trap bis "nicht einfach nur…", dann Filter-Dip, Snare-Roll auf CHAOS
nicht = ws("L03", 4)
chaos_t = ws("L04", 7)
drop_bus = Bus(TOTAL_S + 4)
music = drop_bus
groove_trap(D0, D1, energy=1.0, gain=1.0)
music = _m
dseg = drop_bus.x
a, bnd = sec(nicht - 0.05), sec(ls("L04"))
# Filter-Dip auf "nicht einfach nur…"
fcd = np.full(dseg.shape[1], 18000.0)
fcd[a:bnd] = np.linspace(9000, 380, bnd - a)
lo_ = sec(tb(D0))
hi_ = sec(tb(D1)) + sec(1)
part = dseg[:, lo_:hi_]
part = np.stack([svf_sweep(part[0], fcd[lo_:hi_], 0.7, "lp"), svf_sweep(part[1], fcd[lo_:hi_], 0.7, "lp")])
# Stille kurz vor CHAOS (Ein-Schlag-Pause)
pre = sec(chaos_t - 0.12) - lo_
part[:, pre:pre + sec(0.12)] = 0
music.x[:, lo_:hi_] += part
# Snare-Roll unter "Der macht aus jedem Server ein komplettes …"
r0, r1 = ls("L04"), chaos_t - 0.12
tt = r0
k = 0
while tt < r1:
    frac = (tt - r0) / max(0.01, r1 - r0)
    music.add(SNARE, tt, 0.18 + 0.4 * frac, 0)
    step = BEAT_S / (2 if frac < 0.35 else 4 if frac < 0.7 else 8)
    tt += step
    k += 1
music.add(riser(max(0.5, r1 - r0), 200, 1800), r0, 0.35)

# CHECK: Bounce bis zur Stille, dann Tape-Stop
silence = HIT["silence"]
groove_bounce(C0, TL["hits"]["silence"], gain=0.85)
ts_src = music.x[:, sec(silence - 0.5): sec(silence)].copy()
music.x[:, sec(silence - 0.5):] = 0  # alles danach neu
music.add(tape_stop(ts_src, 0.5), silence - 0.5, 1.0)

# CHAOS: Wiedereinstieg nach "…das." mit Rewind, Double-Time, Riser
groove_double(X0, X1, gain=0.9)
funk = ws("L10", 4)
blackout = max(le("L10") + 0.1, tb(X1) - 0.5)
music.add(riser(max(0.8, funk - ls("L10") + 0.4), 250, 3200, seed=8), ls("L10") - 0.4, 0.55)
# alles nach "FUNKTIONIEREN" weg -> Stutter -> totale Stille
fz = sec(funk)
stut = stutter(music.x[:, fz - sec(0.05): fz + sec(0.2)], 0.05, 5)
music.x[:, fz: sec(tb(P0))] = 0
music.add(bitcrush(stut, 5, 8), funk, 0.8)

# EPIC
das_ist = ls("L12")
logo = ws("L13", 0)
strings_ostinato(P0, P0 + 16, gain=0.9)
taiko_pattern(P0 + 4, P0 + 16, gain=0.9)
for k, bb in enumerate([P0, P0 + 8]):
    music.add(braam(["F1", "Db1"][k], 3.4), tb(bb), 0.8)
pad([midi("F3"), midi("Ab3"), midi("C4"), midi("F4")], tb(P0), 6.4, 0.35, 1200)
pad([midi("Db3"), midi("F3"), midi("Ab3"), midi("Db4")], tb(P0 + 16) - 3.2 + 3.2 - 3.2, 3.2, 0.3, 1200)
# alles weg kurz vor "Das ist…", dann Herzschlag und Drone
cut_e = sec(das_ist - 0.35)
music.x[:, cut_e: sec(logo)] *= 0
drone = additive_saw(note_hz("F1"), sec(logo - das_ist + 0.6), cutoff=180, detune_cents=(-5, 5), max_h=12)
drone *= np.linspace(0, 1, len(drone)) ** 1.5
music.add(stereo(drone, 0, 9), das_ist - 0.3, 0.45)
hb = heartbeat()
music.add(stereo(hb), das_ist - 0.3, 0.9)
music.add(stereo(hb), das_ist + 0.6, 0.8)
music.add(reverse_cymbal(1.0), logo - 1.0, 0.6)
# Logo: großer Akkord nach dem Schlag
music.add(braam("F1", 4.0, 0.08), logo, 1.0)
pad([midi("F3"), midi("C4"), midi("F4"), midi("Ab4"), midi("C5")], logo, tb(P1) - logo + 0.4, 0.4, 2400)
for i, m in enumerate([midi("C5"), midi("F5"), midi("Ab5"), midi("C6")]):
    music.add(pling(m, 0.6), logo + 0.55 + i * BEAT_S / 2, 0.28, (-0.4, 0.4)[i % 2])

# FINAL: Trap mit voller Energie bis "Und glaub mir", dann gefiltertes Pad
l14 = ls("L14")
endT = tb(N0)
groove_trap(F0, (l14 - 0.15) / BEAT_S, energy=1.1, gain=1.0, octave=12)
music.add(KICK, tb(F0), 1.0)
pad([midi("Db3"), midi("F3"), midi("Ab3"), midi("C4")], l14 - 0.1, endT - l14 + 0.4, 0.35, 900)
music.add(reverse_cymbal(1.3), endT - 1.3, 0.55)

# END: Auflösung nach F-Dur
pad([midi("F3"), midi("A3"), midi("C4"), midi("F4")], endT, TOTAL_S - endT + 1.0, 0.38, 1800)
for i, m in enumerate([midi("F4"), midi("A4"), midi("C5"), midi("F5"), midi("A5"), midi("C6")]):
    music.add(pling(m, 0.7), endT + 0.15 + i * BEAT_S / 2, 0.3, (-0.35, 0.35)[i % 2])
music.add(stereo(lp(kick(0.8, 0.6), 400)), endT, 0.9)
music.add(stereo(nbass(midi("F2") + 12, 1.0)), endT, 0.6)

# ------------------------------------------------------------------ SFX
# OPEN
scroll_t = [x / FPS for x in range(2, fr(ws("L01", 1)), 5)]
for t in scroll_t[:14]:
    sfx.add(stereo(mouse_click() * 0.35), t, 0.4, 0.2)
for k in range(8):
    sfx.add(stereo(mouse_click() * 0.35), ws("L01", 2) - 0.07 + k * 0.03, 0.35, 0.2)
sfx.add(stereo(KICK_SOFT), ws("L02", 0), 0.7)
sfx.add(whoosh(0.22, 400, 4000, -0.3, 0.3, 1), ws("L02", 0) - 0.08, 0.45)
sfx.add(stereo(KICK_SOFT), ws("L02", 3), 0.9)
sfx.add(whoosh(0.25, 300, 5000, 0.3, -0.3, 2), ws("L02", 3) - 0.08, 0.55)
sfx.add(riser(max(0.6, tb(D0) - ls("L02")), 160, 2600, 11), ls("L02"), 0.45)
sfx.add(whoosh(0.7, 200, 7000, -0.6, 0.6, 3), tb(D0) - 0.62, 0.8)

# DROP
d0 = tb(D0)
sfx.add(impact(1.3), d0, 1.0)
sfx.add(mc("item_mace_smash_ground_heavy"), d0, 0.9)
sfx.add(stereo(KICK), d0, 1.0)
# L03-Schnitte
sfx.add(whoosh(0.32, 300, 6000, 0.9, -0.9, 4), ws("L03", 0) - 0.18, 0.75)
boom_n = sec(1.6)
boom_t = np.arange(boom_n) / SR
boom = saturate(np.sin(2 * np.pi * np.cumsum(52 + 40 * np.exp(-boom_t * 12)) / SR) * np.exp(-boom_t * 2.2) * 1.4, 3)
sfx.add(reverb(stereo(boom), 2.0, 0.3, 2000, 6), ws("L03", 1), 0.8)  # "TYP" Boom
sfx.add(mc("item_spear_lunge1"), ws("L03", 2) - 0.05, 0.8)
sfx.add(whoosh(0.25, 500, 4000, -0.5, 0.5, 5), ws("L03", 2) - 0.12, 0.4)
sfx.add(mc("random_anvil_land", 0.55), ws("L03", 3), 0.7)
sfx.add(stereo(nbass(midi("F2"), 0.5)), ws("L03", 3), 0.6)
# Tipp-Geräusche für "NICHT EINFACH NUR…"
typing_end = ls("L04") - 0.1
n_letters = 18
for k in range(n_letters):
    t = nicht + (typing_end - nicht) * 0.9 * k / n_letters
    sfx.add(mc("random_click", 0.18), t, 0.5, (k % 3 - 1) * 0.3)
# Raster-Teilungen
for i in range(7):
    sfx.add(stereo(pling(midi("C5") + i * 2, 0.12)), ws("L04", i), 0.32, (i % 2 - 0.5) * 0.6)
    sfx.add(mc("random_pop", 0.5), ws("L04", i), 0.5)
# CHAOS
sfx.add(impact(1.6), chaos_t, 1.0)
sfx.add(mc("random_explode1"), chaos_t, 0.9)
sfx.add(mc("item_mace_smash_ground_heavy"), chaos_t, 0.7)
sfx.add(bitcrush(stereo(noise(sec(0.25)) * 0.25), 4, 10), chaos_t + 0.02, 0.4)

# CHECK
c0 = tb(C0)
sfx.add(whoosh(0.4, 200, 2500, 0, 0, 6), c0 - 0.15, 0.6)
sfx.add(mc("random_anvil_land", 0.6), c0 + 16 / FPS, 0.6)
sfx.add(mc("random_click"), c0 + 0.1, 0.4)
sfx.add(whoosh(0.3, 300, 6000, 0.9, -0.2, 7), ls("L06") - 4 / FPS - 0.12, 0.7)
sfx.add(mc("random_click"), ls("L06") - 4 / FPS, 0.45)
sfx.add(whoosh(0.35, 300, 3000, -0.4, 0.4, 8), ls("L07") - 4 / FPS - 0.1, 0.6)
sfx.add(mc("random_click"), ls("L07") - 4 / FPS, 0.45)
for lid, wi in (("L05", 1), ("L06", 3)):
    t = ws(lid, wi)
    sfx.add(mc("random_levelup"), t, 0.55)
    sfx.add(mc("random_orb"), t, 0.6)
    sfx.add(stereo(KICK), t, 0.7)
    sfx.add(whoosh(0.18, 600, 5000, 0.6, 0.2, 9), t - 0.1, 0.35)
# Toast "wird geprüft"
sfx.add(whoosh(0.2, 600, 5000, 0.8, 0.4, 10), ws("L07", 3) - 0.1, 0.3)
# STILLE + Villager
sfx.add(mc("mob_villager_idle1"), silence + 0.35, 0.9)
verg = ws("L08", 1)
sfx.add(mc("mob_villager_no1"), verg + 0.05, 0.8)
sfx.add(mc("random_break"), verg, 0.7)
sfx.add(stereo(KICK_SOFT), verg, 0.7)
dasf = ws("L08", 3)
sfx.add(whoosh(0.45, 1500, 150, 0, 0, 12), dasf, 0.7)

# CHAOS-Tunnel
x0 = tb(X0)
rev = whoosh(0.5, 200, 6000, -0.7, 0.7, 13)[:, ::-1]
sfx.add(rev, x0 - 0.45, 0.8)
sfx.add(mc("item_trident_riptide1"), x0, 0.8)
sfx.add(impact(0.9, 1.8), x0, 0.7)
for i in range(4):
    t = ws("L09", i + 1)
    sfx.add(mc("item_spear_hit1"), t, 0.7 + 0.08 * i)
    sfx.add(mc("entity_player_attack_crit1"), t, 0.5)
    sfx.add(stereo(KICK), t, 0.55 + 0.1 * i)
sfx.add(impact(1.2, 2.0), ws("L09", 4), 0.6)
for i in range(4):
    sfx.add(whoosh(0.18, 500, 6000, (-0.7, 0.7)[i % 2], (0.7, -0.7)[i % 2], 20 + i), ws("L10", i) - 0.08, 0.35)
sfx.add(impact(1.5), funk, 0.95)
sfx.add(mc("damage_hit1"), funk, 0.6)
sfx.add(mc("item_mace_smash_air1"), funk, 0.6)

# EPIC
p0 = tb(P0)
sfx.add(impact(1.5, 3.2), p0, 0.9)
sfx.add(mc("item_goat_horn_call0"), p0 + 0.05, 0.75)
sfx.add(mc("ambient_weather_thunder1", 0.6), p0, 0.6)
sfx.add(mc("item_mace_smash_ground_heavy"), logo, 1.0)
sfx.add(mc("item_trident_thunder1"), logo, 0.75)
sfx.add(impact(1.8, 3.5), logo, 1.0)
sfx.add(mc("item_totem_use_totem"), logo + 0.08, 0.55)
sfx.add(mc("fireworks_largeblast1"), logo + 0.12, 0.45)

# FINAL-Montage: Schnitte bekommen Klicks/Whooshes (identische Schnittlogik wie S6Final.tsx)
cuts = [fr(tb(F0))]
for p in [14, 12, 10, 8, 6, 6, 4, 4, 3, 3, 3, 3]:
    nxt = cuts[-1] + p
    if nxt >= fr(l14) - 2:
        break
    cuts.append(nxt)
sfx.add(impact(1.0, 1.6), tb(F0), 0.6)
for i, c in enumerate(cuts[1:]):
    t = c / FPS
    sfx.add(whoosh(0.12, 800, 7000, (-0.6, 0.6)[i % 2], (0.6, -0.6)[i % 2], 30 + i), t - 0.06, 0.35)
    sfx.add(mc("random_click", 0.4), t, 0.4)
anf = ws("L15", 4)
sfx.add(mc("block_beacon_activate"), anf - 0.1, 0.55)
sfx.add(whoosh(0.8, 150, 5000, 0.5, -0.5, 40), endT - 0.6, 0.6)

# END: Abo-Klick
sub = HIT["subscribe"]
sfx.add(stereo(mouse_click()), sub, 0.9)
sfx.add(mc("block_bell_bell_use01"), sub + 0.03, 0.6)
sfx.add(mc("random_levelup"), sub + 0.08, 0.4)
sfx.add(mc("random_orb"), sub + 0.05, 0.45)

# ------------------------------------------------------------------ VOICEOVER
EPIC_LINES = {"L11", "L12", "L13", "L14", "L15"}
for lid, v in VO.items():
    a, sr = sf.read(f"{ROOT}/audio/vo/{VOW[lid]['file']}", dtype="float64")
    if a.ndim > 1:
        a = a.mean(1)
    if sr != SR:
        a = resample_poly(a, SR, sr)
    a = hp(a, 85, 2)
    a = peak_eq(a, 180, 1.5, 0.8)
    a = peak_eq(a, 3200, 3.5, 0.9)
    a = peak_eq(a, 7500, -2.0, 1.2)  # leichte De-Essing-Absenkung
    # einfacher RMS-Kompressor
    env = np.sqrt(lp(a ** 2, 30, 1).clip(1e-9))
    thr = 0.08
    gr = np.where(env > thr, (thr / env) ** (1 - 1 / 3.0), 1.0)
    a = a * gr
    a = a / (np.max(np.abs(a)) + 1e-9) * 0.7
    a = fade(a, 0.004, 0.03)
    g = 10 ** (v["spec"].get("gain", 0) / 20)
    if lid in EPIC_LINES:
        x = reverb(stereo(a, 0, 0), 2.4, 0.22, 5000, seed=4)
    elif lid == "L08":
        x = stereo(a)  # trocken, nah – Deadpan
    else:
        x = reverb(stereo(a, 0, 0), 0.7, 0.1, 7000, seed=4)
    vox.add(x, v["start"], g)

# ------------------------------------------------------------------ MIX
# Sidechain: Musik weicht der Stimme aus
venv = np.abs(vox.x).max(axis=0)
att = lp(venv, 25, 1)
duck = 1 - 0.62 * np.clip(att / 0.1, 0, 1)
music.x *= duck
sfx.x *= 1 - 0.3 * np.clip(att / 0.1, 0, 1)

mix = music.x * 0.85 + sfx.x * 0.8 + vox.x * 1.15
# Bus-Kompression (sanft) + Soft-Clip
env = np.sqrt(lp((mix ** 2).mean(0), 8, 1).clip(1e-12))
thr = 0.25
gr = np.where(env > thr, (thr / env) ** (1 - 1 / 2.0), 1.0)
mix = mix * gr
mix = mix[:, : sec(TOTAL_S)]
# Absolute Stille vor dem Trailer-Teil (Schwarzbild in S4Chaos.tsx)
z0, z1 = sec(blackout), sec(tb(P0))
mix[:, z0 - sec(0.03): z0] *= np.linspace(1, 0, sec(0.03))
mix[:, z0:z1] = 0
# Ausklang am Ende
fo = sec(0.35)
mix[:, -fo:] *= np.linspace(1, 0, fo)

try:
    import pyloudnorm as pyln

    meter = pyln.Meter(SR)
    loud = meter.integrated_loudness(mix.T)
    mix = mix * 10 ** ((-14.0 - loud) / 20)
    print("Loudness vorher", round(loud, 2), "LUFS -> Ziel -14 LUFS")
except Exception as e:  # pragma: no cover
    print("pyloudnorm fehlt:", e)
    mix = mix / np.max(np.abs(mix)) * 0.8

# True-Peak-sicherer Limiter (einfach: Soft-Clip unterhalb -1 dBFS)
ceil = 10 ** (-1.2 / 20)
mix = np.tanh(mix / ceil) * ceil
os.makedirs(f"{ROOT}/public/audio", exist_ok=True)
sf.write(f"{ROOT}/public/audio/master.wav", mix.T, SR, subtype="PCM_24")
# Stems zur Kontrolle
os.makedirs(f"{ROOT}/out/stems", exist_ok=True)
for name, bus in (("music", music), ("sfx", sfx), ("vox", vox)):
    sf.write(f"{ROOT}/out/stems/{name}.wav", (bus.x[:, : sec(TOTAL_S)] * 0.5).T, SR, subtype="PCM_16")
print("OK", round(TOTAL_S, 2), "s")
