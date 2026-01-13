import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, Smartphone, Printer, FileCheck } from "lucide-react";

export default function SalesDocumentDownloadDialog({ isOpen, onOpenChange, sale }) {
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const documentFormats = [
    {
      id: "mobile",
      name: "Recibo Móvil",
      description: "Optimizado para compartir por WhatsApp y ver en celular",
      icon: Smartphone,
      size: "375px ancho",
      color: "blue",
    },
    {
      id: "thermal",
      name: "Ticket Térmico (72mm)",
      description: "Formato monoespaciado para impresoras de rollo",
      icon: Printer,
      size: "72mm ancho",
      color: "purple",
    },
    {
      id: "a4",
      name: "Documento A4",
      description: "Documento formal para imprimir y archivar",
      icon: FileCheck,
      size: "210x297mm",
      color: "slate",
    },
  ];

  const handleDownload = async () => {
    if (!selectedFormat || !sale) return;

    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('generateSalesDocumentPDF', {
        saleId: sale.id,
        documentType: selectedFormat
      });

      // Create blob and download
      const mimeType = selectedFormat === 'thermal' ? 'text/plain' : 'application/pdf';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFormat === 'thermal' 
        ? `recibo-termico-${sale.id}.txt`
        : `documento-${selectedFormat}-${sale.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();

      setSelectedFormat(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Error al descargar el documento");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Descargar Comprobante
          </DialogTitle>
          <DialogDescription>
            Selecciona el formato en el que deseas descargar el documento de venta
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
          {documentFormats.map((format) => {
            const Icon = format.icon;
            const isSelected = selectedFormat === format.id;
            const colorMap = {
              blue: "border-blue-500 bg-blue-50",
              purple: "border-purple-500 bg-purple-50",
              slate: "border-slate-500 bg-slate-50",
            };

            return (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? colorMap[format.color]
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex flex-col gap-2">
                  <Icon className="h-6 w-6 text-slate-600" />
                  <div>
                    <p className="font-semibold text-slate-900">{format.name}</p>
                    <p className="text-xs text-slate-600 mt-1">{format.description}</p>
                    <p className="text-xs text-slate-500 mt-2 font-mono">{format.size}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!selectedFormat || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? "Generando..." : "Descargar"}
            {!isLoading && <Download className="h-4 w-4 ml-2" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}