import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase, Plus, Search, LayoutGrid, LayoutList, Calendar,
  TrendingUp, AlertCircle, CheckCircle, Users, Clock
} from "lucide-react";

import ProjectCard from "@/components/projects/ProjectCard";
import ProjectDialog from "@/components/projects/ProjectDialog";
import ProjectDetailView from "@/components/projects/ProjectDetailView";

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200)
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['allProjectTasks'],
    queryFn: () => base44.entities.ProjectTask.list('-created_date', 500)
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const project = await base44.entities.Project.create(data);
      
      await base44.entities.ProjectActivity.create({
        project_id: project.id,
        activity_type: "created",
        description: `Proyecto creado: ${data.name}`,
        user_email: user.email,
        user_name: user.full_name
      });
      
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDialogOpen(false);
      setEditingProject(null);
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDialogOpen(false);
      setEditingProject(null);
      if (selectedProject) {
        const updated = projects.find(p => p.id === selectedProject.id);
        setSelectedProject(updated);
      }
    }
  });

  const handleOpenDialog = (project = null) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleSaveProject = (data) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || project.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const projectsByStatus = {
    en_presupuestacion: projects.filter(p => p.status === "en_presupuestacion").length,
    pendiente_aprobacion: projects.filter(p => p.status === "pendiente_aprobacion").length,
    aprobado: projects.filter(p => p.status === "aprobado").length,
    en_ejecucion: projects.filter(p => p.status === "en_ejecucion").length,
    finalizado: projects.filter(p => p.status === "finalizado").length
  };

  const overdueProjects = projects.filter(p => 
    p.estimated_end_date && 
    new Date(p.estimated_end_date) < new Date() && 
    ['aprobado', 'en_ejecucion'].includes(p.status)
  ).length;

  const myTasks = tasks.filter(task => {
    const assigned = task.assigned_to?.some(a => a.email === "current_user");
    return task.status !== "finalizada";
  });

  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        onEdit={(project) => {
          setSelectedProject(null);
          handleOpenDialog(project);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-purple-600" />
            Proyectos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión integral de proyectos
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">En Presupuestación</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{projectsByStatus.en_presupuestacion}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Pendiente Aprobación</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{projectsByStatus.pendiente_aprobacion}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">En Ejecución</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{projectsByStatus.en_ejecucion}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Finalizados</p>
            <p className="text-2xl font-bold text-slate-600 mt-1">{projectsByStatus.finalizado}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{projects.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar proyectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="en_presupuestacion">En Presupuestación</SelectItem>
                <SelectItem value="pendiente_aprobacion">Pendiente Aprobación</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
                <SelectItem value="en_ejecucion">En Ejecución</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => setSelectedProject(project)}
            />
          ))}
          {filteredProjects.length === 0 && (
            <Card className="col-span-full border-0 shadow-sm">
              <CardContent className="p-12 text-center text-slate-500">
                <Briefcase className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg">No hay proyectos</p>
                <Button onClick={() => handleOpenDialog()} variant="outline" className="mt-4">
                  Crear primer proyecto
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-1 h-12 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800 truncate">{project.name}</h3>
                        <Badge className="capitalize text-xs">
                          {project.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {project.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{project.description}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      {project.responsible_name && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Users className="h-4 w-4" />
                          <span className="text-xs">{project.responsible_name}</span>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Progreso</p>
                        <p className="font-bold text-blue-600">{project.progress_percentage || 0}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProjects.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <p>No hay proyectos que coincidan</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <ProjectDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingProject(null);
        }}
        project={editingProject}
        onSave={handleSaveProject}
      />
    </div>
  );
}