# Audio Production — Generic Lessons for Agent Swarms

> Read this file BEFORE starting audio production in any podcast pipeline. It prevents the most common technical failures.

---

## 1. Verify Voice Availability Before Starting

**The mistake:** Hardcoding a specific voice ID (e.g., `XB0fDUnXU5powFXDhCwa`) and failing when it is not available in the execution environment.

**The fix:** At the start of audio production, check what voices actually exist:

```python
# Step 0: Voice discovery
available_voices = get_available_voices()
english_voices = [v for v in available_voices if "en" in v.language.lower()]

if PREFERRED_VOICE in [v.id for v in english_voices]:
    voice = PREFERRED_VOICE
elif english_voices:
    voice = english_voices[0].id
    log(f"Preferred voice unavailable, using: {voice}")
else:
    # Fallback to edge-tts or other engine
    voice = "en-US-AriaNeural"  # edge-tts fallback
    engine = "edge-tts"
```

**Never fail production because a voice is missing.** Log the fallback and continue.

---

## 2. Know Your Filesystem Limits

**The mistake:** Generating a 320kbps MP3 for a 60+ minute podcast and hitting a filesystem size limit during export.

**Common limit:** The output filesystem has a per-file limit around 90-100 MB.

**Calculate safe bitrate BEFORE encoding:**

```python
def calculate_safe_bitrate(duration_minutes, max_file_mb=85):
    """Calculate highest safe bitrate that stays under filesystem limit."""
    max_bits = max_file_mb * 1024 * 1024 * 8
    duration_seconds = duration_minutes * 60
    max_kbps = int(max_bits / duration_seconds / 1000)
    # Cap at 192, floor at 96, always leave margin
    return min(192, max(96, int(max_kbps * 0.9)))

# Example: 65-minute podcast
safe_bitrate = calculate_safe_bitrate(65)  # Returns ~128
```

**Quick reference table:**

| Duration | 320kbps | 192kbps | 128kbps | 96kbps |
|----------|---------|---------|---------|--------|
| 30 min | 72 MB | 43 MB | 29 MB | 22 MB |
| 45 min | 108 MB | 65 MB | 43 MB | 32 MB |
| 60 min | 144 MB | 86 MB | 58 MB | 43 MB |
| 70 min | 161 MB | 96 MB | 64 MB | 48 MB |
| **90 MB safe limit** | **~37 min** | **~62 min** | **~93 min** | **~124 min** |

**For a typical 60-70 minute news podcast: use 128kbps.** For speech content, 128kbps is audibly identical to 192kbps. The music stings are short enough that compression artifacts in them are negligible.

---

## 3. Use ffmpeg Concat for Long Podcasts

**The mistake:** Using pydub's `AudioSegment` to concatenate 25+ audio files in memory. pydub loads everything into RAM and fails with OSError for podcasts longer than ~30-40 minutes.

**What works:** ffmpeg's concat demuxer. It streams files sequentially without loading them all into memory.

**The workflow:**

```python
import subprocess

# Step 1: Create a filelist
segments = [
    "01_intro_music.mp3",
    "02_opening_narration.mp3",
    "03_block_sting.mp3",
    # ... in exact play order
]

with open("filelist.txt", "w") as f:
    for seg in segments:
        f.write(f"file '/absolute/path/to/{seg}'\n")

# Step 2: Concatenate with ffmpeg
subprocess.run([
    "ffmpeg", "-y",
    "-f", "concat", "-safe", "0",
    "-i", "filelist.txt",
    "-acodec", "libmp3lame",
    "-b:a", f"{safe_bitrate}k",
    "-ar", "44100",
    "/mnt/agents/output/final_podcast.mp3"
], check=True, timeout=90)  # Keep under 120s shell limit
```

**Critical format for filelist.txt:**
```
file '/mnt/agents/output/01_intro_music.mp3'
file '/mnt/agents/output/02_opening_narration.mp3'
```
Each line MUST start with `file '` and use absolute paths.

