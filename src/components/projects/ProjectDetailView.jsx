import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ArrowLeft, Calendar, Users, DollarSign, Activity, MessageSquare,
  FileText, CheckSquare, Flag, Clock, Edit, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import ProjectPhasesTab from "./ProjectPhasesTab";
import ProjectTasksTab from "./ProjectTasksTab";
import ProjectMilestonesTab from "./ProjectMilestonesTab";
import ProjectDocumentsTab from "./ProjectDocumentsTab";
import ProjectActivityTab from "./ProjectActivityTab";
import ProjectBudgetingTab from "./ProjectBudgetingTab";
import { AlertTriangle } from "lucide-react";

export default function ProjectDetailView({ project, onBack, onEdit }) {
  const queryClient = useQueryClient();

  const { data: phases = [] } = useQuery({
    queryKey: ['projectPhases', project.id],
    queryFn: () => base44.entities.ProjectPhase.filter({ project_id: project.id })
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks', project.id],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: project.id })
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['projectMilestones', project.id],
    queryFn: () => base44.entities.ProjectMilestone.filter({ project_id: project.id })
  });

  const statusColors = {
    borrador: "bg-slate-100 text-slate-700",
    en_presupuestacion: "bg-blue-100 text-blue-700",
    pendiente_aprobacion: "bg-amber-100 text-amber-700",
    aprobado: "bg-green-100 text-green-700",
    rechazado: "bg-red-100 text-red-700",
    en_ejecucion: "bg-purple-100 text-purple-700",
    finalizado: "bg-slate-100 text-slate-700",
    cancelado: "bg-red-100 text-red-700"
  };

  const priorityColors = {
    baja: "bg-slate-100 text-slate-700",
    media: "bg-blue-100 text-blue-700",
    alta: "bg-amber-100 text-amber-700",
    critica: "bg-red-100 text-red-700"
  };

  const tasksCompleted = tasks.filter(t => t.status === "finalizada").length;
  const tasksTotal = tasks.length;
  const progressFromTasks = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="h-6 w-px bg-slate-200"></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          <p className="text-slate-500 text-sm">{project.description}</p>
        </div>
        <Button variant="outline" onClick={() => onEdit(project)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Alertas de Estado No Operativo */}
      {!['aprobado', 'en_ejecucion', 'finalizado'].includes(project.status) && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-900">Proyecto no operativo</p>
                <p className="text-xs text-amber-700">
                  {project.status === 'en_presupuestacion' && 'Completá la presupuestación y enviá a aprobación para habilitar tareas y fases.'}
                  {project.status === 'pendiente_aprobacion' && 'Esperando aprobación ejecutiva del presupuesto.'}
                  {project.status === 'rechazado' && 'Presupuesto rechazado. Revisá observaciones y ajustá la propuesta.'}
                  {project.status === 'borrador' && 'Proyecto en borrador. Avanzá a presupuestación.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm" style={{ borderLeft: `4px solid ${project.color}` }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase">Estado</p>
              <Activity className="h-4 w-4 text-slate-400" />
            </div>
            <Badge className={statusColors[project.status]}>
              {project.status.replace('_', ' ')}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase">Prioridad</p>
              <Flag className="h-4 w-4 text-slate-400" />
            </div>
            <Badge className={priorityColors[project.priority]}>
              {project.priority}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase">Progreso</p>
              <CheckSquare className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{Math.round(progressFromTasks)}%</p>
            <Progress value={progressFromTasks} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase">Tareas</p>
              <CheckSquare className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {tasksCompleted}/{tasksTotal}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {project.start_date && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-slate-500">Inicio</p>
                  <p className="font-medium">{format(new Date(project.start_date), 'd MMM yyyy', { locale: es })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {project.estimated_end_date && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-xs text-slate-500">Fin Estimado</p>
                  <p className="font-medium">{format(new Date(project.estimated_end_date), 'd MMM yyyy', { locale: es })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {project.team_members && project.team_members.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-slate-500">Equipo</p>
                  <p className="font-medium">{project.team_members.length} miembro{project.team_members.length > 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-medium text-slate-700">Vista:</span>
        <Select defaultValue="budgeting" onValueChange={(value) => {
          const element = document.getElementById(`tab-content-${value}`);
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="budgeting">Presupuestación</SelectItem>
            <SelectItem value="phases">Fases</SelectItem>
            <SelectItem value="tasks">Tareas</SelectItem>
            <SelectItem value="milestones">Hitos</SelectItem>
            <SelectItem value="documents">Documentos</SelectItem>
            <SelectItem value="activity">Actividad</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div id="tab-content-budgeting">
          <ProjectBudgetingTab projectId={project.id} projectStatus={project.status} />
        </div>

        <div id="tab-content-phases">
          <ProjectPhasesTab projectId={project.id} projectStatus={project.status} />
        </div>

        <div id="tab-content-tasks">
          <ProjectTasksTab projectId={project.id} phases={phases} projectStatus={project.status} />
        </div>

        <div id="tab-content-milestones">
          <ProjectMilestonesTab projectId={project.id} phases={phases} />
        </div>

        <div id="tab-content-documents">
          <ProjectDocumentsTab projectId={project.id} phases={phases} tasks={tasks} />
        </div>

        <div id="tab-content-activity">
          <ProjectActivityTab projectId={project.id} />
        </div>
      </div>
    </div>
  );
}