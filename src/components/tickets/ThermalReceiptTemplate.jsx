import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ThermalReceiptTemplate({ sale, config }) {
  if (!sale) return null;

  const companyName = config?.nombre_empresa || "EMPRESA";
  const subtotal = sale.subtotal || 0;
  const discount = sale.discount || 0;
  const total = sale.total || 0;

  // Thermal width: 72mm = ~40 caracteres con monospaced
  const lineWidth = 40;
  const separator = "─".repeat(lineWidth);

  const padRight = (text, width) => {
    return text.padEnd(width);
  };

  const padBetween = (left, right, width) => {
    const totalSpaces = width - left.length - right.length;
    return left + " ".repeat(Math.max(0, totalSpaces)) + right;
  };

  const centerText = (text, width) => {
    const spaces = Math.max(0, (width - text.length) / 2);
    return " ".repeat(Math.floor(spaces)) + text;
  };

  return (
    <pre
      style={{
        fontFamily: "monospace",
        fontSize: "12px",
        margin: "0",
        padding: "0",
        whiteSpace: "pre",
        overflow: "hidden",
        width: "fit-content",
        backgroundColor: "#fff",
      }}
    >
{centerText(companyName.toUpperCase().substring(0, lineWidth), lineWidth)}
{separator}
{format(new Date(sale.created_date), "dd/MM/yyyy HH:mm", { locale: es })}
{sale.numero_comprobante ? `#${sale.numero_comprobante}` : ""}
{separator}
{sale.client_name ? `${sale.client_name.substring(0, lineWidth)}` : "CONSUMIDOR FINAL"}
{separator}
{sale.items && sale.items.length > 0
  ? sale.items
      .map((item) => {
        const qty = item.quantity.toString().substring(0, 3);
        const price = `$${item.precio_unitario?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}`;
        const total = `$${item.total?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}`;
        
        const nameLen = lineWidth - 3 - price.length - total.length;
        const name = item.name.substring(0, Math.max(5, nameLen));
        
        return `${padBetween(
          `${qty}x ${name}`,
          total,
          lineWidth
        )}\n`;
      })
      .join("")
  : "SIN ITEMS\n"}
{separator}
${padBetween("SUBTOTAL", `$${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, lineWidth)}
${discount > 0 ? `${padBetween("DESCUENTO", `-$${discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, lineWidth)}\n` : ""}${sale.iva_21 > 0 ? `${padBetween("IVA (21%)", `$${sale.iva_21.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, lineWidth)}\n` : ""}{separator}
${padBetween("TOTAL", `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, lineWidth)}
{separator}
${centerText(
  sale.tipo_venta === "CONTADO" ? "CONTADO" : sale.tipo_venta === "CTA_CTE" ? "CUENTA CORRIENTE" : "MIXTO",
  lineWidth
)}
{separator}
${centerText("GRACIAS POR SU COMPRA", lineWidth)}
{separator}
    </pre>
  );
}