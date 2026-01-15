import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Palette, Briefcase, Printer } from "lucide-react";
import ConfiguracionProyectos from "../components/settings/ConfiguracionProyectos";
import IdentidadEmpresa from "../components/settings/IdentidadEmpresa";
import ThemeSelector from "../components/theme/ThemeSelector";
import RegionalConfig from "../components/settings/RegionalConfig";
import ConfiguracionImpresoras from "../components/settings/ConfiguracionImpresoras";
import PlanDeCuentas from "../components/settings/PlanDeCuentas";
import CompanyConfiguration from "../components/settings/CompanyConfiguration";

export default function Settings() {
  const [activeView, setActiveView] = useState("empresa");
  const queryClient = useQueryClient();

  // Configuración básica visible para todos

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
             <SelectItem value="proyectos">Proyectos</SelectItem>
             <SelectItem value="impresoras">Impresoras</SelectItem>
             <SelectItem value="plan_cuentas">Plan de Cuentas</SelectItem>
           </SelectContent>
         </Select>
       </div>

       {/* NIVEL 1: Configuración básica - VISIBLE PARA TODOS */}
       <div className="space-y-6">
         {activeView === "empresa" && (
           <CompanyConfiguration isAdmin={user?.role === 'admin'} />
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

         {activeView === "proyectos" && <ConfiguracionProyectos />}

         {activeView === "impresoras" && <ConfiguracionImpresoras />}

         {activeView === "plan_cuentas" && <PlanDeCuentas />}
       </div>



      </div>
      );
      }