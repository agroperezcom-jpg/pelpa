import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock, TrendingUp, ShieldAlert } from "lucide-react";

import CalendarHeader from "@/components/calendar/CalendarHeader";
import CalendarFilters from "@/components/calendar/CalendarFilters";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import AgendaView from "@/components/calendar/AgendaView";
import TimelineView from "@/components/calendar/TimelineView";
import FreeTaskDialog from "@/components/calendar/FreeTaskDialog";
import CalendarSettingsDialog from "@/components/calendar/CalendarSettingsDialog";
import CalendarAuditDialog from "@/components/calendar/CalendarAuditDialog";
import CalendarSearchDialog from "@/components/calendar/CalendarSearchDialog";
import CalendarExportDialog from "@/components/calendar/CalendarExportDialog";
import { usePermissions } from "@/components/permissions/usePermissions";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [scheduleTasksCreated, setScheduleTasksCreated] = useState(false);
  const [layers, setLayers] = useState({
    projects: true,
    phases: true,
    tasks: true,
    freeTasks: true,
    milestones: true,
    campaigns: true,
    events: false
  });
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [freeTaskDialogOpen, setFreeTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [clickedDate, setClickedDate] = useState(null);
  const [snapMinutes, setSnapMinutes] = useState(30);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dragGhost, setDragGhost] = useState(null);

  const queryClient = useQueryClient();
  const { hasPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  // Permisos del calendario
  const canViewCalendar = isAdmin || hasPermission("calendario", "ver");
  const canCreateEvents = isAdmin || hasPermission("calendario", "crear");
  const canEditEvents = isAdmin || hasPermission("calendario", "editar_eventos");
  const canEditTasks = isAdmin || hasPermission("calendario", "editar_tareas");
  const canEditProjects = isAdmin || hasPermission("calendario", "editar_proyectos");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Crear tareas programadas automáticamente (solo una vez)
  useEffect(() => {
    const createScheduledTasks = async () => {
      if (!isAdmin || scheduleTasksCreated) return;

      try {
        const tasks = await base44.asServiceRole.scheduled_tasks.list();
        const hasRecurrence = tasks.some(t => t.name === 'Procesar Tareas Recurrentes');
        const hasReminders = tasks.some(t => t.name === 'Enviar Recordatorios Diarios');

        if (!hasRecurrence) {
          await base44.asServiceRole.scheduled_tasks.create({
            name: 'Procesar Tareas Recurrentes',
            function_name: 'processRecurrence',
            description: 'Crea automáticamente instancias de tareas recurrentes',
            repeat_interval: 1,
            repeat_unit: 'days',
            start_time: '00:00'
          });
        }

        if (!hasReminders) {
          await base44.asServiceRole.scheduled_tasks.create({
            name: 'Enviar Recordatorios Diarios',
            function_name: 'sendEventReminders',
            description: 'Envía emails recordando eventos del día siguiente',
            repeat_interval: 1,
            repeat_unit: 'days',
            start_time: '18:00'
          });
        }

        setScheduleTasksCreated(true);
      } catch (error) {
        console.error('Error creating scheduled tasks:', error);
      }
    };

    if (isAdmin) {
      createScheduledTasks();
    }
  }, [isAdmin]);

  // Fetch data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['projectPhases'],
    queryFn: () => base44.entities.ProjectPhase.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks'],
    queryFn: () => base44.entities.ProjectTask.list()
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['projectMilestones'],
    queryFn: () => base44.entities.ProjectMilestone.list()
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: freeTasks = [] } = useQuery({
    queryKey: ['freeTasks'],
    queryFn: () => base44.entities.FreeTask.list()
  });

  const { data: calendarConfigs = [] } = useQuery({
    queryKey: ['calendarConfig', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.CalendarConfig.filter({ user_email: currentUser.email });
    },
    enabled: !!currentUser?.email
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['calendarAuditLogs'],
    queryFn: () => base44.entities.CalendarAuditLog.list('-timestamp', 100),
    refetchInterval: 30000
  });

  const calendarConfig = calendarConfigs[0];

  const createFreeTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.FreeTask.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freeTasks'] });
      setFreeTaskDialogOpen(false);
      setEditingTask(null);
      setClickedDate(null);
      toast.success('Tarea creada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear tarea');
      console.error(error);
    }
  });

  const updateFreeTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FreeTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freeTasks'] });
      setFreeTaskDialogOpen(false);
      setEditingTask(null);
      toast.success('Tarea actualizada');
    },
    onError: (error) => {
      toast.error('Error al actualizar tarea');
      console.error(error);
    }
  });

  // Combine all events based on active layers
  const getAllEvents = () => {
    const events = [];

    // Projects (solo aprobados y en ejecución)
    if (layers.projects) {
      projects.forEach(project => {
        const isOperational = ['aprobado', 'en_ejecucion', 'finalizado'].includes(project.status);
        if ((project.start_date || project.estimated_end_date) && isOperational) {
          const matchesProject = selectedProject === "all" || project.id === selectedProject;
          const matchesUser = selectedUser === "all" || 
            project.responsible_email === selectedUser ||
            project.team_members?.some(m => m.email === selectedUser);

          if (matchesProject && matchesUser) {
            events.push({
              id: project.id,
              name: project.name,
              type: "project",
              date: project.start_date,
              start_date: project.start_date,
              estimated_end_date: project.estimated_end_date,
              status: project.status,
              priority: project.priority,
              progress_percentage: project.progress_percentage,
              color: project.color,
              project_id: project.id,
              data: project
            });
          }
        }
      });
    }

    // Phases
    if (layers.phases) {
      phases.forEach(phase => {
        if (phase.start_date || phase.end_date) {
          const matchesProject = selectedProject === "all" || phase.project_id === selectedProject;
          const matchesUser = selectedUser === "all" || phase.responsible_email === selectedUser;

          if (matchesProject && matchesUser) {
            events.push({
              id: phase.id,
              name: phase.name,
              type: "phase",
              date: phase.start_date,
              start_date: phase.start_date,
              estimated_end_date: phase.end_date,
              status: phase.status,
              order: phase.order,
              project_id: phase.project_id,
              data: phase
            });
          }
        }
      });
    }

    // Tasks
    if (layers.tasks) {
      tasks.forEach(task => {
        if (task.start_date || task.due_date) {
          const matchesProject = selectedProject === "all" || task.project_id === selectedProject;
          const matchesUser = selectedUser === "all" || 
            task.assigned_to?.some(a => a.email === selectedUser);

          if (matchesProject && matchesUser) {
            events.push({
              id: task.id,
              name: task.name,
              type: "task",
              date: task.start_date || task.due_date,
              start_date: task.start_date,
              estimated_end_date: task.due_date,
              status: task.status,
              priority: task.priority,
              project_id: task.project_id,
              phase_id: task.phase_id,
              data: task
            });
          }
        }
      });
    }

    // Milestones
    if (layers.milestones) {
      milestones.forEach(milestone => {
        if (milestone.date) {
          const matchesProject = selectedProject === "all" || milestone.project_id === selectedProject;

          if (matchesProject) {
            events.push({
              id: milestone.id,
              name: milestone.name,
              type: "milestone",
              date: milestone.date,
              start_date: milestone.date,
              estimated_end_date: milestone.date,
              status: milestone.status,
              color: milestone.color,
              project_id: milestone.project_id,
              data: milestone
            });
          }
        }
      });
    }

    // Campaigns
    if (layers.campaigns) {
      campaigns.forEach(campaign => {
        if (campaign.start_date) {
          const matchesUser = selectedUser === "all" || campaign.assigned_to === selectedUser;

          if (matchesUser) {
            events.push({
              id: campaign.id,
              name: campaign.name,
              type: "campaign",
              date: campaign.start_date,
              start_date: campaign.start_date,
              estimated_end_date: campaign.end_date || campaign.start_date,
              status: campaign.status,
              data: campaign
            });
          }
        }
      });
    }

    // Free Tasks
    if (layers.freeTasks) {
      freeTasks.forEach(task => {
        if (task.date) {
          const matchesUser = selectedUser === "all" || task.assigned_to === selectedUser;

          if (matchesUser) {
            events.push({
              id: task.id,
              name: task.name,
              type: "freeTask",
              date: task.date,
              start_date: task.date,
              estimated_end_date: task.date,
              status: task.status,
              priority: task.priority,
              time: task.time,
              duration: task.duration,
              tags: task.tags,
              data: task
            });
          }
        }
      });
    }

    return events;
  };

  const events = getAllEvents();

  // Calculate alerts
  const today = new Date();
  const overdueProjects = projects.filter(p => 
    p.estimated_end_date && 
    new Date(p.estimated_end_date) < today && 
    ['aprobado', 'en_ejecucion'].includes(p.status)
  );

  const overdueTasks = tasks.filter(t => 
    t.due_date && 
    new Date(t.due_date) < today && 
    t.status !== "finalizada"
  );

  const overdueFreeTasks = freeTasks.filter(t =>
    t.date &&
    new Date(t.date) < today &&
    t.status !== "completada"
  );

  const upcomingMilestones = milestones.filter(m => {
    const diff = Math.ceil((new Date(m.date) - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7 && m.status === "pendiente";
  });

  const handleEventClick = (event) => {
    // Validar permisos antes de abrir edición
    if (event.type === "freeTask") {
      if (!canEditEvents) return;
      setEditingTask(event.data);
      setFreeTaskDialogOpen(true);
    } else if (event.type === "project") {
      if (!canEditProjects) return;
      window.location.href = `/Projects?id=${event.id}`;
    } else if (event.type === "task" || event.type === "phase") {
      if (!canEditTasks) return;
      window.location.href = `/Projects?id=${event.project_id}`;
    } else if (event.type === "campaign") {
      window.location.href = `/Marketing`;
    }
  };

  const handleDateClick = (date) => {
    if (!canCreateEvents) return;
    setClickedDate(date);
    setEditingTask(null);
    setFreeTaskDialogOpen(true);
  };

  const handleCreateEvent = () => {
    if (!canCreateEvents) return;
    setClickedDate(null);
    setEditingTask(null);
    setFreeTaskDialogOpen(true);
  };

  const handleSaveFreeTask = (taskData) => {
    console.log("handleSaveFreeTask llamado con:", taskData);
    console.log("Permisos:", { canEditEvents, canCreateEvents, editingTask });
    
    // Validar permisos antes de guardar
    if (editingTask?.id && !canEditEvents) {
      toast.error("No tienes permisos para editar eventos");
      return;
    }
    if (!editingTask?.id && !canCreateEvents) {
      toast.error("No tienes permisos para crear eventos");
      return;
    }

    if (editingTask?.id) {
      console.log("Actualizando tarea existente:", editingTask.id);
      updateFreeTaskMutation.mutate({ id: editingTask.id, data: taskData });
    } else {
      console.log("Creando nueva tarea con datos:", taskData);
      createFreeTaskMutation.mutate(taskData);
    }
  };

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, type, data }) => {
      const entityMap = {
        task: base44.entities.ProjectTask,
        phase: base44.entities.ProjectPhase,
        project: base44.entities.Project,
        milestone: base44.entities.ProjectMilestone,
        campaign: base44.entities.Campaign,
        freeTask: base44.entities.FreeTask
      };
      return entityMap[type].update(id, data);
    },
    onSuccess: (_, { type }) => {
      const keyMap = {
        task: 'projectTasks',
        phase: 'projectPhases',
        project: 'projects',
        milestone: 'projectMilestones',
        campaign: 'campaigns',
        freeTask: 'freeTasks'
      };
      queryClient.invalidateQueries({ queryKey: [keyMap[type]] });
      toast.success('Evento actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar evento');
      console.error(error);
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (configData) => {
      if (calendarConfig?.id) {
        return await base44.entities.CalendarConfig.update(calendarConfig.id, configData);
      } else {
        return await base44.entities.CalendarConfig.create({
          user_email: currentUser?.email,
          ...configData
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarConfig'] });
      setSettingsDialogOpen(false);
      toast.success('Configuración guardada');
    },
    onError: (error) => {
      toast.error('Error al guardar configuración');
      console.error(error);
    }
  });

  const logAuditMutation = useMutation({
    mutationFn: (auditData) => base44.entities.CalendarAuditLog.create(auditData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarAuditLogs'] });
    }
  });

  const snapToGrid = (date) => {
    const minutes = date.getMinutes();
    const snappedMinutes = Math.round(minutes / snapMinutes) * snapMinutes;
    const snappedDate = new Date(date);
    snappedDate.setMinutes(snappedMinutes);
    snappedDate.setSeconds(0);
    snappedDate.setMilliseconds(0);
    return snappedDate;
  };

  const checkConflicts = (event, newStart, newEnd) => {
    const conflicts = events.filter(e => {
      if (e.id === event.id) return false;
      if (e.type !== event.type) return false;
      
      const eStart = new Date(e.start_date || e.date);
      const eEnd = new Date(e.estimated_end_date || e.due_date || e.end_date || eStart);
      
      return (newStart < eEnd && newEnd > eStart);
    });
    return conflicts;
  };

  const handleEventDrop = (event, newDate) => {
    if (!event || !event.id) return;

    // Validar permisos
    if (event.type === "freeTask" && !canEditEvents) return;
    if (event.type === "project" && !canEditProjects) return;
    if ((event.type === "task" || event.type === "phase") && !canEditTasks) return;

    const snappedDate = snapToGrid(newDate);
    const dateStr = snappedDate.toISOString().split('T')[0];
    const timeStr = `${String(snappedDate.getHours()).padStart(2, '0')}:${String(snappedDate.getMinutes()).padStart(2, '0')}`;

    // Registrar auditoría
    const oldStartDate = new Date(event.start_date || event.date);
    const oldEndDate = event.estimated_end_date || event.due_date || event.end_date;

    if (event.type === "freeTask") {
      const updateData = { date: dateStr, time: timeStr };
      updateFreeTaskMutation.mutate({
        id: event.id,
        data: updateData
      });
      
      logAuditMutation.mutate({
        action: "move",
        event_type: event.type,
        event_id: event.id,
        event_name: event.name,
        user_email: currentUser?.email,
        user_name: currentUser?.full_name,
        timestamp: new Date().toISOString(),
        old_start_date: oldStartDate.toISOString(),
        new_start_date: snappedDate.toISOString()
      });
    } else if (event.type === "task") {
      const originalStart = new Date(event.start_date);
      const originalEnd = event.due_date ? new Date(event.due_date) : null;
      const duration = originalEnd ? originalEnd - originalStart : null;

      const updateData = { start_date: snappedDate.toISOString() };
      let newEndDate = originalEnd;
      
      if (duration && originalEnd) {
        const newEnd = new Date(snappedDate.getTime() + duration);
        const conflicts = checkConflicts(event, snappedDate, newEnd);
        
        if (conflicts.length > 0) {
          if (!confirm(`Conflicto detectado con ${conflicts.length} tarea(s). ¿Continuar?`)) return;
        }
        
        updateData.due_date = newEnd.toISOString();
        newEndDate = newEnd;
      }

      updateTaskMutation.mutate({ id: event.id, type: "task", data: updateData });
      
      logAuditMutation.mutate({
        action: "move",
        event_type: event.type,
        event_id: event.id,
        event_name: event.name,
        user_email: currentUser?.email,
        user_name: currentUser?.full_name,
        timestamp: new Date().toISOString(),
        old_start_date: originalStart.toISOString(),
        new_start_date: snappedDate.toISOString(),
        old_end_date: originalEnd?.toISOString(),
        new_end_date: newEndDate?.toISOString()
      });
    } else if (event.type === "phase") {
      const originalStart = new Date(event.start_date);
      const originalEnd = event.end_date ? new Date(event.end_date) : null;
      const duration = originalEnd ? originalEnd - originalStart : null;

      const updateData = { start_date: snappedDate.toISOString() };
      let newEndDate = originalEnd;
      
      if (duration && originalEnd) {
        newEndDate = new Date(snappedDate.getTime() + duration);
        updateData.end_date = newEndDate.toISOString();
      }

      updateTaskMutation.mutate({ id: event.id, type: "phase", data: updateData });
      
      logAuditMutation.mutate({
        action: "move",
        event_type: event.type,
        event_id: event.id,
        event_name: event.name,
        user_email: currentUser?.email,
        user_name: currentUser?.full_name,
        timestamp: new Date().toISOString(),
        old_start_date: originalStart.toISOString(),
        new_start_date: snappedDate.toISOString(),
        old_end_date: originalEnd?.toISOString(),
        new_end_date: newEndDate?.toISOString()
      });
    } else if (event.type === "project") {
      const originalStart = new Date(event.start_date);
      const originalEnd = event.estimated_end_date ? new Date(event.estimated_end_date) : null;
      const duration = originalEnd ? originalEnd - originalStart : null;

      const updateData = { start_date: snappedDate.toISOString() };
      let newEndDate = originalEnd;
      
      if (duration && originalEnd) {
        newEndDate = new Date(snappedDate.getTime() + duration);
        updateData.estimated_end_date = newEndDate.toISOString();
      }

      updateTaskMutation.mutate({ id: event.id, type: "project", data: updateData });
      
      logAuditMutation.mutate({
        action: "move",
        event_type: event.type,
        event_id: event.id,
        event_name: event.name,
        user_email: currentUser?.email,
        user_name: currentUser?.full_name,
        timestamp: new Date().toISOString(),
        old_start_date: originalStart.toISOString(),
        new_start_date: snappedDate.toISOString(),
        old_end_date: originalEnd?.toISOString(),
        new_end_date: newEndDate?.toISOString()
      });
    } else if (event.type === "milestone") {
      updateTaskMutation.mutate({ id: event.id, type: "milestone", data: { date: dateStr } });
    } else if (event.type === "campaign") {
      const originalStart = new Date(event.start_date);
      const originalEnd = event.end_date ? new Date(event.end_date) : null;
      const duration = originalEnd ? originalEnd - originalStart : null;

      const updateData = { start_date: snappedDate.toISOString() };
      if (duration && originalEnd) {
        updateData.end_date = new Date(snappedDate.getTime() + duration).toISOString();
      }

      updateTaskMutation.mutate({ id: event.id, type: "campaign", data: updateData });
    }
  };

  const handleEventResize = (event, newDate, direction = "end") => {
    if (!event || !event.id) return;
    
    // Validar permisos
    if (event.type === "freeTask" && !canEditEvents) return;
    if (event.type === "project" && !canEditProjects) return;
    if ((event.type === "task" || event.type === "phase") && !canEditTasks) return;

    const snappedDate = snapToGrid(newDate);
    
    // Capturar valores antiguos para auditoría
    const oldStart = new Date(event.start_date || event.date);
    const oldEnd = event.estimated_end_date || event.due_date || event.end_date ? 
                   new Date(event.estimated_end_date || event.due_date || event.end_date) : null;
    
    if (event.type === "freeTask") {
      if (direction === "end") {
        const timeStr = `${String(snappedDate.getHours()).padStart(2, '0')}:${String(snappedDate.getMinutes()).padStart(2, '0')}`;
        updateFreeTaskMutation.mutate({ id: event.id, data: { end_time: timeStr } });
      }
    } else if (event.type === "task") {
      if (direction === "end") {
        const start = new Date(event.start_date);
        const conflicts = checkConflicts(event, start, snappedDate);
        
        if (conflicts.length > 0) {
          if (!confirm(`Conflicto detectado con ${conflicts.length} tarea(s). ¿Continuar?`)) return;
        }
        
        updateTaskMutation.mutate({ id: event.id, type: "task", data: { due_date: snappedDate.toISOString() } });
        
        logAuditMutation.mutate({
          action: "resize",
          event_type: event.type,
          event_id: event.id,
          event_name: event.name,
          user_email: currentUser?.email,
          user_name: currentUser?.full_name,
          timestamp: new Date().toISOString(),
          old_start_date: oldStart.toISOString(),
          new_start_date: oldStart.toISOString(),
          old_end_date: oldEnd?.toISOString(),
          new_end_date: snappedDate.toISOString()
        });
      } else {
        updateTaskMutation.mutate({ id: event.id, type: "task", data: { start_date: snappedDate.toISOString() } });
      }
    } else if (event.type === "phase" || event.type === "project") {
      const field = direction === "end" ? "estimated_end_date" : "start_date";
      updateTaskMutation.mutate({ id: event.id, type: event.type, data: { [field]: snappedDate.toISOString() } });
      
      logAuditMutation.mutate({
        action: "resize",
        event_type: event.type,
        event_id: event.id,
        event_name: event.name,
        user_email: currentUser?.email,
        user_name: currentUser?.full_name,
        timestamp: new Date().toISOString(),
        old_start_date: oldStart.toISOString(),
        new_start_date: direction === "start" ? snappedDate.toISOString() : oldStart.toISOString(),
        old_end_date: oldEnd?.toISOString(),
        new_end_date: direction === "end" ? snappedDate.toISOString() : oldEnd?.toISOString()
      });
    } else if (event.type === "campaign") {
      const field = direction === "end" ? "end_date" : "start_date";
      updateTaskMutation.mutate({ id: event.id, type: "campaign", data: { [field]: snappedDate.toISOString() } });
    }
  };

  const handleSaveSettings = (configData) => {
    saveConfigMutation.mutate(configData);
  };

  const handleSyncGoogleCalendar = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    const toastId = toast.loading('Sincronizando con Google Calendar...');
    
    try {
      const response = await base44.functions.invoke('syncGoogleCalendar', {
        events: events.filter(e => e.type === "freeTask" || e.type === "task")
      });
      
      if (response.data.success) {
        toast.success('Sincronización completada', { id: toastId });
        queryClient.invalidateQueries({ queryKey: ['freeTasks'] });
        queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      } else {
        toast.error('Error en sincronización', { id: toastId });
      }
    } catch (error) {
      toast.error('Error al sincronizar: ' + error.message, { id: toastId });
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getEventColor = (event) => {
    // Usar color personalizado de proyecto si existe
    if (event.type === "project" && calendarConfig?.custom_project_colors?.[event.id]) {
      return calendarConfig.custom_project_colors[event.id];
    }
    
    // Usar color del proyecto para tareas/fases si está configurado
    if ((event.type === "task" || event.type === "phase") && event.project_id) {
      const projectColor = calendarConfig?.custom_project_colors?.[event.project_id];
      if (projectColor) return projectColor;
    }
    
    // Usar esquema de colores personalizado
    if (calendarConfig?.color_scheme?.[event.type]) {
      return calendarConfig.color_scheme[event.type];
    }
    
    // Colores por defecto
    const defaults = {
      project: "#9333ea",
      phase: "#3b82f6",
      task: "#10b981",
      freeTask: "#64748b",
      milestone: "#f59e0b",
      campaign: "#ec4899"
    };
    
    return defaults[event.type] || event.color || "#64748b";
  };

  // Sin permiso de ver calendario, mostrar mensaje
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  if (!canViewCalendar) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md border-amber-200 bg-amber-50">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-sm text-amber-900 ml-2">
            <strong>Acceso denegado.</strong> No tienes permisos para ver el calendario. Contacta con un administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CalendarHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onCreateEvent={handleCreateEvent}
        filteredEventsCount={events.length}
        canCreateEvents={canCreateEvents}
        snapMinutes={snapMinutes}
        setSnapMinutes={setSnapMinutes}
        onOpenSettings={() => setSettingsDialogOpen(true)}
        onOpenAudit={() => setAuditDialogOpen(true)}
        onOpenSearch={() => setSearchDialogOpen(true)}
        onOpenExport={() => setExportDialogOpen(true)}
        onSyncGoogle={handleSyncGoogleCalendar}
        isSyncing={isSyncing}
      />

      {/* Alerts */}
      {(overdueProjects.length > 0 || overdueTasks.length > 0 || overdueFreeTasks.length > 0 || upcomingMilestones.length > 0) && (
        <div className="grid md:grid-cols-4 gap-4">
          {overdueProjects.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm">
                <strong className="text-red-900">{overdueProjects.length} proyecto{overdueProjects.length > 1 ? 's' : ''}</strong>
                <span className="text-red-700"> atrasado{overdueProjects.length > 1 ? 's' : ''}</span>
              </AlertDescription>
            </Alert>
          )}

          {overdueTasks.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong className="text-amber-900">{overdueTasks.length} tarea{overdueTasks.length > 1 ? 's proyecto' : ' proyecto'}</strong>
                <span className="text-amber-700"> vencida{overdueTasks.length > 1 ? 's' : ''}</span>
              </AlertDescription>
            </Alert>
          )}

          {overdueFreeTasks.length > 0 && (
            <Alert className="border-slate-200 bg-slate-50">
              <AlertCircle className="h-4 w-4 text-slate-600" />
              <AlertDescription className="text-sm">
                <strong className="text-slate-900">{overdueFreeTasks.length} tarea{overdueFreeTasks.length > 1 ? 's libres' : ' libre'}</strong>
                <span className="text-slate-700"> vencida{overdueFreeTasks.length > 1 ? 's' : ''}</span>
              </AlertDescription>
            </Alert>
          )}

          {upcomingMilestones.length > 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong className="text-blue-900">{upcomingMilestones.length} hito{upcomingMilestones.length > 1 ? 's' : ''}</strong>
                <span className="text-blue-700"> próximo{upcomingMilestones.length > 1 ? 's' : ''}</span>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <CalendarFilters
        layers={layers}
        setLayers={setLayers}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        projects={projects}
        users={users}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Eventos visibles</p>
            <p className="text-2xl font-bold text-foreground mt-1">{events.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Proyectos en ejecución</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {projects.filter(p => ['aprobado', 'en_ejecucion'].includes(p.status)).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Tareas proyecto</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {tasks.filter(t => t.status !== "finalizada").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Tareas libres</p>
            <p className="text-2xl font-bold text-slate-600 mt-1">
              {freeTasks.filter(t => t.status !== "completada").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Próximos hitos</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {upcomingMilestones.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Views */}
      {viewMode === "month" && (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onEventDrop={handleEventDrop}
          canCreateEvents={canCreateEvents}
          canEditEvents={canEditEvents}
          canEditTasks={canEditTasks}
          canEditProjects={canEditProjects}
          getEventColor={getEventColor}
        />
      )}

      {viewMode === "week" && (
        <WeekView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          canEditEvents={canEditEvents}
          canEditTasks={canEditTasks}
          canEditProjects={canEditProjects}
          snapMinutes={snapMinutes}
          getEventColor={getEventColor}
        />
      )}

      {viewMode === "day" && (
        <WeekView
          currentDate={currentDate}
          events={events.filter(e => {
            const eventDate = new Date(e.date || e.start_date || e.created_date);
            return eventDate.toDateString() === currentDate.toDateString();
          })}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          canEditEvents={canEditEvents}
          canEditTasks={canEditTasks}
          canEditProjects={canEditProjects}
          snapMinutes={snapMinutes}
          getEventColor={getEventColor}
          singleDay={true}
        />
      )}

      {viewMode === "agenda" && (
        <AgendaView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          canEditEvents={canEditEvents}
          canEditTasks={canEditTasks}
          canEditProjects={canEditProjects}
          getEventColor={getEventColor}
        />
      )}

      {viewMode === "timeline" && (
        <TimelineView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          canEditEvents={canEditEvents}
          canEditTasks={canEditTasks}
          canEditProjects={canEditProjects}
          getEventColor={getEventColor}
        />
      )}

      {/* Dialogs */}
      <FreeTaskDialog
        isOpen={freeTaskDialogOpen}
        onClose={() => {
          setFreeTaskDialogOpen(false);
          setEditingTask(null);
          setClickedDate(null);
        }}
        onSave={handleSaveFreeTask}
        initialData={editingTask || (clickedDate ? { date: clickedDate.toISOString().split('T')[0] } : null)}
        users={users}
        currentUser={currentUser}
        canEdit={editingTask?.id ? canEditEvents : canCreateEvents}
      />

      <CalendarSettingsDialog
        isOpen={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        config={calendarConfig}
        onSave={handleSaveSettings}
        projects={projects}
      />

      <CalendarAuditDialog
        isOpen={auditDialogOpen}
        onClose={() => setAuditDialogOpen(false)}
        auditLogs={auditLogs}
      />

      <CalendarSearchDialog
        isOpen={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        events={events}
        onEventClick={handleEventClick}
        getEventColor={getEventColor}
      />

      <CalendarExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        events={events}
        currentDate={currentDate}
        getEventColor={getEventColor}
      />

      {/* Loading overlay during sync */}
      {isSyncing && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card rounded-lg p-6 shadow-xl flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm font-medium">Sincronizando con Google Calendar...</span>
          </div>
        </div>
      )}
    </div>
  );
}