import React from "react";
import { useCompany } from "@/components/context/CompanyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

/**
 * Company selector component for users to switch between companies
 * Typically placed in header or sidebar
 */
export default function CompanySelector() {
  const { currentCompanyId, companies, switchCompany, loading } = useCompany();

  if (loading || companies.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-slate-600" />
      <Select value={currentCompanyId || ""} onValueChange={switchCompany}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Selecciona empresa" />
        </SelectTrigger>
        <SelectContent>
          {companies.map(company => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}