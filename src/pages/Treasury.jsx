import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  DollarSign
} from "lucide-react";
import CuentasView from "../components/treasury/CuentasView";
import MovimientosView from "../components/treasury/MovimientosView";
import ChequesView from "../components/treasury/ChequesView";
import CobrosView from "../components/treasury/CobrosView";

export default function Treasury() {
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 100)
  });

  const { data: cobros = [] } = useQuery({
    queryKey: ['cobros'],
    queryFn: () => base44.entities.Cobro.list('-created_date')
  });

  const totalCaja = accounts
    .filter(a => a.tipo === 'caja' && a.is_active)
    .reduce((acc, a) => acc + (a.saldo || 0), 0);

  const totalBancos = accounts
    .filter(a => a.tipo === 'banco' && a.is_active)
    .reduce((acc, a) => acc + (a.saldo || 0), 0);

  const totalCobros = cobros.reduce((acc, c) => acc + (c.monto || 0), 0);
  const cobrosAplicados = cobros
    .filter(c => c.aplicado_a_deuda)
    .reduce((acc, c) => acc + (c.monto_aplicado || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-purple-600" />
          Tesorería
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestión de cuentas, movimientos y cobros
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Caja</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">${totalCaja.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Bancos</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">${totalBancos.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total Cobros</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">${totalCobros.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Cobros Aplicados</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">${cobrosAplicados.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cuentas" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="cuentas">Cuentas</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos Internos</TabsTrigger>
          <TabsTrigger value="cheques">Cheques</TabsTrigger>
          <TabsTrigger value="cobros">Cobros</TabsTrigger>
        </TabsList>

        <TabsContent value="cuentas">
          <CuentasView />
        </TabsContent>

        <TabsContent value="movimientos">
          <MovimientosView />
        </TabsContent>

        <TabsContent value="cheques">
          <ChequesView />
        </TabsContent>

        <TabsContent value="cobros">
          <CobrosView />
        </TabsContent>
      </Tabs>
    </div>
  );
}