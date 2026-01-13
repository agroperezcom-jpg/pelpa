import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MobileReceiptTemplate({ sale, config }) {
  if (!sale) return null;

  const companyName = config?.nombre_empresa || "Mi Empresa";
  const companyAddress = config?.direccion || "";
  const companyPhone = config?.telefono || "";

  const subtotal = sale.subtotal || 0;
  const discount = sale.discount || 0;
  const total = sale.total || 0;

  return (
    <div
      id="mobile-receipt"
      style={{
        width: "375px",
        padding: "20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: "13px",
        color: "#1a1a1a",
        backgroundColor: "#fff",
        margin: "0 auto",
        lineHeight: "1.5",
      }}
    >
      {/* HEADER - Empresa */}
      <div style={{ textAlign: "center", marginBottom: "18px", paddingBottom: "14px", borderBottom: "2px solid #e5e7eb" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>{companyName}</h1>
        {companyAddress && <p style={{ margin: "3px 0", fontSize: "12px", color: "#64748b" }}>{companyAddress}</p>}
        {companyPhone && <p style={{ margin: "3px 0", fontSize: "12px", color: "#64748b" }}>☎ {companyPhone}</p>}
      </div>

      {/* DOCUMENTO INFO */}
      <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
        <p style={{ margin: "0", fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
          {sale.tipo_comprobante === "X" ? "TICKET" : sale.tipo_comprobante === "B" ? "FACTURA B" : "FACTURA A"}
        </p>
        {sale.numero_comprobante && (
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#475569", fontWeight: "600" }}>
            #{sale.numero_comprobante}
          </p>
        )}
        <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#64748b" }}>
          {format(new Date(sale.created_date), "dd MMM yyyy • HH:mm", { locale: es })}
        </p>
      </div>

      {/* CLIENTE */}
      {sale.client_name && (
        <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
          <p style={{ margin: "0", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Comprador</p>
          <p style={{ margin: "6px 0 0 0", fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>{sale.client_name}</p>
        </div>
      )}

      {/* ITEMS */}
      <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid #e5e7eb" }}>
        <p style={{ margin: "0 0 10px 0", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Productos</p>
        {sale.items && sale.items.length > 0 ? (
          sale.items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: "12px", fontSize: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                <span style={{ fontWeight: "600", flex: 1, color: "#1a1a1a" }}>{item.name}</span>
                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "8px", minWidth: "40px", textAlign: "right" }}>x{item.quantity}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
                <span>${item.precio_unitario?.toLocaleString() || "0"}/u</span>
                <span style={{ fontWeight: "600", color: "#1a1a1a" }}>${item.total?.toLocaleString() || "0"}</span>
              </div>
            </div>
          ))
        ) : (
          <p style={{ fontSize: "12px", color: "#94a3b8" }}>Sin items registrados</p>
        )}
      </div>

      {/* TOTALES */}
      <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "2px solid #e5e7eb", backgroundColor: "#f0f9ff", padding: "14px", borderRadius: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", color: "#475569" }}>
          <span>Subtotal:</span>
          <span>${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", color: "#16a34a" }}>
            <span>✓ Descuento:</span>
            <span>-${discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        )}
        {sale.iva_21 > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", color: "#475569" }}>
            <span>IVA (21%):</span>
            <span>${sale.iva_21.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "700", color: "#0f172a", paddingTop: "8px", borderTop: "1px solid #bfdbfe" }}>
          <span>TOTAL</span>
          <span>${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* PAGO */}
      {sale.tipo_venta && (
        <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid #e5e7eb" }}>
          <p style={{ margin: "0", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Forma de Pago</p>
          <p style={{ margin: "6px 0 0 0", fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>
            {sale.tipo_venta === "CONTADO" ? "💵 Contado" : sale.tipo_venta === "CTA_CTE" ? "📊 Cuenta Corriente" : "🔄 Mixto"}
          </p>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign: "center", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
        <p style={{ margin: "12px 0 0 0", fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>
          ✓ Gracias por su compra
        </p>
        <p style={{ margin: "6px 0 0 0", fontSize: "10px", color: "#94a3b8" }}>
          {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
        </p>
      </div>
    </div>
  );
}