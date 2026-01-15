import React, { useState, useEffect } from "react";
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

  // Bloquear scroll del body cuando esté abierto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
    <>
      {/* Overlay fullscreen */}
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
        {/* Header - Solo en pantalla, nunca imprime */}
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

        {/* Contenido - Siempre renderizado en DOM */}
        <div className="flex-1 overflow-auto bg-slate-50 flex justify-center py-8">
          <div className="print-container bg-white shadow-lg">
            {getFormatComponent()}
          </div>
        </div>
      </div>

      {/* CSS de impresión global */}
      <style>
        {`
          @media print {
            /* Paso 1: Ocultar todo */
            * {
              visibility: hidden;
            }

            /* Paso 2: Mostrar solo el contenedor de impresión */
            .print-container,
            .print-container * {
              visibility: visible;
            }

            /* Paso 3: Posicionar correctamente */
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
              box-shadow: none;
              background: white;
            }

            /* Paso 4: Estilos de página */
            @page {
              size: auto;
              margin: 0;
            }

            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background: white;
            }

            /* Paso 5: Evitar saltos de página innecesarios */
            .print-container > * {
              page-break-inside: avoid;
            }
          }

          /* En pantalla: ocultar elementos no imprimibles */
          .no-print {
            display: none !important;
          }

          @media print {
            .no-print {
              display: none !important;
              visibility: hidden !important;
            }
          }
        `}
      </style>
    </>
  );
}