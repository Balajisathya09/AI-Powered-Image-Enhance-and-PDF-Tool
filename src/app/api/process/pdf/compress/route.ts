import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

async function compressPdfWithFactor(buffer: Buffer, factor: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer);
  const rawContext = pdfDoc.context;
  const indirectObjects = (rawContext as any).indirectObjects;

  // factor goes from 0.0 (max compression / lowest quality) to 1.0 (min compression / highest quality)
  const targetQuality = Math.round(10 + 85 * factor); // 10 to 95 quality
  const targetScale = 0.3 + 0.7 * factor; // 0.3x to 1.0x scale

  for (const [ref, pdfObject] of indirectObjects.entries()) {
    if (pdfObject && typeof pdfObject === 'object' && 'dict' in pdfObject) {
      const dict = (pdfObject as any).dict;
      if (dict && typeof dict.get === 'function') {
        const subtype = dict.get(rawContext.obj('Subtype'));
        if (subtype && subtype.toString() === '/Image') {
          try {
            const stream = pdfObject as any;
            const contents = stream.contents;
            
            if (contents && contents.length > 15 * 1024) { // Optimize images > 15KB
              let sharpImg = sharp(contents);
              
              if (targetScale < 0.95) {
                const metadata = await sharpImg.metadata();
                if (metadata.width) {
                  sharpImg = sharpImg.resize({
                    width: Math.round(metadata.width * targetScale),
                    withoutEnlargement: true,
                  });
                }
              }
              
              const compressed = await sharpImg
                .jpeg({ quality: targetQuality, force: false })
                .png({ compressionLevel: Math.min(9, Math.round(targetQuality / 10)), force: false })
                .toBuffer();

              if (compressed.length < contents.length) {
                stream.contents = new Uint8Array(compressed);
                dict.set(rawContext.obj('Length'), rawContext.obj(compressed.length));
              }
            }
          } catch (e) {
            // Skip individual images that can't be decoded
          }
        }
      }
    }
  }
  return await pdfDoc.save({ useObjectStreams: true });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const compressionPercent = parseInt(formData.get('level') as string) || 50; // Target reduction: 10% to 90%

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalSize = buffer.length;
    
    // Target size = originalSize * (1 - reductionPercent / 100)
    // E.g., if user selects 21% compression, target is 79% of original size.
    const targetSize = originalSize * (1 - compressionPercent / 100);

    let bestBytes = buffer;
    let low = 0.0;
    let high = 1.0;
    let bestDiff = Infinity;

    // Iterative binary search loop to hit target size closely
    for (let iter = 0; iter < 4; iter++) {
      const mid = (low + high) / 2;
      const currentBytes = await compressPdfWithFactor(buffer, mid);
      const currentSize = currentBytes.length;

      const diff = currentSize - targetSize;
      
      if (Math.abs(diff) < bestDiff) {
        bestDiff = Math.abs(diff);
        bestBytes = Buffer.from(currentBytes);
      }

      // If we are within 2% of original file size to target size, we stop
      if (Math.abs(diff) / originalSize < 0.02) {
        break;
      }

      if (currentSize > targetSize) {
        // Still too large, compress more (lower the factor)
        high = mid;
      } else {
        // Smaller than target, can afford higher quality (raise the factor)
        low = mid;
      }
    }

    return new NextResponse(bestBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compressed_${file.name}"`,
      },
    });
  } catch (error) {
    console.error('PDF Compression error:', error);
    return NextResponse.json({ error: 'Failed to compress PDF document' }, { status: 500 });
  }
}
