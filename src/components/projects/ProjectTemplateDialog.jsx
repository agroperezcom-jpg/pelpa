import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical } from "lucide-react";

export default function ProjectTemplateDialog({ isOpen, onClose, template, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "desarrollo",
    phases: [],
    tasks: [],
    estimated_duration_days: 0
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || "",
        description: template.description || "",
        type: template.type || "desarrollo",
        phases: template.phases || [],
        tasks: template.tasks || [],
        estimated_duration_days: template.estimated_duration_days || 0
      });
    } else {
      setFormData({
        name: "",
        description: "",
        type: "desarrollo",
        phases: [],
        tasks: [],
        estimated_duration_days: 0
      });
    }
  }, [template, isOpen]);

  const handleAddPhase = () => {
    setFormData({
      ...formData,
      phases: [...formData.phases, { name: "", description: "", order: formData.phases.length + 1, duration_days: 0 }]
    });
  };

  const handleUpdatePhase = (index, field, value) => {
    const newPhases = [...formData.phases];
    newPhases[index][field] = value;
    setFormData({ ...formData, phases: newPhases });
  };

  const handleRemovePhase = (index) => {
    const phaseName = formData.phases[index].name;
    setFormData({
      ...formData,
      phases: formData.phases.filter((_, i) => i !== index),
      tasks: formData.tasks.filter(t => t.phase_name !== phaseName)
    });
  };

  const handleAddTask = () => {
    setFormData({
      ...formData,
      tasks: [...formData.tasks, { name: "", description: "", phase_name: "", duration_days: 0, priority: "media" }]
    });
  };

  const handleUpdateTask = (index, field, value) => {
    const newTasks = [...formData.tasks];
    newTasks[index][field] = value;
    setFormData({ ...formData, tasks: newTasks });
  };

  const handleRemoveTask = (index) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nombre de la Plantilla *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Proyecto de Diseño Web"
                  required
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la plantilla..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Proyecto *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desarrollo">Desarrollo</SelectItem>
                    <SelectItem value="diseno">Diseño</SelectItem>
                    <SelectItem value="impresion">Impresión</SelectItem>
                    <SelectItem value="venta_especial">Venta Especial</SelectItem>
                    <SelectItem value="encuadernacion">Encuadernación</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="interno">Interno</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duración Estimada (días)</Label>
                <Input
                  type="number"
                  value={formData.estimated_duration_days}
                  onChange={(e) => setFormData({ ...formData, estimated_duration_days: parseInt(e.target.value) || 0 })}
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          <Tabs defaultValue="phases" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phases">Fases ({formData.phases.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tareas ({formData.tasks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="phases" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-600">Define las fases del proyecto</p>
                <Button type="button" onClick={handleAddPhase} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Fase
                </Button>
              </div>

              {formData.phases.length === 0 ? (
                <div className="text-center py-8 text-slate-500 border rounded-lg border-dashed">
                  <p className="text-sm">No hay fases definidas</p>
                  <Button type="button" onClick={handleAddPhase} variant="outline" size="sm" className="mt-2">
                    Agregar primera fase
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.phases.map((phase, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-slate-50">
                      <div className="flex items-start gap-3">
                        <GripVertical className="h-5 w-5 text-slate-400 mt-2" />
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-8">
                              <Input
                                value={phase.name}
                                onChange={(e) => handleUpdatePhase(index, 'name', e.target.value)}
                                placeholder="Nombre de la fase"
                                className="bg-white"
                              />
                            </div>
                            <div className="col-span-3">
                              <Input
                                type="number"
                                value={phase.duration_days}
                                onChange={(e) => handleUpdatePhase(index, 'duration_days', parseInt(e.target.value) || 0)}
                                placeholder="Días"
                                className="bg-white"
                              />
                            </div>
                            <div className="col-span-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemovePhase(index)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            value={phase.description}
                            onChange={(e) => handleUpdatePhase(index, 'description', e.target.value)}
                            placeholder="Descripción de la fase..."
                            rows={2}
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-600">Define las tareas del proyecto</p>
                <Button type="button" onClick={handleAddTask} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Tarea
                </Button>
              </div>

              {formData.tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 border rounded-lg border-dashed">
                  <p className="text-sm">No hay tareas definidas</p>
                  <Button type="button" onClick={handleAddTask} variant="outline" size="sm" className="mt-2">
                    Agregar primera tarea
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.tasks.map((task, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-slate-50">
                      <div className="flex items-start gap-3">
                        <GripVertical className="h-5 w-5 text-slate-400 mt-2" />
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-6">
                              <Input
                                value={task.name}
                                onChange={(e) => handleUpdateTask(index, 'name', e.target.value)}
                                placeholder="Nombre de la tarea"
                                className="bg-white"
                              />
                            </div>
                            <div className="col-span-3">
                              <Select
                                value={task.phase_name}
                                onValueChange={(v) => handleUpdateTask(index, 'phase_name', v)}
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Fase" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={null}>Sin fase</SelectItem>
                                  {formData.phases.map(p => (
                                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                value={task.duration_days}
                                onChange={(e) => handleUpdateTask(index, 'duration_days', parseInt(e.target.value) || 0)}
                                placeholder="Días"
                                className="bg-white"
                              />
                            </div>
                            <div className="col-span-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveTask(index)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Textarea
                              value={task.description}
                              onChange={(e) => handleUpdateTask(index, 'description', e.target.value)}
                              placeholder="Descripción de la tarea..."
                              rows={2}
                              className="bg-white"
                            />
                            <Select
                              value={task.priority}
                              onValueChange={(v) => handleUpdateTask(index, 'priority', v)}
                            >
                              <SelectTrigger className="bg-white">
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
              {template ? 'Guardar Cambios' : 'Crear Plantilla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}