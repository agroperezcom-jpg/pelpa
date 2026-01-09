import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todas las tareas con recurrencia activa
    const freeTasks = await base44.asServiceRole.entities.FreeTask.filter({
      recurrence: { $ne: 'none' }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const created = [];
    const errors = [];

    for (const task of freeTasks) {
      try {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        
        // Verificar si ya pasó la fecha y necesita crear siguiente instancia
        if (taskDate <= today) {
          let nextDate = new Date(taskDate);
          
          // Calcular siguiente fecha según recurrencia
          switch (task.recurrence) {
            case 'daily':
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            default:
              continue;
          }

          // Crear nueva instancia
          const newTask = {
            name: task.name,
            description: task.description,
            date: nextDate.toISOString().split('T')[0],
            time: task.time,
            duration: task.duration,
            status: 'pendiente',
            priority: task.priority,
            assigned_to: task.assigned_to,
            assigned_to_name: task.assigned_to_name,
            tags: task.tags,
            recurrence: task.recurrence
          };

          await base44.asServiceRole.entities.FreeTask.create(newTask);
          
          // Actualizar fecha de la tarea original
          await base44.asServiceRole.entities.FreeTask.update(task.id, {
            date: nextDate.toISOString().split('T')[0]
          });

          created.push({
            original: task.id,
            name: task.name,
            newDate: nextDate.toISOString().split('T')[0]
          });
        }
      } catch (error) {
        errors.push({
          taskId: task.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      processed: freeTasks.length,
      created: created.length,
      errors: errors.length,
      details: { created, errors }
    });

  } catch (error) {
    console.error('Error processing recurrence:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});