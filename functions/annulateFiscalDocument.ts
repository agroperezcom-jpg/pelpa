import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Annulates a fiscal document (Sale) and optionally liberates the number for reuse
 * 
 * Rules:
 * - Annulated documents keep their number
 * - Numbers can be liberated if Talonario.permite_reutilizar = true
 * - Multi-company isolation enforced
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id, company_id, talonario_id, motivo_anulacion, liberar_numero } = await req.json();

    if (!sale_id || !company_id) {
      return Response.json({ error: 'Missing sale_id or company_id' }, { status: 400 });
    }

    // Fetch Sale
    const sales = await base44.entities.Sale.list();
    const sale = sales.find(s => s.id === sale_id && s.company_id === company_id);

    if (!sale) {
      return Response.json({ error: 'Sale not found or invalid company' }, { status: 404 });
    }

    if (sale.estado === 'ANULADA') {
      return Response.json({ error: 'Sale is already annulated' }, { status: 400 });
    }

    if (!sale.numero_comprobante) {
      return Response.json({ error: 'Sale does not have a document number' }, { status: 400 });
    }

    // Parse number to extract the sequential number
    // Format: B 0003-00001245
    const numberParts = sale.numero_comprobante.split('-');
    const numeroSequencial = parseInt(numberParts[1]);

    // Update Sale to ANULADA
    await base44.entities.Sale.update(sale_id, {
      estado: 'ANULADA',
      fecha_anulacion: new Date().toISOString(),
      motivo_anulacion,
      usuario_anulacion: user.email
    });

    // Liberate number if requested and talonario allows
    if (liberar_numero && talonario_id) {
      const talonarios = await base44.entities.Talonario.list();
      const talonario = talonarios.find(t => t.id === talonario_id && t.company_id === company_id);

      if (talonario && talonario.permite_reutilizar) {
        const numerosLiberados = [...(talonario.numeros_liberados || []), numeroSequencial];
        await base44.entities.Talonario.update(talonario_id, {
          numeros_liberados: numerosLiberados
        });
      }
    }

    return Response.json({
      success: true,
      sale_id,
      numero_comprobante: sale.numero_comprobante,
      estado: 'ANULADA'
    });
  } catch (error) {
    console.error("Error annulating fiscal document:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});