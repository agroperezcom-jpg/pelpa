import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [tipoLista, setTipoLista] = useState("MINORISTA");
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
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

  const calcularPrecioYMargen = (product, quantity) => {
    if (!product.tipo_articulo_id) {
      // Para productos sin tipo (legacy), usar precio original
      return {
        precio_lista: product.price || 0,
        precio_venta: product.price || 0,
        margen_real: 0,
        valido: true
      };
    }

    const tipo = tiposArticulo.find(t => t.id === product.tipo_articulo_id);
    if (!tipo) return { precio_lista: 0, precio_venta: 0, margen_real: 0, valido: false };

    // Determinar precio según lista y forma de pago
    let precio_lista, precio_minimo;
    
    if (tipoLista === "MINORISTA") {
      precio_lista = product.precio_lista_minorista;
      precio_minimo = product.precio_minimo_minorista;
    } else {
      precio_lista = product.precio_lista_mayorista;
      precio_minimo = product.precio_minimo_mayorista;
    }

    // Calcular precio de venta
    let precio_venta = precio_lista;
    if (paymentMethod === "EFECTIVO") {
      precio_venta = precio_lista * (1 - tipo.descuento_efectivo);
    }

    // Calcular margen real
    const margen_real = (precio_venta - product.costo_unitario) / product.costo_unitario;

    // Validar que no rompa el precio mínimo
    const valido = precio_venta >= precio_minimo;

    return {
      precio_lista,
      precio_venta,
      margen_real,
      valido,
      precio_minimo
    };
  };

  const createSaleMutation = useMutation({
    mutationFn: async (saleData) => {
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

      if (saleData.client_id) {
        await base44.entities.Client.update(saleData.client_id, {
          last_contact: new Date().toISOString().split('T')[0]
        });
      }

      return base44.entities.Sale.create(saleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      handleCloseDialog();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleOpenDialog = () => {
    setCart([]);
    setSelectedClient("");
    setTipoLista("MINORISTA");
    setPaymentMethod("EFECTIVO");
    setProductSearch("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCart([]);
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
      // Servicios sin cálculo especial
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

  // Recalcular precios cuando cambia tipo de lista o método de pago
  useEffect(() => {
    const newCart = [...cart];
    newCart.forEach(item => updateCartItemPricing(item));
    setCart(newCart);
  }, [tipoLista, paymentMethod]);

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

  const getSubtotal = () => cart.reduce((acc, item) => acc + item.total, 0);
  const getTotal = () => getSubtotal();

  const tieneItemsInvalidos = cart.some(item => item.valido === false);

  const handleSubmit = () => {
    if (cart.length === 0) return;
    if (tieneItemsInvalidos) {
      alert("Hay artículos que rompen el margen mínimo. Por favor revisa el carrito.");
      return;
    }

    const client = clients.find(c => c.id === selectedClient);

    createSaleMutation.mutate({
      client_id: selectedClient || null,
      client_name: client?.name || "Cliente general",
      employee_email: user?.email,
      employee_name: user?.full_name,
      tipo_lista: tipoLista,
      payment_method: paymentMethod,
      items: cart,
      subtotal: getSubtotal(),
      discount: 0,
      total: getTotal()
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
        <Button onClick={handleOpenDialog} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Venta
        </Button>
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
              <TableHead>Cliente</TableHead>
              <TableHead>Lista</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.id} className="hover:bg-slate-50">
                <TableCell className="text-slate-500 text-sm">
                  {format(new Date(sale.created_date), "d MMM yyyy HH:mm", { locale: es })}
                </TableCell>
                <TableCell className="font-medium">{sale.client_name || 'General'}</TableCell>
                <TableCell>
                  <Badge className={sale.tipo_lista === "MINORISTA" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}>
                    {sale.tipo_lista || "MINORISTA"}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-600">{sale.employee_name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{sale.items?.length || 0} items</Badge>
                </TableCell>
                <TableCell className="capitalize">{sale.payment_method}</TableCell>
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
                                <>
                                  <span className={`flex items-center gap-1 ${
                                    item.margen_real < 0.2 ? 'text-red-600 font-medium' : 'text-emerald-600'
                                  }`}>
                                    <TrendingUp className="h-3 w-3" />
                                    {(item.margen_real * 100).toFixed(0)}%
                                  </span>
                                </>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Lista de Precios</Label>
                    <Select value={tipoLista} onValueChange={setTipoLista}>
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
                    <Label className="text-xs">Forma de Pago</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="TARJETA">Tarjeta</SelectItem>
                        <SelectItem value="CTA_CTE">Cuenta Corriente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Cliente</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cliente general" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Cliente general</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-emerald-600">${getTotal().toFixed(2)}</span>
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
              Confirmar Venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}