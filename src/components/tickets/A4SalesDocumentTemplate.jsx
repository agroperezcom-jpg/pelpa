import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function A4SalesDocumentTemplate({ sale, config }) {
  if (!sale) return null;

  const companyName = config?.nombre_empresa || "Mi Empresa";
  const companyAddress = config?.direccion || "";
  const companyPhone = config?.telefono || "";
  const companyEmail = config?.email || "";
  const companyCuit = config?.cuit || "";

  const subtotal = sale.subtotal || 0;
  const discount = sale.discount || 0;
  const total = sale.total || 0;

  return (
    <div
      id="a4-document"
      style={{
        width: "210mm",
        padding: "20mm",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        fontSize: "11px",
        color: "#1a1a1a",
        backgroundColor: "#fff",
        margin: "0 auto",
        boxSizing: "border-box",
        lineHeight: "1.6",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "3px solid #0f172a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <h1 style={{ margin: "0 0 4px 0", fontSize: "28px", fontWeight: "700", color: "#0f172a" }}>{companyName}</h1>
            <p style={{ margin: "0", fontSize: "10px", color: "#64748b" }}>
              CUIT: <strong>{companyCuit || "——"}</strong>
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "12px", fontWeight: "700" }}>
            <div style={{ backgroundColor: "#0f172a", color: "#fff", padding: "8px 16px", borderRadius: "4px" }}>
              <p style={{ margin: "0", fontSize: "12px" }}>
                {sale.tipo_comprobante === "X" ? "TICKET" : sale.tipo_comprobante === "B" ? "FACTURA B" : "FACTURA A"}
              </p>
            </div>
          </div>
        </div>
        <p style={{ margin: "4px 0", fontSize: "10px", color: "#64748b" }}>{companyAddress}</p>
        <p style={{ margin: "0", fontSize: "10px", color: "#64748b" }}>Tel: {companyPhone} | {companyEmail}</p>
      </div>

      {/* DOCUMENTO INFO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "24px", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "4px" }}>
        <div>
          <p style={{ margin: "0 0 6px 0", fontSize: "10px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Fecha</p>
          <p style={{ margin: "0", fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>
            {format(new Date(sale.created_date), "dd MMM yyyy", { locale: es })}
          </p>
        </div>
        <div>
          <p style={{ margin: "0 0 6px 0", fontSize: "10px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Hora</p>
          <p style={{ margin: "0", fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>
            {format(new Date(sale.created_date), "HH:mm", { locale: es })}
          </p>
        </div>
        <div>
          <p style={{ margin: "0 0 6px 0", fontSize: "10px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Comprobante</p>
          <p style={{ margin: "0", fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>{sale.numero_comprobante || "——"}</p>
        </div>
        {sale.employee_name && (
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={{ margin: "0 0 6px 0", fontSize: "10px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Vendedor</p>
            <p style={{ margin: "0", fontSize: "11px", color: "#0f172a" }}>{sale.employee_name}</p>
          </div>
        )}
      </div>

      {/* CLIENTE */}
      <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "4px" }}>
        <p style={{ margin: "0 0 12px 0", fontSize: "10px", fontWeight: "700", color: "#0c4a6e", textTransform: "uppercase", letterSpacing: "0.5px" }}>Cliente</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <p style={{ margin: "0 0 4px 0", fontSize: "10px", color: "#475569" }}>Nombre/Razón Social</p>
            <p style={{ margin: "0", fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>{sale.client_name || "——"}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 4px 0", fontSize: "10px", color: "#475569" }}>Categoría IVA</p>
            <p style={{ margin: "0", fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>{sale.client_tipo_iva || "——"}</p>
          </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table style={{ width: "100%", marginBottom: "24px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#0f172a", color: "#fff" }}>
            <th style={{ padding: "12px 8px", textAlign: "left", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Descripción</th>
            <th style={{ padding: "12px 8px", textAlign: "center", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", width: "70px" }}>Cantidad</th>
            <th style={{ padding: "12px 8px", textAlign: "right", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", width: "90px" }}>Precio Unit.</th>
            <th style={{ padding: "12px 8px", textAlign: "right", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", width: "90px" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items && sale.items.length > 0 ? (
            sale.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: idx % 2 === 0 ? "#fff" : "#f9fafb" }}>
                <td style={{ padding: "10px 8px", fontSize: "11px", color: "#1a1a1a" }}>{item.name}</td>
                <td style={{ padding: "10px 8px", textAlign: "center", fontSize: "11px", fontWeight: "600", color: "#475569" }}>{item.quantity}</td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontSize: "11px", color: "#475569" }}>
                  ${item.precio_unitario?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "0"}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontSize: "11px", fontWeight: "600", color: "#0f172a" }}>
                  ${item.total?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "0"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ padding: "12px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
                Sin items registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* TOTALES */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
        <div style={{ width: "280px", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "4px", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "11px", color: "#475569" }}>
            <span>Subtotal:</span>
            <span style={{ fontWeight: "600" }}>${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "11px", color: "#16a34a" }}>
              <span>✓ Descuento:</span>
              <span style={{ fontWeight: "600" }}>-${discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {sale.iva_21 > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "11px", color: "#475569", paddingBottom: "10px", borderBottom: "1px solid #e5e7eb" }}>
              <span>IVA (21%):</span>
              <span style={{ fontWeight: "600" }}>${sale.iva_21.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "700", color: "#0f172a", marginTop: "12px", paddingTop: "12px", borderTop: "2px solid #0f172a" }}>
            <span>TOTAL</span>
            <span>${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* PAGO */}
      <div style={{ marginBottom: "24px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
        <p style={{ margin: "0 0 8px 0", fontSize: "10px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Forma de Pago</p>
        <div style={{ backgroundColor: "#fef3c7", padding: "10px 12px", borderRadius: "4px", border: "1px solid #fcd34d" }}>
          <p style={{ margin: "0", fontSize: "12px", fontWeight: "600", color: "#92400e" }}>
            {sale.tipo_venta === "CONTADO" ? "💵 Contado" : sale.tipo_venta === "CTA_CTE" ? "📊 Cuenta Corriente" : "🔄 Mixto"}
          </p>
        </div>
      </div>

      {/* NOTAS */}
      {sale.notes && (
        <div style={{ marginBottom: "24px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "10px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Observaciones</p>
          <p style={{ margin: "0", fontSize: "10px", color: "#64748b" }}>{sale.notes}</p>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign: "center", marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", fontSize: "9px", color: "#94a3b8" }}>
        <p style={{ margin: "0 0 4px 0" }}>Documento generado automáticamente por el sistema</p>
        <p style={{ margin: "0", fontWeight: "600" }}>{format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
      </div>
    </div>
  );
}