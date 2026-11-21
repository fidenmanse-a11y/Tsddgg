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

---

# REVANCHIE – Phonk-Edit (YouTube Short)

**Datei:** `release/revanchie-short.mp4` · 1080×1920 · 60 fps · 22,4 s · −14 LUFS
Komposition `RevanchieShort` in `src/short/Short.tsx`. Der ganze Schnitt hängt am Beat-Raster in `src/short/beats.json`.

Ablauf (in Beats, Drop = Beat 8):

| Beats | Teil |
|---|---|
| 0–8 | Intro: Schwarz-Weiß + Korn, Push aufs Holzschwert-Thumbnail, „Okay… was ist DAS?!“ |
| 8 | Drop: Flash, Shake, „REVANCHIE“-Slam, Farbe kommt zurück |
| 8–20 | 1 Schnitt pro Beat, Zoom-Punch auf jedem Beat, RGB-Split auf der Snare, wechselnde Übergänge |
| 20–28 | ruhiger Teil: schwebende 3D-Karte, 1 Schnitt pro 2 Beats |
| 28–36 | Schnellteil: 1 Schnitt pro halbem Beat |
| 36–42 | Endcard: „Das ist … REVANCHIE“, Abo-Tap |

## Eigenen Song einsetzen (z. B. „Medusa (Slowed)“)

1. Song als Audio- **oder Videodatei** (z. B. Bildschirmaufnahme vom Handy) nach `audio/short/music/` legen. Der Ordner wird von Git ignoriert, fremde Songs landen also nicht im Repo.
2. In `src/short/config.json` eintragen:
   - `musicFile`: Pfad zur Datei
   - `sections`: Startzeiten (Sekunden in der Datei) der Teile
     - `intro`: Schwarz-Weiß
     - `A`: Drop, Schnitt alle 2 Beats
     - `R`: Schnitt auf jedem Beat
     - `S`: 3D-Karte / Breakdown
     - `O`: Logo + Endcard
   - `end`: Ende
   Die Zeiten rasten automatisch auf die erkannten Beats ein.
3. Audio neu bauen (braucht zusätzlich `librosa`) und rendern:
   ```bash
   python audio/short/build_short.py
   npx remotion render RevanchieShort out/revanchie-short.mp4 --codec=h264 --crf=17 --audio-bitrate=320k
   ```

Die aktuelle `config.json` ist auf die Medusa-Bildschirmaufnahme eingestellt:

| Teil | Start in der Aufnahme |
|---|---|
| Intro | 1,18 s |
| Drop | 9,31 s |
| Schnellteil | 18,58 s |
| Breakdown | 21,27 s |
| großer Drop = Logo | 25,52 s |
| Ende | 27,82 s |

Fehlt die Datei, nimmt der Build automatisch den eigenen Beat `audio/short/music/phonk_slowed.wav` (`audio/short/phonk.py`, 112,5 BPM, ohne Claim-Risiko) mit den Abschnitten aus `ownBeatSections`. Diese Version liegt als `release/revanchie-short.mp4` im Repo.

## Clip-Edit (`RevanchieEdit`, `src/short/ClipEdit.tsx`)

Ablauf: **Thumbnail** (komplett sichtbar, knallt auf den Beat) → **Gameplay-Clips aus diesem Video** → nächstes Thumbnail …

1. Clips (MP4/MOV) nach `audio/short/clips_in/` legen, dann `python audio/short/prep_clips.py` ausführen. Das Skript
   - entfernt den Originalton,
   - wandelt in 60 fps um,
   - findet Action-Momente (Bewegung + Lautstärke-Spitzen) und schreibt sie nach `src/short/clips_auto.json`.
2. In `src/short/config.json` die Abfolge `introEdit` (Intro, Schwarz-Weiß) und `edit` (ab dem Drop) eintragen, Vorlage siehe `editExample`. Pro Eintrag:
   - `t`: `thumb` oder `clip`
   - `beats`: Länge
   - `clip` / `video`
   - `hit`: Sekunde im Clip, die auf dem Beat landet
   - `hitBeat`: auf welchem Beat des Eintrags
   - `ramp`: `slowhit` (Zeitlupe nach dem Hit), `steady` oder `fast`
   - `focus` / `focusTo`: Hochformat-Ausschnitt 0..1
   - `zoom`, `text`
3. `python audio/short/build_short.py` und `npx remotion render RevanchieEdit out/edit.mp4`.

Der Originalton der Clips wird nie verwendet. Die Musik kommt nur aus `musicFile`.
