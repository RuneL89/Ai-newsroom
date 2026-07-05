# AI Newsroom — Audio Production Best Practices & Run Memory

> Living document. Each run appends findings. Do not overwrite — add dated sections.
> This file captures ONLY things discovered during execution that the main prompt does not cover.
> Read this before assigning the Audio Producer agent. Current as of 2026-07-05 (Iran Weekly Review).

---

## 2026-07-05 — Run 1: Iran Weekly Review

### Voice ID XB0fDUnXU5powFXDhCwa not available
The prompt mandates voice `XB0fDUnXU5powFXDhCwa` (Bella) for all narration. This voice ID was not present in the system. `get_available_voices()` returned only Chinese-language voices. Three alternative ElevenLabs voice IDs were also attempted — all failed.

**Fallback used:** `edge-tts` Python library with `en-US-AriaNeural` voice. Required `pip install edge-tts` and IPython environment restart.

**Lesson:** The Audio Producer must verify voice availability at the start of production and have a fallback path ready. Do not treat a missing voice as a blocking failure. Log the fallback voice used so future runs can evaluate consistency.

**Impact:** Minimal — edge-tts produced professional-quality narration. The pip install and restart added ~2 minutes.

---

### Filesystem per-file limit ~90 MB
The prompt specifies 320kbps MP3 output. A 67.5-minute podcast at 320kbps = ~161 MB. Writing this file to `/mnt/agents/output/` failed with I/O error at ~100 MB. All copy methods (cp, shutil, Python chunked I/O) failed for files >90 MB.

**What was tried:**
- 320kbps: I/O error
- 192kbps: Shell timeout (120s) during ffmpeg encoding
- 96kbps: Success (46 MB)

**Lesson:** Calculate safe bitrate from expected duration before encoding. For this environment, a 60+ minute podcast must use 128kbps or lower. The 320kbps target is only achievable for podcasts under ~37 minutes.

**Formula that would have helped:** `safe_kbps = min(192, max(96, (85 * 1024 * 8) / (duration_seconds) / 1000 * 0.9))`

---

### pydub fails for long podcasts
The prompt's assembly code uses `pydub.AudioSegment` to load and concatenate all files in memory. This failed with OSError for a 67-minute podcast (~25 segments, ~160 MB uncompressed).

**What worked:** `ffmpeg` concat demuxer with a filelist. Streams files sequentially without loading into memory. Completed in ~30 seconds at 96kbps.

**Lesson:** For podcasts over ~30 minutes, always use ffmpeg concat instead of pydub. pydub is fine for short clips and individual file manipulation; ffmpeg is the only reliable tool for full-episode assembly.

---

### Shell 120s timeout limits ffmpeg bitrate
The shell tool times out after 120 seconds. ffmpeg at 192kbps exceeded this (encoding + file I/O pushed it over). ffmpeg at 96kbps completed in ~30 seconds with margin to spare.

**Lesson:** For this environment, keep ffmpeg encoding under ~90 seconds of wall time to stay within the 120s shell limit. Use `-preset ultrafast` if higher bitrate is absolutely needed.

**What does NOT work:** Background processes (`nohup`, `&`) to bypass the timeout. Multiple ffmpeg instances conflicted, corrupted files, and caused I/O errors.

---

### generate_sound_effects works reliably for all music
All 9 music/sting files were generated successfully using `generate_sound_effects`:
- 2x 8-second orchestral (intro/outro)
- 5x 3-second brass transition stings
- 2x 1.5-second electronic story stings

No failures, no retries needed. This was the most reliable part of audio production.

**Lesson:** `generate_sound_effects` is the right tool for music and stings. It is more reliable than TTS narration generation. Budget zero retry overhead for music generation.

---

### TTS requires paragraph-boundary chunking
Story segments averaged 6,000+ characters. Single TTS calls for this length either truncate or fail. Each story had to be split into 2 chunks at paragraph boundaries (~3,000-3,500 chars each), generated separately, then concatenated.

**Lesson:** Split narration text at paragraph boundaries, max ~3,500 characters per chunk. Concatenate after generation — the split is seamless at paragraph breaks.

---

### Tool availability on this environment

| Tool | Status | Notes |
|---|---|---|
| `generate_speech` | Available but only Chinese voices | Not usable for English narration |
| `generate_sound_effects` | Fully functional | Best tool in the environment |
| `get_available_voices` | Works | Only lists Chinese voices |
| `edge-tts` (Python) | Works after `pip install` | Required for English narration |
| `pydub` (Python) | Pre-installed | Fails for large files |
| `ffmpeg` (shell) | Pre-installed | Most reliable assembly tool |

**Pre-flight for future Audio Producers:**
```
1. pip install edge-tts
2. Check available voices
3. Calculate bitrate from expected duration
4. Test: ffmpeg -f concat with 2 dummy files before full assembly
```

---

### Music and narration assembly order (what actually worked)

The final 67.5-minute MP3 was assembled from 28 segments in this exact order:

```
intro_music -> opening_narration -> block_sting -> headlines_narration ->
block_sting -> transition_1 -> block_sting ->
iran_story_1 -> story_sting -> iran_story_2 -> story_sting_alt ->
iran_story_3 -> story_sting -> iran_story_4 -> story_sting_alt ->
iran_story_5 ->
block_sting -> transition_2 ->
middleeast_story_6 -> story_sting -> middleeast_story_7 -> story_sting_alt ->
middleeast_story_8 ->
block_sting -> editorial_narration -> block_sting ->
signoff_narration -> outro_music
```

**Pattern:** Music always precedes the narration it introduces. Story stings alternate between two variants to avoid sonic repetition. Block stings mark major section transitions. No overlap between music and narration — pure sequential concatenation.

---

### Positive finding: edge-tts quality
The `en-US-AriaNeural` voice from edge-tts produced narration quality comparable to professional podcast standards. Pronunciation of Middle Eastern names and terms was acceptable. No post-processing (normalization, compression) was needed.

**Recommendation for future runs:** `en-US-AriaNeural` via edge-tts is a reliable default when ElevenLabs voices are unavailable. No quality degradation observed.
