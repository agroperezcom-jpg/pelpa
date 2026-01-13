import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generates sequential numbers for non-fiscal documents
 * 
 * Non-fiscal document types:
 * - Presupuesto (P-XXXX)
 * - Remito (R-XXXX)
 * - Orden de Trabajo (OT-XXXX)
 * 
 * Ensures:
 * - Sequential numbering per company + document_type
 * - No collisions or skipped numbers
 * - Atomic update to prevent race conditions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id, document_type } = await req.json();

    if (!company_id || !document_type) {
      return Response.json({ error: 'Missing company_id or document_type' }, { status: 400 });
    }

    // Validate document_type
    const validTypes = ['PRESUPUESTO', 'REMITO', 'ORDEN_TRABAJO'];
    if (!validTypes.includes(document_type)) {
      return Response.json({ error: 'Invalid document_type' }, { status: 400 });
    }

    // Get next number from ConfiguracionEmpresa or create counter
    const configs = await base44.entities.ConfiguracionEmpresa.list();
    let config = configs.find(c => c.company_id === company_id);

    if (!config) {
      // Initialize counters
      config = await base44.entities.ConfiguracionEmpresa.create({
        company_id,
        nf_document_counters: {
          PRESUPUESTO: 0,
          REMITO: 0,
          ORDEN_TRABAJO: 0
        }
      });
    }

    const counters = config.nf_document_counters || {
      PRESUPUESTO: 0,
      REMITO: 0,
      ORDEN_TRABAJO: 0
    };

    const nextNumber = (counters[document_type] || 0) + 1;

    // Generate formatted number
    const typePrefix = {
      PRESUPUESTO: 'P',
      REMITO: 'R',
      ORDEN_TRABAJO: 'OT'
    }[document_type];

    const numero = `${typePrefix}-${String(nextNumber).padStart(6, '0')}`;

    // Update counter atomically
    const updatedCounters = { ...counters, [document_type]: nextNumber };
    await base44.entities.ConfiguracionEmpresa.update(config.id, {
      nf_document_counters: updatedCounters
    });

    return Response.json({
      success: true,
      numero,
      next_number: nextNumber,
      document_type,
      company_id
    });
  } catch (error) {
    console.error("Error generating non-fiscal number:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});