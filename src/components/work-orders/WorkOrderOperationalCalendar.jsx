import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const statusMap = {
  DESIGN: { label: 'En diseño', color: 'bg-blue-100 text-blue-800', bgLight: 'bg-blue-50' },
  PRINTING: { label: 'En impresión', color: 'bg-orange-100 text-orange-800', bgLight: 'bg-orange-50' },
  FINISHING: { label: 'En terminación', color: 'bg-amber-100 text-amber-800', bgLight: 'bg-amber-50' },
  READY: { label: 'Listo para retirar', color: 'bg-green-100 text-green-800', bgLight: 'bg-green-50' },
  DELIVERED: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-800', bgLight: 'bg-emerald-50' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800', bgLight: 'bg-red-50' }
};

export default function WorkOrderOperationalCalendar({ workOrders = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get days for current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Helper to get work orders for a specific date
  const getWorkOrdersForDate = (date) => {
    return workOrders.filter(wo => {
      if (!wo.estimated_delivery_date) return false;
      const deliveryDate = new Date(wo.estimated_delivery_date);
      return (
        deliveryDate.getDate() === date.getDate() &&
        deliveryDate.getMonth() === date.getMonth() &&
        deliveryDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Helper to check if work order is overdue
  const isOverdue = (workOrder) => {
    if (!workOrder.estimated_delivery_date || workOrder.work_order_status === 'DELIVERED' || workOrder.work_order_status === 'CANCELLED') {
      return false;
    }
    return isBefore(new Date(workOrder.estimated_delivery_date), new Date());
  };

  // Helper to check if date has overdue work orders
  const dateHasOverdue = (date) => {
    return getWorkOrdersForDate(date).some(wo => isOverdue(wo));
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Calendario Operacional</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-40 text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="ghost" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Calendar Grid */}
          <div className="border border-border/50 rounded-lg overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-secondary/50">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="p-3 text-center text-xs font-semibold text-muted-foreground border-b border-border/30">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {daysInMonth.map((date, index) => {
                const workOrdersForDay = getWorkOrdersForDate(date);
                const hasOverdue = dateHasOverdue(date);
                const isCurrentDay = isToday(date);
                const isCurrentMonth = isSameMonth(date, currentMonth);

                return (
                  <div
                    key={index}
                    className={`min-h-24 p-2 border-b border-r border-border/30 last:border-r-0 ${
                      !isCurrentMonth ? 'bg-muted/30' : isCurrentDay ? 'bg-blue-50' : ''
                    } ${hasOverdue ? 'bg-red-50 border-l-2 border-red-400' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-medium ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {format(date, 'd')}
                      </span>
                      {hasOverdue && (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                    </div>

                    <div className="space-y-1">
                      {workOrdersForDay.slice(0, 2).map(wo => {
                        const statusInfo = statusMap[wo.work_order_status] || { label: '', color: '' };
                        const isWoOverdue = isOverdue(wo);
                        return (
                          <div
                            key={wo.id}
                            className={`text-[10px] p-1 rounded ${
                              isWoOverdue
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : statusInfo.bgLight + ' text-xs'
                            } truncate`}
                            title={wo.work_order_number}
                          >
                            {wo.work_order_number}
                          </div>
                        );
                      })}
                      {workOrdersForDay.length > 2 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{workOrdersForDay.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" />
              <span className="text-muted-foreground">En diseño</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-50 border border-orange-200" />
              <span className="text-muted-foreground">En impresión</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
              <span className="text-muted-foreground">En terminación</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-100 border border-red-400" />
              <span className="text-muted-foreground">Vencida</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}