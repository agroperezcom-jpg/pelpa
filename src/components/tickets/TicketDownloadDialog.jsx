import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TicketTemplate from "./TicketTemplate";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Download, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function TicketDownloadDialog({ isOpen, onClose, ticketData, ticketType = "sale" }) {
  if (!ticketData) return null;

  const handleDownloadPDF = async () => {
    try {
      const ticketElement = document.getElementById('ticket-download-template');
      if (!ticketElement) {
        toast.error("No se puede encontrar el ticket");
        return;
      }

      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 297]
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const filename = `${ticketType === 'sale' ? 'venta' : 'presupuesto'}-${ticketData.numero_comprobante || 'ticket'}.pdf`;
      doc.save(filename);

      toast.success("Ticket descargado correctamente");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Error al descargar el ticket");
    }
  };

  const handleOpenWhatsApp = () => {
    const message = `Hola ${ticketData.cliente_nombre || 'cliente'}, te envío el detalle de tu ${ticketType === 'sale' ? 'compra' : 'presupuesto'}. Total: $${ticketData.total?.toFixed(2) || '0.00'}. Gracias.`;
    const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {ticketType === 'sale' ? 'Ticket de Venta' : 'Presupuesto'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 inline-block">
            <div id="ticket-download-template">
              <TicketTemplate ticketData={ticketData} ticketType={ticketType} />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            onClick={handleOpenWhatsApp}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Abrir WhatsApp
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}