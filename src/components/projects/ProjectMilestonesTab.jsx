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
import { Plus, Flag, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProjectMilestonesTab({ projectId, phases }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: "",
    phase_id: "",
    color: "#f59e0b",
    status: "pendiente"
  });

  const queryClient = useQueryClient();

  const { data: milestones = [] } = useQuery({
    queryKey: ['projectMilestones', projectId],
    queryFn: () => base44.entities.ProjectMilestone.filter({ project_id: projectId })
  });

  const createMilestoneMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectMilestone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMilestones'] });
      handleCloseDialog();
    }
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectMilestone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMilestones'] });
      handleCloseDialog();
    }
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectMilestone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMilestones'] });
    }
  });

  const handleOpenDialog = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setFormData({
        name: milestone.name,
        description: milestone.description || "",
        date: milestone.date,
        phase_id: milestone.phase_id || "",
        color: milestone.color || "#f59e0b",
        status: milestone.status
      });
    } else {
      setEditingMilestone(null);
      setFormData({
        name: "",
        description: "",
        date: "",
        phase_id: "",
        color: "#f59e0b",
        status: "pendiente"
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMilestone(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSave = {
      project_id: projectId,
      ...formData
    };

    if (editingMilestone) {
      updateMilestoneMutation.mutate({ id: editingMilestone.id, data: dataToSave });
    } else {
      createMilestoneMutation.mutate(dataToSave);
    }
  };

  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  const statusColors = {
    pendiente: "bg-amber-100 text-amber-700",
    alcanzado: "bg-green-100 text-green-700",
    no_alcanzado: "bg-red-100 text-red-700"
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Hito
        </Button>
      </div>

      <div className="space-y-3">
        {sortedMilestones.map((milestone) => {
          const phase = phases.find(p => p.id === milestone.phase_id);
          
          return (
            <Card key={milestone.id} className="border-0 shadow-sm" style={{ borderLeft: `4px solid ${milestone.color}` }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Flag className="h-5 w-5 mt-1" style={{ color: milestone.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800">{milestone.name}</h3>
                        <Badge className={statusColors[milestone.status]}>
                          {milestone.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-slate-600 mb-2">{milestone.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{format(new Date(milestone.date), 'd MMMM yyyy', { locale: es })}</span>
                        {phase && (
                          <Badge variant="outline" className="text-xs">
                            Fase: {phase.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(milestone)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (confirm('¿Eliminar este hito?')) {
                          deleteMilestoneMutation.mutate(milestone.id);
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

        {milestones.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-slate-500">
              <Flag className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No hay hitos definidos</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMilestone ? 'Editar Hito' : 'Nuevo Hito'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Hito *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fase Asociada</Label>
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
                  <SelectItem value="alcanzado">Alcanzado</SelectItem>
                  <SelectItem value="no_alcanzado">No Alcanzado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                {editingMilestone ? 'Guardar' : 'Crear Hito'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}