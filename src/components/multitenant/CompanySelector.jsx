import React, { useState } from "react";
import { useCompany } from "@/components/context/CompanyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown, Check } from "lucide-react";

export default function CompanySelector() {
  const { currentCompany, assignedCompanies, switchCompany, loading } = useCompany();
  const [switching, setSwitching] = useState(false);

  if (loading || !currentCompany) {
    return null;
  }

  // Only show selector if user has more than one assigned company
  if (assignedCompanies.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="font-medium">{currentCompany.name}</span>
      </div>
    );
  }

  const handleSwitch = async (companyId) => {
    if (companyId === currentCompany.id) return;
    setSwitching(true);
    await switchCompany(companyId);
    // Page will reload, so no need to set switching to false
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 h-auto px-3 py-2 hover:bg-secondary"
          disabled={switching}
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{currentCompany.name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Cambiar empresa
        </div>
        {assignedCompanies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => handleSwitch(company.id)}
            className="flex items-center justify-between"
          >
            <span>{company.name}</span>
            {company.id === currentCompany.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}