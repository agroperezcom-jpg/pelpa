import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Wallet, Building2, Users, Package, ArrowRightLeft, Settings } from "lucide-react";

import CajasView from "@/components/tesoreria/CajasView.js";
import BancosView from "@/components/tesoreria/BancosView.js";
import MovimientosView from "@/components/tesoreria/MovimientosView.js";
import CuentaCorrienteView from "@/components/tesoreria/CuentaCorrienteView.js";
import MediosPagoView from "@/components/tesoreria/MediosPagoView.js";

export default function TesoreriaV2() {
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

  const totalCajas = cajas.reduce((acc, c) => acc + (c.saldo_actual || 0), 0);
  const totalBancos = bancos.reduce((acc, b) => acc + (b.saldo_actual || 0), 0);
  const totalTesoreria = totalCajas + totalBancos;

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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total en Cajas</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">
                  ${totalCajas.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">{cajas.length} caja{cajas.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total en Bancos</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  ${totalBancos.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">{bancos.length} cuenta{bancos.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total Tesorería</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  ${totalTesoreria.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">{movimientos.length} movimientos</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Landmark className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}