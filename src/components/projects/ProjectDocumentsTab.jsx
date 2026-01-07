import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Download, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProjectDocumentsTab({ projectId, phases, tasks }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    phase_id: "",
    task_id: "",
    file: null
  });

  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['projectDocuments', projectId],
    queryFn: () => base44.entities.ProjectDocument.filter({ project_id: projectId })
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });
      
      return base44.entities.ProjectDocument.create({
        project_id: projectId,
        name: data.name,
        description: data.description,
        phase_id: data.phase_id || null,
        task_id: data.task_id || null,
        file_url,
        file_type: data.file.type,
        uploaded_by_email: user.email,
        uploaded_by_name: user.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDocuments'] });
      handleCloseDialog();
    }
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDocuments'] });
    }
  });

  const handleOpenDialog = () => {
    setFormData({
      name: "",
      description: "",
      phase_id: "",
      task_id: "",
      file: null
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      alert("Seleccione un archivo");
      return;
    }
    
    setUploading(true);
    uploadDocumentMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Subir Documento
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => {
          const phase = phases.find(p => p.id === doc.phase_id);
          const task = tasks.find(t => t.id === doc.task_id);

          return (
            <Card key={doc.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 truncate">{doc.name}</h4>
                    {doc.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {phase && (
                        <Badge variant="outline" className="text-[10px]">
                          {phase.name}
                        </Badge>
                      )}
                      {task && (
                        <Badge variant="outline" className="text-[10px]">
                          {task.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {doc.uploaded_by_name} · {format(new Date(doc.created_date), 'd MMM', { locale: es })}
                    </p>
                    <div className="flex gap-1 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (confirm('¿Eliminar este documento?')) {
                            deleteDocumentMutation.mutate(doc.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {documents.length === 0 && (
          <Card className="border-0 shadow-sm col-span-full">
            <CardContent className="p-8 text-center text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No hay documentos subidos</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Documento *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Contrato firmado"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción breve..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fase (opcional)</Label>
                <Select value={formData.phase_id} onValueChange={(v) => setFormData({ ...formData, phase_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin fase</SelectItem>
                    {phases.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tarea (opcional)</Label>
                <Select value={formData.task_id} onValueChange={(v) => setFormData({ ...formData, task_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin tarea" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin tarea</SelectItem>
                    {tasks.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Archivo *</Label>
              <Input
                type="file"
                onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={uploading}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Subiendo...' : 'Subir'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}