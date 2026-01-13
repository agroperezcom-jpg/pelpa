import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import toast from "react-hot-toast";

export default function PDFPreviewDialog({ isOpen, onClose, saleId, type, typeName }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && saleId && type) {
      loadPDF();
    }
    
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, saleId, type]);

  const loadPDF = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateSaleTicket', {
        sale_id: saleId,
        type: type
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      toast.error("Error al cargar preview: " + error.message);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `ticket_${type}_${saleId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("PDF descargado");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Vista Previa - {typeName}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-slate-100">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              No se pudo cargar el PDF
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={handleDownload} disabled={!pdfUrl || loading}>
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}