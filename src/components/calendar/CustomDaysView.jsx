import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eachDayOfInterval, format, isToday, isSameDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function CustomDaysView({ currentDate, daysCount, events, onEventClick, onDateClick, onEventDrop, onEventResize }) {
  const [draggingEvent, setDraggingEvent] = useState(null);
  const days = eachDayOfInterval({
    start: currentDate,
    end: addDays(currentDate, daysCount - 1)
  });

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
    if (event.type === "freeTask") return "bg-slate-100 border-slate-300 text-slate-700";
    if (event.type === "milestone") return "bg-amber-100 border-amber-300 text-amber-800";
    if (event.type === "campaign") return "bg-pink-100 border-pink-300 text-pink-800";
    return "bg-slate-100 border-slate-300 text-slate-800";
  };

  const getEventIcon = (event) => {
    if (event.type === "freeTask") return "📝";
    if (event.type === "project") return "📁";
    if (event.type === "phase") return "🎯";
    if (event.type === "task") return "✓";
    if (event.type === "milestone") return "🏁";
    if (event.type === "campaign") return "📢";
    return "📅";
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="flex" style={{ minWidth: `${daysCount * 200}px` }}>
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isDayToday = isToday(day);

            return (
              <div
                key={day.toString()}
                className={cn(
                  "flex-1 min-w-[200px] border-r last:border-r-0",
                  isDayToday && "bg-blue-50/30"
                )}
              >
                {/* Day Header */}
                <div
                  className={cn(
                    "p-4 border-b cursor-pointer hover:bg-secondary/50 transition-colors",
                    isDayToday && "bg-primary/10"
                  )}
                  onClick={() => onDateClick(day)}
                >
                  <div className="text-xs font-medium text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: es })}
                  </div>
                  <div className={cn(
                    "text-2xl font-bold mt-1",
                    isDayToday ? "text-primary" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(day, "MMM yyyy", { locale: es })}
                  </div>
                  {dayEvents.length > 0 && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Events */}
                <div className="p-3 space-y-2 min-h-[400px]">
                  {dayEvents.map((event, idx) => (
                    <div
                      key={idx}
                      draggable
                      onClick={() => onEventClick(event)}
                      className={cn(
                        "border rounded-lg p-3 cursor-move hover:shadow-md transition-all",
                        getEventColor(event),
                        draggingEvent?.id === event.id && "opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-base">{getEventIcon(event)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {event.name || event.title}
                          </div>
                          {event.time && (
                            <div className="text-xs text-muted-foreground mt-1">
                              🕐 {event.time}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {event.type && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {event.type === "freeTask" ? "Libre" : event.type}
                          </Badge>
                        )}
                        {event.priority && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] h-5",
                              event.priority === "alta" || event.priority === "critica" ? "border-red-400 text-red-700" :
                              event.priority === "media" ? "border-amber-400 text-amber-700" :
                              "border-green-400 text-green-700"
                            )}
                          >
                            {event.priority}
                          </Badge>
                        )}
                        {event.status && event.status !== "pendiente" && (
                          <Badge variant="outline" className="text-[10px] h-5">
                            {event.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>

                      {event.tags && event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px] h-4 px-1">
                              #{tag}
                            </Badge>
                          ))}
                          {event.tags.length > 2 && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1">
                              +{event.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {dayEvents.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      Sin eventos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}