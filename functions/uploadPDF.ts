import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { base64PDF } = await req.json();

    if (!base64PDF) {
      return Response.json({ error: 'Missing base64PDF' }, { status: 400 });
    }

    // Convertir base64 a Uint8Array
    const binaryString = atob(base64PDF);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Crear Blob
    const blob = new Blob([bytes], { type: 'application/pdf' });

    // Subir usando la integración
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
      file: blob
    });

    return Response.json({
      success: true,
      file_url: uploadResult.file_url
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});