import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const targetFormat = formData.get('format') as string; // 'png', 'jpg', 'webp'

    if (!file || !targetFormat) {
      return NextResponse.json({ error: 'Missing file or format' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let convertedBuffer;
    
    const image = sharp(buffer);
    
    if (targetFormat === 'png') {
      convertedBuffer = await image.png({ compressionLevel: 9, effort: 10 }).toBuffer();
    } else if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
      convertedBuffer = await image.jpeg({ mozjpeg: true, quality: 90 }).toBuffer();
    } else if (targetFormat === 'webp') {
      convertedBuffer = await image.webp({ lossless: true, effort: 6 }).toBuffer();
    } else {
      return NextResponse.json({ error: 'Unsupported target format' }, { status: 400 });
    }

    const base64 = convertedBuffer.toString('base64');
    const mimeType = `image/${targetFormat === 'jpg' ? 'jpeg' : targetFormat}`;

    return NextResponse.json({
      success: true,
      dataUrl: `data:${mimeType};base64,${base64}`
    });
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json({ error: 'Failed to convert image' }, { status: 500 });
  }
}
