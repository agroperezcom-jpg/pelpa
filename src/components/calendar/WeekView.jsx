import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday, isSameDay, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function WeekView({ 
  currentDate, 
  events, 
  onEventClick,
  onEventDrop,
  onEventResize,
  singleDay = false,
  canEditEvents = true,
  canEditTasks = true,
  canEditProjects = true,
  snapMinutes = 30,
  getEventColor
}) {
  const [draggingEvent, setDraggingEvent] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const resizeRef = useRef(null);
  const weekStart = singleDay ? currentDate : startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = singleDay ? currentDate : endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDateStr = event.date || event.start_date || event.created_date;
      if (!eventDateStr) return false;
      
      // Comparar solo las fechas en formato YYYY-MM-DD
      const dateStr = eventDateStr.split('T')[0];
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, '0');
      const dayNum = String(day.getDate()).padStart(2, '0');
      const targetDateStr = `${year}-${month}-${dayNum}`;
      
      return dateStr === targetDateStr;
    });
  };

  const hasConflict = (event, dayEvents) => {
    if (!event.start_date || !event.estimated_end_date) return false;
    
    const start = new Date(event.start_date);
    const end = new Date(event.estimated_end_date || event.due_date || event.end_date);
    
    return dayEvents.some(other => {
      if (other.id === event.id) return false;
      if (other.type !== event.type) return false;
      
      const otherStart = new Date(other.start_date || other.date);
      const otherEnd = new Date(other.estimated_end_date || other.due_date || other.end_date || otherStart);
      
      return (start < otherEnd && end > otherStart);
    });
  };

  const getEventBgClass = (event) => {
    if (getEventColor) {
      return "border";
    }
    // Fallback por defecto
    if (event.type === "project") return "bg-purple-100 border-purple-300 text-purple-800";
    if (event.type === "phase") return "bg-blue-100 border-blue-300 text-blue-800";
    if (event.type === "task") return "bg-green-100 border-green-300 text-green-800";
    if (event.type === "freeTask") return "bg-slate-50 border-slate-200 text-slate-700";
    if (event.type === "milestone") return "bg-amber-100 border-amber-300 text-amber-800";
    if (event.type === "campaign") return "bg-pink-100 border-pink-300 text-pink-800";
    return "bg-slate-100 border-slate-300 text-slate-800";
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getEventStyle = (event) => {
    if (!getEventColor) return {};
    
    const color = getEventColor(event);
    const rgb = hexToRgb(color);
    
    if (!rgb) return { backgroundColor: color };
    
    return {
      backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
      borderColor: color,
      color: color
    };
  };

  const canClickEvent = (event) => {
    if (event.type === "freeTask") return canEditEvents;
    if (event.type === "project") return canEditProjects;
    if (event.type === "task" || event.type === "phase") return canEditTasks;
    return true;
  };

  const canDragEvent = (event) => {
    if (!onEventDrop) return false;
    return canClickEvent(event);
  };

  const canResizeEvent = (event) => {
    if (!onEventResize) return false;
    return canClickEvent(event);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, day, hour) => {
    e.preventDefault();
    if (!onEventDrop) return;

    try {
      const eventData = JSON.parse(e.dataTransfer.getData("application/json"));
      const newDate = setHours(setMinutes(day, 0), hour);
      onEventDrop(eventData, newDate);
    } catch (err) {
      console.error("Error dropping event:", err);
    }
    setDraggingEvent(null);
  };

  const handleResizeStart = (e, event, direction) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingEvent({ event, direction });
    resizeRef.current = {
      startY: e.clientY,
      startDate: new Date(direction === "end" ? (event.due_date || event.end_date || event.estimated_end_date) : event.start_date)
    };
  };

  const handleResizeMove = (e) => {
    if (!resizingEvent || !resizeRef.current) return;
    
    const deltaY = e.clientY - resizeRef.current.startY;
    const pixelsPerHour = 60;
    const hoursDelta = deltaY / pixelsPerHour;
    
    const newDate = new Date(resizeRef.current.startDate.getTime() + hoursDelta * 60 * 60 * 1000);
    
    if (Math.abs(hoursDelta) > 0.25) {
      onEventResize(resizingEvent.event, newDate, resizingEvent.direction);
      resizeRef.current.startY = e.clientY;
      resizeRef.current.startDate = newDate;
    }
  };

  const handleResizeEnd = () => {
    setResizingEvent(null);
    resizeRef.current = null;
  };

  React.useEffect(() => {
    if (!resizingEvent) return;
    
    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);
    
    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [resizingEvent]);

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header */}
          <div className="bg-secondary/50 border-b sticky top-0 z-10">
            <div 
              className="grid"
              style={{ gridTemplateColumns: singleDay ? '80px 1fr' : '80px repeat(7, 1fr)' }}
            >
              <div className="p-3 border-r text-xs font-semibold text-muted-foreground">Hora</div>
              {days.map(day => {
                const isDayToday = isToday(day);
                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "p-3 border-r last:border-r-0 text-center",
                      isDayToday && "bg-primary/10"
                    )}
                  >
                    <div className="text-xs font-semibold text-muted-foreground">
                      {format(day, "EEE", { locale: es })}
                    </div>
                    <div className={cn(
                      "text-lg font-bold mt-1",
                      isDayToday ? "text-primary" : "text-foreground"
                    )}>
                      {format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time grid */}
          <div className="relative">
            {hours.map(hour => (
              <div 
                key={hour} 
                className="grid border-b"
                style={{ gridTemplateColumns: singleDay ? '80px 1fr' : '80px repeat(7, 1fr)' }}
              >
                <div className="p-2 border-r text-xs text-muted-foreground text-right pr-3">
                  {format(new Date().setHours(hour, 0), "HH:mm")}
                </div>
                {days.map(day => {
                   const isDayToday = isToday(day);
                   return (
                     <div
                       key={`${day}-${hour}`}
                       className={cn(
                         "min-h-[60px] border-r last:border-r-0 p-1",
                         isDayToday && "bg-primary/5",
                         draggingEvent && "bg-blue-50/30"
                       )}
                       onDragOver={handleDragOver}
                       onDrop={(e) => handleDrop(e, day, hour)}
                     />
                   );
                 })}
              </div>
            ))}

            {/* Events overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className="grid h-full"
                style={{ gridTemplateColumns: singleDay ? '80px 1fr' : '80px repeat(7, 1fr)' }}
              >
                <div />
                {days.map((day, dayIndex) => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div key={day.toString()} className="relative">
                      <div className="absolute inset-0 p-1 space-y-1 pointer-events-auto">
                        {dayEvents.map((event, idx) => {
                          const clickable = canClickEvent(event);
                          const draggable = canDragEvent(event);
                          const resizable = canResizeEvent(event);
                          const conflict = hasConflict(event, dayEvents);

                          return (
                            <div
                              key={idx}
                              draggable={draggable}
                              onDragStart={(e) => {
                                if (!draggable) return;
                                e.stopPropagation();
                                const eventPayload = {
                                  id: event.id,
                                  type: event.type,
                                  name: event.name,
                                  date: event.date,
                                  start_date: event.start_date,
                                  due_date: event.due_date,
                                  end_date: event.end_date,
                                  estimated_end_date: event.estimated_end_date,
                                  time: event.time,
                                  duration: event.duration,
                                  project_id: event.project_id,
                                  phase_id: event.phase_id,
                                  ...event
                                };
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("application/json", JSON.stringify(eventPayload));
                                setDraggingEvent(event);
                              }}
                              onDragEnd={() => setDraggingEvent(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (clickable) onEventClick(event);
                              }}
                              className={cn(
                                "relative rounded px-2 py-1 text-xs transition-shadow group",
                                getEventBgClass(event),
                                clickable && "cursor-pointer hover:shadow-md",
                                draggable && "cursor-move",
                                !clickable && !draggable && "cursor-default opacity-60",
                                draggingEvent?.id === event.id && "opacity-50",
                                conflict && "ring-2 ring-red-500 ring-offset-1"
                              )}
                              style={getEventStyle(event)}
                              title={!clickable && !draggable ? "No tienes permisos para editar" : conflict ? "⚠️ Conflicto de horario" : undefined}
                            >
                              {conflict && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />
                              )}
                              <div className="font-medium truncate">{event.name || event.title}</div>
                              {event.type && (
                                <Badge variant="outline" className="text-[9px] mt-1 h-4">
                                  {event.type}
                                </Badge>
                              )}

                              {resizable && (
                                <>
                                  <div
                                    onMouseDown={(e) => handleResizeStart(e, event, "start")}
                                    className="absolute top-0 left-0 right-0 h-1 cursor-n-resize opacity-0 group-hover:opacity-100 bg-blue-500/30 hover:bg-blue-500/50 transition-all"
                                    title="Arrastra para cambiar hora de inicio"
                                  />
                                  <div
                                    onMouseDown={(e) => handleResizeStart(e, event, "end")}
                                    className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize opacity-0 group-hover:opacity-100 bg-blue-500/30 hover:bg-blue-500/50 transition-all"
                                    title="Arrastra para cambiar hora de fin"
                                  />
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}