import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export async function POST(req: NextRequest) {
  const ts = Date.now();
  const tempIn = path.join(process.cwd(), 'public', 'temp', `video_in_${ts}.mp4`);
  const tempOut = path.join(process.cwd(), 'public', 'temp', `video_out_${ts}.mp4`);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const targetSizeMB = parseFloat(formData.get('targetSizeMB') as string) || 25;

    if (!file) {
      return NextResponse.json({ error: 'Missing video file' }, { status: 400 });
    }

    // Save input to temp
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.mkdirSync(path.dirname(tempIn), { recursive: true });
    fs.writeFileSync(tempIn, buffer);

    console.log(`[Video Compressor] File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB, Target: ${targetSizeMB} MB`);

    // Get video duration
    const getDuration = (): Promise<number> => {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempIn, (err, metadata) => {
          if (err) return reject(err);
          const duration = metadata.format.duration;
          if (duration) resolve(duration);
          else reject(new Error('Could not read video duration'));
        });
      });
    };

    const duration = await getDuration();
    
    // Calculate Bitrate (Target Size in MB * 8192 kb/MB / Duration in seconds)
    // 8192 kilobits = 1 Megabyte
    // We aim for 95% of target size to leave room for container overhead (metadata, headers)
    const safeTargetMB = targetSizeMB * 0.95; 
    const totalBitrate = Math.floor((safeTargetMB * 8192) / duration);
    
    // Dynamically adjust audio bitrate based on total available bitrate
    let audioBitrate = 128;
    if (totalBitrate < 400) audioBitrate = 64;
    if (totalBitrate < 200) audioBitrate = 32;

    const videoBitrate = Math.max(totalBitrate - audioBitrate, 50); // Hard floor of 50kbps

    console.log(`[Video Compressor] Duration: ${duration.toFixed(2)}s | Total Bitrate: ${totalBitrate}k | Video: ${videoBitrate}k | Audio: ${audioBitrate}k`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempIn)
        .outputOptions([
          // Use Constant Rate Factor (CRF) 18 for pristine, visually transparent high quality
          '-crf 18',
          // Use a slower preset for maximum size efficiency while retaining high quality
          '-preset slow',
          // Apply Professional Video Enhancements:
          // 1. Unsharp mask (sharpens details)
          // 2. EQ filter (boosts contrast by 10%, saturation by 20%, slight brightness lift)
          '-vf unsharp=5:5:1.0:5:5:0.0,eq=contrast=1.1:saturation=1.2:brightness=0.01',
          // Cap the maximum bitrate to prevent unnecessary bloat on complex frames
          `-maxrate ${Math.max(videoBitrate, 4000)}k`,
          `-bufsize ${Math.max(videoBitrate * 2, 8000)}k`,
          `-b:a ${audioBitrate}k`,
          '-c:v libx264',
          '-c:a aac',
          `-fs ${targetSizeMB * 1024 * 1024}` // Hard stop at exact byte size if it gets too large
        ])
        .output(tempOut)
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('[Video Compressor] FFmpeg error:', err);
          reject(err);
        })
        .run();
    });

    const outBuffer = fs.readFileSync(tempOut);
    const base64 = outBuffer.toString('base64');
    const resultUrl = `data:video/mp4;base64,${base64}`;

    // Cleanup
    try { fs.unlinkSync(tempIn); } catch {}
    try { fs.unlinkSync(tempOut); } catch {}

    return NextResponse.json({
      success: true,
      resultUrl,
      originalSize: file.size,
      newSize: outBuffer.length
    });

  } catch (error: any) {
    console.error('Video Compressor API Route Error:', error);
    try { fs.unlinkSync(tempIn); } catch {}
    try { fs.unlinkSync(tempOut); } catch {}
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
