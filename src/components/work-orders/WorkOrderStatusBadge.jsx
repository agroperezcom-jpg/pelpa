import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Wrench, Loader2, Truck, XCircle } from 'lucide-react';

const statusConfig = {
  DESIGN: {
    label: 'En diseño',
    icon: Wrench,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  PRINTING: {
    label: 'En impresión',
    icon: Loader2,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  FINISHING: {
    label: 'En terminación',
    icon: Wrench,
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  READY: {
    label: 'Listo para retirar',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  DELIVERED: {
    label: 'Entregado',
    icon: Truck,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200'
  }
};

export default function WorkOrderStatusBadge({ status, isOverdue }) {
  const config = statusConfig[status] || statusConfig.DESIGN;
  const Icon = config.icon;

  if (isOverdue && status !== 'DELIVERED' && status !== 'CANCELLED') {
    return (
      <Badge className={`border ${config.color} flex items-center gap-1`}>
        <AlertCircle className="h-3 w-3" />
        Vencida - {config.label}
      </Badge>
    );
  }

  return (
    <Badge className={`border ${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}