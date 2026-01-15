/**
 * Formatea un número como moneda argentina
 * @param {number} amount - Monto a formatear
 * @param {boolean} includeSymbol - Si incluir el símbolo $ (default: true)
 * @returns {string} Monto formateado
 */
export function formatCurrency(amount, includeSymbol = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? '$ 0,00' : '0,00';
  }

  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return includeSymbol ? `$ ${formatted}` : formatted;
}

/**
 * Formatea un número sin símbolo de moneda
 * @param {number} amount - Monto a formatear
 * @returns {string} Monto formateado sin símbolo
 */
export function formatNumber(amount) {
  return formatCurrency(amount, false);
}