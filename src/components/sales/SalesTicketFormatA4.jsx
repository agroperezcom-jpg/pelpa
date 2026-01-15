import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SalesTicketFormatA4({ venta, pagos }) {
  if (!venta) return null;

  return (
    <div className="w-full bg-white" style={{ width: "210mm", margin: "0 auto", padding: "40mm 15mm 15mm 15mm", minHeight: "297mm", fontSize: "11px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Encabezado */}
      <div className="mb-8 pb-6" style={{ borderBottom: "2px solid #1e40af" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#1e40af", margin: "0 0 4px 0", lineHeight: 1 }}>COMPROBANTE</h1>
            <p style={{ fontSize: "18px", fontWeight: 900, color: "#1f2937", margin: 0 }}>{venta.numero_comprobante}</p>
          </div>
          <div style={{ textAlign: "right", fontSize: "10px", lineHeight: "1.6" }}>
            <p style={{ margin: "0 0 2px 0", fontWeight: 600 }}>
              Fecha: {format(new Date(venta.created_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
            <p style={{ margin: 0, fontWeight: 600 }}>
              Tipo: {venta.tipo_comprobante === 'A' ? 'Factura A' : venta.tipo_comprobante === 'B' ? 'Factura B' : 'Ticket X'}
            </p>
          </div>
        </div>
      </div>

      {/* Cliente */}
      <div className="mb-8">
        <h3 style={{ fontSize: "10px", fontWeight: 900, color: "#1f2937", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>Cliente</h3>
        <p style={{ fontSize: "14px", fontWeight: 900, color: "#111827", margin: "0 0 2px 0" }}>{venta.client_name || "Consumidor Final"}</p>
        {venta.client_tipo_iva && (
          <p style={{ fontSize: "10px", color: "#6b7280", fontWeight: 600, margin: 0 }}>Condición IVA: {venta.client_tipo_iva.replace(/_/g, ' ')}</p>
        )}
      </div>

      {/* Tabla de ítems */}
      <div className="mb-8">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #1e40af" }}>
              <th style={{ padding: "8px 4px", textAlign: "left", fontWeight: 900, color: "#1f2937", fontSize: "10px" }}>Descripción</th>
              <th style={{ padding: "8px 4px", textAlign: "center", fontWeight: 900, color: "#1f2937", fontSize: "10px", width: "60px" }}>Cantidad</th>
              <th style={{ padding: "8px 4px", textAlign: "right", fontWeight: 900, color: "#1f2937", fontSize: "10px", width: "80px" }}>Precio Unit.</th>
              <th style={{ padding: "8px 4px", textAlign: "right", fontWeight: 900, color: "#1f2937", fontSize: "10px", width: "80px" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.items?.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 4px", textAlign: "left" }}>
                  <p style={{ fontWeight: 600, color: "#1f2937", margin: "0 0 2px 0" }}>{item.name}</p>
                </td>
                <td style={{ padding: "8px 4px", textAlign: "center", fontWeight: 600 }}>{item.quantity}</td>
                <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 600 }}>${(item.precio_venta || 0).toFixed(2)}</td>
                <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 900 }}>${(item.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div style={{ marginBottom: "20mm", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "200px" }}>
          {venta.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
              <span style={{ fontWeight: 600 }}>Descuento:</span>
              <span style={{ fontWeight: 900, color: "#dc2626" }}>-${(venta.discount || 0).toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", paddingBottom: "6px", borderBottom: "2px solid #1e40af", fontSize: "11px" }}>
            <span style={{ fontWeight: 600 }}>Subtotal:</span>
            <span style={{ fontWeight: 900 }}>${(venta.subtotal || 0).toFixed(2)}</span>
          </div>
          {venta.genera_iva && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
                <span style={{ fontWeight: 600 }}>Neto:</span>
                <span style={{ fontWeight: 900 }}>${(venta.neto_gravado || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
                <span style={{ fontWeight: 600 }}>IVA 21%:</span>
                <span style={{ fontWeight: 900 }}>${(venta.iva_21 || 0).toFixed(2)}</span>
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 900, color: "#1e40af" }}>
            <span>TOTAL:</span>
            <span>${(venta.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Medios de Pago */}
      {pagos && pagos.length > 0 && (
        <div style={{ marginBottom: "12mm", padding: "6px", backgroundColor: "#f3f4f6", borderRadius: "4px", border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: "10px", fontWeight: 900, color: "#1f2937", margin: "0 0 4px 0", textTransform: "uppercase" }}>Medios de Pago</p>
          {pagos.map((pago, idx) => (
            <div key={idx} style={{ fontSize: "10px", color: "#374151", margin: "2px 0" }}>
              <p style={{ margin: 0 }}>• {pago.medio_pago_nombre}: ${(pago.importe || 0).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pie */}
      <div style={{ paddingTop: "12mm", borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: "9px", color: "#6b7280", lineHeight: 1.6 }}>
        <p style={{ margin: "0 0 2px 0" }}>Comprobante generado el {format(new Date(venta.created_date), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        <p style={{ margin: 0 }}>Por: {venta.employee_name}</p>
      </div>
    </div>
  );
}