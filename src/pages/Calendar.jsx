import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock, TrendingUp, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

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
import EventDetailDialog from "@/components/calendar/EventDetailDialog";
import DeleteRecurrenceDialog from "@/components/calendar/DeleteRecurrenceDialog";
import { usePermissionsEnforcement } from "@/components/permissions/usePermissionsEnforcement";
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
    events: false,
    expenses: true
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
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [payExpenseDialog, setPayExpenseDialog] = useState(false);
  const [expenseToPay, setExpenseToPay] = useState(null);

  const queryClient = useQueryClient();
  const { hasPermission, isAdmin, isLoading: permissionsLoading } = usePermissionsEnforcement();

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

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date', 1000)
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ['mediosPago'],
    queryFn: () => base44.entities.MedioPago.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const { data: calendarConfigs = [] } = useQuery({
    queryKey: ['calendarConfig', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.CalendarConfig.filter({ user_email: currentUser.email });
    },
    enabled: !!currentUser?.email
  });

  const { data: regionalConfig = [] } = useQuery({
    queryKey: ['configuracionEmpresa'],
    queryFn: () => base44.entities.ConfiguracionEmpresa.list()
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['calendarAuditLogs'],
    queryFn: () => base44.entities.CalendarAuditLog.list('-timestamp', 100),
    refetchInterval: 30000
  });

  const calendarConfig = calendarConfigs[0];
  const weekStartsOn = regionalConfig[0]?.week_starts_on ?? 1;

  const createFreeTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const result = await base44.entities.FreeTask.create(taskData);
      return result;
    },
    onSuccess: async (newTask) => {
      // Actualizar inmediatamente sin esperar refetch
      queryClient.setQueryData(['freeTasks'], (old = []) => [...old, newTask]);
      // Refetch en background
      await queryClient.invalidateQueries({ queryKey: ['freeTasks'] });
      setFreeTaskDialogOpen(false);
      setEditingTask(null);
      setClickedDate(null);
      toast.success('Tarea creada');
    },
    onError: (error) => {
      toast.error('Error: ' + (error.message || 'No se pudo crear la tarea'));
    }
  });

  const updateFreeTaskMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.entities.FreeTask.update(id, data);
      return result;
    },
    onSuccess: async (updatedTask) => {
      // Actualizar inmediatamente
      queryClient.setQueryData(['freeTasks'], (old = []) => 
        old.map(t => t.id === updatedTask.id ? updatedTask : t)
      );
      await queryClient.invalidateQueries({ queryKey: ['freeTasks'] });
      setFreeTaskDialogOpen(false);
      setEditingTask(null);
      toast.success('Tarea actualizada');
    },
    onError: (error) => {
      toast.error('Error: ' + (error.message || 'No se pudo actualizar'));
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
              start_time: task.start_time,
              estimated_end_date: task.due_date,
              due_time: task.due_time,
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
            // Agregar instancia inicial
            events.push({
              id: task.id,
              name: task.name,
              type: "freeTask",
              date: task.date,
              start_date: task.date,
              start_time: task.start_time,
              estimated_end_date: task.date,
              end_time: task.end_time,
              status: task.status,
              priority: task.priority,
              duration: task.duration,
              tags: task.tags,
              data: task,
              is_recurrence_instance: false
            });

            // Si tiene recurrencia, generar instancias futuras
            if (task.recurrence && task.recurrence !== "none") {
              const baseDate = new Date(task.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              // Generar instancias hasta 3 meses en el futuro
              const maxDate = new Date();
              maxDate.setMonth(maxDate.getMonth() + 3);

              let currentDate = new Date(baseDate);
              currentDate.setHours(0, 0, 0, 0);

              const excludedDates = task.excluded_dates || [];

              while (currentDate <= maxDate) {
                if (currentDate > baseDate) {
                  let shouldInclude = false;

                  if (task.recurrence === "daily") {
                    shouldInclude = true;
                  } else if (task.recurrence === "weekly" && task.recurrence_days?.length > 0) {
                    const dayOfWeek = currentDate.getDay();
                    shouldInclude = task.recurrence_days.includes(dayOfWeek);
                  } else if (task.recurrence === "monthly") {
                    const baseDayOfMonth = baseDate.getDate();
                    shouldInclude = currentDate.getDate() === baseDayOfMonth;
                  }

                  if (shouldInclude) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    
                    // Verificar si esta fecha está excluida
                    const isExcluded = excludedDates.includes(dateStr);
                    
                    if (!isExcluded) {
                      events.push({
                        id: `${task.id}-${dateStr}`,
                        name: task.name,
                        type: "freeTask",
                        date: dateStr,
                        start_date: dateStr,
                        start_time: task.start_time,
                        estimated_end_date: dateStr,
                        end_time: task.end_time,
                        status: task.status,
                        priority: task.priority,
                        duration: task.duration,
                        tags: task.tags,
                        data: task,
                        is_recurrence_instance: true,
                        parent_task_id: task.id
                      });
                    }
                  }
                }

                // Avanzar al siguiente día para revisar
                currentDate.setDate(currentDate.getDate() + 1);
              }
            }
          }
        }
      });
    }

    // Gastos a Pagar (recurrentes y futuros)
    if (layers.expenses) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      expenses.forEach(expense => {
        if (!expense.date) return;

        const expenseDate = new Date(expense.date);
        expenseDate.setHours(0, 0, 0, 0);

        // Mostrar gastos futuros (sin pagarse)
        if (expenseDate >= today && !expense.movimiento_tesoreria_id) {
          events.push({
            id: `expense-${expense.id}`,
            name: `💰 ${expense.description}`,
            type: "expense",
            date: expense.date,
            start_date: expense.date,
            estimated_end_date: expense.date,
            status: "pending",
            priority: "normal",
            data: expense,
            amount: expense.amount
          });
        }

        // Generar instancias de gastos recurrentes
        if (expense.is_recurring) {
          const baseDate = new Date(expense.date);
          baseDate.setHours(0, 0, 0, 0);
          
          const maxDate = new Date();
          maxDate.setMonth(maxDate.getMonth() + 6);

          let currentDate = new Date(baseDate);
          currentDate.setHours(0, 0, 0, 0);

          let instanceCount = 0;
          while (currentDate <= maxDate && instanceCount < 12) {
            if (currentDate > baseDate) {
              let shouldInclude = false;

              if (expense.recurring_frequency === "mensual") {
                const baseDayOfMonth = baseDate.getDate();
                shouldInclude = currentDate.getDate() === baseDayOfMonth;
              } else if (expense.recurring_frequency === "trimestral") {
                const baseMonth = baseDate.getMonth();
                const baseDay = baseDate.getDate();
                const currentMonth = currentDate.getMonth();
                const currentDay = currentDate.getDate();
                shouldInclude = (currentMonth - baseMonth) % 3 === 0 && currentDay === baseDay;
              } else if (expense.recurring_frequency === "anual") {
                const baseMonth = baseDate.getMonth();
                const baseDay = baseDate.getDate();
                shouldInclude = currentDate.getMonth() === baseMonth && currentDate.getDate() === baseDay;
              }

              if (shouldInclude) {
                const dateStr = currentDate.toISOString().split('T')[0];
                
                events.push({
                  id: `expense-${expense.id}-${dateStr}`,
                  name: `💰 ${expense.description}`,
                  type: "expense",
                  date: dateStr,
                  start_date: dateStr,
                  estimated_end_date: dateStr,
                  status: "pending",
                  priority: "normal",
                  data: expense,
                  is_recurrence_instance: true,
                  parent_expense_id: expense.id,
                  amount: expense.amount
                });
                
                instanceCount++;
              }
            }

            currentDate.setDate(currentDate.getDate() + 1);
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
    // Si es un gasto futuro, ir directamente a pagar
    if (event.type === "expense" && !event.data?.movimiento_tesoreria_id) {
      setExpenseToPay(event.data);
      setPayExpenseDialog(true);
      return;
    }
    // Abrir diálogo de detalles para otros eventos
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  };

  const handleEditEvent = (event) => {
    // Validar permisos antes de abrir edición
    setDetailDialogOpen(false);
    
    if (event.type === "freeTask") {
      if (!canEditEvents) {
        toast.error("No tienes permisos para editar eventos");
        return;
      }
      setEditingTask(event.data);
      setFreeTaskDialogOpen(true);
    } else if (event.type === "project") {
      if (!canEditProjects) {
        toast.error("No tienes permisos para editar proyectos");
        return;
      }
      window.location.href = `/Projects?id=${event.id}`;
    } else if (event.type === "task" || event.type === "phase") {
      if (!canEditTasks) {
        toast.error("No tienes permisos para editar tareas");
        return;
      }
      window.location.href = `/Projects?id=${event.project_id}`;
    } else if (event.type === "campaign") {
      window.location.href = `/Marketing`;
    }
  };

  const handleNavigateToProject = (projectId) => {
    window.location.href = `/Projects?id=${projectId}`;
  };

  const handleDeleteEvent = async (event) => {
    if (event.type !== "freeTask") return;
    
    // Verificar si tiene recurrencia
    const hasRecurrence = event.data?.recurrence && event.data.recurrence !== "none";
    
    // Mostrar diálogo si es instancia de recurrencia o la tarea tiene recurrencia
    if (event.is_recurrence_instance || hasRecurrence) {
      setEventToDelete(event);
      setDeleteDialogOpen(true);
    } else {
      // Sin recurrencia, eliminar directamente
      performDelete(event, "this");
    }
  };

  const performDelete = async (event, deleteOption) => {
    try {
      const parentTaskId = event.parent_task_id || event.id;
      const instanceDate = event.date || event.start_date;
      
      if (deleteOption === "this") {
        // Verificar si la tarea tiene recurrencia
        const parentTask = freeTasks.find(t => t.id === parentTaskId);
        
        if (parentTask && (!parentTask.recurrence || parentTask.recurrence === "none")) {
          // Sin recurrencia: eliminar completamente
          await base44.entities.FreeTask.delete(parentTaskId);
        } else if (parentTask) {
          // Con recurrencia: agregar a excluded_dates
          const excludedDates = parentTask.excluded_dates || [];
          if (!excludedDates.includes(instanceDate)) {
            excludedDates.push(instanceDate);
          }
          await base44.entities.FreeTask.update(parentTaskId, {
            excluded_dates: excludedDates
          });
        }
      } else if (deleteOption === "thisAndFuture") {
        // Eliminar esta y todas las futuras - detener recurrencia
        const parentTask = freeTasks.find(t => t.id === parentTaskId);
        if (parentTask) {
          // Excluir esta fecha y todas las futuras dejando la recurrencia como "none"
          await base44.entities.FreeTask.update(parentTaskId, {
            recurrence: "none",
            recurrence_days: [],
            excluded_dates: parentTask.excluded_dates || []
          });
        }
      } else if (deleteOption === "all") {
        // Eliminar la tarea padre (todas las instancias)
        await base44.entities.FreeTask.delete(parentTaskId);
      }
      
      queryClient.invalidateQueries({ queryKey: ['freeTasks'] });
      setDetailDialogOpen(false);
      setSelectedEvent(null);
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      toast.success('Tarea eliminada correctamente');
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message);
      console.error(error);
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
    if (editingTask?.id) {
      if (!canEditEvents) {
        toast.error("No tienes permisos para editar eventos");
        return;
      }
      updateFreeTaskMutation.mutate({ id: editingTask.id, data: taskData });
    } else {
      if (!canCreateEvents) {
        toast.error("No tienes permisos para crear eventos");
        return;
      }
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

  const payExpenseMutation = useMutation({
    mutationFn: async ({ expenseId, payData }) => {
      const expense = expenses.find(e => e.id === expenseId);
      if (!expense) throw new Error("Gasto no encontrado");

      const medio = mediosPago.find(m => m.id === payData.medio_pago_id);
      if (!medio) throw new Error("Debe seleccionar un medio de pago");

      const banco = bancos.find(b => b.id === payData.banco_id);
      const caja = cajas.find(c => c.id === payData.caja_id);

      // Crear movimiento de tesorería
      const movimiento = await base44.entities.MovimientoTesoreria.create({
        fecha: payData.fecha,
        tipo: "EGRESO",
        medio_pago_id: medio.id,
        medio_pago_nombre: medio.nombre,
        banco_id: payData.banco_id || null,
        banco_nombre: banco?.nombre || "",
        caja_id: payData.caja_id || null,
        caja_nombre: caja?.nombre || "",
        importe: expense.amount,
        referencia_tipo: "gasto",
        referencia_id: expenseId,
        observaciones: `Gasto: ${expense.description}`
      });

      // Actualizar expense con movimiento
      await base44.entities.Expense.update(expenseId, {
        movimiento_tesoreria_id: movimiento.id
      });

      // Actualizar saldos
      if (payData.banco_id && banco) {
        await base44.entities.Banco.update(payData.banco_id, {
          saldo_actual: banco.saldo_actual - expense.amount
        });
      }
      if (payData.caja_id && caja) {
        await base44.entities.Caja.update(payData.caja_id, {
          saldo_actual: caja.saldo_actual - expense.amount
        });
      }

      // Calcular y actualizar próxima fecha si es recurrente
      if (expense.is_recurring && expense.recurring_frequency) {
        const nextDate = calculateNextExpenseDate(expense.date, expense.recurring_frequency);
        await base44.entities.Expense.update(expenseId, {
          date: nextDate
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      setPayExpenseDialog(false);
      setExpenseToPay(null);
      toast.success('Gasto pagado correctamente');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const calculateNextExpenseDate = (baseDate, frequency) => {
    const date = new Date(baseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (frequency === "mensual") {
      const dayOfMonth = date.getDate();
      let next = new Date(today);
      next.setDate(dayOfMonth);
      if (next <= today) next.setMonth(next.getMonth() + 1);
      return next.toISOString().split('T')[0];
    } else if (frequency === "trimestral") {
      const baseMonth = date.getMonth();
      const dayOfMonth = date.getDate();
      let next = new Date(today);
      const nextQuarterMonth = baseMonth + (Math.ceil((today.getMonth() - baseMonth) / 3) * 3);
      next.setMonth(nextQuarterMonth);
      next.setDate(dayOfMonth);
      if (next <= today) next.setMonth(next.getMonth() + 3);
      return next.toISOString().split('T')[0];
    } else if (frequency === "anual") {
      const month = date.getMonth();
      const dayOfMonth = date.getDate();
      let next = new Date(today);
      next.setMonth(month);
      next.setDate(dayOfMonth);
      if (next <= today) next.setFullYear(next.getFullYear() + 1);
      return next.toISOString().split('T')[0];
    }
    return baseDate;
  };

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
    // Usar fecha local sin conversión UTC
    const year = snappedDate.getFullYear();
    const month = String(snappedDate.getMonth() + 1).padStart(2, '0');
    const day = String(snappedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${String(snappedDate.getHours()).padStart(2, '0')}:${String(snappedDate.getMinutes()).padStart(2, '0')}`;

    // Registrar auditoría
    const oldStartDate = new Date(event.start_date || event.date);
    const oldEndDate = event.estimated_end_date || event.due_date || event.end_date;

    if (event.type === "freeTask") {
      const updateData = { date: dateStr, start_time: timeStr };
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
      campaign: "#ec4899",
      expense: "#ef4444"
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
          weekStartsOn={weekStartsOn}
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
          weekStartsOn={weekStartsOn}
        />
      )}

      {viewMode === "day" && (
        <WeekView
          currentDate={currentDate}
          events={events.filter(e => {
            const eventDateStr = e.date || e.start_date || e.created_date;
            if (!eventDateStr) return false;
            const dateStr = eventDateStr.split('T')[0];
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            return dateStr === `${year}-${month}-${day}`;
          })}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          canEditEvents={canEditEvents}
          canEditTasks={canEditTasks}
          canEditProjects={canEditProjects}
          snapMinutes={snapMinutes}
          getEventColor={getEventColor}
          weekStartsOn={weekStartsOn}
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
        canEdit={editingTask ? canEditEvents : canCreateEvents}
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

      <EventDetailDialog
        isOpen={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        onNavigate={handleNavigateToProject}
        getEventColor={getEventColor}
      />

      <DeleteRecurrenceDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setEventToDelete(null);
        }}
        onConfirm={(deleteOption) => {
          if (eventToDelete) {
            performDelete(eventToDelete, deleteOption);
          }
        }}
        taskName={eventToDelete?.name}
        isRecurrenceInstance={eventToDelete?.is_recurrence_instance}
      />

      {/* Pay Expense Dialog */}
      <Dialog open={payExpenseDialog} onOpenChange={setPayExpenseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pagar Gasto</DialogTitle>
          </DialogHeader>
          {expenseToPay && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p className="text-xs text-blue-600 font-medium">DESCRIPCIÓN</p>
                <p className="font-semibold text-lg">{expenseToPay.description}</p>
                <p className="text-sm text-blue-600 font-bold">${expenseToPay.amount?.toLocaleString('es-AR')}</p>
              </div>

              <div className="space-y-2">
                <Label>Medio de Pago *</Label>
                <select 
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  onChange={(e) => setExpenseToPay({...expenseToPay, medio_pago_id: e.target.value, banco_id: "", caja_id: ""})}
                  defaultValue={expenseToPay.medio_pago_id || ""}
                >
                  <option value="">Seleccionar</option>
                  {mediosPago.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              {mediosPago.find(m => m.id === expenseToPay.medio_pago_id)?.requiere_banco && (
                <div className="space-y-2">
                  <Label>Banco *</Label>
                  <select 
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    onChange={(e) => setExpenseToPay({...expenseToPay, banco_id: e.target.value})}
                    defaultValue={expenseToPay.banco_id || ""}
                  >
                    <option value="">Seleccionar</option>
                    {bancos.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre} (${b.saldo_actual?.toLocaleString('es-AR')})</option>
                    ))}
                  </select>
                </div>
              )}

              {mediosPago.find(m => m.id === expenseToPay.medio_pago_id)?.requiere_caja && (
                <div className="space-y-2">
                  <Label>Caja *</Label>
                  <select 
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    onChange={(e) => setExpenseToPay({...expenseToPay, caja_id: e.target.value})}
                    defaultValue={expenseToPay.caja_id || ""}
                  >
                    <option value="">Seleccionar</option>
                    {cajas.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} (${c.saldo_actual?.toLocaleString('es-AR')})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayExpenseDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (expenseToPay?.medio_pago_id) {
                  payExpenseMutation.mutate({
                    expenseId: expenseToPay.id,
                    payData: {
                      medio_pago_id: expenseToPay.medio_pago_id,
                      banco_id: expenseToPay.banco_id || null,
                      caja_id: expenseToPay.caja_id || null,
                      fecha: format(new Date(), 'yyyy-MM-dd')
                    }
                  });
                }
              }}
              disabled={payExpenseMutation.isPending}
            >
              {payExpenseMutation.isPending ? 'Pagando...' : 'Pagar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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