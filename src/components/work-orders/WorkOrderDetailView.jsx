import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, User, Wrench, Package, DollarSign, ChevronLeft, AlertCircle, Check } from 'lucide-react';
import { format, isBefore, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

const workOrderStatusMap = {
  DESIGN: { label: 'En diseño', color: 'bg-blue-100 text-blue-800' },
  PRINTING: { label: 'En impresión', color: 'bg-orange-100 text-orange-800' },
  FINISHING: { label: 'En terminación', color: 'bg-amber-100 text-amber-800' },
  READY: { label: 'Listo para retirar', color: 'bg-green-100 text-green-800' },
  DELIVERED: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
};

export default function WorkOrderDetailView({ workOrder, onBack, onUpdate }) {
  const [selectedStatus, setSelectedStatus] = useState(workOrder.work_order_status);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const queryClient = useQueryClient();

  // Fetch related data
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', workOrder.id],
    queryFn: () => base44.entities.Task.filter({ project_id: workOrder.id })
  });

  const { data: inventoryMovements = [] } = useQuery({
    queryKey: ['inventoryMovements', workOrder.id],
    queryFn: () => base44.entities.InventoryMovement.filter({ reference: `Orden de trabajo Nº ${workOrder.work_order_number}` })
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus) => {
      const updates = { work_order_status: newStatus };
      if (newStatus === 'DELIVERED' && !workOrder.real_delivery_date) {
        updates.real_delivery_date = new Date().toISOString().split('T')[0];
      }
      return base44.entities.Project.update(workOrder.id, updates);
    },
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    }
  });

  // Calculate delivery date status
  const isOverdue = workOrder.estimated_delivery_date && 
    !['DELIVERED', 'CANCELLED'].includes(workOrder.work_order_status) &&
    isBefore(new Date(workOrder.estimated_delivery_date), new Date());

  const handleStatusChange = (newStatus) => {
    setSelectedStatus(newStatus);
    updateStatusMutation.mutate(newStatus);
  };

  const statusInfo = workOrderStatusMap[selectedStatus] || { label: selectedStatus, color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{workOrder.work_order_number}</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{workOrder.name}</p>
          </div>
        </div>
      </div>

      {/* Status & Delivery Control */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Estado de la Orden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOverdue && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Orden Vencida</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Entrega estimada: {format(new Date(workOrder.estimated_delivery_date), 'dd MMMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DESIGN">En diseño</SelectItem>
                <SelectItem value="PRINTING">En impresión</SelectItem>
                <SelectItem value="FINISHING">En terminación</SelectItem>
                <SelectItem value="READY">Listo para retirar</SelectItem>
                <SelectItem value="DELIVERED">Entregado</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Dates */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Entrega Estimada</p>
              <p className="font-medium text-sm">
                {workOrder.estimated_delivery_date
                  ? format(new Date(workOrder.estimated_delivery_date), 'dd MMM yyyy', { locale: es })
                  : 'No definida'}
              </p>
            </div>
            {workOrder.real_delivery_date && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-600" />
                  Entrega Real
                </p>
                <p className="font-medium text-sm">
                  {format(new Date(workOrder.real_delivery_date), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="materials">Materiales</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{workOrder.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium capitalize">{workOrder.type}</p>
                </div>
                {workOrder.start_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de inicio</p>
                    <p className="font-medium">
                      {format(new Date(workOrder.start_date), 'dd MMMM yyyy', { locale: es })}
                    </p>
                  </div>
                )}
                {workOrder.estimated_end_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha estimada</p>
                    <p className="font-medium">
                      {format(new Date(workOrder.estimated_end_date), 'dd MMMM yyyy', { locale: es })}
                    </p>
                  </div>
                )}
              </div>

              {workOrder.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Descripción</p>
                  <p className="text-sm bg-secondary p-3 rounded-lg">
                    {workOrder.description}
                  </p>
                </div>
              )}

              {workOrder.responsible_name && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Responsable</p>
                    <p className="font-medium text-sm">{workOrder.responsible_name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map(task => {
                const taskTypeMap = {
                  DESIGN: { label: 'Diseño', color: 'bg-blue-100 text-blue-800' },
                  PRINTING: { label: 'Impresión', color: 'bg-orange-100 text-orange-800' },
                  FINISHING: { label: 'Terminación', color: 'bg-amber-100 text-amber-800' },
                  DELIVERY: { label: 'Entrega', color: 'bg-green-100 text-green-800' },
                  OTHER: { label: 'Otra', color: 'bg-gray-100 text-gray-800' }
                };
                const taskType = taskTypeMap[task.task_type] || taskTypeMap.OTHER;

                return (
                  <Card key={task.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{task.name}</h3>
                            <Badge className={taskType.color + ' text-xs'}>
                              {taskType.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline" className="text-xs">
                              {task.status === 'pendiente' && 'Pendiente'}
                              {task.status === 'en_progreso' && 'En progreso'}
                              {task.status === 'completado' && 'Completada'}
                            </Badge>
                          </div>
                        </div>
                        {task.due_date && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Vencimiento</p>
                            <p className="text-sm font-medium">
                              {format(new Date(task.due_date), 'dd MMM', { locale: es })}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center text-muted-foreground">
                No hay tareas asignadas
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-4">
          {inventoryMovements.length > 0 ? (
            <div className="space-y-3">
              {inventoryMovements.map(movement => (
                <Card key={movement.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Package className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">{movement.product_name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {movement.reason}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${movement.type === 'salida' ? 'text-red-600' : 'text-green-600'}`}>
                          {movement.type === 'salida' ? '-' : '+'}{movement.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Stock: {movement.new_stock}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center text-muted-foreground">
                No hay materiales registrados
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Información de Facturación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workOrder.sale_id ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Venta asociada: <strong>{workOrder.sale_id}</strong>
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    Sin venta asociada
                  </p>
                </div>
              )}

              {workOrder.estimated_budget > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Presupuesto estimado</p>
                    <p className="font-semibold text-lg">
                      ${workOrder.estimated_budget.toLocaleString()}
                    </p>
                  </div>
                  {workOrder.actual_budget > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Presupuesto real</p>
                      <p className="font-semibold text-lg">
                        ${workOrder.actual_budget.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}