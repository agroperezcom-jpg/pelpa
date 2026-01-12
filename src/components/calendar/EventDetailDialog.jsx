import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Clock, User, Tag, FileText, Briefcase, 
  CheckCircle2, AlertCircle, X, ExternalLink, MapPin
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function EventDetailDialog({ 
  isOpen, 
  onClose, 
  event,
  onEdit,
  onNavigate,
  getEventColor 
}) {
  if (!event) return null;

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

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Fecha de inicio</span>
              </div>
              <p className="text-sm pl-6">
                {event.type === "freeTask" 
                  ? formatDateTime(event.date, event.time)
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
                  {formatDate(event.estimated_end_date || event.due_date || event.end_date)}
                </p>
              </div>
            )}
          </div>

          {/* Duración (para freeTask) */}
          {event.type === "freeTask" && event.duration && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Duración</span>
              </div>
              <p className="text-sm pl-6">{event.duration} minutos</p>
            </div>
          )}

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
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span className="font-medium">Proyecto</span>
              </div>
              <div className="pl-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate && onNavigate(event.project_id, "project")}
                  className="gap-2"
                >
                  Ver proyecto
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
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

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {onEdit && (
            <Button onClick={() => onEdit(event)}>
              Editar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}