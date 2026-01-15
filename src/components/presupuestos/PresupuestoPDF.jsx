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
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            html, body {
              width: 100% !important;
              height: 100% !important;
            }
            .no-print {
              display: none !important;
            }
            .presupuesto-print {
              margin: 0 !important;
              padding: 2cm !important;
              box-shadow: none !important;
              border: none !important;
              width: 100% !important;
              page-break-after: avoid;
            }
          }
        `}
      </style>

      <div className="presupuesto-print bg-white p-8 border rounded-lg" style={{ fontWeight: "600", textRendering: "optimizeLegibility" }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-blue-600">
          <div>
            <h1 className="text-3xl font-black text-blue-600 mb-2" style={{ fontWeight: "900", letterSpacing: "0.5px" }}>PRESUPUESTO</h1>
            <p className="text-lg font-black text-slate-800" style={{ fontWeight: "900" }}>{presupuesto.numero_presupuesto}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-700 font-bold">Fecha: {format(new Date(presupuesto.fecha), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
            <p className="text-sm text-slate-700 font-bold">Válido hasta: {format(new Date(presupuesto.validez_hasta), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="mb-8">
          <h3 className="font-black text-slate-800 mb-2" style={{ fontWeight: "900" }}>Cliente</h3>
          <p className="text-lg font-black text-slate-900" style={{ fontWeight: "900" }}>{presupuesto.cliente_name}</p>
          {presupuesto.cliente_tipo_iva && (
            <p className="text-sm text-slate-700 font-bold">Condición IVA: {presupuesto.cliente_tipo_iva.replace(/_/g, ' ')}</p>
          )}
        </div>

        {/* Detalle */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-50 border-b-2 border-blue-600">
                <th className="text-left p-3 font-black text-slate-800" style={{ fontWeight: "900" }}>Descripción</th>
                <th className="text-center p-3 font-black text-slate-800" style={{ fontWeight: "900" }}>Cantidad</th>
                <th className="text-right p-3 font-black text-slate-800" style={{ fontWeight: "900" }}>Precio Unit.</th>
                <th className="text-right p-3 font-black text-slate-800" style={{ fontWeight: "900" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {presupuesto.items?.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-3">
                    <p className="font-bold text-slate-800" style={{ fontWeight: "700" }}>{item.name}</p>
                    {item.descripcion && (
                      <p className="text-sm text-slate-600 font-semibold">{item.descripcion}</p>
                    )}
                  </td>
                  <td className="text-center p-3 font-bold">{item.cantidad}</td>
                  <td className="text-right p-3 font-bold">${(item.precio_unitario || 0).toFixed(2)}</td>
                  <td className="text-right p-3 font-black" style={{ fontWeight: "900" }}>${(item.subtotal || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-slate-800 font-bold">
              <span>Subtotal:</span>
              <span style={{ fontWeight: "900" }}>${(presupuesto.subtotal || 0).toFixed(2)}</span>
            </div>
            {presupuesto.descuento > 0 && (
              <div className="flex justify-between text-red-700 font-black" style={{ fontWeight: "900" }}>
                <span>Descuento:</span>
                <span>-${(presupuesto.descuento || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-black text-blue-700 pt-3 border-t-2 border-blue-600" style={{ fontWeight: "900" }}>
              <span>TOTAL:</span>
              <span>${(presupuesto.total_presupuesto || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {presupuesto.observaciones && (
          <div className="mb-8 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-black text-slate-800 mb-2" style={{ fontWeight: "900" }}>Observaciones</h3>
            <p className="text-sm text-slate-700 font-semibold">{presupuesto.observaciones}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t text-center text-sm text-slate-700 font-semibold">
          <p>Presupuesto generado el {format(new Date(presupuesto.created_date || new Date()), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          <p className="mt-1">Por: {presupuesto.usuario_creador_nombre}</p>
        </div>
      </div>
    </div>
  );
}