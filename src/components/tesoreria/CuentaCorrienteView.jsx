import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Users, Package, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CuentaCorrienteView() {
  const { data: clientes = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => base44.entities.Proveedor.list()
  });

  const { data: movimientosCC = [] } = useQuery({
    queryKey: ['movimientosCC'],
    queryFn: () => base44.entities.MovimientoCC.list('-created_date', 100)
  });

  const movimientosClientes = movimientosCC.filter(m => m.tipo_entidad === "CLIENTE");
  const movimientosProveedores = movimientosCC.filter(m => m.tipo_entidad === "PROVEEDOR");

  const totalDeudaClientes = clientes.reduce((acc, c) => acc + (c.saldo_cc || 0), 0);
  const totalDeudaProveedores = proveedores.reduce((acc, p) => acc + (p.saldo_cc || 0), 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cuenta Corriente</h3>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Deuda Clientes</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  ${totalDeudaClientes.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">{clientes.length} clientes</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
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
                  ${totalDeudaProveedores.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">{proveedores.length} proveedores</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="clientes" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="gap-2">
            <Package className="h-4 w-4" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.filter(c => c.saldo_cc > 0).map((cliente) => (
                  <TableRow key={cliente.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{cliente.name}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-blue-600">
                        ${cliente.saldo_cc?.toLocaleString() || 0}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {clientes.filter(c => c.saldo_cc > 0).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-slate-500">
                      No hay clientes con deuda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden mt-4">
            <div className="p-4 border-b bg-slate-50">
              <h4 className="font-semibold">Movimientos de Clientes</h4>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientosClientes.map((mov) => (
                  <TableRow key={mov.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(mov.fecha), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{mov.entidad_nombre}</TableCell>
                    <TableCell className="text-sm">{mov.concepto}</TableCell>
                    <TableCell className="text-right">
                      {mov.debe > 0 && (
                        <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                          <TrendingUp className="h-3 w-3" />
                          ${mov.debe.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {mov.haber > 0 && (
                        <span className="text-green-600 font-medium flex items-center justify-end gap-1">
                          <TrendingDown className="h-3 w-3" />
                          ${mov.haber.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">${mov.saldo?.toLocaleString() || 0}</TableCell>
                  </TableRow>
                ))}
                {movimientosClientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No hay movimientos de cuenta corriente
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="proveedores">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.filter(p => p.saldo_cc > 0).map((proveedor) => (
                  <TableRow key={proveedor.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-amber-600">
                        ${proveedor.saldo_cc?.toLocaleString() || 0}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {proveedores.filter(p => p.saldo_cc > 0).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-slate-500">
                      No hay proveedores con deuda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden mt-4">
            <div className="p-4 border-b bg-slate-50">
              <h4 className="font-semibold">Movimientos de Proveedores</h4>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientosProveedores.map((mov) => (
                  <TableRow key={mov.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(mov.fecha), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{mov.entidad_nombre}</TableCell>
                    <TableCell className="text-sm">{mov.concepto}</TableCell>
                    <TableCell className="text-right">
                      {mov.debe > 0 && (
                        <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                          <TrendingUp className="h-3 w-3" />
                          ${mov.debe.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {mov.haber > 0 && (
                        <span className="text-green-600 font-medium flex items-center justify-end gap-1">
                          <TrendingDown className="h-3 w-3" />
                          ${mov.haber.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">${mov.saldo?.toLocaleString() || 0}</TableCell>
                  </TableRow>
                ))}
                {movimientosProveedores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No hay movimientos de cuenta corriente
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}