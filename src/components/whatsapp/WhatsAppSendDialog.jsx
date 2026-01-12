import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Phone, User, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";

export default function WhatsAppSendDialog({
  isOpen,
  onClose,
  clientData,
  ticketData,
  ticketType = "budget",
  onSuccess
}) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState(null);

  useEffect(() => {
    if (isOpen && clientData) {
      setClientName(clientData.name || "");
      // Si tiene teléfono, usarlo; sino mostrar +54
      const phone = clientData.phone || "+54";
      setPhoneNumber(phone);
    }
  }, [isOpen, clientData]);

  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    return cleanPhone.length >= 10;
  };

  const formatPhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    
    // Si empieza con 9 y tiene 10 dígitos, es un celular argentino sin código de país
    if (cleanPhone.startsWith("9") && cleanPhone.length === 10) {
      return "54" + cleanPhone;
    }
    
    // Si tiene 10 dígitos y NO empieza con 9, agregar código de país
    if (cleanPhone.length === 10 && !cleanPhone.startsWith("9")) {
      return "54" + cleanPhone;
    }
    
    // Si ya tiene 12 dígitos y empieza con 54, perfecto
    if (cleanPhone.length === 12 && cleanPhone.startsWith("54")) {
      return cleanPhone;
    }
    
    // Si tiene 11 dígitos y empieza con 54, completar a 12
    if (cleanPhone.length === 11 && cleanPhone.startsWith("54")) {
      return cleanPhone + "0";
    }
    
    return cleanPhone;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Encabezado
    doc.setFontSize(20);
    doc.text(ticketType === 'budget' ? 'PRESUPUESTO' : 'TICKET DE VENTA', 20, yPosition);
    yPosition += 15;

    // Información general
    doc.setFontSize(10);
    doc.text(`Número: ${ticketData.numero || ticketData.numero_presupuesto || ticketData.id}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, yPosition);
    yPosition += 7;

    // Cliente
    if (clientName) {
      doc.text(`Cliente: ${clientName}`, 20, yPosition);
      yPosition += 7;
    }

    yPosition += 5;

    // Tabla de items
    doc.setFontSize(9);
    
    // Headers de tabla
    doc.text('Descripción', 20, yPosition);
    doc.text('Cantidad', 100, yPosition);
    doc.text('Unitario', 130, yPosition);
    doc.text('Total', 160, yPosition);
    
    yPosition += 7;
    doc.setDrawColor(200);
    doc.line(20, yPosition - 1, pageWidth - 20, yPosition - 1);
    yPosition += 3;

    // Items
    if (ticketData.items && Array.isArray(ticketData.items)) {
      ticketData.items.forEach((item) => {
        const description = item.name || item.descripcion || '';
        const quantity = item.quantity || item.cantidad || 0;
        const price = item.price_venta || item.precio_unitario || 0;
        const total = (quantity * price).toFixed(2);

        doc.text(description.substring(0, 50), 20, yPosition);
        doc.text(quantity.toString(), 100, yPosition);
        doc.text(`$${price.toFixed(2)}`, 130, yPosition);
        doc.text(`$${total}`, 160, yPosition);

        yPosition += 7;

        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
      });
    }

    yPosition += 3;
    doc.setDrawColor(200);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 7;

    // Totales
    doc.setFontSize(10);
    if (ticketData.subtotal !== undefined) {
      doc.text('Subtotal:', 130, yPosition);
      doc.text(`$${ticketData.subtotal.toFixed(2)}`, 160, yPosition);
      yPosition += 7;
    }

    if (ticketData.discount && ticketData.discount > 0) {
      doc.text('Descuento:', 130, yPosition);
      doc.text(`-$${ticketData.discount.toFixed(2)}`, 160, yPosition);
      yPosition += 7;
    }

    if (ticketData.iva_21 && ticketData.iva_21 > 0) {
      doc.text('IVA (21%):', 130, yPosition);
      doc.text(`$${ticketData.iva_21.toFixed(2)}`, 160, yPosition);
      yPosition += 7;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL:', 130, yPosition);
    doc.text(`$${(ticketData.total || 0).toFixed(2)}`, 160, yPosition);

    if (ticketData.notes) {
      yPosition += 15;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Notas:', 20, yPosition);
      yPosition += 5;
      const noteLines = doc.splitTextToSize(ticketData.notes, 170);
      doc.text(noteLines, 20, yPosition);
    }

    return doc;
  };

  const handleGenerateAndSend = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Ingresa el número de WhatsApp");
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error("Número de WhatsApp inválido (mínimo 10 dígitos)");
      return;
    }

    setIsGenerating(true);

    try {
      // Generar PDF en el frontend
      const doc = generatePDF();
      const pdfBlob = doc.output('blob');

      // Subir el PDF
      const uploadResponse = await base44.integrations.Core.UploadFile({
        file: pdfBlob
      });

      const fileUrl = uploadResponse.file_url;
      setGeneratedUrl(fileUrl);

      // Formatear número
      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Mensaje
      const ticketNumber = ticketData.numero || ticketData.numero_presupuesto || "Documento";
      const ticketTypeLabel = ticketType === "budget" ? "presupuesto" : "ticket de venta";
      const message = `Hola ${clientName || ""}! Te envío el ${ticketTypeLabel} #${ticketNumber}. Descargalo desde aquí: ${fileUrl}`;

      // Abrir WhatsApp Web
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      setTimeout(() => window.open(whatsappUrl, "_blank"), 500);

      toast.success("Abriendo WhatsApp...");
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar documento: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const doc = generatePDF();
      doc.save(`${ticketType}-${ticketData.id}.pdf`);
      toast.success("Documento descargado");
    } catch (error) {
      toast.error("Error al descargar: " + error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <DialogTitle>Enviar por WhatsApp</DialogTitle>
          </div>
          <DialogDescription>
            Envía el {ticketType === "budget" ? "presupuesto" : "ticket"} al cliente por WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client-name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nombre del cliente
            </Label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nombre del cliente"
              disabled
              className="bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Número de WhatsApp
            </Label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+54 9 11 1234 5678"
              type="tel"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Ingresa el número con código de país (54 para Argentina) o sin él
            </p>
          </div>

          {generatedUrl && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                ✓ Documento generado y listo para enviar
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {generatedUrl && (
            <Button variant="outline" onClick={handleDownload}>
              Descargar PDF
            </Button>
          )}
          <Button
            onClick={handleGenerateAndSend}
            disabled={isGenerating || !phoneNumber.trim()}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" />
                Abrir WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}