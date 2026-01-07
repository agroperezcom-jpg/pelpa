import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, CheckSquare, Clock, User, Flag } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export default function ProjectTasksTab({ projectId, phases }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    phase_id: "",
    status: "pendiente",
    priority: "media",
    assigned_to: [],
    start_date: "",
    due_date: "",
    estimated_hours: "",
    tags: []
  });

  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId })
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      const task = await base44.entities.ProjectTask.create(data);
      
      await base44.entities.ProjectActivity.create({
        project_id: projectId,
        activity_type: "task_change",
        description: `Nueva tarea creada: ${data.name}`,
        user_email: (await base44.auth.me()).email,
        user_name: (await base44.auth.me()).full_name
      });
      
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      queryClient.invalidateQueries({ queryKey: ['projectActivity'] });
      handleCloseDialog();
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      handleCloseDialog();
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
    }
  });

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        name: task.name,
        description: task.description || "",
        phase_id: task.phase_id || "",
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to || [],
        start_date: task.start_date?.split('T')[0] || "",
        due_date: task.due_date?.split('T')[0] || "",
        estimated_hours: task.estimated_hours || "",
        tags: task.tags || []
      });
    } else {
      setEditingTask(null);
      setFormData({
        name: "",
        description: "",
        phase_id: "",
        status: "pendiente",
        priority: "media",
        assigned_to: [],
        start_date: "",
        due_date: "",
        estimated_hours: "",
        tags: []
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSave = {
      project_id: projectId,
      ...formData,
      estimated_hours: parseFloat(formData.estimated_hours) || 0,
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
    };

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: dataToSave });
    } else {
      createTaskMutation.mutate(dataToSave);
    }
  };

  const handleAddAssignee = (email) => {
    const user = users.find(u => u.email === email);
    if (!user || formData.assigned_to.some(a => a.email === email)) return;
    
    setFormData({
      ...formData,
      assigned_to: [...formData.assigned_to, { email: user.email, name: user.full_name }]
    });
  };

  const handleRemoveAssignee = (email) => {
    setFormData({
      ...formData,
      assigned_to: formData.assigned_to.filter(a => a.email !== email)
    });
  };

  const filteredTasks = tasks.filter(task => 
    filterStatus === "all" || task.status === filterStatus
  );

  const statusColors = {
    pendiente: "bg-slate-100 text-slate-700",
    en_progreso: "bg-blue-100 text-blue-700",
    bloqueada: "bg-red-100 text-red-700",
    finalizada: "bg-green-100 text-green-700"
  };

  const priorityColors = {
    baja: "bg-slate-100 text-slate-700",
    media: "bg-blue-100 text-blue-700",
    alta: "bg-amber-100 text-amber-700",
    critica: "bg-red-100 text-red-700"
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las tareas</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="en_progreso">En Progreso</SelectItem>
            <SelectItem value="bloqueada">Bloqueadas</SelectItem>
            <SelectItem value="finalizada">Finalizadas</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Tarea
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Tarea</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => {
              const phase = phases.find(p => p.id === task.phase_id);
              const isOverdue = task.due_date && 
                new Date(task.due_date) < new Date() && 
                task.status !== "finalizada";
              const daysLeft = task.due_date ? differenceInDays(new Date(task.due_date), new Date()) : null;

              return (
                <TableRow key={task.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-800">{task.name}</p>
                      {task.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {phase ? (
                      <Badge variant="outline" className="text-xs">
                        #{phase.order} {phase.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[task.status]}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColors[task.priority]} className="text-xs">
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.assigned_to && task.assigned_to.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <span className="text-xs">{task.assigned_to[0].name}</span>
                        {task.assigned_to.length > 1 && (
                          <Badge variant="outline" className="text-[10px] px-1">
                            +{task.assigned_to.length - 1}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.due_date ? (
                      <div className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                        {format(new Date(task.due_date), 'd MMM', { locale: es })}
                        {isOverdue && ' (vencida)'}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(task)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (confirm('¿Eliminar esta tarea?')) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No hay tareas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nombre de la Tarea *</Label>
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
                <Label>Fase</Label>
                <Select value={formData.phase_id} onValueChange={(v) => setFormData({ ...formData, phase_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin fase</SelectItem>
                    {phases.sort((a, b) => a.order - b.order).map(p => (
                      <SelectItem key={p.id} value={p.id}>#{p.order} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="bloqueada">Bloqueada</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Horas Estimadas</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  placeholder="0"
                />
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
                <Label>Fecha Vencimiento</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Asignar a</Label>
                <Select onValueChange={handleAddAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Agregar usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => !formData.assigned_to.some(a => a.email === u.email)).map(u => (
                      <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {formData.assigned_to.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.assigned_to.map(assignee => (
                      <Badge key={assignee.email} variant="outline" className="gap-1">
                        {assignee.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveAssignee(assignee.email)} 
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingTask ? 'Guardar' : 'Crear Tarea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  function handleAddAssignee(email) {
    const user = users.find(u => u.email === email);
    if (!user || formData.assigned_to.some(a => a.email === email)) return;
    
    setFormData({
      ...formData,
      assigned_to: [...formData.assigned_to, { email: user.email, name: user.full_name }]
    });
  }

  function handleRemoveAssignee(email) {
    setFormData({
      ...formData,
      assigned_to: formData.assigned_to.filter(a => a.email !== email)
    });
  }
}