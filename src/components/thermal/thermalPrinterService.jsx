/**
 * Servicio de Impresión Térmica
 * Genera tickets en formato texto plano compatible con impresoras térmicas ESC/POS
 * Soporta anchos: 32 caracteres (58mm), 42 caracteres (72mm), 48 caracteres (80mm)
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Configuración de ancho de papel
 */
export const PAPER_WIDTHS = {
  SMALL: 32,   // 58mm
  MEDIUM: 42,  // 72mm
  LARGE: 48    // 80mm
};

/**
 * Genera el ticket completo como texto plano
 */
export function generateTicketText(venta, pagos = [], isCopia = false, paperWidth = PAPER_WIDTHS.LARGE) {
  const lines = [];
  
  // Encabezado de la empresa
  lines.push(centerText("LIBRERÍA PAPELERÍA", paperWidth));
  lines.push(centerText("Razón Social SRL", paperWidth));
  lines.push(centerText("CUIT: 20-12345678-9", paperWidth));
  lines.push(centerText("Av. Principal 1234", paperWidth));
  lines.push(centerText("Tel: (011) 4444-5555", paperWidth));
  lines.push("");
  lines.push(repeatChar("-", paperWidth));
  
  // Marca de copia si aplica
  if (isCopia) {
    lines.push("");
    lines.push(centerText("*** COPIA ***", paperWidth));
    lines.push("");
  }
  
  // Información del comprobante
  lines.push(`TICKET ${venta.tipo_comprobante} ${venta.numero_comprobante || "SIN-NUM"}`);
  lines.push(`FECHA: ${format(new Date(venta.created_date), "dd/MM/yyyy HH:mm", { locale: es })}`);
  lines.push(`CLIENTE: ${(venta.client_name || "CONSUMIDOR FINAL").toUpperCase()}`);
  lines.push(`CAJERO: ${venta.employee_name || ""}`);
  lines.push(`LISTA: ${venta.tipo_lista || "MINORISTA"}`);
  lines.push(repeatChar("-", paperWidth));
  
  // Items
  if (venta.items && venta.items.length > 0) {
    venta.items.forEach(item => {
      // Línea principal: cantidad + nombre + total
      const qty = String(item.quantity).padEnd(3);
      const total = formatCurrency(item.total);
      const nameWidth = paperWidth - qty.length - total.length - 1;
      const name = truncateText(item.name, nameWidth);
      
      lines.push(`${qty}${name.padEnd(nameWidth)} ${total}`);
      
      // Línea secundaria: precio unitario
      if (item.precio_venta) {
        lines.push(`   ${formatCurrency(item.precio_venta)} x ${item.quantity}`);
      }
      lines.push("");
    });
  }
  
  lines.push(repeatChar("-", paperWidth));
  
  // Totales
  lines.push(alignRight(`Subtotal: ${formatCurrency(venta.subtotal)}`, paperWidth));
  
  if (venta.discount > 0) {
    lines.push(alignRight(`Descuento: -${formatCurrency(venta.discount)}`, paperWidth));
  }
  
  // IVA si aplica
  if (venta.genera_iva && venta.neto_gravado) {
    lines.push(repeatChar("-", paperWidth));
    lines.push(alignRight(`Neto Gravado: ${formatCurrency(venta.neto_gravado)}`, paperWidth));
    lines.push(alignRight(`IVA 21%: ${formatCurrency(venta.iva_21)}`, paperWidth));
  }
  
  lines.push(repeatChar("=", paperWidth));
  lines.push(alignRight(`TOTAL: ${formatCurrency(venta.total)}`, paperWidth, true));
  lines.push(repeatChar("=", paperWidth));
  
  // Formas de pago
  if (pagos && pagos.length > 0) {
    lines.push("");
    lines.push("FORMA DE PAGO:");
    pagos.forEach(pago => {
      let desc = pago.medio_pago_nombre;
      if (pago.banco_nombre) desc += ` (${pago.banco_nombre})`;
      if (pago.caja_nombre) desc += ` (${pago.caja_nombre})`;
      const importe = formatCurrency(pago.importe);
      const descWidth = paperWidth - importe.length - 1;
      lines.push(`${truncateText(desc, descWidth).padEnd(descWidth)} ${importe}`);
    });
    lines.push("");
  }
  
  // Tipo de venta
  if (venta.tipo_venta) {
    lines.push(repeatChar("-", paperWidth));
    let tipoVentaText = "";
    if (venta.tipo_venta === "CONTADO") tipoVentaText = "VENTA DE CONTADO";
    if (venta.tipo_venta === "CTA_CTE") tipoVentaText = "VENTA EN CUENTA CORRIENTE";
    if (venta.tipo_venta === "MIXTA") tipoVentaText = "VENTA MIXTA";
    if (tipoVentaText) {
      lines.push(centerText(tipoVentaText, paperWidth));
    }
  }
  
  // Pie
  lines.push("");
  lines.push(repeatChar("-", paperWidth));
  lines.push("");
  lines.push(centerText("¡GRACIAS POR SU COMPRA!", paperWidth));
  lines.push(centerText("Conserve este ticket", paperWidth));
  lines.push("");
  lines.push("");
  lines.push("");
  lines.push("");
  
  return lines.join("\n");
}

/**
 * Utilidades de formateo
 */

function centerText(text, width) {
  const padding = Math.floor((width - text.length) / 2);
  return " ".repeat(Math.max(0, padding)) + text;
}

function alignRight(text, width, bold = false) {
  const padding = width - text.length;
  return " ".repeat(Math.max(0, padding)) + text;
}

function repeatChar(char, times) {
  return char.repeat(times);
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return "$0.00";
  return `$${Number(amount).toFixed(2)}`;
}

function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Envía el ticket a impresión térmica
 */
export function printThermalTicket(ticketText, paperWidth = PAPER_WIDTHS.LARGE) {
  // Crear ventana de impresión dedicada
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  if (!printWindow) {
    alert('No se pudo abrir la ventana de impresión. Por favor, habilite las ventanas emergentes.');
    return;
  }
  
  // Determinar ancho en píxeles según papel
  let widthPx = '302px'; // 80mm ≈ 302px
  if (paperWidth === PAPER_WIDTHS.SMALL) widthPx = '219px'; // 58mm ≈ 219px
  if (paperWidth === PAPER_WIDTHS.MEDIUM) widthPx = '269px'; // 72mm ≈ 269px
  
  // HTML minimalista optimizado para térmicas
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: ${paperWidth === PAPER_WIDTHS.SMALL ? '58mm' : paperWidth === PAPER_WIDTHS.MEDIUM ? '72mm' : '80mm'} auto;
      margin: 0;
    }
    
    body {
      margin: 0;
      padding: 0;
      background: white;
      font-family: 'Courier New', 'Courier', monospace;
      font-size: 12px;
      line-height: 1.2;
      width: ${widthPx};
    }
    
    pre {
      margin: 0;
      padding: 5mm;
      font-family: 'Courier New', 'Courier', monospace;
      font-size: 12px;
      line-height: 1.2;
      white-space: pre;
      word-wrap: normal;
      overflow: visible;
      background: white;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      pre {
        padding: 2mm;
      }
    }
  </style>
</head>
<body>
<pre>${escapeHtml(ticketText)}</pre>
<script>
  window.onload = function() {
    setTimeout(function() {
      window.print();
      setTimeout(function() {
        window.close();
      }, 100);
    }, 250);
  };
</script>
</body>
</html>`;
  
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * API pública del servicio
 */
export default {
  generateTicketText,
  printThermalTicket,
  PAPER_WIDTHS
};