import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Obtener tareas libres para mañana
    const freeTasks = await base44.asServiceRole.entities.FreeTask.filter({
      date: tomorrowStr,
      status: { $ne: 'completada' }
    });

    // Obtener tareas de proyecto para mañana
    const projectTasks = await base44.asServiceRole.entities.ProjectTask.filter({
      status: { $ne: 'finalizada' }
    });

    const filteredProjectTasks = projectTasks.filter(task => {
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      if (!dueDate) return false;
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === tomorrow.getTime();
    });

    // Obtener campañas para mañana
    const campaigns = await base44.asServiceRole.entities.Campaign.filter({
      status: { $ne: 'completada' }
    });

    const filteredCampaigns = campaigns.filter(campaign => {
      const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
      if (!startDate) return false;
      startDate.setHours(0, 0, 0, 0);
      return startDate.getTime() === tomorrow.getTime();
    });

    const sent = [];
    const errors = [];

    // Enviar recordatorios para tareas libres
    for (const task of freeTasks) {
      try {
        if (task.assigned_to) {
          const emailBody = `
            <h2>Recordatorio: Tarea programada para mañana</h2>
            <p><strong>${task.name}</strong></p>
            ${task.description ? `<p>${task.description}</p>` : ''}
            <p><strong>Fecha:</strong> ${new Date(task.date).toLocaleDateString('es-ES')}</p>
            ${task.time ? `<p><strong>Hora:</strong> ${task.time}</p>` : ''}
            ${task.duration ? `<p><strong>Duración:</strong> ${task.duration} minutos</p>` : ''}
            <p><strong>Prioridad:</strong> ${task.priority}</p>
          `;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: task.assigned_to,
            subject: `Recordatorio: ${task.name} - Mañana`,
            body: emailBody
          });

          sent.push({ type: 'freeTask', id: task.id, to: task.assigned_to });
        }
      } catch (error) {
        errors.push({ type: 'freeTask', id: task.id, error: error.message });
      }
    }

    // Enviar recordatorios para tareas de proyecto
    for (const task of filteredProjectTasks) {
      try {
        if (task.assigned_to && task.assigned_to.length > 0) {
          for (const assignee of task.assigned_to) {
            const emailBody = `
              <h2>Recordatorio: Tarea de proyecto vence mañana</h2>
              <p><strong>${task.name}</strong></p>
              ${task.description ? `<p>${task.description}</p>` : ''}
              <p><strong>Proyecto:</strong> ${task.project_name || 'N/A'}</p>
              <p><strong>Fecha de vencimiento:</strong> ${new Date(task.due_date).toLocaleDateString('es-ES')}</p>
              <p><strong>Prioridad:</strong> ${task.priority}</p>
            `;

            await base44.asServiceRole.integrations.Core.SendEmail({
              to: assignee.email,
              subject: `Recordatorio: ${task.name} - Vence mañana`,
              body: emailBody
            });

            sent.push({ type: 'projectTask', id: task.id, to: assignee.email });
          }
        }
      } catch (error) {
        errors.push({ type: 'projectTask', id: task.id, error: error.message });
      }
    }

    // Enviar recordatorios para campañas
    for (const campaign of filteredCampaigns) {
      try {
        if (campaign.assigned_to) {
          const emailBody = `
            <h2>Recordatorio: Campaña comienza mañana</h2>
            <p><strong>${campaign.name}</strong></p>
            ${campaign.description ? `<p>${campaign.description}</p>` : ''}
            <p><strong>Fecha de inicio:</strong> ${new Date(campaign.start_date).toLocaleDateString('es-ES')}</p>
            <p><strong>Tipo:</strong> ${campaign.type}</p>
          `;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: campaign.assigned_to,
            subject: `Recordatorio: ${campaign.name} - Comienza mañana`,
            body: emailBody
          });

          sent.push({ type: 'campaign', id: campaign.id, to: campaign.assigned_to });
        }
      } catch (error) {
        errors.push({ type: 'campaign', id: campaign.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      totalEvents: freeTasks.length + filteredProjectTasks.length + filteredCampaigns.length,
      sent: sent.length,
      errors: errors.length,
      details: { sent, errors }
    });

  } catch (error) {
    console.error('Error sending reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});