/**
 * TICKET SERVICE - Generación de Tickets como Documentos
 * 
 * Este servicio genera tickets como documentos de texto reutilizables.
 * El ticket es un DOCUMENTO, no una vista.
 * 
 * Puede ser usado para:
 * - Impresión térmica (ESC/POS)
 * - Impresión genérica (texto plano)
 * - Reimpresión
 * - Auditoría
 * - Almacenamiento
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Generar ticket como documento de texto plano
 * @param {Object} venta - Datos de la venta
 * @param {Array} pagos - Formas de pago
 * @param {Object} empresaConfig - Configuración de la empresa
 * @param {boolean} isCopia - Si es copia del ticket
 * @param {number} anchoMaximo - Ancho máximo en caracteres (32, 42, 48)
 * @returns {string} Ticket como string de texto plano
 */
export const generateTicketDocument = (venta, pagos = [], empresaConfig = null, isCopia = false, anchoMaximo = 48) => {
  const lines = [];
  const center = (text) => {
    const spaces = Math.max(0, Math.floor((anchoMaximo - text.length) / 2));
    return ' '.repeat(spaces) + text;
  };
  const right = (text, leftText = '') => {
    const spaces = Math.max(0, anchoMaximo - leftText.length - text.length);
    return leftText + ' '.repeat(spaces) + text;
  };
  const repeat = (char, times) => char.repeat(times);
  const truncate = (text, maxLen) => text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : text;
  const currency = (amount) => `$${parseFloat(amount || 0).toFixed(2)}`;

  // ========== ENCABEZADO ==========
  const nombreEmpresa = empresaConfig?.nombre_empresa || 'LIBRERÍA PAPELERÍA';
  lines.push(center(nombreEmpresa));
  lines.push(center('Tel: (123) 456-7890'));
  lines.push(repeat('=', anchoMaximo));
  
  if (isCopia) {
    lines.push(center('*** COPIA - NO VALIDO COMO FACTURA ***'));
    lines.push(repeat('=', anchoMaximo));
  }

  // ========== DATOS DEL COMPROBANTE ==========
  const tipoComprobante = venta.tipo_comprobante || 'X';
  const numeroComprobante = venta.numero_comprobante || 'S/N';
  lines.push(center(`TICKET ${tipoComprobante} - ${numeroComprobante}`));
  
  const fecha = venta.created_date 
    ? format(new Date(venta.created_date), "dd/MM/yyyy HH:mm", { locale: es })
    : format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
  lines.push(center(fecha));
  lines.push(repeat('-', anchoMaximo));

  // ========== DATOS DEL CLIENTE ==========
  if (venta.client_name) {
    lines.push(`Cliente: ${truncate(venta.client_name, anchoMaximo - 9)}`);
  }
  if (venta.employee_name) {
    lines.push(`Vendedor: ${truncate(venta.employee_name, anchoMaximo - 10)}`);
  }
  lines.push(repeat('-', anchoMaximo));

  // ========== ITEMS ==========
  lines.push('DESCRIPCION');
  lines.push(right('IMPORTE', 'CANT x PRECIO'));
  lines.push(repeat('-', anchoMaximo));

  (venta.items || []).forEach(item => {
    const nombre = truncate(item.name, anchoMaximo);
    lines.push(nombre);
    
    const cantPrecio = `${item.quantity} x ${currency(item.precio_venta)}`;
    const total = currency((item.quantity || 0) * (item.precio_venta || 0));
    lines.push(right(total, cantPrecio));
  });

  lines.push(repeat('-', anchoMaximo));

  // ========== TOTALES ==========
  lines.push(right(currency(venta.subtotal || 0), 'SUBTOTAL:'));
  
  if (venta.discount > 0) {
    lines.push(right(`-${currency(venta.discount)}`, 'DESCUENTO:'));
  }

  if (venta.genera_iva && venta.iva_21 > 0) {
    const netoGravado = venta.neto_gravado || 0;
    lines.push(right(currency(netoGravado), 'Neto Gravado:'));
    lines.push(right(currency(venta.iva_21), 'IVA 21%:'));
  }

  lines.push(repeat('=', anchoMaximo));
  lines.push(right(currency(venta.total || 0), 'TOTAL:'));
  lines.push(repeat('=', anchoMaximo));

  // ========== FORMAS DE PAGO ==========
  if (pagos && pagos.length > 0) {
    lines.push('');
    lines.push('FORMAS DE PAGO:');
    pagos.forEach(pago => {
      lines.push(right(currency(pago.monto), `${pago.medio_nombre}:`));
    });
    lines.push(repeat('-', anchoMaximo));
  }

  // ========== PIE DE PÁGINA ==========
  lines.push('');
  lines.push(center('¡Gracias por su compra!'));
  lines.push(center('Vuelva pronto'));
  lines.push('');

  return lines.join('\n');
};

