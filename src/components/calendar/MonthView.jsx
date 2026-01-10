import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function MonthView({ 
  currentDate, 
  events, 
  onEventClick, 
  onDateClick,
  onEventDrop,
  canCreateEvents = true,
  canEditEvents = true,
  canEditTasks = true,
  canEditProjects = true,
  getEventColor,
  weekStartsOn = 1
}) {
  const [draggingEvent, setDraggingEvent] = useState(null);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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
      return "";
    }
    // Fallback por defecto
    if (event.type === "project") return "bg-purple-500";
    if (event.type === "phase") return "bg-blue-500";
    if (event.type === "task") return "bg-green-500";
    if (event.type === "freeTask") return "bg-slate-400";
    if (event.type === "milestone") return "bg-amber-500";
    if (event.type === "campaign") return "bg-pink-500";
    return "bg-slate-500";
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, day) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onEventDrop) return;

    try {
      const eventData = JSON.parse(e.dataTransfer.getData("application/json"));
      const noon = new Date(day);
      noon.setHours(12, 0, 0, 0);
      onEventDrop(eventData, noon);
    } catch (err) {
      console.error("Error dropping event:", err);
    }
    setDraggingEvent(null);
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="bg-secondary/50 border-b">
        <div className="grid grid-cols-7">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          return (
            <div
              key={day.toString()}
              className={cn(
                "min-h-[120px] border-r border-b p-2 transition-colors",
                !isCurrentMonth && "bg-secondary/20",
                index % 7 === 6 && "border-r-0",
                canCreateEvents && "cursor-pointer hover:bg-secondary/50",
                draggingEvent && "bg-blue-50/30"
              )}
              onClick={() => canCreateEvents && onDateClick(day)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-sm font-medium",
                  !isCurrentMonth && "text-muted-foreground/50",
                  isDayToday && "w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs"
                )}>
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1">
                    {dayEvents.length}
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, idx) => {
                  const clickable = canClickEvent(event);
                  const draggable = canDragEvent(event);
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
                        "text-[10px] px-2 py-1 rounded text-white truncate transition-opacity",
                        !getEventColor && getEventBgClass(event),
                        clickable && "cursor-pointer hover:opacity-80",
                        draggable && "cursor-move",
                        !clickable && !draggable && "cursor-default opacity-70",
                        draggingEvent?.id === event.id && "opacity-50"
                      )}
                      style={getEventColor ? { backgroundColor: getEventColor(event) } : undefined}
                      title={!clickable && !draggable ? "No tienes permisos para editar" : undefined}
                    >
                      {event.name || event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-2">
                    +{dayEvents.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}