import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Phone, User, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";

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
      setPhoneNumber(clientData.phone || "");
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
      // Generar PDF
      const response = await base44.functions.invoke("generateTicketPDF", {
        ticketType,
        ticketId: ticketData.id,
        ticketData
      });

      if (!response.data.success) {
        throw new Error("Error al generar PDF");
      }

      const fileUrl = response.data.file_url;
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
    if (!generatedUrl) {
      toast.error("Genera el documento primero");
      return;
    }

    try {
      const response = await fetch(generatedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ticketType}-${ticketData.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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
              placeholder="+54 9 11 1234 5678 o 1112345678"
              type="tel"
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