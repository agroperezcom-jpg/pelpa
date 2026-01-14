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

        // Determine user's assigned companies
        let userAssignedCompanies = [];
        if (authenticatedUser) {
          if (authenticatedUser.role === 'admin') {
            // Admins see all companies
            userAssignedCompanies = allCompanies;
          } else {
            // Get UserCompany assignments
            const userCompanyAssignments = await base44.entities.UserCompany.filter({
              user_email: authenticatedUser.email
            });
            
            const assignedCompanyIds = userCompanyAssignments.map(uc => uc.company_id);
            userAssignedCompanies = allCompanies.filter(c => assignedCompanyIds.includes(c.id));
            
            // Fallback: if no assignments, assign first company
            if (userAssignedCompanies.length === 0 && allCompanies.length > 0) {
              userAssignedCompanies = [allCompanies[0]];
            }
          }
          
          setAssignedCompanies(userAssignedCompanies);

          // Set active company
          let activeCompany = null;
          
          // Check if user has active_company_id stored
          if (userInDB?.active_company_id) {
            activeCompany = userAssignedCompanies.find(c => c.id === userInDB.active_company_id);
          }
          
          // Fallback: localStorage
          if (!activeCompany) {
            const storedCompanyId = localStorage.getItem("currentCompanyId");
            activeCompany = userAssignedCompanies.find(c => c.id === storedCompanyId);
          }
          
          // Fallback: first assigned company
          if (!activeCompany && userAssignedCompanies.length > 0) {
            activeCompany = userAssignedCompanies[0];
          }

          if (activeCompany) {
            setDefaultCompanyId(activeCompany.id);
            setCurrentCompany(activeCompany);
            localStorage.setItem("currentCompanyId", activeCompany.id);
            
            // Update user's active_company_id in DB
            if (userInDB && userInDB.active_company_id !== activeCompany.id) {
              await base44.auth.updateMe({ active_company_id: activeCompany.id });
            }
          }
        } else {
          // No user authenticated: default behavior
          const defaultCompany = allCompanies.find(c => c.name === "Empresa Principal") || allCompanies[0];
          if (defaultCompany) {
            setDefaultCompanyId(defaultCompany.id);
            setCurrentCompany(defaultCompany);
            setAssignedCompanies(allCompanies);
            localStorage.setItem("currentCompanyId", defaultCompany.id);
          }
        }
      } catch (error) {
        console.error("Error initializing company context:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeCompany();
  }, []);

  const switchCompany = async (companyId) => {
    const company = assignedCompanies.find(c => c.id === companyId);
    if (!company) {
      console.error("Company not assigned to user");
      return;
    }

    // Update state
    setCurrentCompany(company);
    localStorage.setItem("currentCompanyId", companyId);

    // Update user's active_company_id in DB
    if (user) {
      try {
        await base44.auth.updateMe({ active_company_id: companyId });
      } catch (err) {
        console.error("Error updating active company:", err);
      }
    }

    // Clear cached data (permissions, entities, etc.)
    queryClient.clear();
    
    // Reload page to ensure clean state
    window.location.reload();
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