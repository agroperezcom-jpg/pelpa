import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PresupuestoPDF({ presupuesto, onPrint }) {
  const handlePrint = () => {
    window.print();
  };

  if (!presupuesto) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 no-print">
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            body * {
              visibility: hidden;
            }
            .presupuesto-print, .presupuesto-print * {
              visibility: visible;
            }
            .presupuesto-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}
      </style>

      <div className="presupuesto-print bg-white p-8 border rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-blue-600">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 mb-2">PRESUPUESTO</h1>
            <p className="text-lg font-semibold text-slate-700">{presupuesto.numero_presupuesto}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-600">Fecha: {format(new Date(presupuesto.fecha), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
            <p className="text-sm text-slate-600">Válido hasta: {format(new Date(presupuesto.validez_hasta), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="mb-8">
          <h3 className="font-semibold text-slate-700 mb-2">Cliente</h3>
          <p className="text-lg font-bold text-slate-800">{presupuesto.cliente_name}</p>
          {presupuesto.cliente_tipo_iva && (
            <p className="text-sm text-slate-600">Condición IVA: {presupuesto.cliente_tipo_iva.replace(/_/g, ' ')}</p>
          )}
        </div>

        {/* Detalle */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-50 border-b-2 border-blue-600">
                <th className="text-left p-3 font-semibold text-slate-700">Descripción</th>
                <th className="text-center p-3 font-semibold text-slate-700">Cantidad</th>
                <th className="text-right p-3 font-semibold text-slate-700">Precio Unit.</th>
                <th className="text-right p-3 font-semibold text-slate-700">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {presupuesto.items?.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-3">
                    <p className="font-medium">{item.name}</p>
                    {item.descripcion && (
                      <p className="text-sm text-slate-500">{item.descripcion}</p>
                    )}
                  </td>
                  <td className="text-center p-3">{item.cantidad}</td>
                  <td className="text-right p-3">${(item.precio_unitario || 0).toFixed(2)}</td>
                  <td className="text-right p-3 font-bold">${(item.subtotal || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-slate-700">
              <span>Subtotal:</span>
              <span className="font-bold">${(presupuesto.subtotal || 0).toFixed(2)}</span>
            </div>
            {presupuesto.descuento > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuento:</span>
                <span className="font-bold">-${(presupuesto.descuento || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-bold text-blue-600 pt-3 border-t-2 border-blue-600">
              <span>TOTAL:</span>
              <span>${(presupuesto.total_presupuesto || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {presupuesto.observaciones && (
          <div className="mb-8 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-slate-700 mb-2">Observaciones</h3>
            <p className="text-sm text-slate-600">{presupuesto.observaciones}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t text-center text-sm text-slate-500">
          <p>Presupuesto generado el {format(new Date(presupuesto.created_date || new Date()), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          <p className="mt-1">Por: {presupuesto.usuario_creador_nombre}</p>
        </div>
      </div>
    </div>
  );
}