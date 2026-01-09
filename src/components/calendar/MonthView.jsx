import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import DraggableEventItem from "./DraggableEventItem";

export default function MonthView({ currentDate, events, onEventClick, onDateClick, onEventDrop, onEventResize }) {
  const [draggingEvent, setDraggingEvent] = useState(null);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.date || event.start_date || event.created_date);
      return isSameDay(eventDate, day);
    });
  };

  const getEventColor = (event) => {
    if (event.type === "project") return "bg-purple-500";
    if (event.type === "phase") return "bg-blue-500";
    if (event.type === "task") return "bg-green-500";
    if (event.type === "freeTask") return "bg-slate-400";
    if (event.type === "milestone") return "bg-amber-500";
    if (event.type === "campaign") return "bg-pink-500";
    return "bg-slate-500";
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
                "min-h-[120px] border-r border-b p-2 cursor-pointer hover:bg-secondary/50 transition-colors",
                !isCurrentMonth && "bg-secondary/20",
                index % 7 === 6 && "border-r-0"
              )}
              onClick={() => onDateClick(day)}
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
                {dayEvents.slice(0, 3).map((event, idx) => (
                  <DraggableEventItem
                    key={idx}
                    event={event}
                    onEventClick={(e) => {
                      onEventClick(e);
                    }}
                    onEventDrop={onEventDrop}
                    onEventResize={onEventResize}
                    eventColor={getEventColor(event)}
                    isDragging={draggingEvent?.id === event.id}
                    layout="inline"
                  />
                ))}
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