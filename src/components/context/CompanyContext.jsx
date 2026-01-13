import React, { createContext, useState, useContext, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [currentCompany, setCurrentCompany] = useState(null);
  const [defaultCompanyId, setDefaultCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeCompany = async () => {
      try {
        // Get all companies
        const allCompanies = await base44.entities.Company.list();
        setCompanies(allCompanies);

        // Get or create default company
        let defaultCompany = allCompanies.find(c => c.name === "Empresa Principal");
        
        if (!defaultCompany && allCompanies.length > 0) {
          defaultCompany = allCompanies[0];
        }

        if (defaultCompany) {
          setDefaultCompanyId(defaultCompany.id);
          setCurrentCompany(defaultCompany);
          localStorage.setItem("currentCompanyId", defaultCompany.id);
        }
      } catch (error) {
        console.error("Error initializing company context:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeCompany();
  }, []);

  const switchCompany = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setCurrentCompany(company);
      localStorage.setItem("currentCompanyId", companyId);
    }
  };

  const value = {
    currentCompany,
    currentCompanyId: currentCompany?.id,
    defaultCompanyId,
    companies,
    loading,
    switchCompany
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within CompanyProvider");
  }
  return context;
}