import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PrintFormat80mm({ presupuesto }) {
  if (!presupuesto) return null;

  return (
    <div className="w-full bg-white" style={{ width: "80mm", margin: "0 auto", padding: "8mm", minHeight: "100vh", fontSize: "10px", fontFamily: "'Courier New', monospace", lineHeight: 1.4 }}>
      {/* Separador superior */}
      <div style={{ textAlign: "center", marginBottom: "6mm", paddingBottom: "4mm", borderBottom: "1px dashed #000" }}>
        <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 2mm 0", letterSpacing: "0.05em" }}>PRESUPUESTO</p>
        <p style={{ fontSize: "9px", margin: "0", fontFamily: "'Courier New', monospace" }}>{presupuesto.numero_presupuesto}</p>
      </div>

      {/* Fechas */}
      <div style={{ marginBottom: "6mm", fontSize: "9px" }}>
        <p style={{ margin: "0 0 1mm 0" }}>Fecha: {format(new Date(presupuesto.fecha), "dd/MM/yyyy")}</p>
        <p style={{ margin: "0", borderBottom: "1px dashed #000", paddingBottom: "2mm" }}>Válido: {format(new Date(presupuesto.validez_hasta), "dd/MM/yyyy")}</p>
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: "6mm" }}>
        <p style={{ fontSize: "8px", fontWeight: "bold", textTransform: "uppercase", margin: "0 0 2mm 0" }}>Cliente:</p>
        <p style={{ fontSize: "10px", fontWeight: "bold", margin: "0 0 1mm 0", wordBreak: "break-word" }}>{presupuesto.cliente_name}</p>
        {presupuesto.cliente_tipo_iva && (
          <p style={{ fontSize: "8px", margin: "0", color: "#333" }}>IVA: {presupuesto.cliente_tipo_iva}</p>
        )}
        <p style={{ fontSize: "8px", margin: "0", borderBottom: "1px dashed #000", paddingBottom: "2mm" }}></p>
      </div>

      {/* Ítems */}
      <div style={{ marginBottom: "6mm" }}>
        <p style={{ fontSize: "8px", fontWeight: "bold", textTransform: "uppercase", margin: "0 0 3mm 0" }}>Articulos</p>
        {presupuesto.items?.map((item, idx) => (
          <div key={idx} style={{ marginBottom: "4mm", borderBottom: "1px dotted #000", paddingBottom: "3mm" }}>
            <p style={{ fontSize: "9px", fontWeight: "bold", margin: "0 0 1mm 0", wordBreak: "break-word", maxWidth: "60mm" }}>{item.name}</p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginBottom: "1mm" }}>
              <span>Cant: {item.cantidad}</span>
              <span>${(item.precio_unitario || 0).toFixed(2)}</span>
            </div>
            <div style={{ textAlign: "right", fontSize: "9px", fontWeight: "bold", color: "#000" }}>
              ${(item.subtotal || 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Separador */}
      <div style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "3mm 0", margin: "6mm 0" }}></div>

      {/* Totales */}
      <div style={{ marginBottom: "6mm", fontSize: "10px" }}>
        {presupuesto.descuento > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2mm", fontSize: "9px" }}>
            <span>Descuento:</span>
            <span>-${(presupuesto.descuento || 0).toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2mm", fontSize: "9px" }}>
          <span>Subtotal:</span>
          <span>${(presupuesto.subtotal || 0).toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "bold" }}>
          <span>TOTAL:</span>
          <span>${(presupuesto.total_presupuesto || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Separador final */}
      <div style={{ borderBottom: "1px dashed #000", marginBottom: "4mm", paddingBottom: "4mm" }}></div>

      {/* Pie */}
      <div style={{ textAlign: "center", fontSize: "8px", lineHeight: 1.4 }}>
        <p style={{ margin: "0 0 1mm 0" }}>{format(new Date(presupuesto.created_date || new Date()), "dd/MM/yyyy", { locale: es })}</p>
        <p style={{ margin: 0, fontWeight: "bold" }}>{presupuesto.usuario_creador_nombre}</p>
      </div>

      {/* Corte */}
      <div style={{ textAlign: "center", marginTop: "8mm", fontSize: "7px", color: "#999" }}>
        - - - - - - - - - - -
      </div>
    </div>
  );
}