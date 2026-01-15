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
import SalesTicketFormatA4 from "./SalesTicketFormatA4";
import SalesTicketFormatMobile from "./SalesTicketFormatMobile";
import SalesTicketFormat80mm from "./SalesTicketFormat80mm";

export default function PrintPreviewSales({ venta, pagos, onClose }) {
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
        return <SalesTicketFormatMobile venta={venta} pagos={pagos} />;
      case "80mm":
        return <SalesTicketFormat80mm venta={venta} pagos={pagos} />;
      case "a4":
      default:
        return <SalesTicketFormatA4 venta={venta} pagos={pagos} />;
    }
  };

  return (
    <>
      <div className="print-wrapper">
        <div className="print-header">
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
              className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
            </Button>
            <Button variant="outline" onClick={onClose} className="h-10 w-10 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="print-container">
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