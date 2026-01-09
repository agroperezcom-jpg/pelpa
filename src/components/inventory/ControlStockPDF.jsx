import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ControlStockPDF({ control, detalles }) {
  const handlePrint = () => {
    window.print();
  };

  if (!control) return null;

  return (
    <div>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #control-stock-print, #control-stock-print * {
            visibility: visible;
          }
          #control-stock-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print mb-4">
        <Button onClick={handlePrint} className="w-full">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      <div id="control-stock-print" className="bg-white p-8 space-y-6">
        {/* Header */}
        <div className="border-b-2 pb-4">
          <h1 className="text-2xl font-bold">Control de Stock</h1>
          <p className="text-lg text-slate-600">{control.nombre}</p>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Responsable</p>
            <p className="font-medium">{control.usuario_nombre}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Fecha</p>
            <p className="font-medium">
              {format(new Date(control.fecha_inicio), "d 'de' MMMM yyyy HH:mm", { locale: es })}
            </p>
          </div>
          {control.deposito && (
            <div>
              <p className="text-sm text-slate-500">Depósito</p>
              <p className="font-medium">{control.deposito}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-slate-500">Estado</p>
            <p className="font-medium">{control.estado}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="text-sm text-slate-600">Productos Contados</p>
            <p className="text-xl font-bold">{control.total_productos_contados || 0}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Diferencias</p>
            <p className="text-xl font-bold">{control.total_diferencias || 0}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Valor Diferencias</p>
            <p className="text-xl font-bold">${(control.valor_diferencias || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Table */}
        {detalles.length > 0 && (
          <div>
            <h2 className="font-bold text-lg mb-3">Detalle de Productos</h2>
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-2 text-left">Producto</th>
                  <th className="border p-2 text-center">Stock Teórico</th>
                  <th className="border p-2 text-center">Stock Contado</th>
                  <th className="border p-2 text-center">Diferencia</th>
                  <th className="border p-2 text-right">Valor Dif.</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((detalle, i) => (
                  <tr key={i} className={
                    detalle.diferencia > 0 ? "bg-green-50" :
                    detalle.diferencia < 0 ? "bg-red-50" : ""
                  }>
                    <td className="border p-2">{detalle.product_name}</td>
                    <td className="border p-2 text-center">{detalle.stock_teorico}</td>
                    <td className="border p-2 text-center font-bold">{detalle.stock_contado}</td>
                    <td className="border p-2 text-center">
                      {detalle.diferencia !== 0 ? (
                        <span className={detalle.diferencia > 0 ? "text-green-700" : "text-red-700"}>
                          {detalle.diferencia > 0 ? '+' : ''}{detalle.diferencia}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="border p-2 text-right">
                      {detalle.diferencia !== 0 ? `$${Math.abs(detalle.valor_diferencia).toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Observaciones */}
        {control.observaciones && (
          <div>
            <h3 className="font-bold mb-2">Observaciones</h3>
            <p className="text-sm text-slate-700">{control.observaciones}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 mt-8 text-xs text-slate-500">
          <p>Documento generado el {format(new Date(), "d 'de' MMMM yyyy HH:mm", { locale: es })}</p>
        </div>
      </div>
    </div>
  );
}