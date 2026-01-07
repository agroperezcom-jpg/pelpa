import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { AlertTriangle, Calculator, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";

export default function ArqueoDialog({ isOpen, onClose, turnoActual, user, onArqueoCompleted }) {
  const [efectivoContado, setEfectivoContado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [validando, setValidando] = useState(false);

  const queryClient = useQueryClient();

  // Obtener cajas activas
  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list(),
    enabled: isOpen
  });

  // Calcular saldo teórico desde movimientos de tesorería del turno
  const { data: movimientosCaja = [] } = useQuery({
    queryKey: ['movimientosCajaTurno', turnoActual?.id],
    queryFn: async () => {
      if (!turnoActual?.id) return [];
      
      const allMovimientos = await base44.entities.MovimientoTesoreria.list('', 1000);
      
      // Filtrar movimientos del turno actual que involucren caja
      return allMovimientos.filter(m => {
        const fechaMov = new Date(m.fecha);
        const fechaApertura = new Date(turnoActual.fecha_apertura);
        const ahora = new Date();
        
        return m.caja_id && fechaMov >= fechaApertura && fechaMov <= ahora;
      });
    },
    enabled: isOpen && !!turnoActual
  });

  const cajaActiva = cajas.find(c => c.is_active) || cajas[0];
  
  const saldoTeorico = movimientosCaja.reduce((acc, m) => {
    if (m.caja_id === cajaActiva?.id) {
      return acc + (m.tipo === "INGRESO" ? m.importe : -m.importe);
    }
    return acc;
  }, turnoActual?.saldo_inicial_efectivo || 0);

  const diferencia = efectivoContado ? parseFloat(efectivoContado) - saldoTeorico : 0;
  const tieneDiferencia = Math.abs(diferencia) > 0.01;

  const crearArqueoMutation = useMutation({
    mutationFn: async () => {
      if (!efectivoContado) {
        throw new Error("Debe ingresar el efectivo contado");
      }

      if (tieneDiferencia && !observaciones.trim()) {
        throw new Error("Debe justificar la diferencia con observaciones");
      }

      const arqueo = await base44.entities.ArqueoCaja.create({
        fecha: new Date().toISOString(),
        caja_id: cajaActiva.id,
        caja_nombre: cajaActiva.nombre,
        turno_pos_id: turnoActual.id,
        usuario: user.email,
        usuario_nombre: user.full_name,
        saldo_teorico: saldoTeorico,
        efectivo_contado: parseFloat(efectivoContado),
        diferencia: diferencia,
        observaciones: observaciones || "",
        estado: "CERRADO"
      });

      return arqueo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arqueos'] });
      onArqueoCompleted();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleConfirmar = async () => {
    setValidando(true);
    await crearArqueoMutation.mutateAsync();
    setValidando(false);
  };

  const handleCancelar = () => {
    setEfectivoContado("");
    setObservaciones("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            Arqueo de Caja
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info del Turno */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Caja</p>
                <p className="font-semibold">{cajaActiva?.nombre}</p>
              </div>
              <div>
                <p className="text-slate-500">Usuario</p>
                <p className="font-semibold">{user?.full_name}</p>
              </div>
            </div>
          </div>

          {/* Saldos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <p className="text-xs font-medium text-blue-700 uppercase mb-2">Saldo Sistema</p>
              <p className="text-3xl font-bold text-blue-900">${saldoTeorico.toFixed(2)}</p>
              <p className="text-xs text-blue-600 mt-1">Calculado automáticamente</p>
            </div>

            <div className="p-6 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
              <Label className="text-xs font-medium text-emerald-700 uppercase mb-2 block">
                Efectivo Contado *
              </Label>
              <Input
                type="number"
                step="0.01"
                value={efectivoContado}
                onChange={(e) => setEfectivoContado(e.target.value)}
                placeholder="0.00"
                className="text-2xl font-bold h-12 text-emerald-900 border-emerald-300"
                autoFocus
              />
              <p className="text-xs text-emerald-600 mt-1">Ingrese el efectivo físico</p>
            </div>
          </div>

          {/* Diferencia */}
          {efectivoContado && (
            <div className={`p-6 rounded-xl border-2 ${
              Math.abs(diferencia) < 0.01 
                ? 'bg-green-50 border-green-300' 
                : diferencia > 0 
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase mb-1">
                    {Math.abs(diferencia) < 0.01 ? 'Sin diferencia' : 'Diferencia detectada'}
                  </p>
                  <p className={`text-4xl font-bold ${
                    Math.abs(diferencia) < 0.01 
                      ? 'text-green-600' 
                      : diferencia > 0 
                        ? 'text-amber-600'
                        : 'text-red-600'
                  }`}>
                    {diferencia >= 0 ? '+' : ''}{diferencia.toFixed(2)}
                  </p>
                  <p className="text-sm mt-1">
                    {diferencia > 0.01 && 'Sobrante de caja'}
                    {diferencia < -0.01 && 'Faltante de caja'}
                    {Math.abs(diferencia) < 0.01 && 'Caja cuadrada'}
                  </p>
                </div>
                <div>
                  {Math.abs(diferencia) < 0.01 ? (
                    <CheckCircle2 className="h-16 w-16 text-green-600" />
                  ) : diferencia > 0 ? (
                    <TrendingUp className="h-16 w-16 text-amber-600" />
                  ) : (
                    <TrendingDown className="h-16 w-16 text-red-600" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Observaciones
              {tieneDiferencia && (
                <Badge className="bg-red-100 text-red-700 text-xs">Obligatorio</Badge>
              )}
            </Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder={tieneDiferencia ? "Explique la causa de la diferencia..." : "Observaciones adicionales..."}
              rows={3}
              className={tieneDiferencia ? "border-red-300" : ""}
            />
          </div>

          {/* Validaciones */}
          {tieneDiferencia && !observaciones.trim() && efectivoContado && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Se detectó una diferencia</p>
                <p>Debe ingresar observaciones obligatorias para justificar el faltante o sobrante</p>
              </div>
            </div>
          )}

          {/* Detalle de movimientos */}
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-800">
              Ver detalle de movimientos ({movimientosCaja.length})
            </summary>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {movimientosCaja.filter(m => m.caja_id === cajaActiva?.id).map((mov, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1 border-b">
                  <span>{mov.medio_pago_nombre} - {mov.tipo}</span>
                  <span className={mov.tipo === "INGRESO" ? "text-green-600" : "text-red-600"}>
                    {mov.tipo === "INGRESO" ? "+" : "-"}${mov.importe.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancelar} disabled={validando}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar}
            disabled={!efectivoContado || (tieneDiferencia && !observaciones.trim()) || validando}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {validando ? "Guardando..." : "Confirmar Arqueo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}