import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock, TrendingUp } from "lucide-react";

import CalendarHeader from "@/components/calendar/CalendarHeader";
import CalendarFilters from "@/components/calendar/CalendarFilters";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import TimelineView from "@/components/calendar/TimelineView";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [layers, setLayers] = useState({
    projects: true,
    phases: true,
    tasks: true,
    milestones: true,
    campaigns: true,
    events: false
  });
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");

  // Fetch data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['projectPhases'],
    queryFn: () => base44.entities.ProjectPhase.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks'],
    queryFn: () => base44.entities.ProjectTask.list()
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['projectMilestones'],
    queryFn: () => base44.entities.ProjectMilestone.list()
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Combine all events based on active layers
  const getAllEvents = () => {
    const events = [];

    // Projects
    if (layers.projects) {
      projects.forEach(project => {
        if (project.start_date || project.estimated_end_date) {
          const matchesProject = selectedProject === "all" || project.id === selectedProject;
          const matchesUser = selectedUser === "all" || 
            project.responsible_email === selectedUser ||
            project.team_members?.some(m => m.email === selectedUser);

          if (matchesProject && matchesUser) {
            events.push({
              id: project.id,
              name: project.name,
              type: "project",
              date: project.start_date,
              start_date: project.start_date,
              estimated_end_date: project.estimated_end_date,
              status: project.status,
              priority: project.priority,
              progress_percentage: project.progress_percentage,
              color: project.color,
              project_id: project.id,
              data: project
            });
          }
        }
      });
    }

    // Phases
    if (layers.phases) {
      phases.forEach(phase => {
        if (phase.start_date || phase.end_date) {
          const matchesProject = selectedProject === "all" || phase.project_id === selectedProject;
          const matchesUser = selectedUser === "all" || phase.responsible_email === selectedUser;

          if (matchesProject && matchesUser) {
            events.push({
              id: phase.id,
              name: phase.name,
              type: "phase",
              date: phase.start_date,
              start_date: phase.start_date,
              estimated_end_date: phase.end_date,
              status: phase.status,
              order: phase.order,
              project_id: phase.project_id,
              data: phase
            });
          }
        }
      });
    }

    // Tasks
    if (layers.tasks) {
      tasks.forEach(task => {
        if (task.start_date || task.due_date) {
          const matchesProject = selectedProject === "all" || task.project_id === selectedProject;
          const matchesUser = selectedUser === "all" || 
            task.assigned_to?.some(a => a.email === selectedUser);

          if (matchesProject && matchesUser) {
            events.push({
              id: task.id,
              name: task.name,
              type: "task",
              date: task.start_date || task.due_date,
              start_date: task.start_date,
              estimated_end_date: task.due_date,
              status: task.status,
              priority: task.priority,
              project_id: task.project_id,
              phase_id: task.phase_id,
              data: task
            });
          }
        }
      });
    }

    // Milestones
    if (layers.milestones) {
      milestones.forEach(milestone => {
        if (milestone.date) {
          const matchesProject = selectedProject === "all" || milestone.project_id === selectedProject;

          if (matchesProject) {
            events.push({
              id: milestone.id,
              name: milestone.name,
              type: "milestone",
              date: milestone.date,
              start_date: milestone.date,
              estimated_end_date: milestone.date,
              status: milestone.status,
              color: milestone.color,
              project_id: milestone.project_id,
              data: milestone
            });
          }
        }
      });
    }

    // Campaigns
    if (layers.campaigns) {
      campaigns.forEach(campaign => {
        if (campaign.start_date) {
          const matchesUser = selectedUser === "all" || campaign.assigned_to === selectedUser;

          if (matchesUser) {
            events.push({
              id: campaign.id,
              name: campaign.name,
              type: "campaign",
              date: campaign.start_date,
              start_date: campaign.start_date,
              estimated_end_date: campaign.end_date || campaign.start_date,
              status: campaign.status,
              data: campaign
            });
          }
        }
      });
    }

    return events;
  };

  const events = getAllEvents();

  // Calculate alerts
  const today = new Date();
  const overdueProjects = projects.filter(p => 
    p.estimated_end_date && 
    new Date(p.estimated_end_date) < today && 
    p.status !== "finalizado" && 
    p.status !== "cancelado"
  );

  const overdueTasks = tasks.filter(t => 
    t.due_date && 
    new Date(t.due_date) < today && 
    t.status !== "finalizada"
  );

  const upcomingMilestones = milestones.filter(m => {
    const diff = Math.ceil((new Date(m.date) - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7 && m.status === "pendiente";
  });

  const handleEventClick = (event) => {
    if (event.type === "project") {
      window.location.href = `/Projects?id=${event.id}`;
    } else if (event.type === "task") {
      window.location.href = `/Projects?id=${event.project_id}`;
    } else if (event.type === "campaign") {
      window.location.href = `/Marketing`;
    }
  };

  const handleDateClick = (date) => {
    // Could open a dialog to create new event on this date
    console.log("Clicked date:", date);
  };

  const handleCreateEvent = () => {
    window.location.href = `/Projects?action=new`;
  };

  return (
    <div className="space-y-6">
      <CalendarHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onCreateEvent={handleCreateEvent}
        filteredEventsCount={events.length}
      />

      {/* Alerts */}
      {(overdueProjects.length > 0 || overdueTasks.length > 0 || upcomingMilestones.length > 0) && (
        <div className="grid md:grid-cols-3 gap-4">
          {overdueProjects.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm">
                <strong className="text-red-900">{overdueProjects.length} proyecto{overdueProjects.length > 1 ? 's' : ''}</strong>
                <span className="text-red-700"> atrasado{overdueProjects.length > 1 ? 's' : ''}</span>
              </AlertDescription>
            </Alert>
          )}

          {overdueTasks.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong className="text-amber-900">{overdueTasks.length} tarea{overdueTasks.length > 1 ? 's' : ''}</strong>
                <span className="text-amber-700"> vencida{overdueTasks.length > 1 ? 's' : ''}</span>
              </AlertDescription>
            </Alert>
          )}

          {upcomingMilestones.length > 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong className="text-blue-900">{upcomingMilestones.length} hito{upcomingMilestones.length > 1 ? 's' : ''}</strong>
                <span className="text-blue-700"> próximo{upcomingMilestones.length > 1 ? 's' : ''}</span>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <CalendarFilters
        layers={layers}
        setLayers={setLayers}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        projects={projects}
        users={users}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Eventos visibles</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{events.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Proyectos activos</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {projects.filter(p => p.status === "activo").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Tareas pendientes</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {tasks.filter(t => t.status !== "finalizada").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Próximos hitos</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {upcomingMilestones.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Views */}
      {viewMode === "month" && (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
        />
      )}

      {viewMode === "week" && (
        <WeekView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
        />
      )}

      {viewMode === "day" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              {events.filter(e => {
                const eventDate = new Date(e.date || e.start_date);
                return eventDate.toDateString() === currentDate.toDateString();
              }).length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <p>No hay eventos este día</p>
                </div>
              ) : (
                events.filter(e => {
                  const eventDate = new Date(e.date || e.start_date);
                  return eventDate.toDateString() === currentDate.toDateString();
                }).map(event => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{event.name}</h3>
                      <Badge variant="outline" className="capitalize">
                        {event.type}
                      </Badge>
                    </div>
                    {event.data?.description && (
                      <p className="text-sm text-slate-600 mb-2">{event.data.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {event.status && (
                        <Badge variant="secondary" className="text-xs">
                          {event.status.replace('_', ' ')}
                        </Badge>
                      )}
                      {event.priority && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {event.priority}
                        </Badge>
                      )}
                      {event.progress_percentage !== undefined && (
                        <span>{event.progress_percentage}% completado</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "timeline" && (
        <TimelineView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
        />
      )}
    </div>
  );
}