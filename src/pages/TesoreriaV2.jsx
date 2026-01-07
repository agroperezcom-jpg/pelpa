import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Wallet, Building2, Users, Package, ArrowRightLeft, Settings } from "lucide-react";

import ResumenTesoreria from "@/components/tesoreria/ResumenTesoreria";
import TransferenciasDialog from "@/components/tesoreria/TransferenciasDialog";
import CajasView from "@/components/tesoreria/CajasView";
import BancosView from "@/components/tesoreria/BancosView";
import MovimientosView from "@/components/tesoreria/MovimientosView";
import CuentaCorrienteView from "@/components/tesoreria/CuentaCorrienteView";
import MediosPagoView from "@/components/tesoreria/MediosPagoView";

export default function TesoreriaV2() {
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: movimientos = [] } = useQuery({
    queryKey: ['movimientosTesoreria'],
    queryFn: () => base44.entities.MovimientoTesoreria.list('-created_date', 50)
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => base44.entities.Proveedor.list()
  });

  const totalCajas = cajas.reduce((acc, c) => acc + (c.saldo_actual || 0), 0);
  const totalBancos = bancos.reduce((acc, b) => acc + (b.saldo_actual || 0), 0);
  const totalDeudaClientes = clientes.reduce((acc, c) => acc + (c.saldo_cc || 0), 0);
  const totalDeudaProveedores = proveedores.reduce((acc, p) => acc + (p.saldo_cc || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="h-6 w-6 text-purple-600" />
            Tesorería
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Control de ingresos, egresos, cajas y bancos
          </p>
        </div>
        <Button onClick={() => setIsTransferDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Transferir
        </Button>
      </div>

      {/* Stats */}
      <ResumenTesoreria
        totalCajas={totalCajas}
        totalBancos={totalBancos}
        totalDeudaClientes={totalDeudaClientes}
        totalDeudaProveedores={totalDeudaProveedores}
      />

      {/* Tabs */}
      <Tabs defaultValue="movimientos" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="movimientos" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="cajas" className="gap-2">
            <Wallet className="h-4 w-4" />
            Cajas
          </TabsTrigger>
          <TabsTrigger value="bancos" className="gap-2">
            <Building2 className="h-4 w-4" />
            Bancos
          </TabsTrigger>
          <TabsTrigger value="cuentas" className="gap-2">
            <Users className="h-4 w-4" />
            Cuenta Corriente
          </TabsTrigger>
          <TabsTrigger value="medios" className="gap-2">
            <Settings className="h-4 w-4" />
            Medios de Pago
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos">
          <MovimientosView />
        </TabsContent>

        <TabsContent value="cajas">
          <CajasView />
        </TabsContent>

        <TabsContent value="bancos">
          <BancosView />
        </TabsContent>

        <TabsContent value="cuentas">
          <CuentaCorrienteView />
        </TabsContent>

        <TabsContent value="medios">
          <MediosPagoView />
        </TabsContent>
      </Tabs>

      <TransferenciasDialog 
        isOpen={isTransferDialogOpen}
        onClose={() => setIsTransferDialogOpen(false)}
      />
    </div>
  );
}