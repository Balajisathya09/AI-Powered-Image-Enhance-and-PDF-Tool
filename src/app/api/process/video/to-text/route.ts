import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const HF_TOKEN = process.env.HF_TOKEN || '';

export async function POST(req: NextRequest) {
  const ts = Date.now();
  const tempIn = path.join(process.cwd(), 'public', 'temp', `video_to_text_in_${ts}.mp4`);
  const tempAudioOut = path.join(process.cwd(), 'public', 'temp', `video_to_text_audio_${ts}.mp3`);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Missing video file' }, { status: 400 });
    }

    if (!HF_TOKEN) {
      return NextResponse.json({ error: 'Hugging Face Token is missing. Please add HF_TOKEN to .env.local' }, { status: 500 });
    }

    // Save input to temp
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.mkdirSync(path.dirname(tempIn), { recursive: true });
    fs.writeFileSync(tempIn, buffer);

    console.log(`[Video to Text] Extracting audio from video...`);

    // Extract Audio using FFmpeg (Low-bitrate MP3 for maximum upload speed to Hugging Face)
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempIn)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate('32k')     // Heavily compress audio since Whisper only needs speech
        .audioFrequency(16000)   // Whisper optimally uses 16kHz
        .audioChannels(1)        // Mono
        .output(tempAudioOut)
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('[Video to Text] FFmpeg error extracting audio:', err);
          reject(err);
        })
        .run();
    });

    console.log(`[Video to Text] Audio extracted. Sending to Hugging Face Whisper API...`);

    // Read the extracted audio file
    const audioBuffer = fs.readFileSync(tempAudioOut);
    const audioSizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`[Video to Text] Audio file size is ${audioSizeMB} MB`);

    if (audioBuffer.length > 25 * 1024 * 1024) {
      throw new Error(`The extracted audio (${audioSizeMB} MB) exceeds the Hugging Face API size limit (approx 25MB). Please use a shorter video.`);
    }

    let result;
    try {
      const hf = new HfInference(HF_TOKEN);
      
      // The SDK needs a Blob with a defined mime type, otherwise it sends Content-Type: None
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });

      // Call Hugging Face API using the official SDK (handles retries/timeouts automatically)
      const hfResponse = await hf.automaticSpeechRecognition({
        model: 'openai/whisper-large-v3-turbo',
        data: audioBlob,
      });

      result = hfResponse;
    } catch (fetchError: any) {
      console.error("[Video to Text] SDK error:", fetchError);
      throw new Error(`Failed to connect to AI Transcription service. Check your internet connection. Details: ${fetchError.message}`);
    }

    // Cleanup
    try { fs.unlinkSync(tempIn); } catch {}
    try { fs.unlinkSync(tempAudioOut); } catch {}

    return NextResponse.json({
      success: true,
      text: result.text || "No speech detected.",
    });

  } catch (error: any) {
    console.error('Video to Text API Route Error:', error);
    try { fs.unlinkSync(tempIn); } catch {}
    try { fs.unlinkSync(tempAudioOut); } catch {}
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