/**
 * Generar ticket como documento ESC/POS para impresoras térmicas
 * @param {Object} venta - Datos de la venta
 * @param {Array} pagos - Formas de pago
 * @param {Object} empresaConfig - Configuración de la empresa
 * @param {boolean} isCopia - Si es copia del ticket
 * @returns {Array} Array de comandos ESC/POS
 */
export const generateTicketESCPOS = (venta, pagos = [], empresaConfig = null, isCopia = false) => {
  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';
  
  const commands = [];
  
  // Inicializar impresora
  commands.push(ESC + '@');
  
  // Centrar texto
  commands.push(ESC + 'a' + String.fromCharCode(1));
  
  // ========== ENCABEZADO ==========
  // Texto grande y en negrita
  commands.push(ESC + '!' + String.fromCharCode(0x30));
  const nombreEmpresa = empresaConfig?.nombre_empresa || 'LIBRERÍA PAPELERÍA';
  commands.push(nombreEmpresa + LF);
  
  // Texto normal
  commands.push(ESC + '!' + String.fromCharCode(0));
  commands.push('Tel: (123) 456-7890' + LF);
  commands.push('================================' + LF);
  
  if (isCopia) {
    commands.push(ESC + '!' + String.fromCharCode(0x10)); // negrita
    commands.push('*** COPIA - NO VALIDO ***' + LF);
    commands.push(ESC + '!' + String.fromCharCode(0)); // normal
    commands.push('================================' + LF);
  }

  // ========== DATOS DEL COMPROBANTE ==========
  const tipoComprobante = venta.tipo_comprobante || 'X';
  const numeroComprobante = venta.numero_comprobante || 'S/N';
  commands.push(`TICKET ${tipoComprobante} - ${numeroComprobante}` + LF);
  
  const fecha = venta.created_date 
    ? format(new Date(venta.created_date), "dd/MM/yyyy HH:mm", { locale: es })
    : format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
  commands.push(fecha + LF);
  commands.push('--------------------------------' + LF);

  // Alinear a la izquierda
  commands.push(ESC + 'a' + String.fromCharCode(0));

  // ========== DATOS DEL CLIENTE ==========
  if (venta.client_name) {
    commands.push(`Cliente: ${venta.client_name}` + LF);
  }
  if (venta.employee_name) {
    commands.push(`Vendedor: ${venta.employee_name}` + LF);
  }
  commands.push('--------------------------------' + LF);

  // ========== ITEMS ==========
  (venta.items || []).forEach(item => {
    commands.push(item.name + LF);
    commands.push(`${item.quantity} x $${parseFloat(item.precio_venta || 0).toFixed(2)} = $${parseFloat((item.quantity || 0) * (item.precio_venta || 0)).toFixed(2)}` + LF);
  });

  commands.push('--------------------------------' + LF);

  // ========== TOTALES ==========
  // Alinear a la derecha
  commands.push(ESC + 'a' + String.fromCharCode(2));
  
  commands.push(`SUBTOTAL: $${parseFloat(venta.subtotal || 0).toFixed(2)}` + LF);
  
  if (venta.discount > 0) {
    commands.push(`DESCUENTO: -$${parseFloat(venta.discount).toFixed(2)}` + LF);
  }

  if (venta.genera_iva && venta.iva_21 > 0) {
    commands.push(`Neto Gravado: $${parseFloat(venta.neto_gravado || 0).toFixed(2)}` + LF);
    commands.push(`IVA 21%: $${parseFloat(venta.iva_21).toFixed(2)}` + LF);
  }

  commands.push('================================' + LF);
  
  // Negrita para el total
  commands.push(ESC + '!' + String.fromCharCode(0x10));
  commands.push(`TOTAL: $${parseFloat(venta.total || 0).toFixed(2)}` + LF);
  commands.push(ESC + '!' + String.fromCharCode(0));
  commands.push('================================' + LF);

  // ========== FORMAS DE PAGO ==========
  if (pagos && pagos.length > 0) {
    commands.push(LF + 'FORMAS DE PAGO:' + LF);
    pagos.forEach(pago => {
      commands.push(`${pago.medio_nombre}: $${parseFloat(pago.monto).toFixed(2)}` + LF);
    });
    commands.push('--------------------------------' + LF);
  }

  // ========== PIE DE PÁGINA ==========
  // Centrar
  commands.push(ESC + 'a' + String.fromCharCode(1));
  commands.push(LF + '¡Gracias por su compra!' + LF);
  commands.push('Vuelva pronto' + LF + LF + LF);
  
  // Cortar papel
  commands.push(GS + 'V' + String.fromCharCode(66) + String.fromCharCode(0));
  
  return commands;
};

/**
 * API pública del servicio
 */
export const TicketService = {
  generateDocument: generateTicketDocument,
  generateESCPOS: generateTicketESCPOS
};

export default TicketService;