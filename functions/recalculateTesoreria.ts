import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Esta función se llama cuando se elimina una fuente de tesorería.
    // Como Tesorería es 100% derivada, no hay nada que persistir.
    // El recálculo ocurre automáticamente en el frontend.
    
    return Response.json({
      message: "Tesorería recalculada automáticamente"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});