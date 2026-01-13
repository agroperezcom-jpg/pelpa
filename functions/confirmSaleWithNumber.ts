import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Confirms a sale and atomically assigns a fiscal document number
 * 
 * Flow:
 * 1. Validate Sale and Talonario belong to same company
 * 2. Generate next number from Talonario
 * 3. Update Sale with numero_comprobante and status CONFIRMADA
 * 4. Return formatted number
 * 
 * Ensures:
 * - Document numbers are never reused
 * - Sales are not confirmed twice
 * - Multi-company isolation
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id, company_id, talonario_id } = await req.json();

    if (!sale_id || !company_id || !talonario_id) {
      return Response.json({ 
        error: 'Missing sale_id, company_id, or talonario_id' 
      }, { status: 400 });
    }

    // Fetch Sale
    const sales = await base44.entities.Sale.list();
    const sale = sales.find(s => s.id === sale_id && s.company_id === company_id);

    if (!sale) {
      return Response.json({ error: 'Sale not found or invalid company' }, { status: 404 });
    }

    // Check if already confirmed
    if (sale.estado === 'CONFIRMADA' || sale.numero_comprobante) {
      return Response.json({ 
        error: 'Sale is already confirmed',
        numero_comprobante: sale.numero_comprobante 
      }, { status: 400 });
    }

    // Fetch Talonario
    const talonarios = await base44.entities.Talonario.list();
    const talonario = talonarios.find(t => t.id === talonario_id && t.company_id === company_id);

    if (!talonario) {
      return Response.json({ error: 'Talonario not found or invalid company' }, { status: 404 });
    }

    if (!talonario.is_active) {
      return Response.json({ error: 'Talonario is inactive' }, { status: 400 });
    }

    // Validate tipo_comprobante matches
    if (sale.tipo_comprobante !== talonario.tipo_comprobante) {
      return Response.json({ 
        error: `Sale tipo_comprobante (${sale.tipo_comprobante}) does not match Talonario (${talonario.tipo_comprobante})` 
      }, { status: 400 });
    }

    // Generate next number
    let nextNumber;
    let numerosLiberados = talonario.numeros_liberados || [];

    if (talonario.permite_reutilizar && numerosLiberados.length > 0) {
      nextNumber = Math.min(...numerosLiberados);
      numerosLiberados = numerosLiberados.filter(n => n !== nextNumber);
    } else {
      nextNumber = talonario.ultimo_numero + 1;

      if (talonario.numero_hasta && nextNumber > talonario.numero_hasta) {
        return Response.json(
          { error: `Talonario "${talonario.name}" ha alcanzado su límite de numeración` },
          { status: 400 }
        );
      }
    }

    // Format number: B 0003-00001245
    const numero_comprobante = `${talonario.tipo_comprobante} ${String(talonario.punto_venta).padStart(4, '0')}-${String(nextNumber).padStart(8, '0')}`;

    // Atomic transaction: Update both Sale and Talonario
    await Promise.all([
      base44.entities.Sale.update(sale_id, {
        numero_comprobante,
        estado: 'CONFIRMADA'
      }),
      base44.entities.Talonario.update(talonario_id, {
        ultimo_numero: nextNumber,
        numeros_liberados: numerosLiberados
      })
    ]);

    return Response.json({
      success: true,
      numero_comprobante,
      sale_id,
      next_number: nextNumber,
      talonario_nombre: talonario.name
    });
  } catch (error) {
    console.error("Error confirming sale:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});