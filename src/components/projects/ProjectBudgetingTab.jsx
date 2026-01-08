import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DollarSign, Plus, CheckCircle, XCircle, Edit, FileText, AlertTriangle,
  TrendingUp, Users, Package, Clock, Send
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProjectBudgetingTab({ projectId, projectStatus }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | 'request_changes'
  const [approvalComment, setApprovalComment] = useState("");
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("versions");

  const [formData, setFormData] = useState({
    version_name: "",
    costos_fijos: "",
    costos_variables: "",
    recursos_humanos: {
      horas_estimadas: "",
      costo_hora: "",
      total: 0
    },
    margen_esperado: "",
    observaciones: "",
    moneda: "ARS"
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: budgets = [] } = useQuery({
    queryKey: ['projectBudgets', projectId],
    queryFn: () => base44.entities.ProjectBudget.filter({ project_id: projectId })
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then(r => r[0])
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['projectPhases', projectId],
    queryFn: () => base44.entities.ProjectPhase.filter({ project_id: projectId })
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId })
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (data) => {
      const budget = await base44.entities.ProjectBudget.create({
        ...data,
        project_id: projectId,
        project_name: project?.name || "",
        created_by: user?.email,
        created_by_name: user?.full_name,
        version_number: budgets.length + 1,
        status: "borrador",
        is_current_version: budgets.length === 0
      });
      return budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBudgets', projectId] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectBudget.update(id, {
      ...data,
      modified_by: user?.email,
      modified_by_name: user?.full_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBudgets', projectId] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: async (budgetId) => {
      await base44.entities.ProjectBudget.update(budgetId, {
        status: "pendiente_aprobacion",
        submitted_for_approval_date: new Date().toISOString(),
        submitted_by: user?.email,
        submitted_by_name: user?.full_name
      });
      await base44.entities.Project.update(projectId, {
        status: "pendiente_aprobacion"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBudgets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const approveBudgetMutation = useMutation({
    mutationFn: async ({ budgetId, comment }) => {
      const budget = budgets.find(b => b.id === budgetId);
      
      await base44.entities.ProjectBudget.update(budgetId, {
        status: "aprobado",
        approved_by: user?.email,
        approved_by_name: user?.full_name,
        approval_date: new Date().toISOString(),
        approval_comments: comment,
        is_current_version: true
      });

      // Marcar otras versiones como no actuales
      for (const b of budgets.filter(b => b.id !== budgetId)) {
        await base44.entities.ProjectBudget.update(b.id, { is_current_version: false });
      }

      await base44.entities.Project.update(projectId, {
        status: "aprobado",
        approved_budget_id: budgetId,
        approved_budget_total: budget?.total_presupuestado || 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBudgets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsApprovalDialogOpen(false);
      setApprovalComment("");
    }
  });

  const rejectBudgetMutation = useMutation({
    mutationFn: async ({ budgetId, reason }) => {
      await base44.entities.ProjectBudget.update(budgetId, {
        status: "rechazado",
        rejected_by: user?.email,
        rejected_by_name: user?.full_name,
        rejection_date: new Date().toISOString(),
        rejection_reason: reason
      });

      await base44.entities.Project.update(projectId, {
        status: "rechazado"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBudgets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsApprovalDialogOpen(false);
      setApprovalComment("");
    }
  });

  const resetForm = () => {
    setFormData({
      version_name: "",
      costos_fijos: "",
      costos_variables: "",
      recursos_humanos: {
        horas_estimadas: "",
        costo_hora: "",
        total: 0
      },
      margen_esperado: "",
      observaciones: "",
      moneda: "ARS"
    });
    setEditingBudget(null);
  };

  const handleOpenDialog = (budget = null) => {
    if (budget) {
      setFormData({
        version_name: budget.version_name,
        costos_fijos: budget.costos_fijos || "",
        costos_variables: budget.costos_variables || "",
        recursos_humanos: budget.recursos_humanos || { horas_estimadas: "", costo_hora: "", total: 0 },
        margen_esperado: budget.margen_esperado || "",
        observaciones: budget.observaciones || "",
        moneda: budget.moneda || "ARS"
      });
      setEditingBudget(budget);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const costosFijos = parseFloat(formData.costos_fijos) || 0;
    const costosVariables = parseFloat(formData.costos_variables) || 0;
    const horasEstimadas = parseFloat(formData.recursos_humanos.horas_estimadas) || 0;
    const costoHora = parseFloat(formData.recursos_humanos.costo_hora) || 0;
    const totalRecursosHumanos = horasEstimadas * costoHora;
    const totalCostos = costosFijos + costosVariables + totalRecursosHumanos;
    const margen = parseFloat(formData.margen_esperado) || 0;
    const totalPresupuestado = totalCostos * (1 + margen / 100);

    const dataToSave = {
      ...formData,
      costos_fijos: costosFijos,
      costos_variables: costosVariables,
      recursos_humanos: {
        horas_estimadas: horasEstimadas,
        costo_hora: costoHora,
        total: totalRecursosHumanos
      },
      margen_esperado: margen,
      total_costos: totalCostos,
      total_presupuestado: totalPresupuestado
    };

    if (editingBudget) {
      updateBudgetMutation.mutate({ id: editingBudget.id, data: dataToSave });
    } else {
      createBudgetMutation.mutate(dataToSave);
    }
  };

  const handleApprovalAction = (budget, action) => {
    setSelectedBudget(budget);
    setActionType(action);
    setIsApprovalDialogOpen(true);
  };

  const handleConfirmApproval = () => {
    if (actionType === 'approve') {
      approveBudgetMutation.mutate({ 
        budgetId: selectedBudget.id, 
        comment: approvalComment 
      });
    } else if (actionType === 'reject') {
      if (!approvalComment.trim()) {
        alert("El motivo del rechazo es obligatorio");
        return;
      }
      rejectBudgetMutation.mutate({ 
        budgetId: selectedBudget.id, 
        reason: approvalComment 
      });
    }
  };

  const statusColors = {
    borrador: "bg-slate-100 text-slate-700",
    propuesta_final: "bg-blue-100 text-blue-700",
    pendiente_aprobacion: "bg-amber-100 text-amber-700",
    aprobado: "bg-green-100 text-green-700",
    rechazado: "bg-red-100 text-red-700"
  };

  const approvedBudget = budgets.find(b => b.status === "aprobado" && b.is_current_version);
  const canEditBudgets = ['en_presupuestacion', 'rechazado'].includes(projectStatus);

  return (
    <div className="space-y-6">
      {/* Header con estado del proyecto */}
      <Card className="border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-6 w-6 text-slate-600" />
                <h2 className="text-xl font-bold text-slate-800">Presupuestación del Proyecto</h2>
              </div>
              <p className="text-sm text-slate-600">
                Control formal de costos, márgenes y aprobación ejecutiva
              </p>
            </div>
            {canEditBudgets && (
              <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Versión
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Presupuesto Aprobado */}
      {approvedBudget && (
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-800">Presupuesto Aprobado</CardTitle>
              </div>
              <Badge className="bg-green-100 text-green-700">
                {approvedBudget.version_name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Total Costos</p>
                <p className="text-lg font-bold text-slate-800">
                  ${approvedBudget.total_costos?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Margen</p>
                <p className="text-lg font-bold text-green-600">
                  {approvedBudget.margen_esperado}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Total Presupuestado</p>
                <p className="text-xl font-bold text-green-600">
                  ${approvedBudget.total_presupuestado?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Aprobado por</p>
                <p className="text-sm font-medium text-slate-700">
                  {approvedBudget.approved_by_name}
                </p>
                <p className="text-xs text-slate-500">
                  {format(new Date(approvedBudget.approval_date), 'd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Versiones / Control */}
      <div className="flex gap-2 border-b mb-4">
        <button
          onClick={() => setActiveTab("versions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "versions"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-800"
          }`}
        >
          Versiones de Presupuesto
        </button>
        {approvedBudget && (
          <button
            onClick={() => setActiveTab("control")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "control"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
          >
            Control de Desviaciones
          </button>
        )}
      </div>

      {/* Lista de Versiones */}
      {activeTab === "versions" && (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 uppercase">Historial de Versiones</h3>
        {budgets.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-200">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-2">No hay versiones de presupuesto</p>
              <p className="text-sm text-slate-400 mb-4">
                Crea la primera versión para comenzar el proceso de aprobación
              </p>
              <Button onClick={() => handleOpenDialog()} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Versión
              </Button>
            </CardContent>
          </Card>
        ) : (
          budgets.sort((a, b) => b.version_number - a.version_number).map((budget) => (
            <Card key={budget.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-800">{budget.version_name}</h4>
                      <Badge className={statusColors[budget.status]}>
                        {budget.status.replace('_', ' ')}
                      </Badge>
                      {budget.is_current_version && (
                        <Badge variant="outline" className="text-xs">Actual</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-slate-500">Total Costos</p>
                        <p className="text-sm font-bold text-slate-700">
                          ${budget.total_costos?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Margen</p>
                        <p className="text-sm font-bold text-blue-600">
                          {budget.margen_esperado}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total Presupuestado</p>
                        <p className="text-sm font-bold text-green-600">
                          ${budget.total_presupuestado?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Creado por</p>
                        <p className="text-sm font-medium text-slate-700">
                          {budget.created_by_name}
                        </p>
                      </div>
                    </div>

                    {budget.status === "rechazado" && budget.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-red-800">Rechazado</p>
                            <p className="text-sm text-red-700">{budget.rejection_reason}</p>
                            <p className="text-xs text-red-600 mt-1">
                              Por {budget.rejected_by_name} el {format(new Date(budget.rejection_date), 'd MMM yyyy', { locale: es })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {budget.observaciones && (
                      <p className="text-sm text-slate-600 mt-2">{budget.observaciones}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {budget.status === "borrador" && canEditBudgets && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(budget)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => submitForApprovalMutation.mutate(budget.id)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Enviar
                        </Button>
                      </>
                    )}
                    
                    {budget.status === "pendiente_aprobacion" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprovalAction(budget, 'approve')}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprovalAction(budget, 'reject')}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      )}

      {/* Control de Desviaciones */}
      {activeTab === "control" && approvedBudget && (
        <BudgetDeviationControl 
          budget={approvedBudget}
          phases={phases}
          tasks={tasks}
        />
      )}

      {/* Dialog Crear/Editar Presupuesto */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? 'Editar Versión' : 'Nueva Versión de Presupuesto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la Versión *</Label>
              <Input
                value={formData.version_name}
                onChange={(e) => setFormData({ ...formData, version_name: e.target.value })}
                placeholder="ej: v1.0, Propuesta Final, Revisión Cliente"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Costos Fijos</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.costos_fijos}
                  onChange={(e) => setFormData({ ...formData, costos_fijos: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Costos Variables</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.costos_variables}
                  onChange={(e) => setFormData({ ...formData, costos_variables: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
              <Label className="text-sm font-semibold">Recursos Humanos</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Horas Estimadas</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.recursos_humanos.horas_estimadas}
                    onChange={(e) => setFormData({
                      ...formData,
                      recursos_humanos: { ...formData.recursos_humanos, horas_estimadas: e.target.value }
                    })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Costo por Hora</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.recursos_humanos.costo_hora}
                    onChange={(e) => setFormData({
                      ...formData,
                      recursos_humanos: { ...formData.recursos_humanos, costo_hora: e.target.value }
                    })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-500">Total RRHH</p>
                <p className="text-lg font-bold text-blue-600">
                  ${((parseFloat(formData.recursos_humanos.horas_estimadas) || 0) * (parseFloat(formData.recursos_humanos.costo_hora) || 0)).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Margen Esperado (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.margen_esperado}
                  onChange={(e) => setFormData({ ...formData, margen_esperado: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={formData.moneda} onValueChange={(v) => setFormData({ ...formData, moneda: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                    <SelectItem value="USD">USD (Dólares)</SelectItem>
                    <SelectItem value="EUR">EUR (Euros)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas adicionales sobre el presupuesto..."
                rows={3}
              />
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Total Costos</p>
                  <p className="text-xl font-bold text-slate-800">
                    ${(
                      (parseFloat(formData.costos_fijos) || 0) +
                      (parseFloat(formData.costos_variables) || 0) +
                      ((parseFloat(formData.recursos_humanos.horas_estimadas) || 0) * (parseFloat(formData.recursos_humanos.costo_hora) || 0))
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Total Presupuestado</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(
                      ((parseFloat(formData.costos_fijos) || 0) +
                      (parseFloat(formData.costos_variables) || 0) +
                      ((parseFloat(formData.recursos_humanos.horas_estimadas) || 0) * (parseFloat(formData.recursos_humanos.costo_hora) || 0))) *
                      (1 + (parseFloat(formData.margen_esperado) || 0) / 100)
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingBudget ? 'Guardar Cambios' : 'Crear Versión'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Aprobación/Rechazo */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Aprobar Presupuesto' : 'Rechazar Presupuesto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {actionType === 'approve' 
                ? 'Esta acción marcará el presupuesto como aprobado y habilitará el proyecto para ejecución.'
                : 'Indica el motivo del rechazo para que el equipo pueda hacer ajustes.'}
            </p>

            <div className="space-y-2">
              <Label>{actionType === 'approve' ? 'Comentarios (opcional)' : 'Motivo del Rechazo *'}</Label>
              <Textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={actionType === 'approve' ? 'Comentarios adicionales...' : 'Explica por qué se rechaza...'}
                rows={4}
                required={actionType === 'reject'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsApprovalDialogOpen(false); setApprovalComment(""); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmApproval}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {actionType === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}