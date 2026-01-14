import React, { createContext, useState, useContext, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [currentCompany, setCurrentCompany] = useState(null);
  const [defaultCompanyId, setDefaultCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [assignedCompanies, setAssignedCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initializeCompany = async () => {
      try {
        // Get authenticated user
        let authenticatedUser = null;
        try {
          authenticatedUser = await base44.auth.me();
          setUser(authenticatedUser);
        } catch (err) {
          console.warn("User not authenticated, using default company");
        }

        // Get all companies
        const allCompanies = await base44.entities.Company.list();
        setCompanies(allCompanies);

        // Single-Company Mode: use first company for all users
        setAssignedCompanies(allCompanies);

        // Set fixed active company (first company)
        const activeCompany = allCompanies[0];
        if (activeCompany) {
          setDefaultCompanyId(activeCompany.id);
          setCurrentCompany(activeCompany);
          localStorage.removeItem("currentCompanyId");
        }
      } catch (error) {
        console.error("Error initializing company context:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeCompany();
  }, []);

  const switchCompany = () => {
    // Single-company mode: company switching is disabled
    console.warn("Company switching is disabled in single-company mode");
  };

  const value = {
    currentCompany,
    currentCompanyId: currentCompany?.id,
    defaultCompanyId,
    companies,
    assignedCompanies,
    loading,
    switchCompany,
    user
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