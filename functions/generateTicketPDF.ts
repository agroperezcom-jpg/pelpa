import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { base64PDF, ticketType, ticketId } = await req.json();

    if (!base64PDF || !ticketType || !ticketId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convertir base64 a bytes
    const binaryString = atob(base64PDF);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Usar el SDK de forma correcta con un archivo temporal
    const filename = `${ticketType}-${ticketId}-${Date.now()}.pdf`;

    // Crear una forma que funcione con el API
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    formData.append('file', blob, filename);

    // Usar fetch directamente al endpoint de upload
    const uploadResponse = await fetch('https://api.base44.app/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.id}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.json();
      throw new Error(uploadError.message || 'Upload failed');
    }

    const uploadResult = await uploadResponse.json();

    return Response.json({
      success: true,
      file_url: uploadResult.file_url,
      filename: filename
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});