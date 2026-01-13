import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Truck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function WorkOrderDeliveryInfo({ workOrder, onMarkDelivered, isAdmin, isLoading }) {
  const estimatedDate = workOrder.estimated_delivery_date
    ? new Date(workOrder.estimated_delivery_date)
    : null;
  
  const realDate = workOrder.real_delivery_date
    ? new Date(workOrder.real_delivery_date)
    : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const isOverdue = estimatedDate && 
    estimatedDate < today && 
    workOrder.work_order_status !== 'DELIVERED' &&
    workOrder.work_order_status !== 'CANCELLED';

  const daysUntilDelivery = estimatedDate
    ? Math.ceil((estimatedDate - today) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Información de entrega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estimated Delivery */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Fecha estimada de entrega</p>
              {estimatedDate ? (
                <p className="text-sm text-muted-foreground">
                  {format(estimatedDate, 'd \'de\' MMMM \'de\' yyyy', { locale: es })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No especificada</p>
              )}
            </div>
          </div>
          {daysUntilDelivery !== null && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              isOverdue 
                ? 'bg-red-100 text-red-800'
                : daysUntilDelivery <= 2
                ? 'bg-orange-100 text-orange-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {isOverdue 
                ? `${Math.abs(daysUntilDelivery)} días vencida`
                : `${daysUntilDelivery} días`}
            </span>
          )}
        </div>

        {/* Overdue Alert */}
        {isOverdue && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Esta orden está vencida</p>
              <p className="text-xs text-red-800">Se requiere acción inmediata</p>
            </div>
          </div>
        )}

        {/* Real Delivery */}
        {realDate && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <Truck className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Entregado</p>
              <p className="text-xs text-green-800">
                {format(realDate, 'd \'de\' MMMM \'de\' yyyy \'a las\' HH:mm', { locale: es })}
              </p>
            </div>
          </div>
        )}

        {/* Mark as Delivered Button */}
        {isAdmin && 
          workOrder.work_order_status !== 'DELIVERED' && 
          workOrder.work_order_status !== 'CANCELLED' && 
          !realDate && (
          <Button
            onClick={onMarkDelivered}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Guardando...' : 'Marcar como entregado'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}