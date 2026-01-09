import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Grid3x3, Palette, History } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CalendarHeader({ 
  currentDate, 
  setCurrentDate, 
  viewMode, 
  setViewMode,
  onCreateEvent,
  filteredEventsCount,
  canCreateEvents = true,
  snapMinutes = 30,
  setSnapMinutes,
  onOpenSettings,
  onOpenAudit
}) {
  const handlePrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (viewMode === "day") {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDateLabel = () => {
    if (viewMode === "month") {
      return format(currentDate, "MMMM yyyy", { locale: es });
    } else if (viewMode === "week") {
      return `Semana del ${format(currentDate, "d MMM", { locale: es })}`;
    } else if (viewMode === "day") {
      return format(currentDate, "d 'de' MMMM yyyy", { locale: es });
    }
    return format(currentDate, "MMMM yyyy", { locale: es });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          Calendario
        </h1>
        {filteredEventsCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {filteredEventsCount} evento{filteredEventsCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border rounded-lg p-1 bg-card">
          <Button
            variant={viewMode === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("day")}
            className="text-xs"
          >
            Día
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("week")}
            className="text-xs"
          >
            Semana
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("month")}
            className="text-xs"
          >
            Mes
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="min-w-[80px]">
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="font-semibold text-foreground min-w-[200px] text-center">
          {getDateLabel()}
        </div>

        {setSnapMinutes && (viewMode === "week" || viewMode === "day") && (
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4 text-muted-foreground" />
            <Select value={snapMinutes.toString()} onValueChange={(v) => setSnapMinutes(Number(v))}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <Button variant="outline" size="sm" onClick={onOpenSettings} title="Configuración visual">
              <Palette className="h-4 w-4" />
            </Button>
          )}
          
          {onOpenAudit && (
            <Button variant="outline" size="sm" onClick={onOpenAudit} title="Historial de cambios">
              <History className="h-4 w-4" />
            </Button>
          )}

          {canCreateEvents && (
            <Button onClick={onCreateEvent} className="bg-primary hover:bg-[hsl(var(--primary-hover))]">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarea
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}