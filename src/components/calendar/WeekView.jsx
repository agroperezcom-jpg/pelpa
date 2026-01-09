import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday, isSameDay, addHours, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import DraggableEventItem from "./DraggableEventItem";

export default function WeekView({ currentDate, events, onEventClick, onEventDrop, onEventResize, singleDay = false }) {
  const [draggingEvent, setDraggingEvent] = useState(null);
  const weekStart = singleDay ? currentDate : startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = singleDay ? currentDate : endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.date || event.start_date || event.created_date);
      return isSameDay(eventDate, day);
    });
  };

  const getEventColor = (event) => {
    if (event.type === "project") return "bg-purple-100 border-purple-300 text-purple-800";
    if (event.type === "phase") return "bg-blue-100 border-blue-300 text-blue-800";
    if (event.type === "task") return "bg-green-100 border-green-300 text-green-800";
    if (event.type === "freeTask") return "bg-slate-50 border-slate-200 text-slate-700";
    if (event.type === "milestone") return "bg-amber-100 border-amber-300 text-amber-800";
    if (event.type === "campaign") return "bg-pink-100 border-pink-300 text-pink-800";
    return "bg-slate-100 border-slate-300 text-slate-800";
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

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header */}
          <div className="bg-secondary/50 border-b sticky top-0 z-10">
            <div className={cn("grid", singleDay ? "grid-cols-2" : "grid-cols-8")}>
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
              <div key={hour} className="grid grid-cols-8 border-b">
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
                         draggingEvent && "bg-slate-100/50"
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
              <div className="grid grid-cols-8 h-full">
                <div className="border-r" />
                {days.map((day, dayIndex) => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div key={day.toString()} className="border-r last:border-r-0 relative">
                      <div className="absolute inset-0 p-1 space-y-1 pointer-events-auto">
                        {dayEvents.map((event, idx) => (
                           <DraggableEventItem
                             key={idx}
                             event={event}
                             onEventClick={onEventClick}
                             onEventDrop={onEventDrop}
                             onEventResize={onEventResize}
                             eventColor={getEventColor(event)}
                             isDragging={draggingEvent?.id === event.id}
                             layout="block"
                           />
                         ))}
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