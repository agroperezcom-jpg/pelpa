import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, ChevronRight, AlertTriangle, Calendar, Users, ChevronDown, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProjectPhasesTab({ projectId, projectStatus }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState({});
  
  const canEditPhases = ['aprobado', 'en_ejecucion'].includes(projectStatus);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    order: "",
    start_date: "",
    end_date: "",
    responsible_email: "",
    depends_on_phase_id: ""
  });

  const queryClient = useQueryClient();

  const { data: phases = [] } = useQuery({
    queryKey: ['projectPhases', projectId],
    queryFn: () => base44.entities.ProjectPhase.filter({ project_id: projectId })
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId })
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const createPhaseMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectPhase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectPhases'] });
      handleCloseDialog();
    }
  });

  const updatePhaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectPhase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectPhases'] });
      handleCloseDialog();
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
    }
  });

  const deletePhaseMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectPhase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectPhases'] });
    }
  });

  const handleOpenDialog = (phase = null) => {
    if (phase) {
      setEditingPhase(phase);
      setFormData({
        name: phase.name,
        description: phase.description || "",
        order: phase.order,
        start_date: phase.start_date || "",
        end_date: phase.end_date || "",
        responsible_email: phase.responsible_email || "",
        depends_on_phase_id: phase.depends_on_phase_id || ""
      });
    } else {
      setEditingPhase(null);
      setFormData({
        name: "",
        description: "",
        order: phases.length + 1,
        start_date: "",
        end_date: "",
        responsible_email: "",
        depends_on_phase_id: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPhase(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = users.find(u => u.email === formData.responsible_email);
    
    const dataToSave = {
      project_id: projectId,
      name: formData.name,
      description: formData.description,
      order: parseInt(formData.order),
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      responsible_email: formData.responsible_email || null,
      responsible_name: user?.full_name || null,
      depends_on_phase_id: formData.depends_on_phase_id || null,
      status: editingPhase?.status || "pendiente",
      progress_percentage: editingPhase?.progress_percentage || 0
    };

    if (editingPhase) {
      updatePhaseMutation.mutate({ id: editingPhase.id, data: dataToSave });
    } else {
      createPhaseMutation.mutate(dataToSave);
    }
  };

  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

  const statusColors = {
    pendiente: "bg-slate-100 text-slate-700",
    en_progreso: "bg-blue-100 text-blue-700",
    completada: "bg-green-100 text-green-700",
    bloqueada: "bg-red-100 text-red-700"
  };

  const taskStatusColors = {
    pendiente: "bg-slate-100 text-slate-700",
    en_progreso: "bg-blue-100 text-blue-700",
    finalizada: "bg-green-100 text-green-700",
    cancelada: "bg-red-100 text-red-700"
  };

  const togglePhase = (phaseId) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
  };

  const getPhaseProgress = (phaseId) => {
    const phaseTasks = tasks.filter(t => t.phase_id === phaseId);
    if (phaseTasks.length === 0) return 0;
    const completedTasks = phaseTasks.filter(t => t.status === "finalizada").length;
    return Math.round((completedTasks / phaseTasks.length) * 100);
  };

  const toggleTaskStatus = (task) => {
    const newStatus = task.status === "finalizada" ? "pendiente" : "finalizada";
    updateTaskMutation.mutate({
      id: task.id,
      data: { ...task, status: newStatus }
    });
  };

  // Actualizar progreso de fases cuando cambian las tareas
  React.useEffect(() => {
    phases.forEach(phase => {
      const calculatedProgress = getPhaseProgress(phase.id);
      if (phase.progress_percentage !== calculatedProgress) {
        updatePhaseMutation.mutate({
          id: phase.id,
          data: { progress_percentage: calculatedProgress }
        });
      }
    });
  }, [tasks]);

  return (
    <div className="space-y-4">
      {!canEditPhases && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">Proyecto no habilitado para fases</p>
                <p className="text-xs text-amber-700">El proyecto debe estar aprobado para crear y gestionar fases operativas.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-end">
        <Button 
          onClick={() => handleOpenDialog()} 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={!canEditPhases}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Fase
        </Button>
      </div>

      <div className="space-y-3">
        {sortedPhases.map((phase, index) => {
          const phaseTasks = tasks.filter(t => t.phase_id === phase.id);
          const isExpanded = expandedPhases[phase.id];
          const phaseProgress = getPhaseProgress(phase.id);
          
          return (
            <Card key={phase.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => togglePhase(phase.id)}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? "transform rotate-180" : ""
                          }`}
                        />
                      </Button>
                      <Badge variant="outline" className="font-mono">
                        #{phase.order}
                      </Badge>
                      <h3 className="font-semibold text-slate-800">{phase.name}</h3>
                      <Badge className={statusColors[phase.status]}>
                        {phase.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {phaseTasks.length} tareas
                      </Badge>
                    </div>
                    
                    {phase.description && (
                      <p className="text-sm text-slate-600 mb-3 ml-9">{phase.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500 ml-9">
                      {phase.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(phase.start_date), 'd MMM', { locale: es })}</span>
                        </div>
                      )}
                      {phase.end_date && (
                        <>
                          <ChevronRight className="h-3 w-3" />
                          <span>{format(new Date(phase.end_date), 'd MMM yyyy', { locale: es })}</span>
                        </>
                      )}
                      {phase.responsible_name && (
                        <div className="flex items-center gap-1 ml-4">
                          <Users className="h-3 w-3" />
                          <span>{phase.responsible_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 ml-9">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">Progreso</span>
                        <span className="font-medium">{phaseProgress}%</span>
                      </div>
                      <Progress value={phaseProgress} className="h-2" />
                    </div>

                    {/* Tareas desplegables */}
                    {isExpanded && phaseTasks.length > 0 && (
                      <div className="mt-4 ml-9 space-y-2 border-l-2 border-slate-200 pl-4">
                        {phaseTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <button
                              onClick={() => toggleTaskStatus(task)}
                              className="flex-shrink-0"
                            >
                              {task.status === "finalizada" ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                              )}
                            </button>
                            <div className="flex-1">
                              <p
                                className={`text-sm font-medium ${
                                  task.status === "finalizada"
                                    ? "line-through text-slate-400"
                                    : "text-slate-700"
                                }`}
                              >
                                {task.name}
                              </p>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <Badge className={`${taskStatusColors[task.status]} text-xs`}>
                              {task.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {isExpanded && phaseTasks.length === 0 && (
                      <div className="mt-4 ml-9 text-center py-4 text-slate-400 text-sm">
                        No hay tareas en esta fase
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleOpenDialog(phase)}
                      disabled={!canEditPhases}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      disabled={!canEditPhases}
                      onClick={() => {
                        if (confirm('¿Eliminar esta fase?')) {
                          deletePhaseMutation.mutate(phase.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {phases.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-slate-500">
              <p>No hay fases definidas</p>
              <Button onClick={() => handleOpenDialog()} variant="outline" className="mt-4">
                Crear primera fase
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPhase ? 'Editar Fase' : 'Nueva Fase'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nombre de la Fase *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Orden *</Label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select value={formData.responsible_email} onValueChange={(v) => setFormData({ ...formData, responsible_email: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin responsable</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Depende de Fase</Label>
                <Select value={formData.depends_on_phase_id} onValueChange={(v) => setFormData({ ...formData, depends_on_phase_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin dependencias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin dependencias</SelectItem>
                    {phases.filter(p => p.id !== editingPhase?.id).map(p => (
                      <SelectItem key={p.id} value={p.id}>#{p.order} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingPhase ? 'Guardar' : 'Crear Fase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}