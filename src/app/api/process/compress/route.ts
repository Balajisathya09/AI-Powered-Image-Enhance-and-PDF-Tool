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

    const targetSizeKB = parseInt(formData.get('targetSizeKB') as string);

    // Get original metadata to retain format
    const metadata = await sharp(buffer).metadata();
    const format = metadata.format || 'jpeg';
    // Apply Professional Image Enhancements automatically:
    // 1. Sharpen to increase clarity and reduce blur
    // 2. Modulate to boost color saturation by 20%
    const image = sharp(buffer)
      .sharpen({ sigma: 1.5 })
      .modulate({ saturation: 1.2 });

    let compressedBuffer: any = buffer;

    if (targetSizeKB && targetSizeKB > 0) {
      const targetBytes = targetSizeKB * 1024;
      
      if (buffer.length > targetBytes) {
        // Binary search for the right quality to hit the target size
        let minQ = 1;
        let maxQ = 100;
        let bestBuffer: any = buffer;
        let smallestBuffer: any = buffer; // Track absolute smallest just in case
        let bestDiff = Infinity;
        let foundValid = false;
        
        // Max 7 iterations for binary search is usually enough
        for (let i = 0; i < 7; i++) {
          const midQ = Math.floor((minQ + maxQ) / 2);
          
          let tempBuffer;
          if (format === 'webp') {
            tempBuffer = await image.webp({ quality: midQ, effort: 6 }).toBuffer();
          } else if (format === 'png') {
            const pLevel = Math.max(1, Math.min(9, Math.floor(10 - (midQ / 10))));
            tempBuffer = await image.png({ compressionLevel: pLevel }).toBuffer();
          } else {
            tempBuffer = await image.jpeg({ quality: midQ, mozjpeg: true }).toBuffer();
          }

          // Track the absolute smallest buffer generated in case we can't reach the target
          if (tempBuffer.length < smallestBuffer.length) {
            smallestBuffer = tempBuffer;
          }

          const diff = Math.abs(tempBuffer.length - targetBytes);
          if (diff < bestDiff && tempBuffer.length <= targetBytes * 1.1) { // allow 10% margin
            bestDiff = diff;
            bestBuffer = tempBuffer;
            foundValid = true;
          }

          if (tempBuffer.length > targetBytes) {
            maxQ = midQ - 1; // Needs more compression
          } else {
            minQ = midQ + 1; // Can use higher quality
          }
        } // Close for loop

        // If even the absolute worst quality is still too big, we MUST resize the image dimensions
        if (smallestBuffer.length > targetBytes * 1.1) {
          let currentWidth = metadata.width || 1000;
          let currentHeight = metadata.height || 1000;
          compressedBuffer = smallestBuffer;
          
          let resizeLoops = 5;
          while (compressedBuffer.length > targetBytes * 1.05 && resizeLoops > 0) {
            // Calculate how much to shrink (using square root because size is proportional to Area = W * H)
            const ratio = Math.sqrt(targetBytes / compressedBuffer.length) * 0.95; // 0.95 safety margin
            currentWidth = Math.max(10, Math.floor(currentWidth * ratio));
            currentHeight = Math.max(10, Math.floor(currentHeight * ratio));
            
            // Resize and encode at a balanced low quality (40)
            if (format === 'webp') {
              compressedBuffer = await sharp(buffer).resize(currentWidth, currentHeight).sharpen({ sigma: 1.5 }).modulate({ saturation: 1.2 }).webp({ quality: 80, effort: 6 }).toBuffer();
            } else if (format === 'png') {
              compressedBuffer = await sharp(buffer).resize(currentWidth, currentHeight).sharpen({ sigma: 1.5 }).modulate({ saturation: 1.2 }).png({ compressionLevel: 9, effort: 10 }).toBuffer();
            } else {
              compressedBuffer = await sharp(buffer).resize(currentWidth, currentHeight).sharpen({ sigma: 1.5 }).modulate({ saturation: 1.2 }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
            }
            resizeLoops--;
          }
        } else {
          // If we found a valid size within 10% margin, use it. Otherwise, return the absolute smallest we could generate.
          compressedBuffer = foundValid ? bestBuffer : smallestBuffer;
        }
      }
    } else {
      // Fallback to old level logic if no target KB is provided
      const level = formData.get('level') as string;
      let quality = 92;
      if (level === 'medium') quality = 84;
      if (level === 'high') quality = 75;
      
      if (format === 'webp') compressedBuffer = await image.webp({ quality: level === 'high' ? 60 : 80, effort: 6 }).toBuffer();
      else if (format === 'png') compressedBuffer = await image.png({ compressionLevel: level === 'high' ? 9 : 6, effort: 10 }).toBuffer();
      else compressedBuffer = await image.jpeg({ quality: level === 'high' ? 60 : 80, mozjpeg: true }).toBuffer();
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
