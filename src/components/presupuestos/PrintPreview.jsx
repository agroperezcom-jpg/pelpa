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
      <div className="print-wrapper">
        <div className="print-header">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onClose} className="h-10 w-10 p-0 flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 py-2">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Formato:</label>
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
          <Button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap flex-shrink-0"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / PDF
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 flex justify-center py-8">
          <div className="print-area">
            {getFormatComponent()}
          </div>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .print-wrapper {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: #f9fafb !important;
          z-index: 99999 !important;
          padding: 0 !important;
          margin: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }

        .print-area {
          visibility: visible !important;
          position: relative !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .no-print {
          display: block !important;
          visibility: visible !important;
        }

        @media print {
          *,
          *::before,
          *::after {
            visibility: hidden !important;
            display: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-area,
          .print-area *,
          .print-area *::before,
          .print-area *::after {
            visibility: visible !important;
            display: block !important;
          }

          .print-area {
            position: static !important;
            top: auto !important;
            left: auto !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }

          @page {
            margin: 0 !important;
            padding: 0 !important;
            size: auto !important;
          }

          html {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: white !important;
          }
        }
      `}</style>
    </>
  );
}