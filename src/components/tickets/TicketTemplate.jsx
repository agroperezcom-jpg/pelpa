import React from "react";

export default function TicketTemplate({ ticketData, ticketType = "sale" }) {
  if (!ticketData) return null;

  const {
    comercio_nombre = "MI EMPRESA",
    comercio_domicilio = "",
    comercio_telefono = "",
    comercio_email = "",
    numero_comprobante = "",
    tipo_comprobante = "X",
    fecha = new Date().toLocaleDateString("es-AR"),
    hora = new Date().toLocaleTimeString("es-AR"),
    cliente_nombre = "CONSUMIDOR FINAL",
    cliente_documento = "",
    cliente_domicilio = "",
    items = [],
    subtotal = 0,
    descuento = 0,
    neto_gravado = 0,
    iva_21 = 0,
    total = 0,
    forma_pago = "",
    observaciones = "",
  } = ticketData;

  const isPresupuesto = ticketType === "presupuesto";
  const titleText = isPresupuesto ? "PRESUPUESTO" : "TICKET DE VENTA";
  const subtitleText = isPresupuesto ? "NO VÁLIDO COMO FACTURA" : "";

  return (
    <div
      style={{
        fontFamily: "Courier, monospace",
        fontSize: "11px",
        lineHeight: "1.4",
        width: "80mm",
        padding: "5mm",
        backgroundColor: "#fff",
        color: "#000",
        fontWeight: "600",
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontWeight: "900", fontSize: "13px", letterSpacing: "0.5px" }}>{comercio_nombre}</div>
        {comercio_domicilio && <div style={{ fontSize: "9px", fontWeight: "700" }}>{comercio_domicilio}</div>}
        {comercio_telefono && <div style={{ fontSize: "9px", fontWeight: "700" }}>{comercio_telefono}</div>}
        {comercio_email && <div style={{ fontSize: "9px", fontWeight: "700" }}>{comercio_email}</div>}
      </div>

      <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "4px 0", marginBottom: "8px", textAlign: "center" }}>
        <div style={{ fontWeight: "900", fontSize: "12px", letterSpacing: "0.5px" }}>{titleText}</div>
        {subtitleText && <div style={{ fontSize: "9px", fontStyle: "italic", fontWeight: "700" }}>{subtitleText}</div>}
      </div>

      {/* Comprobante Info */}
      <div style={{ marginBottom: "8px", fontSize: "10px", fontWeight: "700" }}>
        <div>Comprobante: {tipo_comprobante} {numero_comprobante}</div>
        <div>Fecha: {fecha} {hora}</div>
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: "8px", fontSize: "10px", fontWeight: "700" }}>
        <div>Cliente: {cliente_nombre}</div>
        {cliente_documento && <div>Doc: {cliente_documento}</div>}
        {cliente_domicilio && <div>Dom: {cliente_domicilio}</div>}
      </div>

      {/* Separator */}
      <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

      {/* Items Header */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 1fr 1fr", gap: "2px", fontSize: "9px", fontWeight: "900", marginBottom: "4px" }}>
        <div>ARTÍCULO</div>
        <div style={{ textAlign: "center" }}>CANT</div>
        <div style={{ textAlign: "right" }}>P.UNIT</div>
        <div style={{ textAlign: "right" }}>TOTAL</div>
      </div>

      <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", paddingTop: "4px", paddingBottom: "4px", marginBottom: "4px" }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 1fr 1fr", gap: "2px", fontSize: "9px", marginBottom: "3px", fontWeight: "700" }}>
            <div style={{ wordWrap: "break-word" }}>{item.name}</div>
            <div style={{ textAlign: "center" }}>{item.quantity}</div>
            <div style={{ textAlign: "right" }}>${item.precio_venta?.toFixed(2) || item.precio_unitario?.toFixed(2) || "0.00"}</div>
            <div style={{ textAlign: "right" }}>${item.total?.toFixed(2) || "0.00"}</div>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div style={{ marginBottom: "8px", fontSize: "10px", fontWeight: "700" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal:</span>
          <span>${subtotal?.toFixed(2) || "0.00"}</span>
        </div>
        {descuento > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#d00", fontWeight: "800" }}>
            <span>Descuento:</span>
            <span>-${descuento?.toFixed(2) || "0.00"}</span>
          </div>
        )}
        {iva_21 > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Neto Gravado:</span>
              <span>${neto_gravado?.toFixed(2) || "0.00"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>IVA 21%:</span>
              <span>${iva_21?.toFixed(2) || "0.00"}</span>
            </div>
          </>
        )}
        <div style={{ borderTop: "1px dashed #000", paddingTop: "4px", display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "12px" }}>
          <span>TOTAL:</span>
          <span>${total?.toFixed(2) || "0.00"}</span>
        </div>
      </div>

      {/* Forma de pago */}
      {forma_pago && (
        <div style={{ marginBottom: "8px", fontSize: "10px", borderTop: "1px dashed #000", paddingTop: "4px", fontWeight: "700" }}>
          <div>Forma de Pago: {forma_pago}</div>
        </div>
      )}

      {/* Observaciones */}
      {observaciones && (
        <div style={{ marginBottom: "8px", fontSize: "9px", borderTop: "1px dashed #000", paddingTop: "4px" }}>
          <div style={{ fontWeight: "bold" }}>Observaciones:</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{observaciones}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px dashed #000", paddingTop: "4px", textAlign: "center", fontSize: "9px", marginTop: "8px" }}>
        <div>Gracias por su compra</div>
        {isPresupuesto && <div style={{ fontStyle: "italic" }}>Válido por 30 días</div>}
      </div>
    </div>
  );
}