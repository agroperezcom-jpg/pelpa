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
      style={{
        width: "210mm",
        height: "297mm",
        padding: "20mm",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        color: "#000",
        backgroundColor: "#fff",
        margin: "0 auto",
        boxSizing: "border-box",
        lineHeight: "1.5",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: "20px", paddingBottom: "15px", borderBottom: "2px solid #333" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
          <div>
            <h1 style={{ margin: "0 0 5px 0", fontSize: "24px", fontWeight: "bold" }}>{companyName}</h1>
            <p style={{ margin: "0", fontSize: "10px", color: "#666" }}>
              CUIT: {companyCuit || "——"}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "12px", fontWeight: "bold" }}>
            <p style={{ margin: "0", fontSize: "14px" }}>
              {sale.tipo_comprobante === "X" ? "TICKET" : sale.tipo_comprobante === "B" ? "FACTURA B" : "FACTURA A"}
            </p>
          </div>
        </div>
        <p style={{ margin: "0", fontSize: "10px" }}>{companyAddress}</p>
        <p style={{ margin: "0", fontSize: "10px" }}>Tel: {companyPhone} | Email: {companyEmail}</p>
      </div>

      {/* DOCUMENTO INFO */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <p style={{ margin: "0 0 8px 0", fontSize: "10px", fontWeight: "bold" }}>FECHA</p>
          <p style={{ margin: "0", fontSize: "11px" }}>
            {format(new Date(sale.created_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div>
          <p style={{ margin: "0 0 8px 0", fontSize: "10px", fontWeight: "bold" }}>NÚMERO</p>
          <p style={{ margin: "0", fontSize: "11px" }}>{sale.numero_comprobante || "——"}</p>
        </div>
        {sale.employee_name && (
          <div>
            <p style={{ margin: "0 0 8px 0", fontSize: "10px", fontWeight: "bold" }}>VENDEDOR</p>
            <p style={{ margin: "0", fontSize: "11px" }}>{sale.employee_name}</p>
          </div>
        )}
      </div>

      {/* CLIENTE */}
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
        <p style={{ margin: "0 0 10px 0", fontSize: "11px", fontWeight: "bold" }}>CLIENTE</p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "0 0 4px 0", fontSize: "11px" }}>
              <strong>Nombre:</strong> {sale.client_name || "——"}
            </p>
            <p style={{ margin: "0", fontSize: "11px" }}>
              <strong>Categoría IVA:</strong> {sale.client_tipo_iva || "——"}
            </p>
          </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table style={{ width: "100%", marginBottom: "20px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f0f0f0", borderBottom: "2px solid #333" }}>
            <th style={{ padding: "10px 5px", textAlign: "left", fontSize: "10px", fontWeight: "bold" }}>Descripción</th>
            <th style={{ padding: "10px 5px", textAlign: "right", fontSize: "10px", fontWeight: "bold", width: "60px" }}>Cantidad</th>
            <th style={{ padding: "10px 5px", textAlign: "right", fontSize: "10px", fontWeight: "bold", width: "80px" }}>
              Precio Unit.
            </th>
            <th style={{ padding: "10px 5px", textAlign: "right", fontSize: "10px", fontWeight: "bold", width: "80px" }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {sale.items && sale.items.length > 0 ? (
            sale.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "8px 5px", fontSize: "11px" }}>{item.name}</td>
                <td style={{ padding: "8px 5px", textAlign: "right", fontSize: "11px" }}>{item.quantity}</td>
                <td style={{ padding: "8px 5px", textAlign: "right", fontSize: "11px" }}>
                  ${item.precio_unitario?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "0"}
                </td>
                <td style={{ padding: "8px 5px", textAlign: "right", fontSize: "11px", fontWeight: "500" }}>
                  ${item.total?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "0"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ padding: "10px", textAlign: "center", fontSize: "11px", color: "#999" }}>
                Sin items
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* TOTALES */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <div style={{ width: "250px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11px", paddingBottom: "8px", borderBottom: "1px solid #ddd" }}>
            <span>Subtotal:</span>
            <span>${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11px", color: "#d97706", paddingBottom: "8px", borderBottom: "1px solid #ddd" }}>
              <span>Descuento:</span>
              <span>-${discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {sale.iva_21 > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11px", paddingBottom: "8px", borderBottom: "1px solid #ddd" }}>
              <span>IVA (21%):</span>
              <span>${sale.iva_21.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "bold", marginTop: "8px" }}>
            <span>TOTAL:</span>
            <span>${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* PAGO */}
      <div style={{ marginBottom: "20px", paddingTop: "15px", borderTop: "1px solid #ddd" }}>
        <p style={{ margin: "0 0 5px 0", fontSize: "11px", fontWeight: "bold" }}>FORMA DE PAGO</p>
        <p style={{ margin: "0", fontSize: "11px" }}>
          {sale.tipo_venta === "CONTADO" ? "Contado" : sale.tipo_venta === "CTA_CTE" ? "Cuenta Corriente" : "Mixto"}
        </p>
      </div>

      {/* NOTAS */}
      {sale.notes && (
        <div style={{ marginBottom: "20px", paddingTop: "15px", borderTop: "1px solid #ddd" }}>
          <p style={{ margin: "0 0 5px 0", fontSize: "11px", fontWeight: "bold" }}>OBSERVACIONES</p>
          <p style={{ margin: "0", fontSize: "10px", color: "#666" }}>{sale.notes}</p>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign: "center", marginTop: "30px", paddingTop: "15px", borderTop: "1px solid #ddd", fontSize: "9px", color: "#999" }}>
        <p style={{ margin: "0" }}>Documento generado automáticamente</p>
        <p style={{ margin: "0" }}>{format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
      </div>
    </div>
  );
}