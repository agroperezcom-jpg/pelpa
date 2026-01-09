import React, { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Warehouse,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  History,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2
} from "lucide-react";
import DeleteProductsDialog from "../components/inventory/DeleteProductsDialog";
import CsvImportMapperDialog from "../components/inventory/CsvImportMapperDialog";
import ControlStockDialog from "../components/inventory/ControlStockDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'];

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isControlStockOpen, setIsControlStockOpen] = useState(false);
  const [movementType, setMovementType] = useState("entrada");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isMapperDialogOpen, setIsMapperDialogOpen] = useState(false);
  const [csvDataForMapper, setCsvDataForMapper] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['movements'],
    queryFn: () => base44.entities.InventoryMovement.list('-created_date', 100)
  });

  const createMovementMutation = useMutation({
    mutationFn: async (movementData) => {
      const product = products.find(p => p.id === movementData.product_id);
      const newStock = movementData.type === 'entrada' 
        ? product.stock + movementData.quantity
        : product.stock - movementData.quantity;

      if (newStock < 0) {
        throw new Error("No se puede tener stock negativo");
      }

      await base44.entities.Product.update(product.id, { stock: newStock });
      await base44.entities.InventoryMovement.create({
        ...movementData,
        previous_stock: product.stock,
        new_stock: newStock
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      handleCloseDialog();
    }
  });

  const handleOpenDialog = (type, product = null) => {
    setMovementType(type);
    setSelectedProduct(product?.id || "");
    setQuantity("");
    setReason("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedProduct(null);
    setQuantity("");
    setReason("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === selectedProduct);
    
    createMovementMutation.mutate({
      product_id: selectedProduct,
      product_name: product.name,
      type: movementType,
      quantity: parseInt(quantity),
      reason: reason
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.includes(searchTerm);
    
    const matchesStock = 
      stockFilter === "all" ||
      (stockFilter === "low" && product.stock <= product.min_stock) ||
      (stockFilter === "out" && product.stock === 0) ||
      (stockFilter === "ok" && product.stock > product.min_stock);

    return matchesSearch && matchesStock;
  });

  const lowStockProducts = products.filter(p => p.stock <= p.min_stock && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalValue = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.costo_unitario || p.precio_lista_minorista || 0)), 0);

  // Chart data by category
  const categoryData = products.reduce((acc, p) => {
    const cat = p.category || 'otros';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += p.stock;
    return acc;
  }, {});

  const chartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  const exportToCSV = () => {
    const headers = ["Producto", "Categoría", "Stock Actual", "Stock Mínimo", "Valor"];
    const rows = filteredProducts.map(p => [
      p.name,
      p.category,
      p.stock,
      p.min_stock,
      (p.stock || 0) * (p.costo_unitario || p.precio_lista_minorista || 0)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventario_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const { data: tiposArticulo = [] } = useQuery({
    queryKey: ['tiposArticulo'],
    queryFn: () => base44.entities.TipoArticulo.filter({ is_active: true })
  });

  const exportTemplate = () => {
    const headers = ["nombre", "descripcion", "tipo_articulo", "costo_unitario", "categoria", "proveedor", "stock", "stock_minimo", "codigo_barras"];
    const example = ["Ejemplo: Cuaderno A5", "Cuaderno rayado 100 hojas", "Papelería", "3.50", "papeleria", "Proveedor XYZ", "50", "10", "7891234567890"];
    
    const csvContent = [headers, example].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_productos.csv";
    link.click();
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processCSVFile(file);
    e.target.value = '';
  };

  const handleConfirmImport = async (productsToCreate) => {
    try {
      if (productsToCreate.length === 0) {
        alert('No hay productos para importar');
        return;
      }

      await base44.entities.Product.bulkCreate(productsToCreate);
      queryClient.invalidateQueries({ queryKey: ['products'] });

      alert(`✓ ${productsToCreate.length} producto${productsToCreate.length !== 1 ? 's' : ''} importado${productsToCreate.length !== 1 ? 's' : ''} exitosamente`);
      setIsMapperDialogOpen(false);
      setCsvDataForMapper(null);
    } catch (error) {
      console.error('Error importing:', error);
      alert('Error al importar productos: ' + error.message);
    }
  };

  const processCSVFile = (file) => {
    if (!file.name.endsWith('.csv')) {
      alert('Por favor selecciona un archivo CSV');
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          alert('El archivo está vacío o no tiene datos');
          setIsImporting(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => line.split(',').map(v => v.trim()));

        setCsvDataForMapper({ headers, rows });
        setIsMapperDialogOpen(true);
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Error al leer el archivo CSV');
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processCSVFile(files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-amber-600" />
            Inventario
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Control de stock y movimientos
          </p>
        </div>
        <div 
          className="flex gap-2 flex-wrap"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
           <Button variant="outline" onClick={exportTemplate}>
             <FileSpreadsheet className="h-4 w-4 mr-2" />
             Plantilla
           </Button>
           <Button variant="outline" onClick={exportToCSV}>
             <Download className="h-4 w-4 mr-2" />
             Exportar
           </Button>
           <label htmlFor="import-csv">
             <Button 
               variant="outline" 
               asChild 
               disabled={isImporting}
               className={isDragging ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
             >
               <span className="cursor-pointer">
                 <Upload className="h-4 w-4 mr-2" />
                 {isImporting ? 'Importando...' : 'Importar'}
               </span>
             </Button>
           </label>
           <input
             id="import-csv"
             type="file"
             accept=".csv"
             className="hidden"
             onChange={handleImportCSV}
           />
          <Button variant="outline" onClick={() => setIsControlStockOpen(true)} className="border-blue-200 text-blue-600 hover:bg-blue-50 w-full sm:w-auto whitespace-nowrap">
            <History className="h-4 w-4 mr-2" />
            Control de Stock
          </Button>
          <Button variant="outline" onClick={() => handleOpenDialog('salida')} className="border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto whitespace-nowrap">
            <Minus className="h-4 w-4 mr-2" />
            Salida
          </Button>
          <Button onClick={() => setIsDeleteDialogOpen(true)} variant="destructive" className="w-full sm:w-auto whitespace-nowrap">
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
          <Button onClick={() => handleOpenDialog('entrada')} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Entrada
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total Unidades</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{totalStock.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Valor Total</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">${totalValue.toLocaleString()}</p>
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
                <p className="text-xs font-medium text-slate-500 uppercase">Stock Bajo</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockProducts.length}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Sin Stock</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockProducts.length}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="stock">Stock Actual</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
          <TabsTrigger value="analytics">Distribución</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar producto o escanear código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="low">Stock Bajo</SelectItem>
                    <SelectItem value="out">Sin Stock</SelectItem>
                    <SelectItem value="ok">Stock OK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-center">Stock Actual</TableHead>
                  <TableHead className="text-center">Stock Mínimo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{product.name}</p>
                          {product.barcode && (
                            <p className="text-xs text-slate-400">{product.barcode}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-slate-600">
                      {product.category?.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        product.stock === 0 ? "bg-red-100 text-red-700" :
                        product.stock <= product.min_stock ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      }>
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-slate-500">
                      {product.min_stock}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${((product.stock || 0) * (product.costo_unitario || product.precio_lista_minorista || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleOpenDialog('entrada', product)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleOpenDialog('salida', product)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead>Stock Anterior</TableHead>
                  <TableHead>Stock Nuevo</TableHead>
                  <TableHead>Razón</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mov) => (
                  <TableRow key={mov.id} className="hover:bg-slate-50">
                    <TableCell className="text-slate-500 text-sm">
                      {format(new Date(mov.created_date), "d MMM yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{mov.product_name}</TableCell>
                    <TableCell>
                      <Badge className={
                        mov.type === 'entrada' ? "bg-emerald-100 text-emerald-700" :
                        mov.type === 'salida' ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }>
                        {mov.type === 'entrada' ? <Plus className="h-3 w-3 mr-1" /> : <Minus className="h-3 w-3 mr-1" />}
                        {mov.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {mov.type === 'entrada' ? '+' : '-'}{mov.quantity}
                    </TableCell>
                    <TableCell className="text-slate-500">{mov.previous_stock}</TableCell>
                    <TableCell className="font-medium">{mov.new_stock}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{mov.reason || '-'}</TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No hay movimientos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Products Dialog */}
      <DeleteProductsDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        products={products}
      />

      {/* CSV Import Mapper Dialog */}
      <CsvImportMapperDialog
        isOpen={isMapperDialogOpen}
        onClose={() => {
          setIsMapperDialogOpen(false);
          setCsvDataForMapper(null);
        }}
        csvData={csvDataForMapper}
        tiposArticulo={tiposArticulo}
        onConfirm={handleConfirmImport}
      />

      {/* Control de Stock Dialog */}
      <ControlStockDialog
        isOpen={isControlStockOpen}
        onClose={() => setIsControlStockOpen(false)}
        products={products}
      />

      {/* Movement Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementType === 'entrada' ? (
                <><Plus className="h-5 w-5 text-emerald-600" /> Entrada de Stock</>
              ) : (
                <><Minus className="h-5 w-5 text-red-600" /> Salida de Stock</>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Stock: {product.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Cantidad"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Razón</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Razón del movimiento"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className={movementType === 'entrada' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
              >
                Confirmar {movementType}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}