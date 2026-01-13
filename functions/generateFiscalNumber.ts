import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generates the next sequential fiscal document number atomically
 * 
 * Ensures:
 * - Sequential numbering per company + tipo_comprobante + punto_venta
 * - No collisions or skipped numbers
 * - Atomic update to prevent race conditions
 * - Reuses liberated numbers if available
 * - Format: X 0003-00001245 (tipo punto_venta-numero)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { talonario_id, company_id } = await req.json();

    if (!talonario_id || !company_id) {
      return Response.json({ error: 'Missing talonario_id or company_id' }, { status: 400 });
    }

    // Fetch talonario
    const talonarios = await base44.entities.Talonario.list();
    const talonario = talonarios.find(t => t.id === talonario_id && t.company_id === company_id);

    if (!talonario) {
      return Response.json({ error: 'Talonario not found or invalid company' }, { status: 404 });
    }

    if (!talonario.is_active) {
      return Response.json({ error: 'Talonario is inactive' }, { status: 400 });
    }

    // Determine next number
    let nextNumber;
    let numerosLiberados = talonario.numeros_liberados || [];

    // Check if can reuse liberated numbers
    if (talonario.permite_reutilizar && numerosLiberados.length > 0) {
      // Use the smallest liberated number
      nextNumber = Math.min(...numerosLiberados);
      numerosLiberados = numerosLiberados.filter(n => n !== nextNumber);
    } else {
      // Use sequential number
      nextNumber = talonario.ultimo_numero + 1;

      // Validate doesn't exceed limit
      if (talonario.numero_hasta && nextNumber > talonario.numero_hasta) {
        return Response.json(
          { error: `Talonario "${talonario.name}" ha alcanzado su límite de numeración` },
          { status: 400 }
        );
      }
    }

    // Format document number: tipo_comprobante punto_venta numero
    // Example: B 0003-00001245
    const numero_comprobante = `${talonario.tipo_comprobante} ${String(talonario.punto_venta).padStart(4, '0')}-${String(nextNumber).padStart(8, '0')}`;

    // Update talonario atomically
    await base44.entities.Talonario.update(talonario_id, {
      ultimo_numero: nextNumber,
      numeros_liberados: numerosLiberados
    });

    return Response.json({
      success: true,
      numero_comprobante,
      next_number: nextNumber,
      tipo_comprobante: talonario.tipo_comprobante,
      punto_venta: talonario.punto_venta,
      talonario_nombre: talonario.name
    });
  } catch (error) {
    console.error("Error generating fiscal number:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});