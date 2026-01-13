import { useCompany } from "@/components/context/CompanyContext";

/**
 * Hook para filtrar queries por company_id automáticamente
 * 
 * Uso:
 * const { filterQuery, currentCompanyId } = useCompanyFilter();
 * const sales = await base44.entities.Sale.filter(filterQuery({status: 'CONFIRMADA'}));
 */
export function useCompanyFilter() {
  const { currentCompanyId } = useCompany();

  if (!currentCompanyId) {
    throw new Error("Company context not initialized. currentCompanyId is required.");
  }

  /**
   * Combina un query con el company_id automáticamente
   * @param {Object} query - Query adicional
   * @returns {Object} Query combinado con company_id
   */
  const filterQuery = (query = {}) => {
    return {
      ...query,
      company_id: currentCompanyId
    };
  };

  return {
    filterQuery,
    currentCompanyId
  };
}