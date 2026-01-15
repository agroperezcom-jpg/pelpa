import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Printer, X } from "lucide-react";
import PrintFormatA4 from "./PrintFormatA4";
import PrintFormatMobile from "./PrintFormatMobile";
import PrintFormat80mm from "./PrintFormat80mm";

export default function PrintPreview({ presupuesto, onClose }) {
  const [format, setFormat] = useState("a4");

  const getFormatComponent = () => {
    switch (format) {
      case "mobile":
        return <PrintFormatMobile presupuesto={presupuesto} />;
      case "80mm":
        return <PrintFormat80mm presupuesto={presupuesto} />;
      case "a4":
      default:
        return <PrintFormatA4 presupuesto={presupuesto} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
      {/* Header - Solo en pantalla */}
      <div className="flex items-center justify-between gap-3 p-4 bg-slate-100 border-b no-print">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Formato:</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4 (Documento)</SelectItem>
                <SelectItem value="mobile">Mobile (WhatsApp)</SelectItem>
                <SelectItem value="80mm">80mm (Térmico)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / PDF
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contenido */}
      <div className="overflow-auto flex-1 bg-slate-50 flex justify-center py-8">
        <div className="bg-white shadow-lg">
          {getFormatComponent()}
        </div>
      </div>

      {/* CSS de impresión */}
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            * {
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            /* Ocultar todo excepto el contenido a imprimir */
            body > * {
              display: none !important;
            }
            .fixed.inset-0 {
              position: static !important;
              width: auto !important;
              height: auto !important;
              display: block !important;
              background: white !important;
            }
            .bg-slate-50 {
              background: white !important;
            }
            .shadow-lg {
              box-shadow: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}