**pydub is fine for:**
- Short clips (<5 minutes total)
- Adding fade-in/fade-out to individual files
- Crossfading between two tracks

**pydub will fail for:**
- Full podcast assembly (>30 minutes)
- Any operation loading 100+ MB of audio into memory

---

## 4. Chunk TTS at Paragraph Boundaries

**The mistake:** Sending a 6000-character story segment to TTS in one call and hitting length limits or getting truncated output.

**The fix:** Split long text at paragraph boundaries before TTS generation:

```python
def chunk_for_tts(text, max_chars=3500):
    """Split text at paragraph boundaries for TTS generation."""
    paragraphs = text.split('\n\n')
    chunks = []
    current = ""
    
    for para in paragraphs:
        test = current + para + "\n\n" if current else para
        if len(test) <= max_chars:
            current = test
        else:
            if current:
                chunks.append(current.strip())
            current = para
    
    if current:
        chunks.append(current.strip())
    
    return chunks
```

**Rules:**
- Max 3500 characters per TTS call (stays well under limits)
- Split at paragraph boundaries only (not mid-sentence)
- Concatenate chunks after generation using ffmpeg (seamless at paragraph breaks)
- A typical 6000-character story = 2 chunks

---

## 5. Music vs. Speech Generation Tools

**The mistake:** Using `generate_speech` with a voice ID to produce music or transition stings. Speech generation has a voice; music generation does not.

**The correct tool mapping:**

| Audio type | Tool | How |
|-----------|------|-----|
| Narration (speech) | `generate_speech` or `edge-tts` | Text + voice ID |
| Intro/outro music | `generate_sound_effects` | Description of mood/style |
| Transition stings | `generate_sound_effects` | Description of sound |
| Story stings | `generate_sound_effects` | Description of sound |

**Prompt template for music that works:**
```
"Dramatic orchestral news intro with brass fanfare and sweeping strings,
professional broadcast quality, building to crescendo, [N] seconds"
```

**Prompt template for transition stings:**
```
"Classic news transition sting, brass hit with string sustain,
professional broadcast, [N] seconds"
```

---

## 6. Music and Narration Must Not Overlap

**The rule:** Music plays FIRST (alone), then FADES OUT, then narration plays SECOND (alone). Never simultaneously.

**Assembly order:**
```
[INTRO MUSIC] -> fade out -> [OPENING NARRATION]
[BLOCK STING] -> [HEADLINES NARRATION]
[STORY STING] -> [STORY 1 NARRATION]
[STORY STING] -> [STORY 2 NARRATION]
... etc ...
[SIGN-OFF NARRATION] -> fade out -> [OUTRO MUSIC]
```

**Why:** Simultaneous music and speech sounds unprofessional and makes narration hard to understand. The podcast should feel like a BBC broadcast — clean separation between music and speech.

---

## 7. Watch the Shell Timeout

**The constraint:** Shell tool calls time out after 120 seconds.

**What this means for ffmpeg:**
- 128kbps encoding of a 70-minute podcast: ~25-30 seconds -> SAFE
- 192kbps encoding of a 70-minute podcast: ~40-50 seconds -> BORDERLINE
- 320kbps encoding of a 70-minute podcast: ~60-80 seconds -> LIKELY TIMEOUT

**If you need higher bitrate and are near the timeout:**
```bash
ffmpeg -y -f concat -safe 0 -i filelist.txt \
  -acodec libmp3lame -b:a 192k \
  -preset ultrafast \  # Faster encoding, slightly larger file
  output.mp3
```

**Never use background processes** (`nohup`, `&`) to bypass the timeout. Multiple ffmpeg instances conflict, corrupt output files, and cause I/O errors. Always run ffmpeg in the foreground.

---

## 8. Tool Availability Matrix

