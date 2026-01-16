import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Building2, Users, Package } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatCurrency";

export default function ResumenTesoreria({ 
  totalCajas, 
  totalBancos, 
  totalDeudaClientes, 
  totalDeudaProveedores 
}) {
  const totalTesoreria = totalCajas + totalBancos;
  const balanceCC = totalDeudaClientes - totalDeudaProveedores;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-0 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Efectivo en Cajas</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                {formatCurrency(totalCajas)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Saldo en Bancos</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {formatCurrency(totalBancos)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Deuda Clientes</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">
                {formatCurrency(totalDeudaClientes)}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Deuda Proveedores</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">
                {formatCurrency(totalDeudaProveedores)}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Package className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-sm lg:col-span-2">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Tesorería Disponible</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {formatCurrency(totalTesoreria)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Cajas + Bancos</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-sm lg:col-span-2">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Balance Cuenta Corriente</p>
              <p className={`text-3xl font-bold mt-2 ${balanceCC >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(balanceCC)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {balanceCC >= 0 ? 'A favor' : 'En contra'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              balanceCC >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {balanceCC >= 0 ? (
                <TrendingUp className={`h-6 w-6 ${balanceCC >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              ) : (
                <TrendingDown className={`h-6 w-6 ${balanceCC >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}