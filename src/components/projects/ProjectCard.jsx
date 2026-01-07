import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProjectCard({ project, onClick }) {
  const priorityColors = {
    baja: "bg-slate-100 text-slate-700",
    media: "bg-blue-100 text-blue-700",
    alta: "bg-amber-100 text-amber-700",
    critica: "bg-red-100 text-red-700"
  };

  const statusColors = {
    propuesto: "bg-purple-100 text-purple-700",
    activo: "bg-green-100 text-green-700",
    en_pausa: "bg-amber-100 text-amber-700",
    finalizado: "bg-slate-100 text-slate-700",
    cancelado: "bg-red-100 text-red-700"
  };

  const isOverdue = project.estimated_end_date && 
    new Date(project.estimated_end_date) < new Date() && 
    project.status !== "finalizado" && 
    project.status !== "cancelado";

  const daysRemaining = project.estimated_end_date 
    ? differenceInDays(new Date(project.estimated_end_date), new Date())
    : null;

  return (
    <Card 
      className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
      style={{ borderLeft: `4px solid ${project.color || '#3b82f6'}` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
            {project.name}
          </CardTitle>
          <Badge className={priorityColors[project.priority]}>
            {project.priority}
          </Badge>
        </div>
        {project.client_name && (
          <p className="text-xs text-slate-500">Cliente: {project.client_name}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={statusColors[project.status]}>
            {project.status.replace('_', ' ')}
          </Badge>
          {project.type && (
            <Badge variant="outline" className="capitalize">
              {project.type.replace('_', ' ')}
            </Badge>
          )}
        </div>

        {project.description && (
          <p className="text-sm text-slate-600 line-clamp-2">{project.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Progreso</span>
            <span className="font-medium">{project.progress_percentage || 0}%</span>
          </div>
          <Progress value={project.progress_percentage || 0} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {project.start_date && (
            <div className="flex items-center gap-1 text-slate-600">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(project.start_date), 'd MMM', { locale: es })}</span>
            </div>
          )}
          {project.estimated_end_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
              <Clock className="h-3 w-3" />
              <span>
                {isOverdue ? 'Vencido' : daysRemaining > 0 ? `${daysRemaining}d` : 'Hoy'}
              </span>
            </div>
          )}
        </div>

        {project.team_members && project.team_members.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Users className="h-3 w-3" />
            <span>{project.team_members.length} miembro{project.team_members.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {isOverdue && (
          <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 p-2 rounded">
            <AlertCircle className="h-3 w-3" />
            <span>Proyecto atrasado</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}