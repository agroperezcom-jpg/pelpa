import qz from 'qz-tray';

// Certificado para firma digital (necesario para QZ Tray 2.x)
// NOTA: Este es un certificado de desarrollo. Para producción, generá uno propio en:
// https://qz.io/wiki/using-a-self-signed-certificate
const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIEJzCCAw+gAwIBAgIBATANBgkqhkiG9w0BAQsFADB6MQswCQYDVQQGEwJVUzEL
MAkGA1UECAwCTlkxETAPBgNVBAcMCEJ1ZmZhbG8xFTATBgNVBAoMDFF6IEluZHVz
dHJpZXMxGTAXBgNVBAsMEERlbW9ncmFwaGljIE9yZzEZMBcGA1UEAwwQcXppbmQu
Z2l0aHViLmlvMB4XDTE2MDMwNjE1MjkxN1oXDTI2MDMwNjE1MjkxN1owejELMAkG
A1UEBhMCVVMxCzAJBgNVBAgMAk5ZMREwDwYDVQQHDAhCdWZmYWxvMRUwEwYDVQQK
DAxReiBJbmR1c3RyaWVzMRkwFwYDVQQLDBBEZW1vZ3JhcGhpYyBPcmcxGTAXBgNV
BAMMEHF6aW5kLmdpdGh1Yi5pbzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC
ggEBANTDgbmZN11fz5SiJUvGnlvR3F5A9J2sEw7nL7C2FfkMWJYKQVmGg6UuKlPf
t0KCGLQCNjKMHQ5X1M+JOhYcXLn0xGZqcWEBBJcbGqJTLEoJZQEQ0fXNvvPGAajx
E1g7MJhpFAFTsVZLDPpWCHg9bPOBTG6j0xkWRMPXg+VBbLmOJPWQXtLILEhHRQyQ
VxChCHO6pQJXJWwHhIQRlcaZVRHvWBSKwcN3xmA9GKQoL7mTvPdLzTcwhGvF8NEL
3LBCZMxTVTHZk2tLVzLLEKBGJLN2kYb3M5CKqWLn+vMKLZ9W0QvVaQQ/rCIjMPNV
eMxqLJQPHHmGhNdYb7mzJZWvS7sCAwEAAaOBuTCBtjAJBgNVHRMEAjAAMBEGCWCG
SAGG+EIBAQQEAwIFoDAzBglghkgBhvhCAQ0EJhYkT3BlblNTTCBHZW5lcmF0ZWQg
Q2xpZW50IENlcnRpZmljYXRlMB0GA1UdDgQWBBQCu+TqiO0Tk2TnEpZNwMmQY6Gg
8DAfBgNVHSMEGDAWgBQCu+TqiO0Tk2TnEpZNwMmQY6Gg8DAOBgNVHQ8BAf8EBAMC
BeAwEwYDVR0lBAwwCgYIKwYBBQUHAwIwDQYJKoZIhvcNAQELBQADggEBAMqKSbPc
CgCxgn8f4TBqjmJwS1eoNQp0uyxV1cKK4YhLGALdNMgBLVEQN6xZvPHfMTqN5WxF
cR9H5sTqZW2Y8mIFRRMlJNLRO7eVUiSlLFbXfuNLoKlp0xEvqVnPh5nE3aBcRKN0
dLjGPkqPqsLb1cG8c5MbPYOBgLN8dPGgH8BHQX7qEZJlvPSKKHXjJGhvHJHBXCgD
NwGVxPqFT9kB0rsPvWZLhPGLfQQfGYRQWQqQCvTp8YmPYMtgvTGnJX0zNgJ0bLMf
OFGqVhVLKXbJWqHwFG6Lf0nNYkDqFVSe3xGLZkdFCdBLXI5dZj+J0cE8gRhqGLxz
jRRLLFZnJWQRfZE=
-----END CERTIFICATE-----`;

let isConnected = false;
let availablePrinters = [];

/**
 * Conectar con QZ Tray
 */
export const connectQZ = async () => {
  if (isConnected) return true;
  
  try {
    // Configurar firma (opcional en desarrollo, obligatorio en producción)
    qz.security.setCertificatePromise(() => Promise.resolve(CERTIFICATE));
    qz.security.setSignaturePromise((toSign) => Promise.resolve(toSign));
    
    await qz.websocket.connect();
    isConnected = true;
    console.log('✓ QZ Tray conectado');
    return true;
  } catch (error) {
    console.error('Error conectando QZ Tray:', error);
    return false;
  }
};

/**
 * Desconectar QZ Tray
 */
export const disconnectQZ = async () => {
  if (!isConnected) return;
  
  try {
    await qz.websocket.disconnect();
    isConnected = false;
    console.log('✓ QZ Tray desconectado');
  } catch (error) {
    console.error('Error desconectando QZ Tray:', error);
  }
};

/**
 * Obtener lista de impresoras disponibles
 */
export const getPrinters = async () => {
  try {
    if (!isConnected) {
      await connectQZ();
    }
    
    availablePrinters = await qz.printers.find();
    return availablePrinters;
  } catch (error) {
    console.error('Error obteniendo impresoras:', error);
    return [];
  }
};

/**
 * Buscar impresora térmica (Hasar, Epson, etc.)
 */
export const findThermalPrinter = async () => {
  const printers = await getPrinters();
  
  // Buscar por marcas comunes de térmicas
  const thermalBrands = ['Hasar', 'HASAR', 'Epson', 'EPSON', 'Star', 'STAR', 'Bixolon', 'BIXOLON'];
  
  const thermal = printers.find(printer => 
    thermalBrands.some(brand => printer.toLowerCase().includes(brand.toLowerCase()))
  );
  
  return thermal || printers[0]; // Si no encuentra térmica, usar primera impresora
};

/**
 * Generar comandos ESC/POS para ticket
 */
export const generateESCPOS = (venta, pagos = [], isCopia = false, empresaConfig = null) => {
  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';
  
  const commands = [];
  
  // Inicializar impresora
  commands.push(ESC + '@');
  
  // Centrar texto
  commands.push(ESC + 'a' + String.fromCharCode(1));
  
  // Texto grande y en negrita
  commands.push(ESC + '!' + String.fromCharCode(0x30));
  commands.push((empresaConfig?.nombre_empresa || 'LIBRERÍA PAPELERÍA') + LF);
  
  // Texto normal
  commands.push(ESC + '!' + String.fromCharCode(0));
  commands.push('Tel: (123) 456-7890' + LF);
  commands.push('================================' + LF);
  
  if (isCopia) {
    commands.push(ESC + '!' + String.fromCharCode(0x10)); // Negrita
    commands.push('*** COPIA ***' + LF);
    commands.push(ESC + '!' + String.fromCharCode(0));
  }
  
  // Información de venta
  commands.push(LF);
  if (venta.tipo_comprobante && venta.numero_comprobante) {
    commands.push(`Comprobante: ${venta.tipo_comprobante} ${venta.numero_comprobante}` + LF);
  }
  commands.push(`Fecha: ${new Date(venta.created_date).toLocaleString('es-AR')}` + LF);
  
  if (venta.client_name) {
    commands.push(`Cliente: ${venta.client_name}` + LF);
  }
  
  if (venta.employee_name) {
    commands.push(`Vendedor: ${venta.employee_name}` + LF);
  }
  
  commands.push('================================' + LF);
  
  // Alinear a la izquierda para items
  commands.push(ESC + 'a' + String.fromCharCode(0));
  
  // Items
  commands.push(LF + 'ITEMS:' + LF);
  commands.push('--------------------------------' + LF);
  
  (venta.items || []).forEach(item => {
    const name = item.name.substring(0, 28);
    const qty = String(item.quantity);
    const price = `$${item.precio_venta.toFixed(2)}`;
    const total = `$${(item.quantity * item.precio_venta).toFixed(2)}`;
    
    commands.push(`${name}` + LF);
    commands.push(`  ${qty} x ${price} = ${total}` + LF);
  });
  
  commands.push('--------------------------------' + LF);
  
  // Totales
  const subtotal = venta.subtotal || 0;
  const discount = venta.discount || 0;
  const total = venta.total || 0;
  
  commands.push(`Subtotal:           $${subtotal.toFixed(2)}` + LF);
  
  if (discount > 0) {
    commands.push(`Descuento:         -$${discount.toFixed(2)}` + LF);
  }
  
  if (venta.genera_iva && venta.iva_21 > 0) {
    commands.push(`IVA 21%:            $${venta.iva_21.toFixed(2)}` + LF);
  }
  
  commands.push(LF);
  commands.push(ESC + '!' + String.fromCharCode(0x30)); // Grande y negrita
  commands.push(`TOTAL:              $${total.toFixed(2)}` + LF);
  commands.push(ESC + '!' + String.fromCharCode(0));
  
  // Formas de pago
  if (pagos && pagos.length > 0) {
    commands.push(LF + '--------------------------------' + LF);
    commands.push('FORMAS DE PAGO:' + LF);
    pagos.forEach(pago => {
      commands.push(`${pago.medio_nombre}: $${pago.monto.toFixed(2)}` + LF);
    });
  }
  
  // Footer
  commands.push(LF + '================================' + LF);
  commands.push(ESC + 'a' + String.fromCharCode(1)); // Centrar
  commands.push('¡Gracias por su compra!' + LF);
  commands.push('www.example.com' + LF);
  commands.push(LF + LF);
  
  // Cortar papel
  commands.push(GS + 'V' + String.fromCharCode(1));
  
  return commands;
};

/**
 * Imprimir ticket con QZ Tray
 */
export const printTicketQZ = async (venta, pagos = [], isCopia = false, printerName = null, empresaConfig = null) => {
  try {
    // Conectar si no está conectado
    if (!isConnected) {
      const connected = await connectQZ();
      if (!connected) {
        throw new Error('No se pudo conectar con QZ Tray');
      }
    }
    
    // Buscar impresora
    let printer = printerName;
    if (!printer) {
      printer = await findThermalPrinter();
      if (!printer) {
        throw new Error('No se encontró ninguna impresora');
      }
    }
    
    console.log('Imprimiendo en:', printer);
    
    // Generar comandos ESC/POS
    const commands = generateESCPOS(venta, pagos, isCopia, empresaConfig);
    
    // Configurar trabajo de impresión
    const config = qz.configs.create(printer, { encoding: 'UTF-8' });
    
    // Imprimir
    await qz.print(config, commands);
    
    return { success: true, printer };
  } catch (error) {
    console.error('Error imprimiendo con QZ Tray:', error);
    throw error;
  }
};

/**
 * Imprimir ticket de prueba
 */
export const printTestTicket = async (printerName = null, empresaConfig = null) => {
  const testVenta = {
    created_date: new Date().toISOString(),
    tipo_comprobante: 'X',
    numero_comprobante: '00001-00000001',
    client_name: 'Cliente de Prueba',
    employee_name: 'Vendedor de Prueba',
    items: [
      { name: 'Producto de prueba 1', quantity: 2, precio_venta: 100, type: 'product' },
      { name: 'Producto de prueba 2', quantity: 1, precio_venta: 50, type: 'product' }
    ],
    subtotal: 250,
    discount: 0,
    total: 250,
    genera_iva: false,
    iva_21: 0
  };

  const testPagos = [
    { medio_nombre: 'Efectivo', monto: 250 }
  ];

  return await printTicketQZ(testVenta, testPagos, false, printerName, empresaConfig);
};

/**
 * Verificar si QZ Tray está instalado y corriendo
 */
export const checkQZStatus = async () => {
  try {
    await connectQZ();
    return {
      installed: true,
      running: true,
      version: await qz.api.getVersion()
    };
  } catch (error) {
    return {
      installed: false,
      running: false,
      error: error.message
    };
  }
};

/**
 * Obtener información del sistema
 */
export const getSystemInfo = async () => {
  try {
    if (!isConnected) await connectQZ();
    
    return {
      version: await qz.api.getVersion(),
      printers: await getPrinters()
    };
  } catch (error) {
    console.error('Error obteniendo info del sistema:', error);
    return null;
  }
};