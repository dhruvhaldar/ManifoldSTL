import { analyzeSTL } from '@/utils/stl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const badRequest = (message: string) =>
  Response.json(
    {
      ok: false,
      error: message,
    },
    { status: 400 }
  );

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    let bytes: Uint8Array | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return badRequest('Expected a multipart form-data field named "file" containing an STL file.');
      }

      const buffer = await file.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } else {
      const buffer = await request.arrayBuffer();
      bytes = new Uint8Array(buffer);
    }

    if (!bytes || bytes.byteLength === 0) {
      return badRequest('Received empty request body.');
    }

    const analysis = analyzeSTL(bytes);

    return Response.json({
      ok: true,
      fileSizeBytes: bytes.byteLength,
      ...analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown STL parsing error.';
    return badRequest(message);
  }
}
