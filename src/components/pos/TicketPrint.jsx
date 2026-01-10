import React, { useState } from "react";
import { generateTicketText, printThermalTicket, PAPER_WIDTHS } from "../../utils/thermalPrinterService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Función para imprimir el ticket usando impresión térmica directa
export const printTicket = (venta, pagos = [], isCopia = false, paperWidth = PAPER_WIDTHS.LARGE) => {
  if (!venta) return;
  
  try {
    const ticketText = generateTicketText(venta, pagos, isCopia, paperWidth);
    printThermalTicket(ticketText, paperWidth);
  } catch (error) {
    console.error('Error al imprimir ticket:', error);
    alert('Error al generar el ticket. Por favor, intente nuevamente.');
  }
};

export default function TicketPrint({ venta, pagos, isCopia = false }) {
  const [paperWidth, setPaperWidth] = useState(PAPER_WIDTHS.LARGE);
  
  if (!venta) return null;

  const handlePrint = () => {
    printTicket(venta, pagos, isCopia, paperWidth);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Ancho de papel</Label>
        <Select value={String(paperWidth)} onValueChange={(v) => setPaperWidth(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={String(PAPER_WIDTHS.SMALL)}>58mm (32 caracteres)</SelectItem>
            <SelectItem value={String(PAPER_WIDTHS.MEDIUM)}>72mm (42 caracteres)</SelectItem>
            <SelectItem value={String(PAPER_WIDTHS.LARGE)}>80mm (48 caracteres)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <button
        onClick={handlePrint}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        IMPRESIÓN TÉRMICA DIRECTA
      </button>

      {/* Vista previa del ticket */}
      <div className="border rounded-lg bg-slate-50 p-4 mx-auto" style={{ maxWidth: '400px' }}>
        <div className="bg-white p-4 rounded border">
          <pre className="text-xs" style={{ fontFamily: 'Courier New, monospace', lineHeight: '1.2', whiteSpace: 'pre', overflow: 'auto' }}>
            {generateTicketText(venta, pagos, isCopia, paperWidth)}
          </pre>
        </div>
      </div>
    </div>
  );
}