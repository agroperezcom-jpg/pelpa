import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Briefcase } from 'lucide-react';
import WorkOrderCard from '../components/work-orders/WorkOrderCard';
import WorkOrderDetailView from '../components/work-orders/WorkOrderDetailView';

export default function WorkOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

  const { data: workOrders = [], refetch } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.Project.filter({ is_work_order: true })
  });

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch =
      wo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.work_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wo.client_name && wo.client_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || wo.work_order_status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Summary stats
  const stats = {
    total: workOrders.length,
    inProgress: workOrders.filter(wo => ['DESIGN', 'PRINTING', 'FINISHING'].includes(wo.work_order_status)).length,
    ready: workOrders.filter(wo => wo.work_order_status === 'READY').length,
    delivered: workOrders.filter(wo => wo.work_order_status === 'DELIVERED').length
  };

  if (selectedWorkOrder) {
    return (
      <WorkOrderDetailView
        workOrder={selectedWorkOrder}
        onBack={() => setSelectedWorkOrder(null)}
        onUpdate={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          Órdenes de Trabajo
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestiona las órdenes de trabajo gráficas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">En ejecución</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Listos</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.ready}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Entregados</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.delivered}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Buscar por número, nombre o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent p-0 focus-visible:ring-0"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="DESIGN">En diseño</SelectItem>
                <SelectItem value="PRINTING">En impresión</SelectItem>
                <SelectItem value="FINISHING">En terminación</SelectItem>
                <SelectItem value="READY">Listo para retirar</SelectItem>
                <SelectItem value="DELIVERED">Entregado</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Grid */}
      {filteredWorkOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkOrders.map(wo => (
            <WorkOrderCard
              key={wo.id}
              workOrder={wo}
              onView={() => setSelectedWorkOrder(wo)}
            />
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all'
                ? 'No se encontraron órdenes de trabajo'
                : 'No hay órdenes de trabajo creadas aún'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}