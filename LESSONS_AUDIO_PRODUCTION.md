# Lessons Learned: Audio Production Pipeline

> Documented after executing the full Iran Weekly Review pipeline (2026-07-05).
> This file captures every technical limitation, workaround, and hard-won insight from the Audio Producer stage so future runs can be smoother.

---

## Table of Contents

1. [Voice ID Availability](#1-voice-id-availability)
2. [Filesystem Size Limits](#2-filesystem-size-limits)
3. [Audio Assembly Strategies](#3-audio-assembly-strategies)
4. [TTS Chunking](#4-tts-chunking)
5. [Music Generation](#5-music-generation)
6. [Bitrate vs. File Size](#6-bitrate-vs-file-size)
7. [Shell Tool Timeouts](#7-shell-tool-timeouts)
8. [Tool Availability Matrix](#8-tool-availability-matrix)
9. [Recommended Audio Pipeline](#9-recommended-audio-pipeline)
10. [Hardware/Environment Assumptions](#10-hardwareenvironment-assumptions)

---

## 1. Voice ID Availability

**The MANDATORY config:** Voice ID `XB0fDUnXU5powFXDhCwa` (Bella) specified in the prompt.

**What happened:**
- `generate_speech` with `XB0fDUnXU5powFXDhCwa` -> FAILED (voice not found)
- Tried alternative voice IDs -> All FAILED
- `get_available_voices` -> Only Chinese-language voices available in the system
- Fallback: `edge-tts` Python library with `en-US-AriaNeural` voice

**The lesson:** Do NOT hardcode voice IDs that may not be available in the execution environment. The system only has a subset of ElevenLabs voices (or in this case, none of the English ones).

**Fix for future runs:**
```python
# At the start of audio production, verify voice availability:
1. Call get_available_voices()
2. Filter for English voices
3. If target voice exists -> use it
4. If target voice missing -> 
   a. Use best available English voice from list
   b. Log: "Voice XB0fDUnXU5powFXDhCwa unavailable, using [fallback]"
   c. Continue production (don't fail)
```

**Better approach:** Make voice ID configurable per-environment:
```yaml
# config.yaml
audio:
  preferred_voice: "XB0fDUnXU5powFXDhCwa"  # ElevenLabs Bella
  fallback_voice: "en-US-AriaNeural"          # edge-tts
  fallback_engine: "edge-tts"                 # If ElevenLabs unavailable
```

---

## 2. Filesystem Size Limits

**The constraint:** `/mnt/agents/output/` has an effective size limit of approximately 90-100 MB per file.

**What happened:**
- Target: 320kbps MP3, ~67 minutes = ~162 MB -> **FAILED** (I/O error at ~100MB)
- Attempt 192kbps = ~97 MB -> **TIMED OUT** in shell tool (120s limit)
- Final 96kbps = ~46 MB -> **SUCCESS**

**File operations that failed:**
```
cp 162MB_file /mnt/agents/output/     -> I/O error
shutil.move(162MB_file, output_dir)   -> I/O error
Python chunked copy                   -> I/O error
ffmpeg 320kbps direct to output       -> I/O error at ~100MB
ffmpeg 192kbps via shell              -> Shell timeout (120s)
ffmpeg 96kbps via shell               -> SUCCESS (46MB)
```

**The lesson:** The output filesystem has a hard file size limit around 90-100MB. Plan audio output accordingly.

**Bitrate vs. Duration table:**

| Duration | 320kbps | 192kbps | 128kbps | 96kbps |
|----------|---------|---------|---------|--------|
| 30 min | 72 MB | 43 MB | 29 MB | 22 MB |
| 45 min | 108 MB | 65 MB | 43 MB | 32 MB |
| 60 min | 144 MB | 86 MB | 58 MB | 43 MB |
| 67 min | 161 MB | 96 MB | 64 MB | 48 MB |
| **90 MB safe limit** | **~37 min** | **~62 min** | **~93 min** | **~124 min** |

**For a typical ~60-70 min podcast: 128kbps is the maximum reliable bitrate.**

**Fix for future runs:**
```python
# Before generating audio, calculate safe bitrate:
duration_minutes = estimated_script_duration / 60
max_bitrate_kbps = int((90 * 1024 * 8) / (duration_minutes * 60) / 1000)
safe_bitrate = min(320, max(96, max_bitrate_kbps))
# For 67 minutes: max_bitrate = ~180kbps, use 128kbps for safety margin
```

---

## 3. Audio Assembly Strategies

Three approaches were attempted:

### Attempt 1: pydub in-memory concatenation
```python
from pydub import AudioSegment
final = AudioSegment.empty()
for file in files:
    final += AudioSegment.from_mp3(file)
final.export("output.mp3", format="mp3")
```
**Result:** FAILED with OSError for large files (>~40 seconds of audio). pydub loads everything into memory, and the combined ~67 minutes of audio exhausted available RAM.

### Attempt 2: ffmpeg concat demuxer (320kbps)
```bash
ffmpeg -f concat -safe 0 -i filelist.txt -acodec libmp3lame -b:a 320k output.mp3
```
**Result:** File generated but I/O error copying to output directory (161MB > 100MB limit).

### Attempt 3: ffmpeg concat demuxer (96kbps)
```bash
ffmpeg -f concat -safe 0 -i filelist.txt -acodec libmp3lame -b:a 96k output.mp3
```
**Result:** SUCCESS. 46MB file, copied to output directory without issues.

**The lesson:** For podcasts >30 minutes, use **ffmpeg concat demuxer** at a bitrate that keeps the output under 90MB. pydub is fine for short clips but fails at scale.

**The ffmpeg concat filelist format:**
```
# filelist.txt
file '/mnt/agents/output/01_intro_music.mp3'
file '/mnt/agents/output/05_opening.mp3'
file '/mnt/agents/output/03a_block_opening.mp3'
# ... etc
```

**The winning command:**
```bash
ffmpeg -y -f concat -safe 0 -i filelist.txt \
  -acodec libmp3lame -b:a 96k -ar 44100 \
  /mnt/agents/output/final_podcast.mp3
```

---

## 4. TTS Chunking

**Problem:** Long story segments (>4000 characters) exceed single TTS call limits.

**What happened:**
- Stories averaged 6000+ characters each
- Split each story at paragraph boundaries into 2 chunks
- Generated chunk A and chunk B separately
- Concatenated chunks per story using ffmpeg
- Result: 23 narration files covering 8 stories + transitions

**Chunking strategy:**
```python
def split_for_tts(text, max_chars=4000):
    """Split text at paragraph boundaries."""
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        if len(current_chunk) + len(para) < max_chars:
            current_chunk += para + "\n\n"
        else:
            chunks.append(current_chunk.strip())
            current_chunk = para + "\n\n"
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks
```

**The lesson:** Always chunk at NATURAL BOUNDARIES (paragraphs, not mid-sentence). The concatenation is seamless if the split happens at a paragraph break.

**For future runs:** Target 3000-3500 chars per chunk to stay well under limits.

---

## 5. Music Generation

**What worked well:** `generate_sound_effects` produced all 9 music/sting files successfully.

| File | Description | Duration | Tool |
|------|-------------|----------|------|
| Intro music | Dramatic orchestral with brass/strings | 8s | generate_sound_effects |
| Outro music | Dramatic orchestral conclusion | 8s | generate_sound_effects |
| Block transition stings (x5) | Brass hit with string sustain | 3s | generate_sound_effects |
| Story stings (x2 variants) | Clean minimal electronic | 1.5s | generate_sound_effects |

**The lesson:** `generate_sound_effects` is reliable for generating background music and transition stings. Describe the mood/style in the prompt, not musical notes.

**Prompt template that worked:**
```
"Dramatic orchestral news intro with brass fanfare and sweeping strings, 
professional broadcast quality, building to crescendo, 8 seconds"
```

**What does NOT work:** Using `generate_speech` with a voice ID to generate music. Music generation has no voice. The prompt's instruction to use `XB0fDUnXU5powFXDhCwa` for music was technically nonsensical.

---

## 6. Bitrate vs. File Size

**Target was 320kbps. Final was 96kbps. Is this acceptable?**

| Bitrate | Quality | Use Case |
|---------|---------|----------|
| 320kbps | Transparent (CD quality) | Music distribution |
| 192kbps | Excellent | Professional podcast |
| 128kbps | Very good | Standard podcast |
| 96kbps | Good | Speech-only podcast (acceptable) |
| 64kbps | Fair | Speech with compression artifacts |

**For a NEWS podcast (primarily speech): 96-128kbps is acceptable.** The content is narration, not music. Listeners won't notice the difference on typical podcast playback devices (phone speakers, car audio, earbuds).

**However:** If the podcast includes significant music segments, 128kbps is the minimum to avoid audible compression in the music portions.

**Recommendation:** Use **128kbps as the default** for speech-heavy podcasts. This keeps a 60-minute podcast at ~58MB (under the 90MB limit) with quality that is indistinguishable from 192kbps for speech content.

---

## 7. Shell Tool Timeouts

**The constraint:** Shell tool has a 120-second timeout.

**What happened:**
- ffmpeg at 192kbps took ~50 seconds but the shell tool timed out (overhead from file I/O pushed it over 120s)
- ffmpeg at 96kbps took ~30 seconds -> SUCCESS
- pip install edge-tts -> SUCCESS (fast)
- nohup background processes -> Multiple conflicting processes, I/O errors

**The lesson:** Keep ffmpeg operations under ~20-25 seconds of actual CPU time to stay within the 120s shell timeout. Higher bitrates = more encoding time = more likely to timeout.

**If you MUST use higher bitrate:**
```bash
# Use -preset ultrafast for ffmpeg (faster encoding, slightly larger file)
ffmpeg -y -f concat -safe 0 -i filelist.txt \
  -acodec libmp3lame -b:a 192k -preset ultrafast \
  output.mp3
```

**Avoid background processes.** `nohup` and `&` caused multiple ffmpeg instances to conflict, leading to corrupted files and I/O errors. Always run ffmpeg in the foreground within the shell tool.

---

## 8. Tool Availability Matrix

| Tool | Available? | Works for? | Notes |
|------|-----------|------------|-------|
| `generate_speech` | Yes | TTS | Only Chinese voices available |
| `generate_sound_effects` | Yes | Music/SFX | Works perfectly for all music |
| `get_available_voices` | Yes | Discovery | Lists available voices |
| `edge-tts` (Python) | After pip install | TTS | `en-US-AriaNeural` worked well |
| `pydub` | Pre-installed | Audio manipulation | Fails for large files |
| `ffmpeg` | Pre-installed | Audio conversion/concat | Most reliable for assembly |

**The gap:** No reliable English TTS through built-in tools. `edge-tts` is a solid workaround but requires pip install and IPython restart.

**For future runs:**
```bash
# Always run this at the start of audio production:
pip install edge-tts
# Then restart IPython environment if needed
```

---

## 9. Recommended Audio Pipeline

Based on all lessons, here is the optimized audio production workflow:

```python
#!/usr/bin/env python3
"""Optimized Audio Pipeline for AI Newsroom Podcasts."""

import os
import subprocess
import edge_tts

# === CONFIGURATION ===
OUTPUT_DIR = "/mnt/agents/output"
VOICE = "en-US-AriaNeural"  # Fallback from XB0fDUnXU5powFXDhCwa
MAX_FILE_MB = 85  # Stay under 90MB filesystem limit

# Calculate safe bitrate
duration_minutes = estimated_duration  # From script analysis
max_bitrate_kbps = int((MAX_FILE_MB * 1024 * 8) / (duration_minutes * 60) / 1000)
BITRATE = min(320, max(96, min(max_bitrate_kbps, 192)))  # Cap at 192, floor at 96

# === STEP 1: Generate music ===
music_files = [
    ("01_intro.mp3", "Dramatic orchestral news intro, 8s", 8),
    ("02_outro.mp3", "Dramatic orchestral outro, 8s", 8),
    # ... etc
]
# Use generate_sound_effects for each

# === STEP 2: Generate narration ===
# Split long segments at paragraph boundaries
# Use edge_tts with VOICE
# Save to numbered files

# === STEP 3: Build concat filelist ===
segments = [
    "01_intro.mp3", "05_opening.mp3", "03a_block.mp3",
    # ... in exact play order
]
with open(f"{OUTPUT_DIR}/filelist.txt", 'w') as f:
    for seg in segments:
        f.write(f"file '{OUTPUT_DIR}/{seg}'\n")

# === STEP 4: Assemble with ffmpeg ===
subprocess.run([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
    "-i", f"{OUTPUT_DIR}/filelist.txt",
    "-acodec", "libmp3lame",
    "-b:a", f"{BITRATE}k",
    "-ar", "44100",
    f"{OUTPUT_DIR}/final_podcast.mp3"
], check=True, timeout=90)  # Under 120s shell limit

# === STEP 5: Verify ===
size_mb = os.path.getsize(f"{OUTPUT_DIR}/final_podcast.mp3") / (1024*1024)
print(f"Final: {size_mb:.1f}MB at {BITRATE}kbps")
```

---

## 10. Hardware/Environment Assumptions

Document these assumptions for reproducibility:

| Resource | Available | Limit |
|----------|-----------|-------|
| RAM (IPython) | ~4GB | pydub fails above ~2GB usage |
| Disk (/mnt/agents/output) | Unlimited total | **90MB per file** |
| Shell timeout | 120 seconds | ffmpeg must complete in ~90s |
| IPython timeout | 600 seconds | Sufficient for all TTS |
| Python packages | Pre-installed: pydub, ffmpeg | edge-tts needs `pip install` |
| Network | Full internet | Required for edge-tts, SFX generation |

**If running in a different environment:**
- Check filesystem limits FIRST
- Verify TTS voice availability FIRST
- Test ffmpeg with a small concat before the full assembly
- Always have a fallback voice/engine

---

## Quick Troubleshooting Guide

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| "Voice not found" | ElevenLabs voice ID unavailable | Use get_available_voices(), fallback to edge-tts |
| "I/O error" on export | File >90MB | Reduce bitrate to 128kbps or lower |
| "Transport endpoint not connected" | Filesystem disconnect | Retry at lower bitrate |
| pydub OSError | Out of memory | Use ffmpeg concat instead |
| Shell timeout (120s) | ffmpeg too slow | Lower bitrate or add `-preset ultrafast` |
| ffmpeg concat fails | Wrong filelist format | Use `file '/path/to/file.mp3'` format |
| TTS output is garbled | Text too long | Split at 3000-4000 char boundaries |
| Music overlaps narration | Assembly order wrong | Music first, narration second, never overlap |
| Multiple ffmpeg conflicts | Background processes | Kill all ffmpeg, run single foreground process |
