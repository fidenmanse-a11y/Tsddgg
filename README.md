# REVANCHIE – The Ultimate SMP Promo

44,8-Sekunden-Werbespot für den Minecraft-Kanal **[Revanchie (@RevanchieSMP)](https://www.youtube.com/@RevanchieSMP)**.
Gebaut mit Remotion, React und TypeScript. Format 1920×1080, 60 fps, H.264 + AAC 320 kbps, Lautheit −14 LUFS.

- **Fertiges Video:** `release/revanchie-promo.mp4`
- **Sekundengenaues Storyboard:** [`STORYBOARD.md`](STORYBOARD.md)

## Projektstruktur

```
src/
  timeline.json        Beat-Raster (150 BPM = 24 Frames/Beat), Abschnitte, VO-Platzierung – gemeinsame Quelle für Bild UND Ton
  vo-data.json         generiert: Wort-genaue VO-Timings in Frames (Whisper)
  data/channel.ts      echte Kanaldaten (Titel, Aufrufe, Längen) – nichts erfunden
  scenes/S1…S6         individuell choreografierte Szenen (Cold Open, Drop, Checkliste, Tunnel, Trailer, Finale)
  components/          YouTube-UI-Nachbau, Minecraft-UI, FX (RGB-Split, Glitch, Grain, Letterbox …)
audio/
  select_vo.py         wählt pro Zeile den besten TTS-Take (Whisper-Abgleich), Tempo, Wort-Alignment
  build_audio.py       komplette Musik (selbst synthetisiert), SFX, VO-Mix, Ducking, Mastering
  dsp.py               Synth-/DSP-Bibliothek (808, Braam, Taiko, Riser, Whoosh, Tape-Stop …)
  vo/                  ausgewählte Voiceover-Takes + words.json
  mc/                  originale Minecraft-Sounds (offizieller Mojang-Asset-Index)
public/
  thumbs/              14 Original-Thumbnails (maxresdefault, 1280×720)
  channel/             Avatar (900×900) + Banner
  audio/master.wav     fertiger Mix (wird gerendert)
```

## Neu bauen

```bash
npm install
# 1) Audio + Wort-Timings (Python ≥3.10, numpy, scipy, soundfile, pyloudnorm)
python audio/build_audio.py
# 2) Video
REMOTION_BROWSER=/pfad/zu/chrome-headless-shell npm run render   # REMOTION_BROWSER ist optional
```

`npm run studio` öffnet die Remotion-Vorschau.
Timing-Änderungen macht man in `src/timeline.json`. Danach `build_audio.py` erneut ausführen: Bild und Ton bleiben synchron.

### Voiceover neu erzeugen (optional)

Die Takes stammen aus **Chatterbox Multilingual** (Resemble AI, MIT-Lizenz, lokal auf der CPU, mit Perth-Wasserzeichen).
Sprachreferenz ist der **Thorsten-Voice**-Datensatz, Teil „Emotional“ (amüsiert / überrascht / wütend). Er steht unter **CC0**, der Sprecher hat ihn ausdrücklich zur freien Nutzung bereitgestellt.
Es wird also keine Stimme einer realen Person ohne Erlaubnis kopiert.
Pro Zeile wurden 3–5 Takes erzeugt. `audio/select_vo.py` transkribiert jeden Take mit Whisper (medium, de), vergleicht ihn per DP-Alignment mit dem Skript und verwirft Takes mit Artefakten (lange Pausen, Nachklapp-Silben). Danach folgen manuelle Regie-Overrides (siehe Kommentare im Skript).

## Quellen & Rechte

| Material | Quelle | Status |
|---|---|---|
| Thumbnails, Titel, Aufrufe, Avatar, Banner | Öffentliche Kanalseite von @RevanchieSMP (abgerufen am 20.11.2026) | Eigenes Material des Kanals, unverändert |
| Musik | Selbst synthetisiert in `audio/dsp.py` und `build_audio.py` | Frei, keine fremden Samples |
| SFX (Impacts, Whooshes, Riser, Braams …) | Selbst synthetisiert | Frei |
| Minecraft-Sounds (Mace, Spear, Villager, Level-Up, Totem …) | Offizieller Mojang-Asset-Index (`resources.download.minecraft.net`) | Nutzung in Videos laut Minecraft Usage Guidelines |
| Notenblock-Melodie | Minecraft-Sample `note/pling`, gesampelt | wie oben |
| Stimme | Chatterbox (MIT) + Thorsten-Voice (CC0) | Frei nutzbar |
| Schriften | Anton, Roboto, Inter, Pixelify Sans (SIL OFL) | Frei |

Die YouTube- und Minecraft-Oberflächen sind eigene Nachzeichnungen, keine Screenshots.
