import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export default function ProjectDialog({ isOpen, onClose, project, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "desarrollo",
    status: "en_presupuestacion",
    priority: "media",
    start_date: "",
    estimated_end_date: "",
    client_id: "",
    client_name: "",
    responsible_email: "",
    responsible_name: "",
    department: "",
    estimated_budget: "",
    tags: [],
    color: "#3b82f6",
    team_members: []
  });

  const [tagInput, setTagInput] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        type: project.type || "desarrollo",
        status: project.status || "propuesto",
        priority: project.priority || "media",
        start_date: project.start_date || "",
        estimated_end_date: project.estimated_end_date || "",
        client_id: project.client_id || "",
        client_name: project.client_name || "",
        responsible_email: project.responsible_email || "",
        responsible_name: project.responsible_name || "",
        department: project.department || "",
        estimated_budget: project.estimated_budget || "",
        tags: project.tags || [],
        color: project.color || "#3b82f6",
        team_members: project.team_members || []
      });
    } else {
      setFormData({
        name: "",
        description: "",
        type: "desarrollo",
        status: "en_presupuestacion",
        priority: "media",
        start_date: "",
        estimated_end_date: "",
        client_id: "",
        client_name: "",
        responsible_email: "",
        responsible_name: "",
        department: "",
        estimated_budget: "",
        tags: [],
        color: "#3b82f6",
        team_members: []
      });
    }
  }, [project, isOpen]);

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleAddTeamMember = (email) => {
    const user = users.find(u => u.email === email);
    if (!user || formData.team_members.some(m => m.email === email)) return;
    
    setFormData({
      ...formData,
      team_members: [...formData.team_members, { 
        email: user.email, 
        name: user.full_name, 
        role: "colaborador" 
      }]
    });
  };

  const handleRemoveTeamMember = (email) => {
    setFormData({
      ...formData,
      team_members: formData.team_members.filter(m => m.email !== email)
    });
  };

  const handleUpdateMemberRole = (email, role) => {
    setFormData({
      ...formData,
      team_members: formData.team_members.map(m => 
        m.email === email ? { ...m, role } : m
      )
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const cliente = clients.find(c => c.id === formData.client_id);
    const responsable = users.find(u => u.email === formData.responsible_email);

    const dataToSave = {
      ...formData,
      client_name: cliente?.name || "",
      responsible_name: responsable?.full_name || "",
      estimated_budget: parseFloat(formData.estimated_budget) || 0
    };

    onSave(dataToSave);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nombre del Proyecto *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del proyecto"
                required
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción detallada..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
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
              <Label>Estado *</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })} disabled={!project}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="en_presupuestacion">En Presupuestación</SelectItem>
                  <SelectItem value="pendiente_aprobacion">Pendiente de Aprobación</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                  <SelectItem value="en_ejecucion">En Ejecución</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              {!project && (
                <p className="text-xs text-slate-500">Nuevos proyectos inician en "En Presupuestación"</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Prioridad *</Label>
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
              <Label>Color</Label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-10"
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
              <Label>Fecha Fin Estimada</Label>
              <Input
                type="date"
                value={formData.estimated_end_date}
                onChange={(e) => setFormData({ ...formData, estimated_end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin cliente</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsable Principal</Label>
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
              <Label>Departamento</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Ej: Ventas, Diseño, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Presupuesto Estimado</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.estimated_budget}
                onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Agregar etiqueta..."
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  Agregar
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Equipo de Trabajo</Label>
              <Select onValueChange={handleAddTeamMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Agregar miembro..." />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => !formData.team_members.some(m => m.email === u.email)).map(u => (
                    <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {formData.team_members.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2 mt-2">
                  {formData.team_members.map(member => (
                    <div key={member.email} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded">
                      <span className="text-sm font-medium">{member.name}</span>
                      <div className="flex items-center gap-2">
                        <Select value={member.role} onValueChange={(v) => handleUpdateMemberRole(member.email, v)}>
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="director">Director</SelectItem>
                            <SelectItem value="responsable">Responsable</SelectItem>
                            <SelectItem value="colaborador">Colaborador</SelectItem>
                            <SelectItem value="observador">Observador</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveTeamMember(member.email)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {project ? 'Guardar Cambios' : 'Crear Proyecto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}