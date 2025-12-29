import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  RefreshCw,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO
} from "date-fns";
import { es } from "date-fns/locale";

const EVENT_COLORS = {
  project: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  campaign: { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" },
  task: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-300" },
  google: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" }
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState("month");
  const [googleEvents, setGoogleEvents] = useState([]);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  // Load Google Calendar events
  const loadGoogleEvents = async () => {
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const response = await base44.functions.invoke('syncGoogleCalendar', {
        action: 'list',
        eventData: {
          timeMin: monthStart.toISOString(),
          timeMax: monthEnd.toISOString()
        }
      });

      if (response.data.events) {
        setGoogleEvents(response.data.events);
      }
    } catch (error) {
      console.log('No se pudieron cargar eventos de Google Calendar:', error);
      setGoogleEvents([]);
    }
  };

  useEffect(() => {
    loadGoogleEvents();
  }, [currentDate]);

  // Combine all events
  const getAllEvents = () => {
    const events = [];

    // Projects
    projects.forEach(project => {
      if (project.due_date) {
        events.push({
          id: `project-${project.id}`,
          title: project.name,
          start: project.start_date || project.due_date,
          end: project.due_date,
          type: 'project',
          data: project,
          color: EVENT_COLORS.project
        });
      }
    });

    // Campaigns
    campaigns.forEach(campaign => {
      if (campaign.start_date) {
        events.push({
          id: `campaign-${campaign.id}`,
          title: campaign.name,
          start: campaign.start_date,
          end: campaign.end_date || campaign.start_date,
          type: 'campaign',
          data: campaign,
          color: EVENT_COLORS.campaign
        });
      }
    });

    // Tasks
    tasks.forEach(task => {
      if (task.due_date) {
        events.push({
          id: `task-${task.id}`,
          title: task.name,
          start: task.start_date || task.due_date,
          end: task.due_date,
          type: 'task',
          data: task,
          color: EVENT_COLORS.task
        });
      }
    });

    // Google Calendar events
    googleEvents.forEach(gEvent => {
      if (gEvent.start) {
        const startDate = gEvent.start.dateTime || gEvent.start.date;
        const endDate = gEvent.end?.dateTime || gEvent.end?.date || startDate;
        
        events.push({
          id: `google-${gEvent.id}`,
          title: gEvent.summary || 'Sin título',
          start: startDate,
          end: endDate,
          type: 'google',
          data: gEvent,
          color: EVENT_COLORS.google
        });
      }
    });

    return events;
  };

  const getEventsForDate = (date) => {
    return getAllEvents().filter(event => {
      const eventStart = parseISO(event.start);
      const eventEnd = parseISO(event.end);
      return date >= eventStart && date <= eventEnd;
    });
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { locale: es });
  const endDate = endOfWeek(monthEnd, { locale: es });
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const dayEvents = getEventsForDate(selectedDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-indigo-600" />
            Calendario
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Proyectos, tareas y eventos sincronizados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadGoogleEvents} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sincronizar
          </Button>
          <a 
            href="https://calendar.google.com" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir Google Calendar
            </Button>
          </a>
        </div>
      </div>

      {/* Legend */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-slate-600">Proyectos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-pink-500 rounded"></div>
              <span className="text-sm text-slate-600">Campañas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-violet-500 rounded"></div>
              <span className="text-sm text-slate-600">Tareas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500 rounded"></div>
              <span className="text-sm text-slate-600">Google Calendar</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                  </h2>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={today}>
                  Hoy
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Weekdays */}
              <div className="grid grid-cols-7 border-b">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-slate-600 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7">
                {dateRange.map((day, idx) => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[100px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                        !isCurrentMonth ? 'bg-slate-50' : ''
                      } ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        !isCurrentMonth ? 'text-slate-400' : 
                        isToday ? 'text-white bg-blue-600 w-6 h-6 rounded-full flex items-center justify-center' : 
                        'text-slate-700'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            className={`text-xs p-1 rounded truncate ${event.color.bg} ${event.color.text} border ${event.color.border} hover:shadow-sm transition-shadow`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-slate-500 pl-1">
                            +{dayEvents.length - 2} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Events for selected day */}
        <div>
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-base">
                {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {dayEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay eventos este día</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${event.color.bg} ${event.color.border}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`font-medium ${event.color.text}`}>
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                            <Clock className="h-3 w-3" />
                            {event.start.includes('T') ? (
                              format(parseISO(event.start), 'HH:mm', { locale: es })
                            ) : (
                              'Todo el día'
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {event.type === 'project' ? 'Proyecto' :
                           event.type === 'campaign' ? 'Campaña' :
                           event.type === 'task' ? 'Tarea' : 'Google'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.type === 'google' && <Sparkles className="h-5 w-5 text-emerald-600" />}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-slate-500">Tipo</Label>
                <p className="font-medium capitalize mt-1">
                  {selectedEvent.type === 'project' ? 'Proyecto' :
                   selectedEvent.type === 'campaign' ? 'Campaña' :
                   selectedEvent.type === 'task' ? 'Tarea' : 'Evento de Google Calendar'}
                </p>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Fecha y Hora</Label>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">
                      {selectedEvent.start.includes('T') ? (
                        <>
                          Inicio: {format(parseISO(selectedEvent.start), "d MMM yyyy, HH:mm", { locale: es })}
                        </>
                      ) : (
                        <>Inicio: {format(parseISO(selectedEvent.start), "d MMM yyyy", { locale: es })}</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">
                      {selectedEvent.end.includes('T') ? (
                        <>
                          Fin: {format(parseISO(selectedEvent.end), "d MMM yyyy, HH:mm", { locale: es })}
                        </>
                      ) : (
                        <>Fin: {format(parseISO(selectedEvent.end), "d MMM yyyy", { locale: es })}</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {selectedEvent.type !== 'google' && selectedEvent.data.description && (
                <div>
                  <Label className="text-xs text-slate-500">Descripción</Label>
                  <p className="text-sm mt-1">{selectedEvent.data.description}</p>
                </div>
              )}

              {selectedEvent.type === 'google' && selectedEvent.data.description && (
                <div>
                  <Label className="text-xs text-slate-500">Descripción</Label>
                  <p className="text-sm mt-1">{selectedEvent.data.description}</p>
                </div>
              )}

              {selectedEvent.type === 'project' && (
                <>
                  {selectedEvent.data.client_name && (
                    <div>
                      <Label className="text-xs text-slate-500">Cliente</Label>
                      <p className="text-sm mt-1">{selectedEvent.data.client_name}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-500">Estado</Label>
                    <div className="mt-1">
                      <Badge className={
                        selectedEvent.data.status === 'completado' ? 'bg-emerald-100 text-emerald-700' :
                        selectedEvent.data.status === 'en_progreso' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {selectedEvent.data.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </>
              )}

              {selectedEvent.type === 'google' && selectedEvent.data.htmlLink && (
                <a 
                  href={selectedEvent.data.htmlLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver en Google Calendar
                </a>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}