import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    let shouldDelete = false;

    // Eliminar si se borra el presupuesto
    if (event.type === 'delete' && data?.proyecto_id) {
      shouldDelete = true;
    }

    // Eliminar si el presupuesto es cancelado
    if (event.type === 'update' && old_data?.estado !== 'CANCELADO' && data?.estado === 'CANCELADO' && data?.proyecto_id) {
      shouldDelete = true;
    }

    if (shouldDelete) {
      try {
        await base44.asServiceRole.entities.Project.delete(data.proyecto_id);
      } catch (error) {
        console.error(`No se pudo eliminar proyecto ${data.proyecto_id}:`, error.message);
      }
    }

    return Response.json({ status: 'success' });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});