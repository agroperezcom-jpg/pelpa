import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Función para imprimir el ticket usando el DOM actual
export const printTicket = (venta, pagos = [], isCopia = false) => {
  if (!venta) return;

  // Crear elemento temporal para impresión
  const printContainer = document.createElement('div');
  printContainer.id = 'ticket-print-container';
  
  const ticketHTML = `
    <div id="ticket-to-print" style="
      width: 80mm;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10mm;
      background: white;
      color: black;
    ">
      <!-- Encabezado -->
      <div style="text-align: center; margin-bottom: 5mm;">
        <div style="font-size: 16px; font-weight: bold;">LIBRERÍA PAPELERÍA</div>
        <div style="font-size: 10px;">Razón Social SRL</div>
        <div style="font-size: 10px;">CUIT: 20-12345678-9</div>
        <div style="font-size: 10px;">Av. Principal 1234</div>
        <div style="font-size: 10px;">Tel: (011) 4444-5555</div>
      </div>

      <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>

      ${isCopia ? '<div style="text-align: center; font-size: 14px; font-weight: bold; margin: 3mm 0;">*** COPIA ***</div>' : ''}

      <!-- Info Venta -->
      <div style="font-size: 10px; margin-bottom: 3mm;">
        <div style="font-size: 12px; font-weight: bold;">
          TICKET ${venta.tipo_comprobante} N°: ${venta.numero_comprobante || 'SIN-NUM'}
        </div>
        <div>FECHA: ${format(new Date(venta.created_date), "dd/MM/yyyy HH:mm", { locale: es })}</div>
        <div>CLIENTE: ${venta.client_name || 'CONSUMIDOR FINAL'}</div>
        <div>CAJERO: ${venta.employee_name}</div>
        <div>LISTA: ${venta.tipo_lista}</div>
      </div>

      <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>

      <!-- Artículos -->
      <div style="font-size: 11px;">
        <div style="font-weight: bold; margin-bottom: 2mm;">
          <span>CANT</span>
          <span style="margin-left: 8mm;">DESCRIPCIÓN</span>
          <span style="float: right;">SUBTOTAL</span>
        </div>
        <div style="border-top: 1px solid #000; margin: 1mm 0; clear: both;"></div>
        
        ${venta.items?.map(item => `
          <div style="margin-bottom: 2mm;">
            <div>
              <span style="display: inline-block; width: 6mm;">${item.quantity}</span>
              <span style="display: inline-block; width: 42mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${item.name}
              </span>
              <span style="float: right;">$${item.total?.toFixed(2)}</span>
            </div>
            ${item.precio_venta ? `
              <div style="font-size: 9px; color: #666; margin-left: 6mm; clear: both;">
                $${item.precio_venta?.toFixed(2)} x ${item.quantity}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <div style="border-top: 1px dashed #000; margin: 3mm 0; clear: both;"></div>

      <!-- Totales -->
      <div style="text-align: right; font-size: 14px; font-weight: bold; margin-bottom: 5mm;">
        <div style="font-size: 12px; font-weight: normal; margin-bottom: 2mm;">
          Subtotal: $${venta.subtotal?.toFixed(2)}
        </div>
        ${venta.discount > 0 ? `
          <div style="font-size: 12px; font-weight: normal; margin-bottom: 2mm;">
            Descuento: -$${venta.discount?.toFixed(2)}
          </div>
        ` : ''}
        ${venta.genera_iva && venta.neto_gravado ? `
          <div style="border-top: 1px dashed #000; margin: 2mm 0;"></div>
          <div style="font-size: 12px; font-weight: normal; margin-bottom: 1mm;">
            Neto Gravado: $${venta.neto_gravado?.toFixed(2)}
          </div>
          <div style="font-size: 12px; font-weight: bold; margin-bottom: 2mm; color: #059669;">
            IVA 21%: $${venta.iva_21?.toFixed(2)}
          </div>
        ` : ''}
        <div style="border-top: 2px solid #000; padding-top: 2mm;">
          TOTAL: $${venta.total?.toFixed(2)}
        </div>
      </div>

      <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>

      <!-- Detalle de Pagos -->
      ${pagos && pagos.length > 0 ? `
        <div style="font-size: 11px; margin-bottom: 5mm;">
          <div style="font-weight: bold; margin-bottom: 2mm;">FORMA DE PAGO:</div>
          ${pagos.map(pago => `
            <div style="margin-bottom: 1mm;">
              <span>${pago.medio_pago_nombre}</span>
              ${pago.banco_nombre ? `<span style="font-size: 9px;"> (${pago.banco_nombre})</span>` : ''}
              ${pago.caja_nombre ? `<span style="font-size: 9px;"> (${pago.caja_nombre})</span>` : ''}
              <span style="float: right;">$${pago.importe?.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Tipo de Venta -->
      ${venta.tipo_venta ? `
        <div style="font-size: 10px; text-align: center; margin-bottom: 3mm;">
          <div style="font-weight: bold;">
            ${venta.tipo_venta === "CONTADO" ? "VENTA DE CONTADO" : ""}
            ${venta.tipo_venta === "CTA_CTE" ? "VENTA EN CUENTA CORRIENTE" : ""}
            ${venta.tipo_venta === "MIXTA" ? "VENTA MIXTA (CONTADO + CTA CTE)" : ""}
          </div>
        </div>
      ` : ''}

      <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>

      <!-- Pie -->
      <div style="text-align: center; font-size: 11px; margin-top: 5mm;">
        <div style="font-weight: bold; margin-bottom: 2mm;">¡GRACIAS POR SU COMPRA!</div>
        <div style="font-size: 9px;">Conserve este ticket</div>
      </div>

      <div style="height: 10mm;"></div>
    </div>
  `;

  printContainer.innerHTML = ticketHTML;
  
  // Agregar estilos para impresión
  const styleElement = document.createElement('style');
  styleElement.innerHTML = `
    @media print {
      body * {
        visibility: hidden;
      }
      #ticket-print-container,
      #ticket-print-container * {
        visibility: visible;
      }
      #ticket-print-container {
        position: absolute;
        left: 0;
        top: 0;
      }
      @page {
        size: 80mm auto;
        margin: 0;
      }
    }
    @media screen {
      #ticket-print-container {
        position: fixed;
        left: -9999px;
        top: 0;
      }
    }
  `;
  
  // Agregar al DOM
  document.head.appendChild(styleElement);
  document.body.appendChild(printContainer);
  
  // Imprimir
  setTimeout(() => {
    window.print();
    
    // Limpiar después de imprimir
    setTimeout(() => {
      document.body.removeChild(printContainer);
      document.head.removeChild(styleElement);
    }, 1000);
  }, 100);
};

export default function TicketPrint({ venta, pagos, isCopia = false }) {
  if (!venta) return null;

  const handlePrint = () => {
    printTicket(venta, pagos, isCopia);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handlePrint}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        IMPRIMIR TICKET
      </button>

      {/* Vista previa del ticket */}
      <div 
        className="border rounded-lg bg-slate-50 p-4 mx-auto"
        style={{ maxWidth: '80mm' }}
      >
        <div 
          style={{
            width: '80mm',
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            padding: '10mm',
            backgroundColor: 'white',
            border: '1px solid #ccc'
          }}
        >
          {/* Encabezado */}
          <div style={{ textAlign: 'center', marginBottom: '5mm' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>LIBRERÍA PAPELERÍA</div>
            <div style={{ fontSize: '10px' }}>Razón Social SRL</div>
            <div style={{ fontSize: '10px' }}>CUIT: 20-12345678-9</div>
            <div style={{ fontSize: '10px' }}>Av. Principal 1234</div>
            <div style={{ fontSize: '10px' }}>Tel: (011) 4444-5555</div>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '3mm 0' }}></div>

          {isCopia && (
            <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', margin: '3mm 0' }}>
              *** COPIA ***
            </div>
          )}

          {/* Info Venta */}
          <div style={{ fontSize: '10px', marginBottom: '3mm' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
              TICKET {venta.tipo_comprobante} N°: {venta.numero_comprobante || 'SIN-NUM'}
            </div>
            <div>FECHA: {format(new Date(venta.created_date), "dd/MM/yyyy HH:mm", { locale: es })}</div>
            <div>CLIENTE: {venta.client_name || 'CONSUMIDOR FINAL'}</div>
            <div>CAJERO: {venta.employee_name}</div>
            <div>LISTA: {venta.tipo_lista}</div>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '3mm 0' }}></div>

          {/* Artículos */}
          <div style={{ fontSize: '11px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2mm' }}>
              <span>CANT</span>
              <span style={{ marginLeft: '8mm' }}>DESCRIPCIÓN</span>
              <span style={{ float: 'right' }}>SUBTOTAL</span>
            </div>
            <div style={{ borderTop: '1px solid #000', margin: '1mm 0' }}></div>
            
            {venta.items?.map((item, index) => (
              <div key={index} style={{ marginBottom: '2mm' }}>
                <div>
                  <span style={{ display: 'inline-block', width: '6mm' }}>{item.quantity}</span>
                  <span style={{ display: 'inline-block', width: '42mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span style={{ float: 'right' }}>${item.total?.toFixed(2)}</span>
                </div>
                {item.precio_venta && (
                  <div style={{ fontSize: '9px', color: '#666', marginLeft: '6mm' }}>
                    ${item.precio_venta?.toFixed(2)} x {item.quantity}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '3mm 0' }}></div>

          {/* Totales */}
          <div style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'right', marginBottom: '5mm' }}>
            <div style={{ fontSize: '12px', fontWeight: 'normal', marginBottom: '2mm' }}>
              Subtotal: ${venta.subtotal?.toFixed(2)}
            </div>
            {venta.discount > 0 && (
              <div style={{ fontSize: '12px', fontWeight: 'normal', marginBottom: '2mm' }}>
                Descuento: -${venta.discount?.toFixed(2)}
              </div>
            )}
            {venta.genera_iva && venta.neto_gravado && (
              <>
                <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }}></div>
                <div style={{ fontSize: '12px', fontWeight: 'normal', marginBottom: '1mm' }}>
                  Neto Gravado: ${venta.neto_gravado?.toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2mm', color: '#059669' }}>
                  IVA 21%: ${venta.iva_21?.toFixed(2)}
                </div>
              </>
            )}
            <div style={{ borderTop: '2px solid #000', paddingTop: '2mm' }}>
              TOTAL: ${venta.total?.toFixed(2)}
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '3mm 0' }}></div>

          {/* Detalle de Pagos */}
          {pagos && pagos.length > 0 && (
            <div style={{ fontSize: '11px', marginBottom: '5mm' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2mm' }}>FORMA DE PAGO:</div>
              {pagos.map((pago, index) => (
                <div key={index} style={{ marginBottom: '1mm' }}>
                  <span>{pago.medio_pago_nombre}</span>
                  {pago.banco_nombre && <span style={{ fontSize: '9px' }}> ({pago.banco_nombre})</span>}
                  {pago.caja_nombre && <span style={{ fontSize: '9px' }}> ({pago.caja_nombre})</span>}
                  <span style={{ float: 'right' }}>${pago.importe?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tipo de Venta */}
          {venta.tipo_venta && (
            <div style={{ fontSize: '10px', textAlign: 'center', marginBottom: '3mm' }}>
              <div style={{ fontWeight: 'bold' }}>
                {venta.tipo_venta === "CONTADO" && "VENTA DE CONTADO"}
                {venta.tipo_venta === "CTA_CTE" && "VENTA EN CUENTA CORRIENTE"}
                {venta.tipo_venta === "MIXTA" && "VENTA MIXTA (CONTADO + CTA CTE)"}
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px dashed #000', margin: '3mm 0' }}></div>

          {/* Pie */}
          <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '5mm' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2mm' }}>¡GRACIAS POR SU COMPRA!</div>
            <div style={{ fontSize: '9px' }}>Conserve este ticket</div>
          </div>

          {/* Espacio final */}
          <div style={{ height: '10mm' }}></div>
        </div>
      </div>
    </div>
  );
}