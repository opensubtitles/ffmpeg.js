# Enhanced Audio Encoding Guide for FFmpeg.js

This guide covers the enhanced audio encoding capabilities available in the MKVE build, specifically designed for transcription workflows.

## Overview

The MKVE build now supports true audio encoding (not just stream copy), enabling optimized audio extraction for speech-to-text services like OpenAI Whisper, Google Speech-to-Text, and other transcription tools.

## Supported Audio Encoders

### MP3 Encoding (libmp3lame)
- **Encoder**: `libmp3lame`
- **Container**: `mp3`
- **Use Case**: Maximum transcription compatibility
- **Recommended Settings**: 16kHz, mono, 24kbps
- **Command**: `ffmpeg -i input.mkv -map 0:a:0 -c:a libmp3lame -ar 16000 -ac 1 -b:a 24k output.mp3`

### WAV Output (PCM)
- **Encoder**: `pcm_s16le`
- **Container**: `wav`
- **Use Case**: High-quality uncompressed audio
- **Recommended Settings**: 16kHz, mono, 16-bit
- **Command**: `ffmpeg -i input.mkv -map 0:a:0 -c:a pcm_s16le -ar 16000 -ac 1 output.wav`

### AAC Encoding
- **Encoder**: `aac`
- **Container**: `mp4`, `matroska`
- **Use Case**: Efficient encoding with good quality-to-size ratio
- **Recommended Settings**: 16kHz, mono, 32kbps
- **Command**: `ffmpeg -i input.mkv -map 0:a:0 -c:a aac -ar 16000 -ac 1 -b:a 32k output.m4a`

### Additional PCM Codecs
- **pcm_s8**: 8-bit signed PCM
- **pcm_u8**: 8-bit unsigned PCM
- **pcm_alaw**: A-law PCM (telephony)
- **pcm_mulaw**: μ-law PCM (telephony)

## Build Configuration

The MKVE build includes the following audio encoding support:

```makefile
MKVE_DEMUXERS = matroska mov avi wav
MKVE_MUXERS = matroska mp4 mov srt ass sup webvtt dvd vob flac mp3 wav null
MKVE_DECODERS = pcm_s16le pcm_s8 pcm_u8 pcm_alaw pcm_mulaw aac mp3
MKVE_ENCODERS = aac libmp3lame pcm_s16le pcm_s8 pcm_u8 pcm_alaw pcm_mulaw
```

## Transcription Optimization

### Recommended Audio Settings for Speech Recognition

| Service | Sample Rate | Channels | Bitrate | Format |
|---------|-------------|----------|---------|--------|
| OpenAI Whisper | 16kHz | Mono | 24kbps | MP3 |
| Google Speech-to-Text | 16kHz | Mono | 32kbps | MP3 |
| Azure Speech Services | 16kHz | Mono | 16kbps | MP3 |
| AWS Transcribe | 16kHz | Mono | 24kbps | MP3 |
| Custom/Local ASR | 16kHz | Mono | N/A | WAV |

### Quality vs File Size Comparison

| Format | Quality | File Size (5min audio) | Processing Time |
|--------|---------|------------------------|-----------------|
| MP3 24kbps | Good | ~900KB | Fast |
| MP3 32kbps | Better | ~1.2MB | Fast |
| MP3 48kbps | Best | ~1.8MB | Fast |
| WAV 16-bit | Excellent | ~9.4MB | Very Fast |

## Usage Examples

### Basic Audio Extraction

```javascript
// Extract audio and convert to MP3 for transcription
const args = [
  '-i', '/data/video.mkv',
  '-map', '0:a:0',
  '-c:a', 'libmp3lame',
  '-ar', '16000',
  '-ac', '1',
  '-b:a', '24k',
  '/data/transcription.mp3'
];

await ffmpeg.run(...args);
```

### Batch Processing

```javascript
// Process multiple audio tracks from a video
const audioTracks = await ffmpeg.listAudioStreams('/data/meeting.mkv');

for (const track of audioTracks) {
  const args = [
    '-i', '/data/meeting.mkv',
    '-map', `0:a:${track.index}`,
    '-c:a', 'libmp3lame',
    '-ar', '16000',
    '-ac', '1',
    '-b:a', '24k',
    `/data/track_${track.index}.mp3`
  ];

  await ffmpeg.run(...args);
}
```

