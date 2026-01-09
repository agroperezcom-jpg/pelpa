import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Briefcase, Target, CheckSquare } from "lucide-react";
import DraggableEventItem from "./DraggableEventItem";

export default function TimelineView({ currentDate, events, onEventClick, onEventDrop, onEventResize }) {
  const [draggingEvent, setDraggingEvent] = useState(null);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filtrar solo proyectos, fases y tareas con fechas
  const timelineEvents = events.filter(e => 
    (e.type === "project" || e.type === "phase" || e.type === "task") &&
    e.start_date && e.estimated_end_date
  );

  const getEventPosition = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const daysSinceStart = differenceInDays(start, monthStart);
    const duration = differenceInDays(end, start);
    
    const leftPercent = (daysSinceStart / daysInMonth.length) * 100;
    const widthPercent = (duration / daysInMonth.length) * 100;
    
    return {
      left: Math.max(0, leftPercent),
      width: Math.min(100 - Math.max(0, leftPercent), widthPercent)
    };
  };

  const getEventColor = (event) => {
    if (event.type === "project") return "bg-purple-500";
    if (event.type === "phase") return "bg-blue-500";
    if (event.type === "task") return "bg-green-500";
    return "bg-slate-500";
  };

  const getEventIcon = (event) => {
    if (event.type === "project") return Briefcase;
    if (event.type === "phase") return Target;
    if (event.type === "task") return CheckSquare;
    return Briefcase;
  };

  // Agrupar por proyecto
  const projectGroups = {};
  timelineEvents.forEach(event => {
    const projectId = event.type === "project" ? event.id : event.project_id;
    if (!projectGroups[projectId]) {
      projectGroups[projectId] = [];
    }
    projectGroups[projectId].push(event);
  });

  return (
    <div className="space-y-6">
      {/* Timeline header con días */}
      <Card className="border-0 shadow-sm overflow-x-auto">
        <div className="min-w-[1000px] p-4">
          <div className="flex justify-between mb-2">
            {daysInMonth.map((day, idx) => {
              if (idx % 3 === 0) {
                return (
                  <div key={day.toString()} className="text-xs text-slate-500 flex-1 text-center">
                    {format(day, "d MMM", { locale: es })}
                  </div>
                );
              }
              return null;
            })}
          </div>
          <div className="h-px bg-slate-200" />
        </div>
      </Card>

      {/* Eventos agrupados por proyecto */}
      {Object.entries(projectGroups).map(([projectId, projectEvents]) => {
        const project = projectEvents.find(e => e.type === "project") || projectEvents[0];
        const phases = projectEvents.filter(e => e.type === "phase");
        const tasks = projectEvents.filter(e => e.type === "task");

        return (
          <Card key={projectId} className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-purple-600" />
                {project.name}
                {project.progress_percentage !== undefined && (
                  <Badge variant="outline" className="ml-auto">
                    {project.progress_percentage}%
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Proyecto */}
              {project.type === "project" && (
                <div className="relative">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-medium text-slate-600 w-32">Proyecto</span>
                    <div className="flex-1 relative h-8 bg-slate-100 rounded overflow-hidden">
                    <DraggableEventItem
                    event={project}
                    onEventClick={onEventClick}
                    onEventDrop={onEventDrop}
                    onEventResize={onEventResize}
                    eventColor={getEventColor(project)}
                    isDragging={draggingEvent?.id === project.id}
                    style={getEventPosition(project.start_date, project.estimated_end_date)}
                    layout="timeline"
                    />
                    </div>
                  </div>
                </div>
              )}

              {/* Fases */}
              {phases.length > 0 && (
                <div className="space-y-1 pl-4">
                  {phases.map((phase, idx) => {
                    const Icon = getEventIcon(phase);
                    return (
                      <div key={idx} className="relative">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs text-slate-600 w-28 flex items-center gap-1">
                            <Icon className="h-3 w-3" />
                            Fase #{phase.order}
                          </span>
                          <div className="flex-1 relative h-7 bg-slate-50 rounded overflow-hidden">
                           <DraggableEventItem
                             event={phase}
                             onEventClick={onEventClick}
                             onEventDrop={onEventDrop}
                             onEventResize={onEventResize}
                             eventColor={getEventColor(phase)}
                             isDragging={draggingEvent?.id === phase.id}
                             style={getEventPosition(phase.start_date, phase.end_date)}
                             layout="timeline"
                           />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tareas */}
              {tasks.length > 0 && (
                <div className="space-y-1 pl-8">
                  {tasks.slice(0, 5).map((task, idx) => {
                    const Icon = getEventIcon(task);
                    return (
                      <div key={idx} className="relative">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-24 flex items-center gap-1">
                            <Icon className="h-3 w-3" />
                            Tarea
                          </span>
                          <div className="flex-1 relative h-6 bg-slate-50 rounded overflow-hidden">
                           <DraggableEventItem
                             event={task}
                             onEventClick={onEventClick}
                             onEventDrop={onEventDrop}
                             onEventResize={onEventResize}
                             eventColor={getEventColor(task)}
                             isDragging={draggingEvent?.id === task.id}
                             style={getEventPosition(task.start_date, task.due_date)}
                             layout="timeline"
                           />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {tasks.length > 5 && (
                    <div className="text-xs text-slate-500 pl-24">
                      +{tasks.length - 5} tareas más
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {timelineEvents.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center text-slate-500">
            <p>No hay eventos con fechas en este período</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}