import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const workOrderStatusMap = {
  DESIGN: { label: 'En diseño', color: 'bg-blue-100 text-blue-800' },
  PRINTING: { label: 'En impresión', color: 'bg-orange-100 text-orange-800' },
  FINISHING: { label: 'En terminación', color: 'bg-amber-100 text-amber-800' },
  READY: { label: 'Listo para retirar', color: 'bg-green-100 text-green-800' },
  DELIVERED: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
};

const priorityMap = {
  baja: { label: 'Baja', color: 'bg-slate-100 text-slate-700' },
  media: { label: 'Media', color: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  critica: { label: 'Crítica', color: 'bg-red-100 text-red-700' }
};

export default function WorkOrderCard({ workOrder, onView }) {
  const woStatus = workOrderStatusMap[workOrder.work_order_status] || {
    label: workOrder.work_order_status,
    color: 'bg-gray-100 text-gray-800'
  };
  const priority = priorityMap[workOrder.priority] || { label: workOrder.priority, color: 'bg-gray-100 text-gray-700' };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {workOrder.work_order_number}
              </p>
            </div>
            <CardTitle className="text-base truncate">
              {workOrder.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {workOrder.client_name}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={woStatus.color}>
            {woStatus.label}
          </Badge>
          <Badge className={priority.color}>
            {priority.label}
          </Badge>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {workOrder.start_date && (
            <div>
              <p className="text-muted-foreground">Inicio</p>
              <p className="font-medium">
                {format(new Date(workOrder.start_date), 'dd MMM', { locale: es })}
              </p>
            </div>
          )}
          {workOrder.estimated_end_date && (
            <div>
              <p className="text-muted-foreground">Entrega</p>
              <p className="font-medium">
                {format(new Date(workOrder.estimated_end_date), 'dd MMM', { locale: es })}
              </p>
            </div>
          )}
        </div>

        {/* Progress */}
        {workOrder.progress_percentage > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Avance</span>
              <span className="font-medium">{workOrder.progress_percentage}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${workOrder.progress_percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* View Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(workOrder)}
          className="w-full justify-between"
        >
          Ver detalles
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}