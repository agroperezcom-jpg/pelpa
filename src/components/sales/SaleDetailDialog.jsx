import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Printer, FileCheck, Calendar, User, Package, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { printTicket } from "../pos/TicketPrint";
import { PAPER_WIDTHS } from "../thermal/thermalPrinterService";

export default function SaleDetailDialog({ isOpen, onClose, sale, pagos = [] }) {
  const [paperWidth, setPaperWidth] = useState(PAPER_WIDTHS.LARGE);
  
  if (!sale) return null;

  const handlePrint = () => {
    printTicket(sale, pagos, true, paperWidth);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            Detalle de Venta
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Info General */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Comprobante</p>
                  <Badge variant="outline" className="font-mono text-sm">
                    {sale.tipo_comprobante} {sale.numero_comprobante || "—"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fecha</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {format(new Date(sale.created_date), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                  <p className="text-sm font-medium">{sale.client_name || 'Consumidor Final'}</p>
                  {sale.client_tipo_iva && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {sale.client_tipo_iva}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Vendedor</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{sale.employee_name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estado</p>
                  {sale.estado === "ANULADA" ? (
                    <Badge className="bg-red-100 text-red-700">Anulada</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700">Confirmada</Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tipo de Venta</p>
                  <Badge variant="outline">
                    {sale.tipo_venta === "CONTADO" && "Contado"}
                    {sale.tipo_venta === "CTA_CTE" && "Cuenta Corriente"}
                    {sale.tipo_venta === "MIXTA" && "Mixta"}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Artículos ({sale.items?.length || 0})</h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Artículo</th>
                      <th className="text-center p-2 text-xs font-medium text-muted-foreground">Cant.</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">P. Unit.</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sale.items?.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {item.type === 'product' ? 'Producto' : 'Servicio'}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-2 text-center font-medium">{item.quantity}</td>
                        <td className="p-2 text-right">${item.precio_venta?.toFixed(2)}</td>
                        <td className="p-2 text-right font-semibold text-emerald-600">
                          ${item.total?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Totales */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">${sale.subtotal?.toFixed(2)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="font-semibold text-red-600">-${sale.discount?.toFixed(2)}</span>
                  </div>
                )}
                {sale.genera_iva && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Neto Gravado</span>
                      <span className="font-semibold">${sale.neto_gravado?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <FileCheck className="h-3 w-3" />
                        IVA 21%
                      </span>
                      <span className="font-semibold text-blue-600">${sale.iva_21?.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">TOTAL</span>
                  <span className="font-bold text-emerald-600">${sale.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Medios de Pago */}
            {pagos.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-3">Medios de Pago</h3>
                  <div className="space-y-2">
                    {pagos.map((pago, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{pago.medio_pago_nombre}</p>
                          {pago.banco_nombre && (
                            <p className="text-xs text-muted-foreground">{pago.banco_nombre}</p>
                          )}
                          {pago.caja_nombre && (
                            <p className="text-xs text-muted-foreground">{pago.caja_nombre}</p>
                          )}
                        </div>
                        <p className="font-bold">${pago.importe?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notas */}
            {sale.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Notas</p>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{sale.notes}</p>
                </div>
              </>
            )}

            {/* Información de Anulación */}
            {sale.estado === "ANULADA" && (
              <>
                <Separator />
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-red-900 mb-2">Venta Anulada</p>
                  <div className="space-y-1 text-xs text-red-800">
                    <p><strong>Fecha:</strong> {format(new Date(sale.fecha_anulacion), "d/MM/yyyy HH:mm", { locale: es })}</p>
                    <p><strong>Usuario:</strong> {sale.usuario_anulacion}</p>
                    <p><strong>Motivo:</strong> {sale.motivo_anulacion}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50">
          {sale.estado === "CONFIRMADA" && (
            <div className="w-full space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ancho de papel</Label>
                <Select value={String(paperWidth)} onValueChange={(v) => setPaperWidth(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(PAPER_WIDTHS.SMALL)}>58mm (32 caracteres)</SelectItem>
                    <SelectItem value={String(PAPER_WIDTHS.MEDIUM)}>72mm (42 caracteres)</SelectItem>
                    <SelectItem value={String(PAPER_WIDTHS.LARGE)}>80mm (48 caracteres)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
                <Button 
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Impresión Térmica Directa
                </Button>
              </div>
            </div>
          )}
          {sale.estado !== "CONFIRMADA" && (
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}