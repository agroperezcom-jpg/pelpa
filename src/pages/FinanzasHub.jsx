import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardEjecutivo from "./DashboardEjecutivo";
import Finance from "./Finance";
import IngresosBrutos from "./IngresosBrutos";
import IVAMensual from "./IVAMensual";
import TableroFiscal from "./TableroFiscal";

export default function FinanzasHub() {
  const [activeView, setActiveView] = useState("dashboard");

  const views = [
    { id: "dashboard", nombre: "Dashboard Ejecutivo" },
    { id: "finanzas", nombre: "Finanzas" },
    { id: "tablero_fiscal", nombre: "Tablero Fiscal" },
    { id: "iva_mensual", nombre: "IVA Mensual" },
    { id: "ingresos_brutos", nombre: "Ingresos Brutos" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finanzas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Panel integral de análisis financiero y fiscal
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-foreground">Vista:</span>
        <Select value={activeView} onValueChange={setActiveView}>
          <SelectTrigger className="w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {views.map((view) => (
              <SelectItem key={view.id} value={view.id}>
                {view.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {activeView === "dashboard" && <DashboardEjecutivo />}
        {activeView === "finanzas" && <Finance />}
        {activeView === "tablero_fiscal" && <TableroFiscal />}
        {activeView === "iva_mensual" && <IVAMensual />}
        {activeView === "ingresos_brutos" && <IngresosBrutos />}
      </div>
    </div>
  );
}