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
      style={{
        width: "375px",
        padding: "16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "12px",
        color: "#000",
        backgroundColor: "#fff",
        margin: "0 auto",
        lineHeight: "1.4",
      }}
    >
      {/* HEADER - Empresa */}
      <div style={{ textAlign: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #eee" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "bold" }}>{companyName}</h1>
        {companyAddress && <p style={{ margin: "2px 0", fontSize: "11px", color: "#666" }}>{companyAddress}</p>}
        {companyPhone && <p style={{ margin: "2px 0", fontSize: "11px", color: "#666" }}>{companyPhone}</p>}
      </div>

      {/* DOCUMENTO INFO */}
      <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #eee", textAlign: "center" }}>
        <p style={{ margin: "0", fontSize: "13px", fontWeight: "600" }}>
          {sale.tipo_comprobante === "X" ? "TICKET" : sale.tipo_comprobante === "B" ? "FACTURA B" : "FACTURA"}
        </p>
        {sale.numero_comprobante && (
          <p style={{ margin: "2px 0", fontSize: "11px", color: "#666" }}>
            # {sale.numero_comprobante}
          </p>
        )}
        <p style={{ margin: "2px 0", fontSize: "11px", color: "#666" }}>
          {format(new Date(sale.created_date), "dd/MM/yyyy HH:mm", { locale: es })}
        </p>
      </div>

      {/* CLIENTE */}
      {sale.client_name && (
        <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #eee" }}>
          <p style={{ margin: "0", fontSize: "11px", fontWeight: "600" }}>CLIENTE</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>{sale.client_name}</p>
        </div>
      )}

      {/* ITEMS */}
      <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #eee" }}>
        <p style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: "600" }}>ITEMS</p>
        {sale.items && sale.items.length > 0 ? (
          sale.items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: "8px", fontSize: "11px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span style={{ fontWeight: "500", flex: 1 }}>{item.name}</span>
                <span style={{ fontSize: "10px", color: "#666", marginLeft: "4px" }}>{item.quantity}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#666" }}>
                <span>${item.precio_unitario?.toLocaleString() || "0"}</span>
                <span>${item.total?.toLocaleString() || "0"}</span>
              </div>
            </div>
          ))
        ) : (
          <p style={{ fontSize: "11px", color: "#999" }}>Sin items</p>
        )}
      </div>

      {/* TOTALES */}
      <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
          <span>Subtotal:</span>
          <span>${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px", color: "#d97706" }}>
            <span>Descuento:</span>
            <span>-${discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        )}
        {sale.iva_21 > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px", color: "#666" }}>
            <span>IVA (21%):</span>
            <span>${sale.iva_21.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "bold" }}>
          <span>TOTAL:</span>
          <span>${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* PAGO */}
      {sale.tipo_venta && (
        <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #eee" }}>
          <p style={{ margin: "0", fontSize: "11px", fontWeight: "600" }}>PAGO</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
            {sale.tipo_venta === "CONTADO" ? "Contado" : sale.tipo_venta === "CTA_CTE" ? "Cuenta Corriente" : "Mixto"}
          </p>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign: "center", paddingTop: "8px" }}>
        <p style={{ margin: "0", fontSize: "11px", fontStyle: "italic", color: "#666" }}>
          Gracias por su compra
        </p>
      </div>
    </div>
  );
}