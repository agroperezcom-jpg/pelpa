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
     start_time: "",
     end_time: "",
     duration: "",
     status: "pendiente",
     priority: "media",
     assigned_to: currentUser?.email || "",
     assigned_to_name: currentUser?.full_name || "",
     tags: [],
     recurrence: "none",
     recurrence_days: []
   });

  const [newTag, setNewTag] = useState("");
  const [showRecurrenceDays, setShowRecurrenceDays] = useState(false);

  const daysOfWeek = [
    { label: "Lunes", value: 1 },
    { label: "Martes", value: 2 },
    { label: "Miércoles", value: 3 },
    { label: "Jueves", value: 4 },
    { label: "Viernes", value: 5 },
    { label: "Sábado", value: 6 },
    { label: "Domingo", value: 0 }
  ];

  useEffect(() => {
    if (initialData && initialData.id) {
      // Editando tarea existente - preservar fecha sin conversión
      setFormData({
        ...initialData,
        tags: initialData.tags || []
      });
    } else {
      // Nueva tarea
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const localDate = `${year}-${month}-${day}`;
      const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      setFormData({
         name: "",
         description: "",
         date: initialData?.date || localDate,
         start_time: defaultTime,
         end_time: initialData?.end_time || "",
         duration: "60",
         status: "pendiente",
         priority: "media",
         assigned_to: currentUser?.email || "",
         assigned_to_name: currentUser?.full_name || "",
         tags: [],
         recurrence: "none",
         recurrence_days: []
       });
    }
  }, [initialData, isOpen, currentUser]);

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!canEdit) return;
    if (!formData.name?.trim() || !formData.date || !formData.start_time) {
      alert("Complete el nombre, fecha y hora de inicio");
      return;
    }
    
    const taskToSave = {
       name: formData.name.trim(),
       description: formData.description?.trim() || "",
       date: formData.date,
       start_time: formData.start_time,
       end_time: formData.end_time || "",
       duration: parseInt(formData.duration) || 60,
       status: formData.status,
       priority: formData.priority,
       assigned_to: formData.assigned_to,
       assigned_to_name: formData.assigned_to_name,
       tags: formData.tags || [],
       recurrence: formData.recurrence,
       recurrence_days: formData.recurrence_days || []
     };
    
    onSave(taskToSave);
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

          {/* Fecha, Hora Inicio y Hora Fin */}
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
              <Label>Hora Inicio *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="pl-10"
                  disabled={!canEdit}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hora Fin</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="pl-10"
                  disabled={!canEdit}
                />
              </div>
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
            <Select value={formData.recurrence} onValueChange={(v) => {
              setFormData({ ...formData, recurrence: v });
              if (v === "weekly") setShowRecurrenceDays(true);
            }} disabled={!canEdit}>
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

          {/* Seleccionar días de repetición (para recurrencia semanal) */}
          {formData.recurrence === "weekly" && canEdit && (
            <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border border-border">
              <Label className="font-medium">Seleccionar días a repetir</Label>
              <div className="grid grid-cols-4 gap-2">
                {daysOfWeek.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      const newDays = formData.recurrence_days.includes(day.value)
                        ? formData.recurrence_days.filter(d => d !== day.value)
                        : [...formData.recurrence_days, day.value];
                      setFormData({ ...formData, recurrence_days: newDays });
                    }}
                    className={`p-2 rounded-md text-sm font-medium transition-colors ${
                      formData.recurrence_days.includes(day.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border hover:bg-secondary"
                    }`}
                  >
                    {day.label.substring(0, 3)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.recurrence_days.length === 0 
                  ? "Selecciona al menos un día" 
                  : `${formData.recurrence_days.length} día${formData.recurrence_days.length !== 1 ? 's' : ''} seleccionado${formData.recurrence_days.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          )}

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