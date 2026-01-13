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
import { FileText, Download, Loader2 } from "lucide-react";

export default function DocumentDownloadDialog({ isOpen, onOpenChange, sale }) {
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const documentFormats = [
    {
      id: "mobile",
      name: "Recibo Móvil",
      description: "PDF optimizado para compartir por WhatsApp",
      icon: "📱",
      size: "360-390px",
    },
    {
      id: "thermal",
      name: "Recibo Térmico (72mm)",
      description: "Texto monoespaciado para impresoras térmicas",
      icon: "🖨️",
      size: "72mm ancho",
    },
    {
      id: "a4",
      name: "Documento A4",
      description: "Documento formal para imprimir y archivar",
      icon: "📄",
      size: "210x297mm",
    },
  ];

  const handleDownload = async () => {
    if (!selectedFormat || !sale) return;

    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('generateSalesDocument', {
        saleId: sale.id,
        documentType: selectedFormat
      });

      // Create blob and download
      const blob = new Blob([response.data], {
        type: selectedFormat === 'thermal' ? 'text/plain' : 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFormat === 'thermal' 
        ? `recibo-termico-${sale.id}.txt`
        : `recibo-${selectedFormat}-${sale.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Descargar Documento
          </DialogTitle>
          <DialogDescription>
            Selecciona el formato en el que deseas descargar el recibo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {documentFormats.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedFormat === format.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{format.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{format.name}</p>
                  <p className="text-xs text-slate-600 mt-1">{format.description}</p>
                  <p className="text-xs text-slate-500 mt-1">{format.size}</p>
                </div>
              </div>
            </button>
          ))}
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