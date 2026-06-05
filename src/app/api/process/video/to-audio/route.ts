import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function POST(req: NextRequest) {
  const ts = Date.now();
  const tempIn = path.join(process.cwd(), 'public', 'temp', `video_to_audio_in_${ts}.mp4`);
  const tempAudioOut = path.join(process.cwd(), 'public', 'temp', `video_to_audio_out_${ts}.mp3`);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Missing video file' }, { status: 400 });
    }

    // Save input to temp
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.mkdirSync(path.dirname(tempIn), { recursive: true });
    fs.writeFileSync(tempIn, buffer);

    console.log(`[Video to Audio] Extracting audio from video (Size: ${(file.size / 1024 / 1024).toFixed(2)} MB)...`);

    // Extract Audio using FFmpeg (High-quality MP3 for user download)
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempIn)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate('192k')    // High quality audio for standalone download
        .output(tempAudioOut)
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('[Video to Audio] FFmpeg error extracting audio:', err);
          reject(err);
        })
        .run();
    });

    console.log(`[Video to Audio] Audio extracted successfully.`);

    // Read the extracted audio file
    const audioBuffer = fs.readFileSync(tempAudioOut);
    const base64 = audioBuffer.toString('base64');
    const resultUrl = `data:audio/mp3;base64,${base64}`;

    // Cleanup
    try { fs.unlinkSync(tempIn); } catch {}
    try { fs.unlinkSync(tempAudioOut); } catch {}

    return NextResponse.json({
      success: true,
      resultUrl,
    });

  } catch (error: any) {
    console.error('Video to Audio API Route Error:', error);
    try { fs.unlinkSync(tempIn); } catch {}
    try { fs.unlinkSync(tempAudioOut); } catch {}
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
