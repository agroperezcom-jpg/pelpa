import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Landmark, Wallet, Building2, Users, Package, ArrowRightLeft, Settings } from "lucide-react";

import ResumenTesoreria from "@/components/tesoreria/ResumenTesoreria";
import TransferenciasDialog from "@/components/tesoreria/TransferenciasDialog";
import CajasView from "@/components/tesoreria/CajasView";
import BancosView from "@/components/tesoreria/BancosView";
import MovimientosView from "@/components/tesoreria/MovimientosView";
import CuentaCorrienteView from "@/components/tesoreria/CuentaCorrienteView";
import MediosPagoView from "@/components/tesoreria/MediosPagoView";

export default function TesoreriaV2() {
  const [activeView, setActiveView] = useState("movimientos");
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ['mediosPago'],
    queryFn: () => base44.entities.MedioPago.list()
  });

  // Fetch entidades origen para derivar movimientos
  const { data: gastos = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 1000)
  });

  const { data: ventas = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 1000)
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => base44.entities.Compra.list('-fecha', 1000)
  });

  const { data: presupuestos = [] } = useQuery({
    queryKey: ['presupuestos'],
    queryFn: () => base44.entities.Presupuesto.list('-created_date', 1000)
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => base44.entities.Proveedor.list()
  });

  // DERIVAR MOVIMIENTOS (Única Fuente de Verdad)
  const movimientosDerivedos = React.useMemo(() => {
    const movs = [];

    // Gastos → EGRESO
    gastos.forEach(g => {
      if (g.medio_pago_id) {
        const medio = mediosPago.find(m => m.id === g.medio_pago_id);
        movs.push({
          id: `gasto-${g.id}`,
          fecha: g.date,
          tipo: 'EGRESO',
          importe: g.amount,
          caja_id: g.caja_id,
          caja_nombre: g.caja_nombre,
          banco_id: g.banco_id,
          banco_nombre: g.banco_nombre,
          medio_pago_nombre: g.medio_pago_nombre,
          categoria_medio: medio?.categoria,
          referencia: `Gasto: ${g.description}`
        });
      }
    });

    // Ventas CONFIRMADAS → INGRESO
    ventas.filter(v => v.estado === "CONFIRMADA").forEach(v => {
      if (v.tipo_venta === "CONTADO" || v.tipo_venta === "MIXTA") {
        // Buscar pagos de la venta
        // Por ahora, consideramos el total como ingreso en medio efectivo/caja
        movs.push({
          id: `venta-${v.id}`,
          fecha: v.created_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          tipo: 'INGRESO',
          importe: v.total,
          caja_id: null, // Aquí dependerá de cómo se registró el pago
          caja_nombre: '',
          banco_id: null,
          banco_nombre: '',
          medio_pago_nombre: 'Venta',
          categoria_medio: 'EFECTIVO',
          referencia: `Venta a ${v.client_name || 'Cliente'}`
        });
      }
    });

    // Compras → EGRESO
    compras.forEach(c => {
      movs.push({
        id: `compra-${c.id}`,
        fecha: c.fecha,
        tipo: 'EGRESO',
        importe: c.total,
        caja_id: null,
        caja_nombre: '',
        banco_id: null,
        banco_nombre: '',
        medio_pago_nombre: 'Compra',
        categoria_medio: 'TRANSFERENCIA',
        referencia: `Compra a ${c.proveedor_nombre || 'Proveedor'}`
      });
    });

    // Presupuestos APROBADOS/CONFIRMADOS → INGRESO
    presupuestos.filter(p => p.estado === "aprobado" || p.estado === "confirmado").forEach(p => {
      movs.push({
        id: `presupuesto-${p.id}`,
        fecha: p.created_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        tipo: 'INGRESO',
        importe: p.total,
        caja_id: null,
        caja_nombre: '',
        banco_id: null,
        banco_nombre: '',
        medio_pago_nombre: 'Presupuesto',
        categoria_medio: 'EFECTIVO',
        referencia: `Presupuesto para ${p.cliente_nombre || 'Cliente'}`
      });
    });

    return movs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [gastos, ventas, compras, presupuestos, mediosPago]);

  // CALCULAR KPIs desde Movimientos (ÚNICA FUENTE DE VERDAD)
  const totalCajas = movimientosDerivedos
    .filter(m => m.caja_id && m.categoria_medio === 'EFECTIVO')
    .reduce((acc, m) => acc + (m.tipo === 'INGRESO' ? m.importe : -m.importe), 0);

  const totalBancos = movimientosDerivedos
    .filter(m => m.banco_id || m.categoria_medio === 'TRANSFERENCIA' || m.categoria_medio === 'BANCO')
    .reduce((acc, m) => acc + (m.tipo === 'INGRESO' ? m.importe : -m.importe), 0);

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

      {/* Vista Selector */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-medium text-slate-700">Vista:</span>
        <Select value={activeView} onValueChange={setActiveView}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="movimientos">Movimientos</SelectItem>
            <SelectItem value="cajas">Cajas</SelectItem>
            <SelectItem value="bancos">Bancos</SelectItem>
            <SelectItem value="cuentas">Cuenta Corriente</SelectItem>
            <SelectItem value="medios">Medios de Pago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {activeView === "movimientos" && <MovimientosView />}
        {activeView === "cajas" && <CajasView />}
        {activeView === "bancos" && <BancosView />}
        {activeView === "cuentas" && <CuentaCorrienteView />}
        {activeView === "medios" && <MediosPagoView />}
      </div>

      <TransferenciasDialog 
        isOpen={isTransferDialogOpen}
        onClose={() => setIsTransferDialogOpen(false)}
      />
    </div>
  );
}