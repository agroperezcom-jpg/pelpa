import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Printer, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  FileText,
  Receipt,
  ClipboardList
} from "lucide-react";

export default function ConfiguracionImpresoras() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingImpresora, setEditingImpresora] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    tipo: "termica",
    marca: "Hasar",
    modelo: "",
    ancho_papel: "80mm",
    conexion: "USB",
    nombre_sistema: "",
    activa: true,
    es_predeterminada: false,
    observaciones: ""
  });

  const queryClient = useQueryClient();

  const { data: impresoras = [] } = useQuery({
    queryKey: ['impresoraConfig'],
    queryFn: () => base44.entities.ImpresoraConfig.list()
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignacionImpresion'],
    queryFn: () => base44.entities.AsignacionImpresion.list()
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingImpresora) {
        return base44.entities.ImpresoraConfig.update(editingImpresora.id, data);
      } else {
        return base44.entities.ImpresoraConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impresoraConfig'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ImpresoraConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impresoraConfig'] });
      queryClient.invalidateQueries({ queryKey: ['asignacionImpresion'] });
    }
  });

  const saveAsignacionMutation = useMutation({
    mutationFn: async ({ tipo_documento, impresora_id }) => {
      const existing = asignaciones.find(a => a.tipo_documento === tipo_documento);
      const impresora = impresoras.find(i => i.id === impresora_id);
      
      const data = {
        tipo_documento,
        impresora_id,
        impresora_nombre: impresora?.nombre,
        impresora_tipo: impresora?.tipo,
        copias: 1,
        auto_imprimir: false
      };

      if (existing) {
        return base44.entities.AsignacionImpresion.update(existing.id, data);
      } else {
        return base44.entities.AsignacionImpresion.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignacionImpresion'] });
    }
  });

  const resetForm = () => {
    setFormData({
      nombre: "",
      tipo: "termica",
      marca: "Hasar",
      modelo: "",
      ancho_papel: "80mm",
      conexion: "USB",
      nombre_sistema: "",
      activa: true,
      es_predeterminada: false,
      observaciones: ""
    });
    setEditingImpresora(null);
  };

  const handleEdit = (impresora) => {
    setEditingImpresora(impresora);
    setFormData(impresora);
    setShowDialog(true);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (confirm('¿Eliminar esta impresora?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAsignacion = (tipo_documento, impresora_id) => {
    if (!impresora_id) return;
    saveAsignacionMutation.mutate({ tipo_documento, impresora_id });
  };

  const getAsignacionImpresora = (tipo_documento) => {
    const asignacion = asignaciones.find(a => a.tipo_documento === tipo_documento);
    return asignacion?.impresora_id || "";
  };

  const tiposDocumento = [
    { value: "ticket", label: "Ticket POS", icon: Receipt },
    { value: "factura", label: "Factura", icon: FileText },
    { value: "presupuesto", label: "Presupuesto", icon: ClipboardList },
    { value: "remito", label: "Remito", icon: FileText },
    { value: "recibo", label: "Recibo", icon: Receipt },
    { value: "nota_credito", label: "Nota de Crédito", icon: FileText },
    { value: "orden_trabajo", label: "Orden de Trabajo", icon: ClipboardList }
  ];

  const impresorasActivas = impresoras.filter(i => i.activa);

  return (
    <div className="space-y-6">
      {/* Gestión de Impresoras */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-600" />
                Gestión de Impresoras
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Configurá las impresoras disponibles en el sistema
              </p>
            </div>
            <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Impresora
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {impresoras.length === 0 ? (
            <Alert className="bg-slate-50">
              <AlertCircle className="h-5 w-5 text-slate-500" />
              <AlertDescription className="text-sm">
                No hay impresoras configuradas. Agregá una para comenzar.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {impresoras.map(impresora => (
                <div key={impresora.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${impresora.activa ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <Printer className={`h-5 w-5 ${impresora.activa ? 'text-green-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{impresora.nombre}</p>
                        {impresora.es_predeterminada && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Predeterminada</span>
                        )}
                        {!impresora.activa && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Inactiva</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {impresora.marca} {impresora.modelo && `- ${impresora.modelo}`} | 
                        {impresora.tipo} | {impresora.ancho_papel} | {impresora.conexion}
                      </p>
                      {impresora.nombre_sistema && (
                        <p className="text-xs text-slate-500 mt-1">Sistema: {impresora.nombre_sistema}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(impresora)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(impresora.id)} className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asignación de Impresoras */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Asignación de Impresión
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Definí qué impresora usar para cada tipo de documento
          </p>
        </CardHeader>
        <CardContent>
          {impresorasActivas.length === 0 ? (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-sm">
                Necesitás configurar al menos una impresora activa para asignar documentos.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {tiposDocumento.map(tipo => {
                const Icon = tipo.icon;
                return (
                  <div key={tipo.value} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-slate-400" />
                      <p className="font-medium">{tipo.label}</p>
                    </div>
                    <Select 
                      value={getAsignacionImpresora(tipo.value)} 
                      onValueChange={(v) => handleAsignacion(tipo.value, v)}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sin asignar</SelectItem>
                        {impresorasActivas.map(imp => (
                          <SelectItem key={imp.id} value={imp.id}>
                            {imp.nombre} ({imp.tipo} - {imp.ancho_papel})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Crear/Editar Impresora */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingImpresora ? 'Editar Impresora' : 'Nueva Impresora'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Hasar Mostrador"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="termica">Térmica</SelectItem>
                  <SelectItem value="laser">Láser</SelectItem>
                  <SelectItem value="matricial">Matricial</SelectItem>
                  <SelectItem value="inyeccion">Inyección</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Marca *</Label>
              <Select value={formData.marca} onValueChange={(v) => setFormData({ ...formData, marca: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hasar">Hasar</SelectItem>
                  <SelectItem value="Epson">Epson</SelectItem>
                  <SelectItem value="Star">Star</SelectItem>
                  <SelectItem value="Bixolon">Bixolon</SelectItem>
                  <SelectItem value="HP">HP</SelectItem>
                  <SelectItem value="Canon">Canon</SelectItem>
                  <SelectItem value="Brother">Brother</SelectItem>
                  <SelectItem value="Otra">Otra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                placeholder="Ej: P-715F"
              />
            </div>

            <div className="space-y-2">
              <Label>Ancho de Papel</Label>
              <Select value={formData.ancho_papel} onValueChange={(v) => setFormData({ ...formData, ancho_papel: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm</SelectItem>
                  <SelectItem value="72mm">72mm</SelectItem>
                  <SelectItem value="80mm">80mm</SelectItem>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="Carta">Carta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conexión</Label>
              <Select value={formData.conexion} onValueChange={(v) => setFormData({ ...formData, conexion: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USB">USB</SelectItem>
                  <SelectItem value="Serial">Serial</SelectItem>
                  <SelectItem value="Red">Red</SelectItem>
                  <SelectItem value="Bluetooth">Bluetooth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Nombre en Sistema (QZ Tray)</Label>
              <Input
                value={formData.nombre_sistema}
                onChange={(e) => setFormData({ ...formData, nombre_sistema: e.target.value })}
                placeholder="Ej: Hasar P-715F"
              />
              <p className="text-xs text-slate-500">
                Nombre exacto como aparece en QZ Tray o el sistema operativo
              </p>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Observaciones</Label>
              <Input
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.activa}
                onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <Label>Impresora activa</Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.es_predeterminada}
                onChange={(e) => setFormData({ ...formData, es_predeterminada: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <Label>Impresora predeterminada</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {editingImpresora ? 'Guardar Cambios' : 'Crear Impresora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}