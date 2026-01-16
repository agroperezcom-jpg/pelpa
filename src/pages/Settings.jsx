import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfiguracionProyectos from "../components/settings/ConfiguracionProyectos";
import IdentidadEmpresa from "../components/settings/IdentidadEmpresa";
import ThemeSelector from "../components/theme/ThemeSelector";
import RegionalConfig from "../components/settings/RegionalConfig";
import ConfiguracionImpresoras from "../components/settings/ConfiguracionImpresoras";
import PlanDeCuentas from "../components/settings/PlanDeCuentas";
import CompanyConfiguration from "../components/settings/CompanyConfiguration";
import SettingsUsers from "./SettingsUsers";
import SettingsRoles from "./SettingsRoles";
import DebugPermissions from "./DebugPermissions";
import SettingsSeedData from "../components/settings/SettingsSeedData";

export default function Settings() {
  const [activeView, setActiveView] = useState("empresa");

  return (
    <div className="space-y-6">
      <div>
         <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
         <p className="text-muted-foreground text-sm mt-1">
           Gestiona los ajustes de tu empresa
         </p>
       </div>

       <div className="flex items-center gap-4">
         <span className="text-sm font-medium text-foreground">Vistas:</span>
         <Select value={activeView} onValueChange={setActiveView}>
           <SelectTrigger className="w-80">
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="empresa">Datos Empresa</SelectItem>
             <SelectItem value="identidad">Identidad</SelectItem>
             <SelectItem value="tema">Tema Visual</SelectItem>
             <SelectItem value="regional">Configuración Regional</SelectItem>
             <SelectItem value="usuarios">Empleados</SelectItem>
             <SelectItem value="roles">Roles y Permisos</SelectItem>
             <SelectItem value="proyectos">Proyectos</SelectItem>
             <SelectItem value="impresoras">Impresoras</SelectItem>
             <SelectItem value="plan_cuentas">Plan de Cuentas</SelectItem>
             <SelectItem value="seed">🌱 Inicializar Sistema</SelectItem>
             <SelectItem value="debug">🔍 Debug Permisos</SelectItem>
             </SelectContent>
         </Select>
       </div>

       {/* NIVEL 1: Configuración básica - VISIBLE PARA TODOS */}
       <div className="space-y-6">
         {activeView === "empresa" && (
           <CompanyConfiguration />
         )}

         {activeView === "identidad" && <IdentidadEmpresa />}

         {activeView === "tema" && (
           <Card className="border-0 shadow-sm">
             <CardContent className="p-6">
               <ThemeSelector />
             </CardContent>
           </Card>
         )}

         {activeView === "regional" && <RegionalConfig />}

         {activeView === "usuarios" && <SettingsUsers />}

         {activeView === "roles" && <SettingsRoles />}

         {activeView === "proyectos" && <ConfiguracionProyectos />}

         {activeView === "impresoras" && <ConfiguracionImpresoras />}

         {activeView === "plan_cuentas" && <PlanDeCuentas />}

         {activeView === "seed" && <SettingsSeedData />}

         {activeView === "debug" && <DebugPermissions />}
         </div>
         </div>
         );
         }