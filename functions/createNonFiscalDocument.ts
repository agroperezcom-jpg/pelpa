import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Creates a non-fiscal document (Presupuesto, Remito, or Work Order)
 * and assigns an auto-incremented number
 * 
 * Non-fiscal documents:
 * - Do NOT require Talonario
 * - Have independent numbering per company
 * - Have NO fiscal impact
 * - Are NOT linked to accounting
 * 
 * Types:
 * - Presupuesto: P-XXXXXX
 * - Remito: R-XXXXXX
 * - Orden de Trabajo: OT-XXXXXX (uses Project with is_work_order=true)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id, document_type, entity_id } = await req.json();

    if (!company_id || !document_type || !entity_id) {
      return Response.json({ 
        error: 'Missing company_id, document_type, or entity_id' 
      }, { status: 400 });
    }

    // Validate document_type
    const validTypes = ['PRESUPUESTO', 'REMITO', 'ORDEN_TRABAJO'];
    if (!validTypes.includes(document_type)) {
      return Response.json({ error: 'Invalid document_type' }, { status: 400 });
    }

    // Get or create configuration for counters
    const configs = await base44.entities.ConfiguracionEmpresa.list();
    let config = configs.find(c => c.company_id === company_id);

    if (!config) {
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

    // Update entity with the number
    let updatePayload = {};
    
    if (document_type === 'PRESUPUESTO') {
      updatePayload = { numero_presupuesto: numero };
      await base44.entities.Presupuesto.update(entity_id, updatePayload);
    } else if (document_type === 'REMITO') {
      updatePayload = { numero_remito: numero };
      await base44.entities.Remito.update(entity_id, updatePayload);
    } else if (document_type === 'ORDEN_TRABAJO') {
      updatePayload = { work_order_number: numero, is_work_order: true };
      await base44.entities.Project.update(entity_id, updatePayload);
    }

    return Response.json({
      success: true,
      numero,
      document_type,
      entity_id,
      company_id,
      next_number: nextNumber
    });
  } catch (error) {
    console.error("Error creating non-fiscal document:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});