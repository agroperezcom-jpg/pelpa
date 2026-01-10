import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Copy, Edit, Trash2, FileText } from "lucide-react";
import ProjectTemplateDialog from "@/components/projects/ProjectTemplateDialog";

export default function ProjectTemplates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['projectTemplates'],
    queryFn: () => base44.entities.ProjectTemplate.list('-created_date')
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates'] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates'] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates'] });
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const copy = {
        ...template,
        name: `${template.name} (Copia)`,
        id: undefined,
        created_date: undefined,
        updated_date: undefined
      };
      return base44.entities.ProjectTemplate.create(copy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTemplates'] });
    }
  });

  const handleSaveTemplate = (data) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleDelete = (template) => {
    if (window.confirm(`¿Eliminar la plantilla "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-purple-600" />
            Plantillas de Proyectos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Crea plantillas reutilizables con fases y tareas predefinidas
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar plantillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 mb-1">{template.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{template.description}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize ml-2">
                  {template.type}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1 text-slate-600">
                  <span className="font-semibold">{template.phases?.length || 0}</span>
                  <span className="text-xs">fases</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <span className="font-semibold">{template.tasks?.length || 0}</span>
                  <span className="text-xs">tareas</span>
                </div>
                {template.estimated_duration_days && (
                  <div className="flex items-center gap-1 text-slate-600">
                    <span className="font-semibold">{template.estimated_duration_days}</span>
                    <span className="text-xs">días</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingTemplate(template);
                    setIsDialogOpen(true);
                  }}
                  className="flex-1"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicateTemplateMutation.mutate(template)}
                  className="flex-1"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Duplicar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(template)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTemplates.length === 0 && (
          <Card className="col-span-full border-0 shadow-sm">
            <CardContent className="p-12 text-center text-slate-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg">No hay plantillas</p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="mt-4">
                Crear primera plantilla
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ProjectTemplateDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}