import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Calendar } from 'lucide-react';

export default function WorkOrderOperationalCalendarView({ workOrders }) {
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group work orders by date
  const eventsByDate = useMemo(() => {
    const map = {};
    
    workOrders.forEach(wo => {
      if (wo.estimated_delivery_date) {
        const dateKey = wo.estimated_delivery_date;
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(wo);
      }
    });

    return map;
  }, [workOrders]);

  const isDateOverdue = (dateStr) => {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getEventsForDay = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Calendario de entregas - {format(currentMonth, 'MMMM \'de\' yyyy', { locale: es })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Calendar Grid */}
          <div className="border rounded-lg overflow-hidden">
            {/* Days header */}
            <div className="grid grid-cols-7 bg-secondary">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-semibold text-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {daysInMonth.map(day => {
                const events = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const hasOverdueEvents = events.some(
                  wo => isDateOverdue(wo.estimated_delivery_date) && wo.work_order_status !== 'DELIVERED'
                );

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-24 p-2 border-r border-b text-xs ${
                      isToday ? 'bg-blue-50' : 'bg-background'
                    } ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    <div className={`font-semibold mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {events.map(wo => (
                        <div
                          key={wo.id}
                          className={`p-1 rounded truncate text-white cursor-pointer ${
                            hasOverdueEvents ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          title={`${wo.work_order_number} - ${wo.name}`}
                        >
                          {wo.work_order_number}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overdue Summary */}
          {workOrders.some(wo => 
            isDateOverdue(wo.estimated_delivery_date) && wo.work_order_status !== 'DELIVERED'
          ) && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Órdenes vencidas</p>
                <p className="text-sm text-red-800 mt-1">
                  {workOrders.filter(wo => 
                    isDateOverdue(wo.estimated_delivery_date) && wo.work_order_status !== 'DELIVERED'
                  ).length} órdenes requieren atención inmediata
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}