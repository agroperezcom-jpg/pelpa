import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Download, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";

export default function CalendarExportDialog({ isOpen, onClose, events, currentDate, getEventColor }) {
  const [exportRange, setExportRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState(currentDate);
  const [customEndDate, setCustomEndDate] = useState(currentDate);

  const handleExport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Determinar rango de fechas
    let startDate, endDate;
    if (exportRange === "month") {
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
    } else if (exportRange === "week") {
      startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      startDate = customStartDate;
      endDate = customEndDate;
    }

    // Filtrar eventos
    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.date || event.start_date || event.created_date);
      return eventDate >= startDate && eventDate <= endDate;
    }).sort((a, b) => {
      const dateA = new Date(a.date || a.start_date || a.created_date);
      const dateB = new Date(b.date || b.start_date || b.created_date);
      return dateA - dateB;
    });

    // Título
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Calendario de Eventos', 15, 20);

    // Rango de fechas
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(
      `${format(startDate, "dd/MM/yyyy", { locale: es })} - ${format(endDate, "dd/MM/yyyy", { locale: es })}`,
      15,
      28
    );

    // Total de eventos
    doc.setFontSize(10);
    doc.text(`Total de eventos: ${filteredEvents.length}`, 15, 35);

    // Línea divisoria
    doc.setDrawColor(200);
    doc.line(15, 38, pageWidth - 15, 38);

    // Eventos
    let y = 45;
    let currentDay = null;

    filteredEvents.forEach((event, idx) => {
      const eventDate = new Date(event.date || event.start_date || event.created_date);
      const dayStr = format(eventDate, "dd/MM/yyyy", { locale: es });

      // Nueva página si es necesario
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      // Encabezado de día
      if (dayStr !== currentDay) {
        if (currentDay !== null) y += 5;
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0);
        doc.text(format(eventDate, "EEEE, dd 'de' MMMM", { locale: es }), 15, y);
        y += 7;
        currentDay = dayStr;
      }

      // Evento
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0);
      
      const eventIcon = event.type === "project" ? "📁" :
                       event.type === "task" ? "✓" :
                       event.type === "freeTask" ? "📝" : "📅";
      
      doc.text(`${eventIcon} ${event.name || event.title}`, 20, y);
      y += 5;

      // Detalles
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80);

      if (event.time) {
        doc.text(`Hora: ${event.time}`, 25, y);
        y += 4;
      }

      if (event.type) {
        doc.text(`Tipo: ${event.type}`, 25, y);
        y += 4;
      }

      if (event.description) {
        const desc = event.description.length > 80 
          ? event.description.substring(0, 80) + "..." 
          : event.description;
        const lines = doc.splitTextToSize(desc, pageWidth - 50);
        doc.text(lines, 25, y);
        y += lines.length * 4;
      }

      y += 5;
    });

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${totalPages} - Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Descargar
    const fileName = `calendario_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Exportar Calendario a PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Rango de exportación</Label>
            <Select value={exportRange} onValueChange={setExportRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana actual</SelectItem>
                <SelectItem value="month">Mes actual</SelectItem>
                <SelectItem value="custom">Rango personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exportRange === "custom" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Fecha de inicio</Label>
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  locale={es}
                  className="rounded-md border"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Fecha de fin</Label>
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  locale={es}
                  className="rounded-md border"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleExport} className="bg-primary">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}