| Tool | Purpose | Reliability | Fallback if unavailable |
|------|---------|-------------|------------------------|
| `generate_speech` | TTS narration | Varies by voice availability | `edge-tts` Python library |
| `generate_sound_effects` | Music, stings | Reliable | None needed |
| `get_available_voices` | Voice discovery | Reliable | N/A |
| `edge-tts` (Python) | TTS narration | Reliable after `pip install` | None |
| `pydub` (Python) | Audio manipulation | Fails for large files | `ffmpeg` concat |
| `ffmpeg` (shell) | Audio assembly, conversion | Reliable | None |

**Pre-flight checklist:**
```python
# Before generating ANY audio:
1. pip install edge-tts  # Ensure fallback TTS is ready
2. Check voice availability
3. Calculate safe bitrate from expected duration
4. Verify output directory exists and is writable
5. Test ffmpeg with a 2-file concat before the full assembly
```

---

## 9. File Count and Assembly Order

**Typical file count for a podcast with N stories:**

| Category | Count | Files |
|----------|-------|-------|
| Music | 3 | intro, outro, block transitions (x1 or x5) |
| Stings | 2 variants | story stings (reused between stories) |
| Narration | 4 + N | opening, headlines, N stories, transitions, editorial, sign-off |
| **Total** | **~15 + N** | For 8 stories: ~23 files |

**The final assembly is a simple ordered list.** Write it out explicitly before calling ffmpeg:

```python
ASSEMBLY_ORDER = [
    ("01_intro_music.mp3", "music"),
    ("05_opening.mp3", "voice"),
    ("03a_block_opening.mp3", "music"),
    ("06_headlines.mp3", "voice"),
    ("03b_block_headlines.mp3", "music"),
    ("09_transition_1.mp3", "voice"),
    ("03c_block_iran.mp3", "music"),
    ("07a_story_1.mp3", "voice"),
    ("04_story_sting.mp3", "music"),
    ("07b_story_2.mp3", "voice"),
    # ... continue for all stories and segments
    ("11_signoff.mp3", "voice"),
    ("02_outro_music.mp3", "music"),
]
```

The "music" / "voice" tags are for documentation only — ffmpeg concat plays everything sequentially regardless. The tags help verify the pattern: music -> voice -> sting -> voice -> sting -> voice...

---

## 10. Environment Assumptions

Document these for reproducibility across different environments:

| Resource | Typical Availability | Hard Limit |
|----------|---------------------|------------|
| RAM (IPython) | ~4 GB | pydub fails above ~2 GB |
| Disk (output dir) | Unlimited total | **~90 MB per file** |
| Shell timeout | 120 seconds | ffmpeg must finish in ~90s |
| IPython timeout | 600 seconds | TTS generation has plenty of time |
| Pre-installed Python | pydub, ffmpeg | edge-tts needs `pip install` |
| Network | Full internet | Required for all TTS and SFX |

**If running in a constrained environment:**
- Lower bitrate to 96kbps ( halves file size)
- Shorten music stings to 2-3 seconds
- Use fewer story sting variants (1 instead of 2)
- These changes have minimal quality impact on speech-heavy content

---

## Quick Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Voice not found" | ElevenLabs voice unavailable | Check available voices, fallback to edge-tts |
| "I/O error" on export | File exceeds ~90MB | Reduce bitrate to 128kbps or lower |
| "Transport endpoint not connected" | Filesystem disconnect | Retry, or use lower bitrate |
| pydub OSError | Out of memory | Use ffmpeg concat instead |
| Shell timeout (120s) | ffmpeg too slow | Lower bitrate or add `-preset ultrafast` |
| TTS output truncated | Text too long | Split at paragraph boundaries, max 3500 chars |
| ffmpeg concat fails | Wrong filelist format | Use `file '/absolute/path.mp3'` format |
| Multiple ffmpeg errors | Background processes | `pkill ffmpeg`, run single foreground process |
| Music overlaps narration | Wrong assembly order | Music file always BEFORE its narration |
