import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function CalendarSearchDialog({ isOpen, onClose, events, onEventClick, getEventColor }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEvents([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = events.filter(event => {
      const name = (event.name || event.title || "").toLowerCase();
      const description = (event.description || "").toLowerCase();
      const type = (event.type || "").toLowerCase();
      const tags = (event.tags || []).join(" ").toLowerCase();
      
      return name.includes(term) || description.includes(term) || type.includes(term) || tags.includes(term);
    }).slice(0, 20); // Limitar a 20 resultados

    setFilteredEvents(results);
  }, [searchTerm, events]);

  const handleEventClick = (event) => {
    onEventClick(event);
    onClose();
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

  const formatEventDate = (event) => {
    const date = new Date(event.date || event.start_date || event.created_date);
    return format(date, "dd MMM yyyy", { locale: es });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar eventos por nombre, descripción, tipo o etiquetas..."
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="p-4 space-y-2">
            {searchTerm && filteredEvents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No se encontraron eventos
              </div>
            )}

            {!searchTerm && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Escribe para buscar eventos...
              </div>
            )}

            {filteredEvents.map((event, idx) => {
              const color = getEventColor ? getEventColor(event) : "#64748b";
              
              return (
                <div
                  key={idx}
                  onClick={() => handleEventClick(event)}
                  className="p-3 rounded-lg border hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{getEventIcon(event)}</span>
                      <div>
                        <div className="font-medium text-sm">{event.name || event.title}</div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Badge variant="outline" style={{ color }} className="text-xs">
                      {event.type}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatEventDate(event)}
                    </div>
                    
                    {event.time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </div>
                    )}
                  </div>

                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] h-4">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}