import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, CheckCircle2, Plus, Edit, Trash2, FileText, Tag } from "lucide-react";
import ProjectTemplateDialog from "../projects/ProjectTemplateDialog";
import toast from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfiguracionProyectos() {
  const [plantillaId, setPlantillaId] = useState(null);
  const [usarAutomaticamente, setUsarAutomaticamente] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [tipoDialogOpen, setTipoDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [deleteTipoDialogOpen, setDeleteTipoDialogOpen] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState(null);
  const [formTipo, setFormTipo] = useState({ nombre: "", valor: "", descripcion: "", color: "#8b5cf6", orden: 0 });

  const queryClient = useQueryClient();

  const { data: configuracion = [] } = useQuery({
    queryKey: ['configuracionProyectos'],
    queryFn: () => base44.entities.ConfiguracionProyectos.list()
  });

  const { data: plantillas = [] } = useQuery({
    queryKey: ['projectTemplates'],
    queryFn: () => base44.entities.ProjectTemplate.list()
  });

  const { data: tiposProyecto = [] } = useQuery({
    queryKey: ['tiposProyecto'],
    queryFn: () => base44.entities.TipoProyecto.list()
  });

  useEffect(() => {
    if (configuracion[0]) {
      setPlantillaId(configuracion[0].plantilla_por_defecto_id || null);
      setUsarAutomaticamente(configuracion[0].usar_plantilla_automaticamente ?? true);
    }
  }, [configuracion]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (configuracion[0]) {
        return await base44.entities.ConfiguracionProyectos.update(configuracion[0].id, data);
      } else {
        return await base44.entities.ConfiguracionProyectos.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracionProyectos'] });
      toast.success('Configuración guardada correctamente');
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates'] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      toast.success('Plantilla creada correctamente');
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates'] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      toast.success('Plantilla actualizada correctamente');
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['configuracionProyectos'] });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      toast.success('Plantilla eliminada correctamente');
    }
  });

  const createTipoMutation = useMutation({
    mutationFn: (data) => base44.entities.TipoProyecto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposProyecto'] });
      setTipoDialogOpen(false);
      setEditingTipo(null);
      setFormTipo({ nombre: "", valor: "", descripcion: "", color: "#8b5cf6", orden: 0 });
      toast.success('Tipo de proyecto creado correctamente');
    }
  });

  const updateTipoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TipoProyecto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposProyecto'] });
      setTipoDialogOpen(false);
      setEditingTipo(null);
      setFormTipo({ nombre: "", valor: "", descripcion: "", color: "#8b5cf6", orden: 0 });
      toast.success('Tipo de proyecto actualizado correctamente');
    }
  });

  const deleteTipoMutation = useMutation({
    mutationFn: (id) => base44.entities.TipoProyecto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiposProyecto'] });
      setDeleteTipoDialogOpen(false);
      setTipoToDelete(null);
      toast.success('Tipo de proyecto eliminado correctamente');
    }
  });

  const handleSave = () => {
    const selectedTemplate = plantillas.find(t => t.id === plantillaId);
    
    saveConfigMutation.mutate({
      plantilla_por_defecto_id: plantillaId,
      plantilla_por_defecto_nombre: selectedTemplate?.name || null,
      usar_plantilla_automaticamente: usarAutomaticamente
    });
  };

  const handleSaveTemplate = (data) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = (template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplateMutation.mutate(templateToDelete.id);
    }
  };

  const handleEditTipo = (tipo) => {
    setEditingTipo(tipo);
    setFormTipo({
      nombre: tipo.nombre,
      valor: tipo.valor,
      descripcion: tipo.descripcion || "",
      color: tipo.color || "#8b5cf6",
      orden: tipo.orden || 0
    });
    setTipoDialogOpen(true);
  };

  const handleDeleteTipo = (tipo) => {
    setTipoToDelete(tipo);
    setDeleteTipoDialogOpen(true);
  };

  const handleSaveTipo = (e) => {
    e.preventDefault();
    if (editingTipo) {
      updateTipoMutation.mutate({ id: editingTipo.id, data: formTipo });
    } else {
      createTipoMutation.mutate(formTipo);
    }
  };

  const confirmDeleteTipo = () => {
    if (tipoToDelete) {
      deleteTipoMutation.mutate(tipoToDelete.id);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Tipos de Proyecto */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-purple-600" />
                <div>
                  <CardTitle className="text-base">Tipos de Proyecto</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Configura los tipos de proyecto disponibles en el sistema
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setEditingTipo(null);
                  setFormTipo({ nombre: "", valor: "", descripcion: "", color: "#8b5cf6", orden: 0 });
                  setTipoDialogOpen(true);
                }}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Tipo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tiposProyecto.length === 0 ? (
              <div className="text-center py-8 border rounded-lg border-dashed">
                <Tag className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-3">No hay tipos de proyecto creados</p>
                <Button
                  onClick={() => {
                    setEditingTipo(null);
                    setFormTipo({ nombre: "", valor: "", descripcion: "", color: "#8b5cf6", orden: 0 });
                    setTipoDialogOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Crear primer tipo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {tiposProyecto.sort((a, b) => a.orden - b.orden).map((tipo) => (
                  <div
                    key={tipo.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tipo.color }}
                      />
                      <span className="font-medium text-sm text-slate-900 truncate">
                        {tipo.nombre}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditTipo(tipo)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteTipo(tipo)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plantillas Existentes */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <div>
                  <CardTitle className="text-base">Plantillas de Proyectos</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Gestiona plantillas con fases, tareas y asignaciones predefinidas
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateDialogOpen(true);
                }}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nueva Plantilla
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {plantillas.length === 0 ? (
              <div className="text-center py-8 border rounded-lg border-dashed">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-3">No hay plantillas creadas</p>
                <Button
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateDialogOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Crear primera plantilla
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {plantillas.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{template.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">
                          {template.phases?.length || 0} fases · {template.tasks?.length || 0} tareas
                        </span>
                        {template.type && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {template.type}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteTemplate(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuración por Defecto */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Plantilla por Defecto</CardTitle>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona una plantilla que se aplicará automáticamente a nuevos proyectos
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Plantilla por Defecto</Label>
              <Select value={plantillaId || "none"} onValueChange={(v) => setPlantillaId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ninguna - crear proyectos en blanco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna - crear proyectos en blanco</SelectItem>
                  {plantillas.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.phases?.length || 0} fases, {t.tasks?.length || 0} tareas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Los proyectos se crearán {plantillaId ? "con fases y tareas predefinidas" : "sin fases ni tareas predefinidas"}
              </p>
            </div>

            <Button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700 w-full"
              disabled={saveConfigMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {saveConfigMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Template Dialog */}
      <ProjectTemplateDialog
        isOpen={templateDialogOpen}
        onClose={() => {
          setTemplateDialogOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSave={handleSaveTemplate}
        isSaving={createTemplateMutation.isPending || updateTemplateMutation.isPending}
      />

      {/* Tipo Dialog */}
      <Dialog open={tipoDialogOpen} onOpenChange={setTipoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTipo ? 'Editar Tipo de Proyecto' : 'Nuevo Tipo de Proyecto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTipo} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formTipo.nombre}
                onChange={(e) => setFormTipo({ ...formTipo, nombre: e.target.value })}
                placeholder="Ej: Diseño Gráfico"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (slug) *</Label>
              <Input
                value={formTipo.valor}
                onChange={(e) => setFormTipo({ ...formTipo, valor: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="Ej: diseno_grafico"
                required
              />
              <p className="text-xs text-slate-500">Se usará internamente (minúsculas y guiones bajos)</p>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formTipo.descripcion}
                onChange={(e) => setFormTipo({ ...formTipo, descripcion: e.target.value })}
                placeholder="Descripción opcional..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formTipo.color}
                    onChange={(e) => setFormTipo({ ...formTipo, color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={formTipo.color}
                    onChange={(e) => setFormTipo({ ...formTipo, color: e.target.value })}
                    placeholder="#8b5cf6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={formTipo.orden}
                  onChange={(e) => setFormTipo({ ...formTipo, orden: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTipoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                {editingTipo ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Template Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La plantilla "{templateToDelete?.name}" será eliminada permanentemente.
              {configuracion[0]?.plantilla_por_defecto_id === templateToDelete?.id && (
                <p className="mt-2 text-amber-600 font-medium">
                  ⚠️ Esta es la plantilla por defecto actual. Deberás configurar otra después de eliminarla.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Tipo Dialog */}
      <AlertDialog open={deleteTipoDialogOpen} onOpenChange={setDeleteTipoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El tipo "{tipoToDelete?.nombre}" será eliminado permanentemente.
              <p className="mt-2 text-amber-600 font-medium">
                ⚠️ Las plantillas que usen este tipo deberán ser actualizadas.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTipo}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}