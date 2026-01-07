import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import PagosDialog from "../components/pos/PagosDialog";
import ReportesDialog from "../components/pos/ReportesDialog";
import TicketPrint from "../components/pos/TicketPrint";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  ShoppingCart,
  Plus,
  Search,
  Trash2,
  Package,
  Briefcase,
  DollarSign,
  Receipt,
  X,
  Minus,
  AlertTriangle,
  TrendingUp,
  FileText,
  FileCheck
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPagosDialogOpen, setIsPagosDialogOpen] = useState(false);
  const [isReportesDialogOpen, setIsReportesDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ventaConfirmada, setVentaConfirmada] = useState(null);
  const [pagosConfirmados, setPagosConfirmados] = useState([]);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [currentSale, setCurrentSale] = useState({
    client_id: "",
    client_name: "",
    client_tipo_iva: "",
    tipo_lista: "MINORISTA",
    genera_iva: false,
    discount: 0,
    notes: ""
  });
  const [productSearch, setProductSearch] = useState("");
  const [activeTab, setActiveTab] = useState("products");

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 100)
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: tiposArticulo = [] } = useQuery({
    queryKey: ['tiposArticulo'],
    queryFn: () => base44.entities.TipoArticulo.list()
  });

  const { data: mediosPago = [] } = useQuery({
    queryKey: ['mediosPago'],
    queryFn: () => base44.entities.MedioPago.list()
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: () => base44.entities.Caja.list()
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ['bancos'],
    queryFn: () => base44.entities.Banco.list()
  });

  const { data: tiposComprobante = [] } = useQuery({
    queryKey: ['tiposComprobante'],
    queryFn: () => base44.entities.TipoComprobante.list()
  });

  const calcularPrecioYMargen = (product, quantity) => {
    if (!product.tipo_articulo_id) {
      return {
        precio_lista: product.price || 0,
        precio_venta: product.price || 0,
        margen_real: 0,
        valido: true
      };
    }

    const tipo = tiposArticulo.find(t => t.id === product.tipo_articulo_id);
    if (!tipo) return { precio_lista: 0, precio_venta: 0, margen_real: 0, valido: false };

    let precio_lista, precio_minimo;
    
    if (currentSale.tipo_lista === "MINORISTA") {
      precio_lista = product.precio_lista_minorista;
      precio_minimo = product.precio_minimo_minorista;
    } else {
      precio_lista = product.precio_lista_mayorista;
      precio_minimo = product.precio_minimo_mayorista;
    }

    const precio_venta = precio_lista;
    const margen_real = (precio_venta - product.costo_unitario) / product.costo_unitario;
    const valido = precio_venta >= precio_minimo;

    return {
      precio_lista,
      precio_venta,
      margen_real,
      valido,
      precio_minimo
    };
  };

  const { data: pagosPorVenta = [] } = useQuery({
    queryKey: ['pagosPorVenta', ventaConfirmada?.id],
    queryFn: async () => {
      if (!ventaConfirmada?.id) return [];
      const allPagos = await base44.entities.PagoVenta.list();
      return allPagos.filter(p => p.venta_id === ventaConfirmada.id);
    },
    enabled: !!ventaConfirmada?.id
  });

  const { data: periodosIVA = [] } = useQuery({
    queryKey: ['periodosIVA'],
    queryFn: () => base44.entities.PeriodoIVA.list('-anio,-mes', 12)
  });

  const createSaleMutation = useMutation({
    mutationFn: async ({ saleData, pagos, tipoVenta }) => {
      // PROTECCIÓN FISCAL: Verificar que el período no esté cerrado
      const periodoVenta = format(new Date(), 'yyyy-MM');
      const periodoCerrado = periodosIVA.find(p => p.periodo === periodoVenta && p.estado === "CERRADO");
      
      if (periodoCerrado) {
        throw new Error(`⚠️ NO SE PUEDE VENDER: El período fiscal ${periodoVenta} está CERRADO. No se pueden registrar más ventas en este período.`);
      }

      // Validar márgenes antes de crear la venta
      for (const item of saleData.items.filter(i => i.type === 'product')) {
        const product = products.find(p => p.id === item.item_id);
        if (product && product.tipo_articulo_id) {
          const calc = calcularPrecioYMargen(product, item.quantity);
          if (!calc.valido) {
            throw new Error(`El artículo "${product.name}" rompe el margen mínimo. Precio mínimo: $${calc.precio_minimo.toFixed(2)}`);
          }
        }
      }

      // Update product stock
      for (const item of saleData.items.filter(i => i.type === 'product')) {
        const product = products.find(p => p.id === item.item_id);
        if (product) {
          const newStock = product.stock - item.quantity;
          await base44.entities.Product.update(product.id, { stock: newStock });
          
          await base44.entities.InventoryMovement.create({
            product_id: product.id,
            product_name: product.name,
            type: 'salida',
            quantity: item.quantity,
            previous_stock: product.stock,
            new_stock: newStock,
            reason: 'Venta',
            reference: `Venta ${format(new Date(), 'dd/MM/yyyy HH:mm')}`
          });
        }
      }

      // Determinar tipo de comprobante
      const tipoComprobante = saleData.genera_iva ? "B" : "X";
      
      // Buscar tipo de comprobante
      let tipoComprobanteRecord = tiposComprobante.find(tc => tc.codigo === tipoComprobante);
      
      // Si no existe, crear tipo de comprobante
      if (!tipoComprobanteRecord) {
        tipoComprobanteRecord = await base44.entities.TipoComprobante.create({
          codigo: tipoComprobante,
          descripcion: tipoComprobante === "B" ? "Factura B - Con IVA" : "Ticket X - Sin IVA",
          prefijo: tipoComprobante,
          longitud_numero: 4,
          ultimo_numero: 0,
          is_active: true
        });
      }

      // Incrementar número
      const nuevoNumero = tipoComprobanteRecord.ultimo_numero + 1;
      const numeroFormateado = String(nuevoNumero).padStart(tipoComprobanteRecord.longitud_numero, '0');
      const numeroComprobante = `${tipoComprobanteRecord.prefijo}-${numeroFormateado}`;

      // Actualizar tipo de comprobante
      await base44.entities.TipoComprobante.update(tipoComprobanteRecord.id, {
        ultimo_numero: nuevoNumero
      });

      // Crear venta con IVA
      const sale = await base44.entities.Sale.create({
        ...saleData,
        tipo_venta: tipoVenta,
        estado: "CONFIRMADA",
        tipo_comprobante: tipoComprobante,
        numero_comprobante: numeroComprobante
      });

      // Generar IVA Ventas si corresponde
      if (saleData.genera_iva) {
        await base44.entities.IVAVenta.create({
          venta_id: sale.id,
          fecha: format(new Date(), 'yyyy-MM-dd'),
          tipo_comprobante: tipoComprobante,
          numero_comprobante: numeroComprobante,
          cliente_nombre: saleData.client_name,
          cliente_tipo_iva: saleData.client_tipo_iva,
          neto_gravado: saleData.neto_gravado,
          iva_21: saleData.iva_21,
          total: saleData.total,
          periodo: format(new Date(), 'yyyy-MM')
        });
      }

      // Procesar cada pago
      for (const pago of pagos) {
        // Guardar registro de pago
        await base44.entities.PagoVenta.create({
          venta_id: sale.id,
          ...pago
        });

        // Generar movimientos según tipo de pago
        if (pago.medio_pago_nombre === "Cuenta Corriente") {
          // Movimiento CC
          const client = clients.find(c => c.id === saleData.client_id);
          const nuevoSaldo = (client?.saldo_cc || 0) + pago.importe;

          await base44.entities.MovimientoCC.create({
            tipo_entidad: "CLIENTE",
            entidad_id: saleData.client_id,
            entidad_nombre: saleData.client_name,
            fecha: new Date().toISOString().split('T')[0],
            concepto: `Venta #${sale.id}`,
            debe: pago.importe,
            haber: 0,
            saldo: nuevoSaldo,
            referencia_tipo: "venta",
            referencia_id: sale.id
          });

          await base44.entities.Client.update(saleData.client_id, {
            saldo_cc: nuevoSaldo
          });
        } else {
          // Movimiento Tesorería
          await base44.entities.MovimientoTesoreria.create({
            fecha: new Date().toISOString().split('T')[0],
            tipo: "INGRESO",
            medio_pago_id: pago.medio_pago_id,
            medio_pago_nombre: pago.medio_pago_nombre,
            banco_id: pago.banco_id,
            banco_nombre: pago.banco_nombre,
            caja_id: pago.caja_id,
            caja_nombre: pago.caja_nombre,
            importe: pago.importe,
            referencia_tipo: "venta",
            referencia_id: sale.id,
            observaciones: `Venta #${sale.id} - ${saleData.client_name}`
          });

          // Actualizar saldos
          if (pago.banco_id) {
            const banco = bancos.find(b => b.id === pago.banco_id);
            await base44.entities.Banco.update(pago.banco_id, {
              saldo_actual: banco.saldo_actual + pago.importe
            });
          }
          if (pago.caja_id) {
            const caja = cajas.find(c => c.id === pago.caja_id);
            await base44.entities.Caja.update(pago.caja_id, {
              saldo_actual: caja.saldo_actual + pago.importe
            });
          }
        }
      }

      // Actualizar último contacto
      if (saleData.client_id) {
        await base44.entities.Client.update(saleData.client_id, {
          last_contact: new Date().toISOString().split('T')[0]
        });
      }

      return sale;
    },
    onSuccess: (sale, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosTesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['movimientosCC'] });
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['tiposComprobante'] });
      queryClient.invalidateQueries({ queryKey: ['ivaVentas'] });
      setIsPagosDialogOpen(false);
      setVentaConfirmada(sale);
      setPagosConfirmados(variables.pagos);
      setIsTicketDialogOpen(true);
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleOpenDialog = () => {
    setCart([]);
    setCurrentSale({
      client_id: "",
      client_name: "",
      client_tipo_iva: "",
      tipo_lista: "MINORISTA",
      genera_iva: false,
      discount: 0,
      notes: ""
    });
    setProductSearch("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCart([]);
  };

  const handleCloseTicket = () => {
    setIsTicketDialogOpen(false);
    setVentaConfirmada(null);
    setPagosConfirmados([]);
    handleCloseDialog();
  };

  const addToCart = (item, type) => {
    const existingIndex = cart.findIndex(c => c.item_id === item.id && c.type === type);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      updateCartItemPricing(newCart[existingIndex]);
      setCart(newCart);
    } else {
      const newItem = {
        type,
        item_id: item.id,
        name: item.name,
        quantity: 1,
        costo_unitario: item.costo_unitario || 0
      };
      updateCartItemPricing(newItem);
      setCart([...cart, newItem]);
    }
  };

  const updateCartItemPricing = (cartItem) => {
    if (cartItem.type === 'product') {
      const product = products.find(p => p.id === cartItem.item_id);
      if (product) {
        const calc = calcularPrecioYMargen(product, cartItem.quantity);
        cartItem.precio_lista = calc.precio_lista;
        cartItem.precio_venta = calc.precio_venta;
        cartItem.margen_real = calc.margen_real;
        cartItem.valido = calc.valido;
        cartItem.total = calc.precio_venta * cartItem.quantity;
      }
    } else {
      const service = services.find(s => s.id === cartItem.item_id);
      if (service) {
        cartItem.precio_lista = service.price;
        cartItem.precio_venta = service.price;
        cartItem.margen_real = 0;
        cartItem.valido = true;
        cartItem.total = service.price * cartItem.quantity;
      }
    }
  };

  // Recalcular precios cuando cambia tipo de lista
  useEffect(() => {
    const newCart = [...cart];
    newCart.forEach(item => updateCartItemPricing(item));
    setCart(newCart);
  }, [currentSale.tipo_lista]);

  const updateCartQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cart[index];
    if (item.type === 'product') {
      const product = products.find(p => p.id === item.item_id);
      if (product && quantity > product.stock) {
        return;
      }
    }

    const newCart = [...cart];
    newCart[index].quantity = quantity;
    updateCartItemPricing(newCart[index]);
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const totalWithDiscount = subtotal - (currentSale.discount || 0);
  
  // Cálculo de IVA
  const neto_gravado = currentSale.genera_iva ? totalWithDiscount / 1.21 : totalWithDiscount;
  const iva_21 = currentSale.genera_iva ? neto_gravado * 0.21 : 0;
  const total_final = neto_gravado + iva_21;

  const tieneItemsInvalidos = cart.some(item => item.valido === false);

  const handleSubmit = () => {
    if (cart.length === 0) return;
    if (tieneItemsInvalidos) {
      alert("Hay artículos que rompen el margen mínimo. Por favor revisa el carrito.");
      return;
    }

    // Validación IVA: no permitir Factura B sin cliente con tipo IVA válido
    if (currentSale.genera_iva && !currentSale.client_id) {
      alert("Para emitir Factura B con IVA debe seleccionar un cliente con CUIT/CUIL válido.");
      return;
    }

    if (currentSale.genera_iva && currentSale.client_tipo_iva === "CONSUMIDOR_FINAL") {
      alert("No se puede emitir Factura B a un Consumidor Final. Seleccione un cliente Responsable Inscripto o Monotributista.");
      return;
    }

    setIsPagosDialogOpen(true);
  };

  const handleConfirmarPagos = (pagos, tipoVenta) => {
    const cliente = clients.find(c => c.id === currentSale.client_id);

    createSaleMutation.mutate({
      saleData: {
        client_id: currentSale.client_id || null,
        client_name: cliente?.name || "Consumidor Final",
        client_tipo_iva: cliente?.tipo_iva || "CONSUMIDOR_FINAL",
        employee_email: user?.email,
        employee_name: user?.full_name,
        tipo_lista: currentSale.tipo_lista,
        items: cart,
        subtotal: subtotal,
        discount: currentSale.discount || 0,
        genera_iva: currentSale.genera_iva,
        neto_gravado: neto_gravado,
        iva_21: iva_21,
        total: total_final,
        notes: currentSale.notes
      },
      pagos,
      tipoVenta
    });
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode?.includes(productSearch)
  );

  const filteredServices = services.filter(s =>
    s.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredSales = sales.filter(sale => 
    sale.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.created_date?.startsWith(today));
  const todayTotal = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-emerald-600" />
            Ventas
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Hoy: ${todayTotal.toLocaleString()} ({todaySales.length} ventas)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsReportesDialogOpen(true)} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Reportes X/Z
          </Button>
          <Button onClick={handleOpenDialog} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Ventas Hoy</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{todaySales.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Ingresos Hoy</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">${todayTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Promedio</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              ${todaySales.length > 0 ? Math.round(todayTotal / todaySales.length).toLocaleString() : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Total Histórico</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{sales.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente o empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Fecha</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>IVA</TableHead>
              <TableHead>Lista</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.id} className="hover:bg-slate-50">
                <TableCell className="text-slate-500 text-sm">
                  {format(new Date(sale.created_date), "d MMM HH:mm", { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {sale.numero_comprobante || "—"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{sale.client_name || 'General'}</TableCell>
                <TableCell>
                  {sale.genera_iva ? (
                    <Badge className="bg-blue-100 text-blue-700">
                      <FileCheck className="h-3 w-3 mr-1" />
                      Con IVA
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600">Sin IVA</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={sale.tipo_lista === "MINORISTA" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}>
                    {sale.tipo_lista || "MINORISTA"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{sale.items?.length || 0}</Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-600">
                  ${sale.total?.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {filteredSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No hay ventas registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* New Sale Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              Nueva Venta
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Products/Services Selection */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar producto o código..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant={activeTab === 'products' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('products')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Productos
                </Button>
                <Button 
                  variant={activeTab === 'services' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('services')}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Servicios
                </Button>
              </div>

              <div className="h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                {activeTab === 'products' && filteredProducts.map((product) => {
                  const calc = calcularPrecioYMargen(product, 1);
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 cursor-pointer ${
                        product.stock === 0 ? 'opacity-50' : 'bg-slate-50'
                      }`}
                      onClick={() => product.stock > 0 && addToCart(product, 'product')}
                    >
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-slate-500">Stock: {product.stock}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600 text-sm">
                          ${calc.precio_venta?.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400">
                          Margen: {(calc.margen_real * 100).toFixed(0)}%
                        </p>
                        {product.stock === 0 && (
                          <Badge className="bg-red-100 text-red-700 text-xs mt-1">Agotado</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {activeTab === 'services' && filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                    onClick={() => addToCart(service, 'service')}
                  >
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{service.category?.replace('_', ' ')}</p>
                    </div>
                    <p className="font-bold text-emerald-600">${service.price?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Carrito ({cart.length})
                </h3>
              </div>

              <div className="h-48 overflow-y-auto border rounded-lg">
                {cart.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    Carrito vacío
                  </div>
                ) : (
                  <div className="divide-y">
                    {cart.map((item, index) => (
                      <div key={index} className={`p-3 ${!item.valido ? 'bg-red-50 border-l-4 border-red-500' : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <span>${item.precio_venta?.toFixed(2)} c/u</span>
                              {item.type === 'product' && (
                                <span className={`flex items-center gap-1 ${
                                  item.margen_real < 0.2 ? 'text-red-600 font-medium' : 'text-emerald-600'
                                }`}>
                                  <TrendingUp className="h-3 w-3" />
                                  {(item.margen_real * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                            {!item.valido && (
                              <div className="flex items-center gap-1 text-xs text-red-600 font-medium mt-1">
                                <AlertTriangle className="h-3 w-3" />
                                Rompe margen mínimo
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500"
                            onClick={() => removeFromCart(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateCartQuantity(index, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateCartQuantity(index, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-bold text-sm">${item.total?.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Lista de Precios</Label>
                  <Select 
                    value={currentSale.tipo_lista} 
                    onValueChange={(v) => setCurrentSale({ ...currentSale, tipo_lista: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MINORISTA">Minorista</SelectItem>
                      <SelectItem value="MAYORISTA">Mayorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Cliente</Label>
                  <Select 
                    value={currentSale.client_id} 
                    onValueChange={(v) => {
                      const cliente = clients.find(c => c.id === v);
                      const shouldGenerateIVA = cliente?.tipo_iva === "RESP_INSCRIPTO" || cliente?.tipo_iva === "MONOTRIBUTO";
                      setCurrentSale({ 
                        ...currentSale, 
                        client_id: v,
                        client_name: cliente?.name || "",
                        client_tipo_iva: cliente?.tipo_iva || "",
                        genera_iva: shouldGenerateIVA
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Consumidor Final" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Consumidor Final</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.tipo_iva && (
                            <span className="text-xs text-slate-400 ml-2">
                              ({c.tipo_iva})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Toggle IVA */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold text-blue-900">Generar IVA Ventas</Label>
                      <p className="text-xs text-blue-700 mt-1">
                        {currentSale.genera_iva ? "Factura B - IVA discriminado" : "Ticket X - Sin IVA"}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentSale.genera_iva}
                        onChange={(e) => setCurrentSale({ ...currentSale, genera_iva: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-1">Subtotal</p>
                      <p className="text-xl font-bold text-slate-800">${subtotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-1">Descuento</p>
                      <Input
                        type="number"
                        step="0.01"
                        value={currentSale.discount || ""}
                        onChange={(e) => setCurrentSale({ ...currentSale, discount: parseFloat(e.target.value) || 0 })}
                        className="text-lg font-bold h-9"
                        placeholder="0.00"
                      />
                    </div>
                    {currentSale.genera_iva && (
                      <>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Neto Gravado</p>
                          <p className="text-lg font-bold text-slate-700">${neto_gravado.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-emerald-600 uppercase mb-1">IVA 21%</p>
                          <p className="text-lg font-bold text-emerald-600">${iva_21.toFixed(2)}</p>
                        </div>
                      </>
                    )}
                    <div className="col-span-2 border-t pt-4">
                      <p className="text-sm font-medium text-slate-600 uppercase mb-2">Total Final</p>
                      <p className="text-4xl font-bold text-emerald-600">${total_final.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={cart.length === 0 || tieneItemsInvalidos}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Siguiente: Pagos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PagosDialog
        isOpen={isPagosDialogOpen}
        onClose={() => setIsPagosDialogOpen(false)}
        total={total_final}
        onConfirm={handleConfirmarPagos}
        clienteId={currentSale.client_id}
      />

      <ReportesDialog
        isOpen={isReportesDialogOpen}
        onClose={() => setIsReportesDialogOpen(false)}
        user={user}
      />

      {/* Ticket Dialog */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Venta Confirmada
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-green-600 mb-2">
              ¡Venta Confirmada!
            </h3>
            <p className="text-slate-600 mb-1">
              Total: ${ventaConfirmada?.total?.toFixed(2)}
            </p>
            <p className="text-sm text-slate-500">
              Cliente: {ventaConfirmada?.client_name}
            </p>
            {ventaConfirmada?.genera_iva && (
              <Badge className="bg-blue-100 text-blue-700 mt-2">
                <FileCheck className="h-3 w-3 mr-1" />
                Factura B generada
              </Badge>
            )}
          </div>

          {ventaConfirmada && (
            <TicketPrint 
              venta={ventaConfirmada} 
              pagos={pagosConfirmados}
            />
          )}

          <DialogFooter>
            <Button onClick={handleCloseTicket} className="w-full bg-emerald-600 hover:bg-emerald-700">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}