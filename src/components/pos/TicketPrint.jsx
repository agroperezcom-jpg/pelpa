import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Función para generar el HTML del ticket e imprimirlo en una nueva ventana
export const printTicket = (venta, pagos = [], isCopia = false) => {
  if (!venta) return;

  const ticketHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket ${venta.numero_comprobante || 'SIN-NUM'}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 10mm;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 80mm;
          background: white;
        }
        .ticket {
          width: 100%;
        }
        .center {
          text-align: center;
        }
        .bold {
          font-weight: bold;
        }
        .dashed {
          border-top: 1px dashed #000;
          margin: 3mm 0;
        }
        .solid {
          border-top: 1px solid #000;
          margin: 1mm 0;
        }
        .thick {
          border-top: 2px solid #000;
          padding-top: 2mm;
        }
        .header {
          font-size: 16px;
          font-weight: bold;
        }
        .small {
          font-size: 10px;
        }
        .tiny {
          font-size: 9px;
          color: #666;
        }
        .right {
          text-align: right;
        }
        .flex {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2mm;
        }
        .item {
          margin-bottom: 2mm;
        }
        .item-detail {
          margin-left: 6mm;
          font-size: 9px;
          color: #666;
        }
        .green {
          color: #059669;
        }
        .space {
          height: 10mm;
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <!-- Encabezado -->
        <div class="center" style="margin-bottom: 5mm;">
          <div class="header">LIBRERÍA PAPELERÍA</div>
          <div class="small">Razón Social SRL</div>
          <div class="small">CUIT: 20-12345678-9</div>
          <div class="small">Av. Principal 1234</div>
          <div class="small">Tel: (011) 4444-5555</div>
        </div>

        <div class="dashed"></div>

        ${isCopia ? '<div class="center bold" style="margin: 3mm 0; font-size: 14px;">*** COPIA ***</div>' : ''}

        <!-- Info Venta -->
        <div class="small" style="margin-bottom: 3mm;">
          <div class="bold" style="font-size: 12px;">
            TICKET ${venta.tipo_comprobante} N°: ${venta.numero_comprobante || 'SIN-NUM'}
          </div>
          <div>FECHA: ${format(new Date(venta.created_date), "dd/MM/yyyy HH:mm", { locale: es })}</div>
          <div>CLIENTE: ${venta.client_name || 'CONSUMIDOR FINAL'}</div>
          <div>CAJERO: ${venta.employee_name}</div>
          <div>LISTA: ${venta.tipo_lista}</div>
        </div>

        <div class="dashed"></div>

        <!-- Artículos -->
        <div style="font-size: 11px;">
          <div class="bold" style="margin-bottom: 2mm;">
            <span>CANT</span>
            <span style="margin-left: 8mm;">DESCRIPCIÓN</span>
            <span style="float: right;">SUBTOTAL</span>
          </div>
          <div class="solid"></div>
          
          ${venta.items?.map(item => `
            <div class="item">
              <div>
                <span style="display: inline-block; width: 6mm;">${item.quantity}</span>
                <span style="display: inline-block; width: 42mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${item.name}
                </span>
                <span style="float: right;">$${item.total?.toFixed(2)}</span>
              </div>
              ${item.precio_venta ? `
                <div class="item-detail">
                  $${item.precio_venta?.toFixed(2)} x ${item.quantity}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="dashed"></div>

        <!-- Totales -->
        <div class="right" style="font-size: 14px; font-weight: bold; margin-bottom: 5mm;">
          <div style="font-size: 12px; font-weight: normal; margin-bottom: 2mm;">
            Subtotal: $${venta.subtotal?.toFixed(2)}
          </div>
          ${venta.discount > 0 ? `
            <div style="font-size: 12px; font-weight: normal; margin-bottom: 2mm;">
              Descuento: -$${venta.discount?.toFixed(2)}
            </div>
          ` : ''}
          ${venta.genera_iva && venta.neto_gravado ? `
            <div class="dashed"></div>
            <div style="font-size: 12px; font-weight: normal; margin-bottom: 1mm;">
              Neto Gravado: $${venta.neto_gravado?.toFixed(2)}
            </div>
            <div style="font-size: 12px; font-weight: bold; margin-bottom: 2mm; color: #059669;">
              IVA 21%: $${venta.iva_21?.toFixed(2)}
            </div>
          ` : ''}
          <div class="thick">
            TOTAL: $${venta.total?.toFixed(2)}
          </div>
        </div>

        <div class="dashed"></div>

        <!-- Detalle de Pagos -->
        ${pagos && pagos.length > 0 ? `
          <div style="font-size: 11px; margin-bottom: 5mm;">
            <div class="bold" style="margin-bottom: 2mm;">FORMA DE PAGO:</div>
            ${pagos.map(pago => `
              <div style="margin-bottom: 1mm;">
                <span>${pago.medio_pago_nombre}</span>
                ${pago.banco_nombre ? `<span class="tiny"> (${pago.banco_nombre})</span>` : ''}
                ${pago.caja_nombre ? `<span class="tiny"> (${pago.caja_nombre})</span>` : ''}
                <span style="float: right;">$${pago.importe?.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Tipo de Venta -->
        ${venta.tipo_venta ? `
          <div class="small center" style="margin-bottom: 3mm;">
            <div class="bold">
              ${venta.tipo_venta === "CONTADO" ? "VENTA DE CONTADO" : ""}
              ${venta.tipo_venta === "CTA_CTE" ? "VENTA EN CUENTA CORRIENTE" : ""}
              ${venta.tipo_venta === "MIXTA" ? "VENTA MIXTA (CONTADO + CTA CTE)" : ""}
            </div>
          </div>
        ` : ''}

        <div class="dashed"></div>

        <!-- Pie -->
        <div class="center" style="font-size: 11px; margin-top: 5mm;">
          <div class="bold" style="margin-bottom: 2mm;">¡GRACIAS POR SU COMPRA!</div>
          <div class="tiny">Conserve este ticket</div>
        </div>

        <div class="space"></div>
      </div>
    </body>
    </html>
  `;

  // Abrir nueva ventana e imprimir
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (printWindow) {
    printWindow.document.write(ticketHTML);
    printWindow.document.close();
    
    // Esperar a que el contenido cargue antes de imprimir
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      // Cerrar la ventana después de imprimir (opcional)
      setTimeout(() => {
        printWindow.close();
      }, 500);
    };
  } else {
    alert('Por favor, habilita las ventanas emergentes para imprimir el ticket.');
  }
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