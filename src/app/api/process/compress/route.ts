import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const level = formData.get('level') as string; // 'low', 'medium', 'high'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let quality = 92; // default (low compression, highest quality)
    if (level === 'medium') quality = 84; // medium compression, very high quality
    if (level === 'high') quality = 75; // high compression, quality is still preserved/indistinguishable from original

    // Get original metadata to retain format
    const metadata = await sharp(buffer).metadata();
    const format = metadata.format || 'jpeg';

    let compressedBuffer;
    
    const image = sharp(buffer);
    
    if (format === 'jpeg' || format === 'jpg') {
      compressedBuffer = await image.jpeg({ quality }).toBuffer();
    } else if (format === 'webp') {
      compressedBuffer = await image.webp({ quality }).toBuffer();
    } else if (format === 'png') {
      // PNG uses compressionLevel 0-9
      const pngLevel = level === 'high' ? 9 : (level === 'medium' ? 6 : 4);
      compressedBuffer = await image.png({ compressionLevel: pngLevel }).toBuffer();
    } else {
      // Fallback to jpeg for other formats
      compressedBuffer = await image.jpeg({ quality }).toBuffer();
    }

    const base64 = compressedBuffer.toString('base64');
    const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;

    return NextResponse.json({
      success: true,
      originalSize: buffer.length,
      compressedSize: compressedBuffer.length,
      dataUrl: `data:${mimeType};base64,${base64}`
    });
  } catch (error) {
    console.error('Compression error:', error);
    return NextResponse.json({ error: 'Failed to compress image' }, { status: 500 });
  }
}
