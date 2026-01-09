import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Tag, X } from "lucide-react";

export default function FreeTaskDialog({ isOpen, onClose, onSave, initialData, users, currentUser, canEdit = true }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    time: "",
    duration: "",
    status: "pendiente",
    priority: "media",
    assigned_to: currentUser?.email || "",
    assigned_to_name: currentUser?.full_name || "",
    tags: [],
    recurrence: "none"
  });

  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (initialData && initialData.id) {
      // Editando tarea existente
      setFormData({
        ...initialData,
        tags: initialData.tags || []
      });
    } else {
      // Nueva tarea (con o sin fecha pre-seleccionada)
      setFormData({
        name: "",
        description: "",
        date: initialData?.date || new Date().toISOString().split('T')[0],
        time: "",
        duration: "",
        status: "pendiente",
        priority: "media",
        assigned_to: currentUser?.email || "",
        assigned_to_name: currentUser?.full_name || "",
        tags: [],
        recurrence: "none"
      });
    }
  }, [initialData, isOpen, currentUser]);

  const handleSave = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log("=== FreeTaskDialog handleSave INICIO ===");
    console.log("canEdit:", canEdit);
    console.log("formData:", formData);
    
    if (!canEdit) {
      console.error("❌ Sin permisos para editar");
      alert("No tienes permisos para crear/editar tareas");
      return;
    }
    
    if (!formData.name || !formData.date) {
      console.error("❌ Faltan campos obligatorios");
      alert("Complete el nombre y la fecha");
      return;
    }
    
    console.log("✅ Validaciones OK - Llamando onSave");
    console.log("Datos que se envían:", formData);
    
    onSave(formData);
    
    console.log("=== FreeTaskDialog handleSave FIN ===");
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag("");
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleUserChange = (email) => {
    const user = users.find(u => u.email === email);
    setFormData({
      ...formData,
      assigned_to: email,
      assigned_to_name: user?.full_name || ""
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-600" />
            {!canEdit && "(Solo lectura) "}
            {initialData?.id ? "Editar Tarea Libre" : "Nueva Tarea Libre"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Reunión con cliente, Revisión de inventario..."
              autoFocus
              disabled={!canEdit}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles adicionales sobre la tarea..."
              rows={3}
              disabled={!canEdit}
            />
          </div>

          {/* Fecha, Hora y Duración */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="pl-10"
                  disabled={!canEdit}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duración (min)</Label>
              <Input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="60"
                min="0"
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Estado, Prioridad y Usuario */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_progreso">En progreso</SelectItem>
                  <SelectItem value="completada">Completada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })} disabled={!canEdit}>
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
              <Label>Asignado a</Label>
              <Select value={formData.assigned_to} onValueChange={handleUserChange} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Repetición */}
          <div className="space-y-2">
            <Label>Repetición</Label>
            <Select value={formData.recurrence} onValueChange={(v) => setFormData({ ...formData, recurrence: v })} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin repetición</SelectItem>
                <SelectItem value="daily">Diaria</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Etiquetas */}
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            {canEdit && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Agregar etiqueta..."
                    className="pl-10"
                  />
                </div>
                <Button type="button" onClick={(e) => { e.preventDefault(); addTag(); }} variant="outline">
                  Agregar
                </Button>
              </div>
            )}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    {canEdit && (
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-600"
                        onClick={() => removeTag(tag)}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {canEdit ? "Cancelar" : "Cerrar"}
          </Button>
          {canEdit && (
            <Button type="button" onClick={handleSave} className="bg-primary hover:bg-[hsl(var(--primary-hover))]">
              {initialData?.id ? "Guardar cambios" : "Crear tarea"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}