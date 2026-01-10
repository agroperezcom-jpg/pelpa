import React, { useState, useEffect } from "react";
import { generateTicketText, printThermalTicket, PAPER_WIDTHS } from "../thermal/thermalPrinterService";
import { printTicketQZ, checkQZStatus, getPrinters, printTestTicket } from "../thermal/qzTrayService";
import QZTrayGuide from "../thermal/QZTrayGuide";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Printer, AlertCircle, CheckCircle2, HelpCircle, Zap } from "lucide-react";

// Función para imprimir el ticket usando impresión térmica directa
export const printTicket = (venta, pagos = [], isCopia = false, paperWidth = PAPER_WIDTHS.LARGE) => {
  if (!venta) return;
  
  try {
    const ticketText = generateTicketText(venta, pagos, isCopia, paperWidth);
    printThermalTicket(ticketText, paperWidth);
  } catch (error) {
    console.error('Error al imprimir ticket:', error);
    alert('Error al generar el ticket. Por favor, intente nuevamente.');
  }
};

export default function TicketPrint({ venta, pagos, isCopia = false }) {
  const [paperWidth, setPaperWidth] = useState(PAPER_WIDTHS.LARGE);
  const [qzStatus, setQzStatus] = useState(null);
  const [qzPrinters, setQzPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [printing, setPrinting] = useState(false);
  
  const { data: configuracionEmpresa = [] } = useQuery({
    queryKey: ['configuracionEmpresa'],
    queryFn: () => base44.entities.ConfiguracionEmpresa.list()
  });

  const empresaConfig = configuracionEmpresa[0];
  
  useEffect(() => {
    checkQZ();
  }, []);

  useEffect(() => {
    // Cargar impresora guardada
    const saved = localStorage.getItem('qz_preferred_printer');
    if (saved && qzPrinters.includes(saved)) {
      setSelectedPrinter(saved);
    }
  }, [qzPrinters]);

  const checkQZ = async () => {
    const status = await checkQZStatus();
    setQzStatus(status);
    
    if (status.installed && status.running) {
      const printers = await getPrinters();
      setQzPrinters(printers);
      if (printers.length > 0) {
        // Intentar cargar preferida
        const saved = localStorage.getItem('qz_preferred_printer');
        if (saved && printers.includes(saved)) {
          setSelectedPrinter(saved);
          return;
        }
        
        // Buscar térmica Hasar/Epson o usar la primera
        const thermal = printers.find(p => 
          p.toLowerCase().includes('hasar') || 
          p.toLowerCase().includes('epson') ||
          p.toLowerCase().includes('star')
        );
        setSelectedPrinter(thermal || printers[0]);
      }
    }
  };

  const handlePrinterChange = (printer) => {
    setSelectedPrinter(printer);
    localStorage.setItem('qz_preferred_printer', printer);
  };
  
  if (!venta) return null;

  const handlePrint = () => {
    printTicket(venta, pagos, isCopia, paperWidth);
  };

  const handlePrintQZ = async () => {
    setPrinting(true);
    try {
      await printTicketQZ(venta, pagos, isCopia, selectedPrinter, empresaConfig);
      alert('✓ Ticket impreso correctamente');
    } catch (error) {
      alert('Error al imprimir: ' + error.message);
    } finally {
      setPrinting(false);
    }
  };

  const handleTestPrint = async () => {
    setPrinting(true);
    try {
      await printTestTicket(selectedPrinter, empresaConfig);
      alert('✓ Ticket de prueba impreso');
    } catch (error) {
      alert('Error al imprimir prueba: ' + error.message);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Estado QZ Tray */}
      {qzStatus && (
        <Alert className={qzStatus.running ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {qzStatus.running ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <AlertDescription className="text-sm text-green-700">
                    <strong>QZ Tray conectado</strong> - Impresión térmica disponible
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-700">
                    <strong>QZ Tray no detectado</strong> - Instalá para impresión térmica real
                  </AlertDescription>
                </>
              )}
            </div>
            <button
              onClick={() => setShowGuide(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <HelpCircle className="h-4 w-4" />
              Guía
            </button>
          </div>
        </Alert>
      )}

      {/* Selector de impresora QZ */}
      {qzStatus?.running && qzPrinters.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Impresora térmica</Label>
          <Select value={selectedPrinter} onValueChange={handlePrinterChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {qzPrinters.map(printer => (
                <SelectItem key={printer} value={printer}>
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    {printer}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Botón de prueba */}
      {qzStatus?.running && selectedPrinter && (
        <button
          onClick={handleTestPrint}
          disabled={printing}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
        >
          <Zap className="w-4 h-4" />
          IMPRIMIR TICKET DE PRUEBA
        </button>
      )}

      {/* Botón QZ Tray (prioritario) */}
      {qzStatus?.running && (
        <button
          onClick={handlePrintQZ}
          disabled={printing || !selectedPrinter}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Printer className="w-5 h-5" />
          {printing ? 'IMPRIMIENDO...' : 'IMPRIMIR CON QZ TRAY (TÉRMICA)'}
        </button>
      )}

      {/* Opciones para impresión genérica */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Ancho de papel (método genérico)</Label>
        <Select value={String(paperWidth)} onValueChange={(v) => setPaperWidth(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={String(PAPER_WIDTHS.SMALL)}>58mm (32 caracteres)</SelectItem>
            <SelectItem value={String(PAPER_WIDTHS.MEDIUM)}>72mm (42 caracteres)</SelectItem>
            <SelectItem value={String(PAPER_WIDTHS.LARGE)}>80mm (48 caracteres)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <button
        onClick={handlePrint}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        IMPRESIÓN GENÉRICA (window.print)
      </button>

      {/* Vista previa del ticket */}
      <div className="border rounded-lg bg-slate-50 p-4 mx-auto" style={{ maxWidth: '400px' }}>
        <div className="bg-white p-4 rounded border">
          <pre className="text-xs" style={{ fontFamily: 'Courier New, monospace', lineHeight: '1.2', whiteSpace: 'pre', overflow: 'auto' }}>
            {generateTicketText(venta, pagos, isCopia, paperWidth)}
          </pre>
        </div>
      </div>

      {/* Guía de instalación QZ Tray */}
      <QZTrayGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}