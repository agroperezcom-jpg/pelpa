import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Solo procesar eventos de eliminación
    if (event.type !== 'delete') {
      return Response.json({ status: 'ignored' });
    }

    // Si el presupuesto tenía un proyecto asociado, eliminarlo
    if (data?.proyecto_id) {
      try {
        await base44.asServiceRole.entities.Project.delete(data.proyecto_id);
      } catch (error) {
        console.error(`No se pudo eliminar proyecto ${data.proyecto_id}:`, error.message);
      }
    }

    return Response.json({ status: 'success', message: 'Proyecto eliminado si existía' });
  } catch (error) {
    console.error('Error en deleteProjectFromDeletedBudget:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});