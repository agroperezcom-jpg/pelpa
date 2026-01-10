/**
 * TICKET PRINTER ADAPTER
 * 
 * Adaptador que toma un documento de ticket y lo envía a diferentes destinos de impresión.
 * Separa la lógica de generación del documento de la lógica de impresión.
 */

import TicketService from './ticketService';

/**
 * Imprimir ticket usando window.print (método genérico)
 */
export const printTicketGeneric = (ticketDocument) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes para imprimir');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 10px;
            white-space: pre;
          }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>${ticketDocument.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 100);
        };
      </script>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Imprimir ticket usando QZ Tray (impresión térmica ESC/POS)
 */
export const printTicketQZ = async (ticketCommands, printerName) => {
  // Importar dinámicamente para evitar errores si qz no está disponible
  const qz = window.qz;
  
  if (!qz) {
    throw new Error('QZ Tray no está disponible');
  }

  // Conectar si no está conectado
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }

  // Configurar impresora
  const config = qz.configs.create(printerName, { encoding: 'UTF-8' });
  
  // Imprimir
  await qz.print(config, ticketCommands);
};

/**
 * API del adaptador
 */
export const TicketPrinterAdapter = {
  printGeneric: printTicketGeneric,
  printQZ: printTicketQZ
};

export default TicketPrinterAdapter;