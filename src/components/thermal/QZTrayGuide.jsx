import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Usb,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";

export default function QZTrayGuide({ isOpen, onClose }) {
  const [copiedStep, setCopiedStep] = React.useState(null);

  const copyToClipboard = (text, stepNumber) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepNumber);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Printer className="h-6 w-6 text-blue-600" />
            Guía de Instalación - QZ Tray para Impresoras Térmicas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ¿Qué es QZ Tray? */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-sm text-slate-700">
              <strong>QZ Tray</strong> es un servicio que permite al navegador comunicarse directamente 
              con impresoras térmicas (Hasar, Epson, Star, etc.) usando comandos ESC/POS.
            </AlertDescription>
          </Alert>

          {/* Paso 1: Descargar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-semibold text-lg">Descargar QZ Tray</h3>
            </div>
            
            <div className="ml-10 space-y-3">
              <p className="text-sm text-slate-600">
                Descargá la versión para tu sistema operativo:
              </p>
              
              <div className="grid gap-3">
                <a 
                  href="https://github.com/qzind/tray/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Windows (recomendado)</p>
                      <p className="text-xs text-slate-500">qz-tray-X.X.X.exe</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </a>

                <a 
                  href="https://github.com/qzind/tray/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">macOS</p>
                      <p className="text-xs text-slate-500">qz-tray-X.X.X.pkg</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </a>

                <a 
                  href="https://github.com/qzind/tray/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Linux</p>
                      <p className="text-xs text-slate-500">qz-tray-X.X.X.run</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Paso 2: Instalar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-semibold text-lg">Instalar QZ Tray</h3>
            </div>
            
            <div className="ml-10 space-y-2">
              <p className="text-sm text-slate-600">
                Ejecutá el instalador descargado y seguí las instrucciones.
              </p>
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm">
                  <strong>Importante:</strong> QZ Tray debe ejecutarse como servicio. 
                  Durante la instalación, asegurate de seleccionar "Iniciar con Windows".
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Paso 3: Conectar impresora */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-semibold text-lg">Conectar Impresora Térmica</h3>
            </div>
            
            <div className="ml-10 space-y-3">
              <div className="flex items-start gap-3">
                <Usb className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-slate-600">
                    Conectá tu impresora térmica (Hasar, Epson, etc.) por USB
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm space-y-1">
                    <p className="font-medium">Para Hasar P-715F / SMH-P715F:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                      <li>Conectar cable USB a la PC</li>
                      <li>Instalar driver oficial Hasar (si no lo tenés)</li>
                      <li>Verificar en "Dispositivos" que aparezca</li>
                      <li>Nombre típico: "Hasar P-715F" o "HASAR SMH"</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Paso 4: Verificar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="font-semibold text-lg">Verificar Instalación</h3>
            </div>
            
            <div className="ml-10 space-y-3">
              <p className="text-sm text-slate-600">
                Abrí QZ Tray desde el ícono en la bandeja del sistema (systray) y verificá:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm">Estado: "QZ Tray está corriendo"</p>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm">Impresora detectada en la lista</p>
                </div>
              </div>
            </div>
          </div>

          {/* Paso 5: Usar desde el ERP */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                ✓
              </div>
              <h3 className="font-semibold text-lg text-green-700">¡Listo para usar!</h3>
            </div>
            
            <div className="ml-10 space-y-2">
              <p className="text-sm text-slate-600">
                Ahora podés usar el botón <strong>"Imprimir con QZ Tray"</strong> en el diálogo de tickets.
              </p>
              <p className="text-sm text-slate-600">
                El sistema detectará automáticamente tu impresora térmica.
              </p>
            </div>
          </div>

          {/* Troubleshooting */}
          <Alert>
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="text-sm space-y-2">
              <p className="font-medium">¿Problemas?</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2">
                <li>Verificá que QZ Tray esté corriendo (ícono en la bandeja)</li>
                <li>Comprobá que la impresora esté encendida y conectada</li>
                <li>Instalá el driver oficial de tu impresora</li>
                <li>Recargá la página del ERP después de instalar QZ Tray</li>
                <li>Si usás antivirus, agregá QZ Tray a las excepciones</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Links útiles */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <p className="font-medium text-sm">Links útiles:</p>
            <div className="space-y-1">
              <a 
                href="https://qz.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Sitio oficial QZ Tray <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="https://github.com/qzind/tray/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Descargas GitHub <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="https://www.hasar.com/descargas/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Drivers Hasar oficiales <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}