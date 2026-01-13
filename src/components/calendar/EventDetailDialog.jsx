import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Clock, User, Tag, FileText, Briefcase, 
  CheckCircle2, AlertCircle, X, ExternalLink, MapPin, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageUrl } from "@/utils";
import { useCompany } from "@/components/context/CompanyContext";

export default function EventDetailDialog({ 
  isOpen, 
  onClose, 
  event,
  onEdit,
  onDelete,
  onNavigate,
  getEventColor 
}) {
  const [projectData, setProjectData] = useState(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const { currentCompanyId } = useCompany();

  if (!event) return null;

  // Fetch full project data when modal opens and event has project_id
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!event?.project_id || event.type === "project" || !isOpen) {
        setProjectData(null);
        return;
      }

      setIsLoadingProject(true);
      try {
        const projects = await base44.entities.Project.filter({ id: event.project_id });
        if (projects.length > 0) {
          const project = projects[0];
          // Safety check: ensure company_id matches
          if (project.company_id === currentCompanyId) {
            setProjectData(project);
          }
        }
      } catch (error) {
        console.error("Error fetching project data:", error);
      } finally {
        setIsLoadingProject(false);
      }
    };

    fetchProjectData();
  }, [event?.project_id, event?.type, isOpen, currentCompanyId]);

  const eventColor = getEventColor ? getEventColor(event) : "#64748b";

  const getStatusBadge = (status) => {
    const statusConfig = {
      pendiente: { color: "bg-yellow-100 text-yellow-700", label: "Pendiente" },
      en_progreso: { color: "bg-blue-100 text-blue-700", label: "En Progreso" },
      completada: { color: "bg-green-100 text-green-700", label: "Completada" },
      finalizada: { color: "bg-green-100 text-green-700", label: "Finalizada" },
      bloqueada: { color: "bg-red-100 text-red-700", label: "Bloqueada" },
      aprobado: { color: "bg-green-100 text-green-700", label: "Aprobado" },
      en_ejecucion: { color: "bg-blue-100 text-blue-700", label: "En Ejecución" },
      cancelado: { color: "bg-gray-100 text-gray-700", label: "Cancelado" },
      planificada: { color: "bg-purple-100 text-purple-700", label: "Planificada" }
    };
    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-700", label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      baja: { color: "bg-slate-100 text-slate-700", label: "Baja" },
      media: { color: "bg-blue-100 text-blue-700", label: "Media" },
      alta: { color: "bg-orange-100 text-orange-700", label: "Alta" },
      critica: { color: "bg-red-100 text-red-700", label: "Crítica" }
    };
    const config = priorityConfig[priority] || { color: "bg-gray-100 text-gray-700", label: priority };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getTypeLabel = (type) => {
    const labels = {
      project: "Proyecto",
      phase: "Fase",
      task: "Tarea de Proyecto",
      freeTask: "Tarea Libre",
      milestone: "Hito",
      campaign: "Campaña"
    };
    return labels[type] || type;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "No definida";
    try {
      return format(new Date(dateStr), "d 'de' MMMM yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return "No definida";
    try {
      const date = format(new Date(dateStr), "d 'de' MMMM yyyy", { locale: es });
      return timeStr ? `${date} a las ${timeStr}` : date;
    } catch {
      return dateStr;
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    try {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;

      let diffMinutes = endTotalMinutes - startTotalMinutes;
      if (diffMinutes < 0) diffMinutes += 24 * 60; // Si cruza medianoche

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      if (hours === 0) return `${minutes} min`;
      if (minutes === 0) return `${hours}h`;
      return `${hours}h ${minutes}min`;
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: eventColor }}
                />
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {getTypeLabel(event.type)}
                </span>
              </div>
              <DialogTitle className="text-xl pr-8">
                {event.name || event.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Estado y Prioridad */}
          <div className="flex gap-3">
            {event.status && (
              <div>
                {getStatusBadge(event.status)}
              </div>
            )}
            {event.priority && (
              <div>
                {getPriorityBadge(event.priority)}
              </div>
            )}
          </div>

          {/* Fechas y Horarios */}
          <div className="space-y-4">
            {event.type === "freeTask" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Hora de inicio</span>
                    </div>
                    <p className="text-sm pl-6">
                      {formatDateTime(event.date, event.start_time)}
                    </p>
                  </div>

                  {event.end_time && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">Hora de fin</span>
                      </div>
                      <p className="text-sm pl-6">
                        {event.end_time}
                      </p>
                    </div>
                  )}
                </div>

                {event.start_time && event.end_time && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Duración</span>
                    </div>
                    <p className="text-sm pl-6">
                      {calculateDuration(event.start_time, event.end_time)}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Fecha de inicio</span>
                    </div>
                    <p className="text-sm pl-6">
                      {event.start_time 
                        ? formatDateTime(event.start_date || event.date, event.start_time)
                        : formatDate(event.start_date || event.date)
                      }
                    </p>
                  </div>

                  {(event.estimated_end_date || event.due_date || event.end_date) && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Fecha de fin</span>
                      </div>
                      <p className="text-sm pl-6">
                        {event.due_time
                          ? formatDateTime(event.estimated_end_date || event.due_date || event.end_date, event.due_time)
                          : formatDate(event.estimated_end_date || event.due_date || event.end_date)
                        }
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Asignado a */}
          {(event.data?.assigned_to || event.data?.responsible_email || event.data?.responsible_name) && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="font-medium">Asignado a</span>
              </div>
              <div className="pl-6 space-y-1">
                {event.data?.assigned_to && Array.isArray(event.data.assigned_to) ? (
                  event.data.assigned_to.map((person, idx) => (
                    <p key={idx} className="text-sm">
                      {person.name} {person.email && <span className="text-muted-foreground">({person.email})</span>}
                    </p>
                  ))
                ) : (
                  <p className="text-sm">
                    {event.data?.responsible_name || event.data?.responsible_email || "No asignado"}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Descripción */}
          {event.data?.description && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Descripción</span>
              </div>
              <p className="text-sm pl-6 text-muted-foreground whitespace-pre-wrap">
                {event.data.description}
              </p>
            </div>
          )}

          {/* Notas (para freeTask) */}
          {event.data?.notes && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Notas</span>
              </div>
              <p className="text-sm pl-6 text-muted-foreground whitespace-pre-wrap">
                {event.data.notes}
              </p>
            </div>
          )}

          {/* Ubicación (para freeTask) */}
          {event.data?.location && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Ubicación</span>
              </div>
              <p className="text-sm pl-6">{event.data.location}</p>
            </div>
          )}

          {/* Recurrencia */}
          {event.type === "freeTask" && event.data?.recurrence && event.data.recurrence !== "none" && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Recurrencia</span>
              </div>
              <p className="text-sm pl-6 capitalize">
                {event.data.recurrence === "daily" && "Diaria"}
                {event.data.recurrence === "weekly" && "Semanal"}
                {event.data.recurrence === "monthly" && "Mensual"}
              </p>
            </div>
          )}

          {/* Etiquetas */}
          {event.tags && event.tags.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span className="font-medium">Etiquetas</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {event.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Completada por */}
          {event.type === "freeTask" && event.data?.completed_at && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Completada</span>
              </div>
              <div className="pl-6 space-y-1">
                <p className="text-sm">
                  {format(new Date(event.data.completed_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                </p>
                {event.data.completed_by && (
                  <p className="text-xs text-muted-foreground">
                    Por: {event.data.completed_by}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Progreso */}
          {event.progress_percentage !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Progreso</span>
              </div>
              <div className="pl-6">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${event.progress_percentage || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{event.progress_percentage || 0}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Proyecto relacionado */}
          {event.project_id && event.type !== "project" && (
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span className="font-medium">Proyecto</span>
              </div>

              {isLoadingProject ? (
                <div className="pl-6 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ) : projectData ? (
                <div className="pl-6 space-y-3">
                  {/* Nombre del proyecto */}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {projectData.name}
                    </p>
                  </div>

                  {/* Estado del proyecto */}
                  {projectData.status && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Estado</p>
                      <div>
                        <Badge className="bg-slate-100 text-slate-800">
                          {projectData.status === "en_ejecucion" && "En Ejecución"}
                          {projectData.status === "aprobado" && "Aprobado"}
                          {projectData.status === "finalizado" && "Finalizado"}
                          {projectData.status === "borrador" && "Borrador"}
                          {projectData.status === "en_presupuestacion" && "En Presupuestación"}
                          {projectData.status === "pendiente_aprobacion" && "Pendiente Aprobación"}
                          {projectData.status === "rechazado" && "Rechazado"}
                          {projectData.status === "cancelado" && "Cancelado"}
                          {!["en_ejecucion", "aprobado", "finalizado", "borrador", "en_presupuestacion", "pendiente_aprobacion", "rechazado", "cancelado"].includes(projectData.status) && projectData.status}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Fechas del proyecto */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {projectData.start_date && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Fecha de inicio</p>
                        <p className="font-medium text-foreground">
                          {format(new Date(projectData.start_date), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    )}
                    {projectData.estimated_end_date && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Fecha de fin</p>
                        <p className="font-medium text-foreground">
                          {format(new Date(projectData.estimated_end_date), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ver proyecto button */}
                  <div className="pt-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <a href={`/Projects?id=${event.project_id}`}>
                        Ver proyecto
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pl-6">
                  <p className="text-xs text-muted-foreground italic">
                    No se pudo cargar la información del proyecto
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Checklist (para freeTask) */}
          {event.data?.checklist && event.data.checklist.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Checklist</span>
              </div>
              <div className="pl-6 space-y-2">
                {event.data.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border ${item.completed ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                      {item.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t">
          <div>
            {event.type === "freeTask" && onDelete && (
              <Button 
                variant="destructive" 
                onClick={() => onDelete(event)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {onEdit && (
              <Button onClick={() => onEdit(event)}>
                Editar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}