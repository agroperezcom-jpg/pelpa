import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PrintFormatMobile({ presupuesto }) {
  if (!presupuesto) return null;

  return (
    <div className="w-full bg-white" style={{ maxWidth: "500px", margin: "0 auto", padding: "24px 16px", fontSize: "13px", fontFamily: "system-ui, -apple-system, sans-serif", lineHeight: 1.6 }}>
      {/* Encabezado */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "2px solid #1e40af", textAlign: "center" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#1e40af", margin: "0 0 4px 0" }}>PRESUPUESTO</h1>
        <p style={{ fontSize: "16px", fontWeight: 900, color: "#1f2937", margin: "0 0 8px 0" }}>{presupuesto.numero_presupuesto}</p>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 2px 0", fontWeight: 600 }}>
          Fecha: {format(new Date(presupuesto.fecha), "d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: 0, fontWeight: 600 }}>
          Válido hasta: {format(new Date(presupuesto.validez_hasta), "d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", fontWeight: 900, color: "#1f2937", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>Cliente</p>
        <p style={{ fontSize: "16px", fontWeight: 900, color: "#111827", margin: "0 0 4px 0" }}>{presupuesto.cliente_name}</p>
        {presupuesto.cliente_tipo_iva && (
          <p style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600, margin: 0 }}>Condición IVA: {presupuesto.cliente_tipo_iva.replace(/_/g, ' ')}</p>
        )}
      </div>

      {/* Ítems */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", fontWeight: 900, color: "#1f2937", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 0" }}>Detalle de Ítems</p>
        <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
          {presupuesto.items?.map((item, idx) => (
            <div key={idx} style={{ padding: "12px", borderBottom: idx < presupuesto.items.length - 1 ? "1px solid #e5e7eb" : "none", backgroundColor: idx % 2 === 0 ? "#f9fafb" : "white" }}>
              <p style={{ fontSize: "13px", fontWeight: 900, color: "#1f2937", margin: "0 0 4px 0" }}>{item.name}</p>
              {item.descripcion && (
                <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 8px 0" }}>{item.descripcion}</p>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                <span>Cantidad: <strong>{item.cantidad}</strong></span>
                <span>Precio: <strong>${(item.precio_unitario || 0).toFixed(2)}</strong></span>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "13px", fontWeight: 900, color: "#1e40af" }}>
                Subtotal: ${(item.subtotal || 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#f3f4f6", borderRadius: "8px", border: "2px solid #1e40af" }}>
        {presupuesto.descuento > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
            <span style={{ fontWeight: 600 }}>Descuento:</span>
            <span style={{ fontWeight: 900, color: "#dc2626" }}>-${(presupuesto.descuento || 0).toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #d1d5db", fontSize: "13px" }}>
          <span style={{ fontWeight: 600 }}>Subtotal:</span>
          <span style={{ fontWeight: 900 }}>${(presupuesto.subtotal || 0).toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: 900, color: "#1e40af" }}>
          <span>TOTAL:</span>
          <span>${(presupuesto.total_presupuesto || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Observaciones */}
      {presupuesto.observaciones && (
        <div style={{ marginBottom: "24px", padding: "12px", backgroundColor: "#fef3c7", borderRadius: "8px", border: "1px solid #fcd34d" }}>
          <p style={{ fontSize: "11px", fontWeight: 900, color: "#78350f", textTransform: "uppercase", margin: "0 0 6px 0" }}>Observaciones</p>
          <p style={{ fontSize: "12px", color: "#92400e", margin: 0, lineHeight: 1.6 }}>{presupuesto.observaciones}</p>
        </div>
      )}

      {/* Pie */}
      <div style={{ paddingTop: "16px", borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: "11px", color: "#6b7280", lineHeight: 1.6 }}>
        <p style={{ margin: "0 0 2px 0" }}>Presupuesto generado el {format(new Date(presupuesto.created_date || new Date()), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        <p style={{ margin: 0 }}>Por: {presupuesto.usuario_creador_nombre}</p>
      </div>
    </div>
  );
}