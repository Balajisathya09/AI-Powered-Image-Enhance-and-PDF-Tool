import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// Stable API token — no user configuration needed
const HF_TOKEN = process.env.HF_TOKEN || '';

export async function POST(req: Request) {
  const ts = Date.now();
  const tempIn   = path.join(process.cwd(), 'public', 'temp', `in_${ts}.jpg`);
  const tempOut  = path.join(process.cwd(), 'public', 'temp', `out_${ts}.jpg`);
  const tempOut2x = path.join(process.cwd(), 'public', 'temp', `out_${ts}_2x.jpg`);
  const tempOut4x = path.join(process.cwd(), 'public', 'temp', `out_${ts}_4x.jpg`);

  try {
    const formData = await req.formData();
    const imageBlob = (formData.get('file') || formData.get('image')) as Blob;
    const mode = (formData.get('mode') as string) || 'colorize';

    if (!imageBlob) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = await imageBlob.arrayBuffer();
    fs.mkdirSync(path.dirname(tempIn), { recursive: true });
    fs.writeFileSync(tempIn, Buffer.from(buffer));

    const enhanceFlag = mode === 'enhance' ? ' --enhance-only' : '';
    console.log(`[Colorize] Mode: ${mode} | Running pipeline...`);
    const scriptPath = path.join(process.cwd(), 'colorize_local.py');
    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}" --input "${tempIn}" --output "${tempOut}" --output2x "${tempOut2x}" --output4x "${tempOut4x}"${enhanceFlag}`,
      { timeout: 120000 } // 2 min hard timeout
    );
    console.log('[Colorize] stdout:', stdout);

    if (!fs.existsSync(tempOut)) {
      console.error('[Colorize] Output missing. stderr:', stderr);
      return NextResponse.json({ error: 'Colorization failed. Check server logs.' }, { status: 500 });
    }

    const toBase64 = (p: string) =>
      fs.existsSync(p)
        ? `data:image/jpeg;base64,${Buffer.from(fs.readFileSync(p)).toString('base64')}`
        : null;

    const result = {
      success: true,
      resultUrl:   toBase64(tempOut),
      result2xUrl: toBase64(tempOut2x),
      result4xUrl: toBase64(tempOut4x),
    };

    // Cleanup
    [tempIn, tempOut, tempOut2x, tempOut4x].forEach(p => { try { fs.unlinkSync(p); } catch {} });

    return NextResponse.json(result);

  } catch (error: any) {
    [tempIn, tempOut, tempOut2x, tempOut4x].forEach(p => { try { fs.unlinkSync(p); } catch {} });
    console.error('Colorization Error:', error);
    return NextResponse.json(
      { error: 'Failed to colorize image: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