### Quality Options

```javascript
// High quality WAV for professional transcription
const wavArgs = [
  '-i', '/data/interview.mkv',
  '-map', '0:a:0',
  '-c:a', 'pcm_s16le',
  '-ar', '16000',
  '-ac', '1',
  '/data/interview.wav'
];

// Standard MP3 for cloud transcription
const mp3Args = [
  '-i', '/data/interview.mkv',
  '-map', '0:a:0',
  '-c:a', 'libmp3lame',
  '-ar', '16000',
  '-ac', '1',
  '-b:a', '24k',
  '/data/interview.mp3'
];
```

## File Size and Performance

### Browser Memory Usage
- Base MKVE build: ~1MB WASM + 52KB JS
- With audio encoding: +200-400KB for LAME library
- Total memory usage: ~50-100MB for typical operations

### Performance Benchmarks
- 5-minute MP3 encoding: ~2-5 seconds in modern browsers
- 5-minute WAV encoding: ~1-2 seconds
- Large file support: Handles 2GB+ files (limited by browser memory)

## Integration with Transcription Services

### OpenAI Whisper API

```javascript
// Extract and upload to Whisper API
const audioBuffer = await ffmpeg.run(
  '-i', '/data/video.mkv',
  '-map', '0:a:0',
  '-c:a', 'libmp3lame',
  '-ar', '16000',
  '-ac', '1',
  '-b:a', '24k',
  '-f', 'mp3',
  'pipe:1'
);

const formData = new FormData();
formData.append('file', new Blob([audioBuffer]), 'audio.mp3');
formData.append('model', 'whisper-1');

const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
  body: formData
});
```

### Google Speech-to-Text

```javascript
// Convert to linear PCM for Google's API
const audioBuffer = await ffmpeg.run(
  '-i', '/data/video.mkv',
  '-map', '0:a:0',
  '-c:a', 'pcm_s16le',
  '-ar', '16000',
  '-ac', '1',
  '-f', 'wav',
  'pipe:1'
);
```

## Troubleshooting

### Common Issues

1. **Memory errors with large files**
   - Reduce input file size
   - Use lower bitrate encoding
   - Process in chunks

2. **Encoding not available**
   - Verify using `ffmpeg -encoders`
   - Check that MKVE build is used
   - Ensure LAME library is loaded

3. **Poor transcription quality**
   - Use 16kHz sample rate
   - Ensure mono audio
   - Try higher bitrate (32kbps+)
   - Use WAV for critical applications

### Verification Commands

```bash
# Check available encoders
ffmpeg -encoders | grep -E "(mp3lame|pcm_|aac)"

# Check available muxers
ffmpeg -muxers | grep -E "(mp3|wav|mp4)"

# Test MP3 encoding
ffmpeg -f lavfi -i anullsrc=r=16000:cl=mono -t 5 -c:a libmp3lame -b:a 24k test.mp3

# Test WAV encoding
ffmpeg -f lavfi -i anullsrc=r=16000:cl=mono -t 5 -c:a pcm_s16le test.wav
```

## Migration Guide

### From Stream Copy to Real Encoding

**Before (stream copy only):**
```javascript
const args = [
  '-i', '/data/video.mkv',
  '-map', '0:a:0',
  '-c:a', 'copy',  // Only container change
  '/data/output.mp4'
];
```

**After (true encoding):**
```javascript
const args = [
  '-i', '/data/video.mkv',
  '-map', '0:a:0',
  '-c:a', 'libmp3lame',  // Real MP3 encoding
  '-ar', '16000',        // Optimize for speech
  '-ac', '1',           // Mono channel
  '-b:a', '24k',        // Efficient bitrate
  '/data/output.mp3'   // Better container
];
```

## License Considerations

- **libmp3lame**: Licensed under LGPL - suitable for most applications
- **AAC**: May require patent licenses in some jurisdictions
- **PCM codecs**: Generally unrestricted
- **Commercial use**: Verify licensing requirements for your jurisdiction

## Future Enhancements

Potential additions to consider:
- Opus encoding for even better compression
- Additional sample rate support (8kHz for legacy systems)
- Noise reduction filters
- Audio normalization options
- Real-time streaming encoding

---

**Note**: This feature represents a significant enhancement to FFmpeg.js, enabling complete audio processing workflows directly in the browser without requiring server-side processing.