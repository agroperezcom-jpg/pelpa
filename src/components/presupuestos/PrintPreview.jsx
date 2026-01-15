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
      {/* Print wrapper - fullscreen */}
      <div className="print-wrapper">
        {/* Header - no-print */}
        <div className="no-print flex items-center justify-between gap-6 px-6 py-4 bg-slate-100 border-b">
          <div className="flex items-center gap-3 flex-1">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Formato:</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4 (Documento)</SelectItem>
                <SelectItem value="mobile">Mobile (WhatsApp)</SelectItem>
                <SelectItem value="80mm">80mm (Térmico)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => window.print()}
              className="no-print bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
            </Button>
            <Button variant="outline" onClick={onClose} className="no-print h-10 w-10 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content - always in DOM */}
        <div className="flex-1 overflow-auto bg-slate-50 flex justify-center py-8">
          <div className="print-area">
            {getFormatComponent()}
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        .print-wrapper {
          position: fixed;
          inset: 0;
          background: #fff;
          z-index: 9999;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .no-print {
          display: block !important;
        }

        @media print {
          /* Hide everything */
          body * {
            visibility: hidden;
          }

          /* Show print area */
          .print-area,
          .print-area * {
            visibility: visible;
          }

          /* Position print area */
          .print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            background: white;
            margin: 0;
            padding: 0;
          }

          /* Hide no-print elements */
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }

          /* Page styles */
          @page {
            margin: 0;
            padding: 0;
          }

          html, body {
            width: 100%;
            margin: 0;
            padding: 0;
            background: white;
          }
        }
      `}</style>
    </>
  );
}