import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PresupuestoImpresion({ presupuesto }) {
  if (!presupuesto) return null;

  return (
    <div className="w-full h-screen bg-white overflow-auto">
      <style>
        {`
          @page {
            size: A4;
            margin: 0;
            padding: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          * {
            box-sizing: border-box;
          }
        `}
      </style>

      <div className="w-full max-w-4xl mx-auto bg-white p-12" style={{ minHeight: "297mm", maxWidth: "210mm" }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-blue-600">
          <div>
            <h1 className="text-4xl font-black text-blue-600 mb-2">PRESUPUESTO</h1>
            <p className="text-lg font-black text-slate-800">{presupuesto.numero_presupuesto}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-700 font-bold">Fecha: {format(new Date(presupuesto.fecha), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
            <p className="text-sm text-slate-700 font-bold">Válido hasta: {format(new Date(presupuesto.validez_hasta), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="mb-8">
          <h3 className="font-black text-slate-800 mb-2 text-base">Cliente</h3>
          <p className="text-lg font-black text-slate-900">{presupuesto.cliente_name}</p>
          {presupuesto.cliente_tipo_iva && (
            <p className="text-sm text-slate-700 font-bold">Condición IVA: {presupuesto.cliente_tipo_iva.replace(/_/g, ' ')}</p>
          )}
        </div>

        {/* Detalle */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-blue-600">
                <th className="text-left p-3 font-black text-slate-800 text-sm">Descripción</th>
                <th className="text-center p-3 font-black text-slate-800 text-sm">Cantidad</th>
                <th className="text-right p-3 font-black text-slate-800 text-sm">Precio Unit.</th>
                <th className="text-right p-3 font-black text-slate-800 text-sm">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {presupuesto.items?.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="p-3">
                    <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                    {item.descripcion && (
                      <p className="text-xs text-slate-600 font-semibold">{item.descripcion}</p>
                    )}
                  </td>
                  <td className="text-center p-3 font-bold text-sm">{item.cantidad}</td>
                  <td className="text-right p-3 font-bold text-sm">${(item.precio_unitario || 0).toFixed(2)}</td>
                  <td className="text-right p-3 font-black text-sm">${(item.subtotal || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-slate-800 font-bold text-sm">
              <span>Subtotal:</span>
              <span className="font-black">${(presupuesto.subtotal || 0).toFixed(2)}</span>
            </div>
            {presupuesto.descuento > 0 && (
              <div className="flex justify-between text-red-700 font-black text-sm">
                <span>Descuento:</span>
                <span>-${(presupuesto.descuento || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-black text-blue-700 pt-3 border-t-2 border-blue-600">
              <span>TOTAL:</span>
              <span>${(presupuesto.total_presupuesto || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {presupuesto.observaciones && (
          <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-black text-slate-800 mb-2 text-sm">Observaciones</h3>
            <p className="text-sm text-slate-700 font-semibold">{presupuesto.observaciones}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t text-center text-xs text-slate-700 font-semibold">
          <p>Presupuesto generado el {format(new Date(presupuesto.created_date || new Date()), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          <p className="mt-1">Por: {presupuesto.usuario_creador_nombre}</p>
        </div>
      </div>

      <style>
        {`
          @media print {
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            .w-full {
              width: 100%;
              margin: 0;
              padding: 0;
            }
          }
        `}
      </style>
    </div>
  );
}