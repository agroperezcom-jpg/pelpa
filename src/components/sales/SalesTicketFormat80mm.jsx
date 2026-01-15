import React from "react";
import { format } from "date-fns";

export default function SalesTicketFormat80mm({ venta, pagos }) {
  if (!venta) return null;

  return (
    <div className="w-full bg-white" style={{ width: "80mm", margin: "0 auto", padding: "8mm", minHeight: "100vh", fontSize: "10px", fontFamily: "'Courier New', monospace", lineHeight: 1.4 }}>
      {/* Separador superior */}
      <div style={{ textAlign: "center", marginBottom: "6mm", paddingBottom: "4mm", borderBottom: "1px dashed #000" }}>
        <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 2mm 0", letterSpacing: "0.05em" }}>COMPROBANTE</p>
        <p style={{ fontSize: "9px", margin: "0", fontFamily: "'Courier New', monospace" }}>{venta.numero_comprobante}</p>
        <p style={{ fontSize: "8px", margin: "0 0 1mm 0" }}>
          {venta.tipo_comprobante === 'A' ? 'Factura A' : venta.tipo_comprobante === 'B' ? 'Factura B' : 'Ticket X'}
        </p>
      </div>

      {/* Fechas */}
      <div style={{ marginBottom: "6mm", fontSize: "9px" }}>
        <p style={{ margin: "0 0 1mm 0" }}>{format(new Date(venta.created_date), "dd/MM/yyyy HH:mm")}</p>
        <p style={{ margin: "0", borderBottom: "1px dashed #000", paddingBottom: "2mm" }}>Cliente: {venta.client_name || "Consumidor Final"}</p>
      </div>

      {/* Ítems */}
      <div style={{ marginBottom: "6mm" }}>
        <p style={{ fontSize: "8px", fontWeight: "bold", textTransform: "uppercase", margin: "0 0 3mm 0" }}>Articulos</p>
        {venta.items?.map((item, idx) => (
          <div key={idx} style={{ marginBottom: "4mm", borderBottom: "1px dotted #000", paddingBottom: "3mm" }}>
            <p style={{ fontSize: "9px", fontWeight: "bold", margin: "0 0 1mm 0", wordBreak: "break-word", maxWidth: "60mm" }}>{item.name}</p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginBottom: "1mm" }}>
              <span>Cant: {item.quantity}</span>
              <span>${(item.precio_venta || 0).toFixed(2)}</span>
            </div>
            <div style={{ textAlign: "right", fontSize: "9px", fontWeight: "bold", color: "#000" }}>
              ${(item.total || 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Separador */}
      <div style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "3mm 0", margin: "6mm 0" }}></div>

      {/* Totales */}
      <div style={{ marginBottom: "6mm", fontSize: "10px" }}>
        {venta.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2mm", fontSize: "9px" }}>
            <span>Descuento:</span>
            <span>-${(venta.discount || 0).toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2mm", fontSize: "9px" }}>
          <span>Subtotal:</span>
          <span>${(venta.subtotal || 0).toFixed(2)}</span>
        </div>
        {venta.genera_iva && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2mm", fontSize: "8px" }}>
              <span>Neto:</span>
              <span>${(venta.neto_gravado || 0).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2mm", fontSize: "8px" }}>
              <span>IVA 21%:</span>
              <span>${(venta.iva_21 || 0).toFixed(2)}</span>
            </div>
          </>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "bold" }}>
          <span>TOTAL:</span>
          <span>${(venta.total || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Medios de Pago */}
      {pagos && pagos.length > 0 && (
        <div style={{ marginBottom: "4mm", borderBottom: "1px dashed #000", paddingBottom: "3mm", fontSize: "8px" }}>
          <p style={{ fontWeight: "bold", margin: "0 0 2mm 0" }}>PAGOS:</p>
          {pagos.map((pago, idx) => (
            <p key={idx} style={{ margin: "1mm 0" }}>
              {pago.medio_pago_nombre}: ${(pago.importe || 0).toFixed(2)}
            </p>
          ))}
        </div>
      )}

      {/* Separador final */}
      <div style={{ borderBottom: "1px dashed #000", marginBottom: "4mm", paddingBottom: "4mm" }}></div>

      {/* Pie */}
      <div style={{ textAlign: "center", fontSize: "8px", lineHeight: 1.4 }}>
        <p style={{ margin: "0 0 1mm 0" }}>{format(new Date(venta.created_date), "dd/MM/yyyy")}</p>
        <p style={{ margin: 0, fontWeight: "bold" }}>{venta.employee_name}</p>
      </div>

      {/* Corte */}
      <div style={{ textAlign: "center", marginTop: "8mm", fontSize: "7px", color: "#999" }}>
        - - - - - - - - - - -
      </div>
    </div>
  );
}