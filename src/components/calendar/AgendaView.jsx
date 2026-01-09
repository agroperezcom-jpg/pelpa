import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isSameDay, startOfDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, User, MapPin, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgendaView({ 
  currentDate, 
  events, 
  onEventClick,
  daysToShow = 14,
  canEditEvents = true,
  canEditTasks = true,
  canEditProjects = true,
  getEventColor
}) {
  const [expandedDay, setExpandedDay] = useState(null);

  const getDaysWithEvents = () => {
    const days = [];
    for (let i = 0; i < daysToShow; i++) {
      const day = addDays(startOfDay(currentDate), i);
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.date || event.start_date || event.created_date);
        return isSameDay(eventDate, day);
      });
      
      if (dayEvents.length > 0) {
        days.push({ date: day, events: dayEvents });
      }
    }
    return days;
  };

  const canClickEvent = (event) => {
    if (event.type === "freeTask") return canEditEvents;
    if (event.type === "project") return canEditProjects;
    if (event.type === "task" || event.type === "phase") return canEditTasks;
    return true;
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

  const daysWithEvents = getDaysWithEvents();

  return (
    <Card className="border-0 shadow-sm">
      <ScrollArea className="h-[600px]">
        <div className="p-4 space-y-4">
          {daysWithEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay eventos próximos</p>
            </div>
          ) : (
            daysWithEvents.map(({ date, events: dayEvents }) => {
              const isExpanded = expandedDay === date.toString();
              
              return (
                <div key={date.toString()} className="space-y-2">
                  {/* Day Header */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {format(date, "d")}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase">
                          {format(date, "MMM", { locale: es })}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {format(date, "EEEE", { locale: es })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedDay(isExpanded ? null : date.toString())}
                    >
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    </Button>
                  </div>

                  {/* Events List */}
                  {isExpanded && (
                    <div className="space-y-2 pl-4">
                      {dayEvents.map((event, idx) => {
                        const clickable = canClickEvent(event);
                        const color = getEventColor ? getEventColor(event) : "#64748b";
                        
                        return (
                          <div
                            key={idx}
                            onClick={() => clickable && onEventClick(event)}
                            className={cn(
                              "p-4 rounded-lg border-l-4 transition-all",
                              clickable && "cursor-pointer hover:bg-secondary/50"
                            )}
                            style={{ borderLeftColor: color }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getEventIcon(event)}</span>
                                <div>
                                  <div className="font-medium text-foreground">
                                    {event.name || event.title}
                                  </div>
                                  {event.time && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                      <Clock className="h-3 w-3" />
                                      {event.time}
                                      {event.duration && ` (${event.duration} min)`}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={{ color }}
                              >
                                {event.type}
                              </Badge>
                            </div>

                            {event.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}

                            {event.assigned_to && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {event.assigned_to}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-1 mt-2">
                              {event.priority && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] h-5",
                                    event.priority === "alta" || event.priority === "critica" ? "border-red-300 text-red-700" :
                                    event.priority === "media" ? "border-amber-300 text-amber-700" :
                                    "border-green-300 text-green-700"
                                  )}
                                >
                                  {event.priority}
                                </Badge>
                              )}
                              
                              {event.status && event.status !== "pendiente" && (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  {event.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}