import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import TicketTemplate from "../tickets/TicketTemplate";
import { jsPDF } from "jspdf";
import { Download, MessageCircle, Loader } from "lucide-react";
import toast from "react-hot-toast";

export default function WhatsAppTicketDialog({ isOpen, onClose, ticketType = "sale", ticketId }) {
  const [clientName, setClientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [ticketData, setTicketData] = useState(null);

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicketData();
    }
  }, [isOpen, ticketId]);

  const loadTicketData = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('generateTicketData', {
        ticketType,
        ticketId
      });

      const data = response.data.ticketData;
      setTicketData(data);
      setClientName(data.cliente_nombre || "");
    } catch (error) {
      console.error("Error loading ticket data:", error);
      toast.error("Error al cargar los datos del comprobante");
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return "54" + cleaned;
    }
    return cleaned;
  };

  const generateAndUploadPDF = async () => {
    try {
      setLoading(true);

      if (!ticketData) {
        toast.error("Datos del comprobante no disponibles");
        return;
      }

      // Generar PDF desde el HTML
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 297]
      });

      // Render del ticket a HTML
      const ticketElement = document.createElement("div");
      const root = document.createElement("div");
      root.innerHTML = `<div id="ticket-render" style="background: white; padding: 5mm;"></div>`;
      ticketElement.appendChild(root);
      document.body.appendChild(ticketElement);

      // Usar html2canvas para convertir a imagen y luego a PDF
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(ticketElement);

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Convertir PDF a Blob
      const pdfBlob = doc.output('blob');

      // Subir usando Core.UploadFile desde el frontend
      const formData = new FormData();
      formData.append('file', pdfBlob, 'comprobante.pdf');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Error uploading PDF');
      }

      const uploadData = await uploadResponse.json();
      setGeneratedUrl(uploadData.file_url);
      toast.success("PDF generado y subido correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 297]
      });

      const html2canvas = (await import('html2canvas')).default;
      const ticketElement = document.getElementById('ticket-template');

      if (!ticketElement) {
        toast.error("No se puede encontrar el elemento del ticket");
        return;
      }

      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      doc.save(`comprobante-${ticketData.numero_comprobante || 'ticket'}.pdf`);

      toast.success("PDF descargado");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Error al descargar el PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Ingresa un número de WhatsApp");
      return;
    }

    try {
      setLoading(true);

      // Generar y subir PDF primero
      if (!generatedUrl) {
        await generateAndUploadPDF();
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);
      const message = `Hola ${clientName}, te envío el comprobante de tu ${ticketType === 'sale' ? 'venta' : 'presupuesto'}. ${generatedUrl || 'Consulta tu comprobante'}`;

      // Abrir WhatsApp Web
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast.success("Abriendo WhatsApp Web");
      onClose();
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      toast.error("Error al abrir WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  if (!ticketData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Enviar por WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Preview del ticket */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-64 overflow-auto">
            <div id="ticket-template">
              <TicketTemplate ticketData={ticketData} ticketType={ticketType} />
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="clientName">Nombre del cliente</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Número de WhatsApp</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+54 9 11 23456789"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ingresa el número con código de país (54 para Argentina)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={loading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            disabled={loading || !phoneNumber.trim()}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Enviar por WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}