import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Minus
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [discount, setDiscount] = useState(0);
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

  const createSaleMutation = useMutation({
    mutationFn: async (saleData) => {
      // Update product stock
      for (const item of saleData.items.filter(i => i.type === 'product')) {
        const product = products.find(p => p.id === item.item_id);
        if (product) {
          const newStock = product.stock - item.quantity;
          await base44.entities.Product.update(product.id, { stock: newStock });
          
          // Create inventory movement
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

      // Update client last contact
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
    }
  });

  const handleOpenDialog = () => {
    setCart([]);
    setSelectedClient("");
    setPaymentMethod("efectivo");
    setDiscount(0);
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
      newCart[existingIndex].total = newCart[existingIndex].quantity * newCart[existingIndex].unit_price;
      setCart(newCart);
    } else {
      setCart([...cart, {
        type,
        item_id: item.id,
        name: item.name,
        quantity: 1,
        unit_price: item.price,
        total: item.price
      }]);
    }
  };

  const updateCartQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cart[index];
    if (item.type === 'product') {
      const product = products.find(p => p.id === item.item_id);
      if (product && quantity > product.stock) {
        return; // Can't exceed stock
      }
    }

    const newCart = [...cart];
    newCart[index].quantity = quantity;
    newCart[index].total = quantity * newCart[index].unit_price;
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getSubtotal = () => cart.reduce((acc, item) => acc + item.total, 0);
  const getTotal = () => getSubtotal() - discount;

  const handleSubmit = () => {
    if (cart.length === 0) return;

    const client = clients.find(c => c.id === selectedClient);

    createSaleMutation.mutate({
      client_id: selectedClient || null,
      client_name: client?.name || "Cliente general",
      employee_email: user?.email,
      employee_name: user?.full_name,
      items: cart,
      subtotal: getSubtotal(),
      discount,
      total: getTotal(),
      payment_method: paymentMethod
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

  // Today's stats
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
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No hay ventas registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* New Sale Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                {activeTab === 'products' && filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                    onClick={() => product.stock > 0 && addToCart(product, 'product')}
                  >
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-slate-500">Stock: {product.stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">${product.price?.toLocaleString()}</p>
                      {product.stock === 0 && (
                        <Badge className="bg-red-100 text-red-700 text-xs">Agotado</Badge>
                      )}
                    </div>
                  </div>
                ))}
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
                      <div key={index} className="flex items-center justify-between p-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-slate-500">${item.unit_price} c/u</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateCartQuantity(index, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateCartQuantity(index, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="w-20 text-right font-bold">${item.total.toLocaleString()}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500"
                            onClick={() => removeFromCart(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
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
                  <div className="space-y-1">
                    <Label className="text-xs">Método de Pago</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Descuento</Label>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${getSubtotal().toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Descuento</span>
                      <span>-${discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-emerald-600">${getTotal().toLocaleString()}</span>
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
              disabled={cart.length === 0}
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