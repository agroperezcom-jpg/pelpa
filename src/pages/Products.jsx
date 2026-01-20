import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  AlertTriangle,
  Barcode,
  Grid3X3,
  List,
  Settings,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import AdvancedCsvImporter from "../components/inventory/AdvancedCsvImporter";

const CATEGORIES = [
  { value: "libros", label: "Libros" },
  { value: "papeleria", label: "Papelería" },
  { value: "arte", label: "Arte" },
  { value: "tecnologia", label: "Tecnología" },
  { value: "oficina", label: "Oficina" },
  { value: "escolar", label: "Escolar" },
  { value: "otros", label: "Otros" }
];

const categoryColors = {
  libros: "bg-blue-100 text-blue-700",
  papeleria: "bg-green-100 text-green-700",
  arte: "bg-purple-100 text-purple-700",
  tecnologia: "bg-cyan-100 text-cyan-700",
  oficina: "bg-amber-100 text-amber-700",
  escolar: "bg-pink-100 text-pink-700",
  otros: "bg-slate-100 text-slate-700"
};

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [isAdvancedImporterOpen, setIsAdvancedImporterOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tipo_articulo_id: "",
    costo_unitario: "",
    category: "otros",
    supplier: "",
    stock: "",
    min_stock: "5",
    barcode: "",
    image_url: ""
  });

  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({}, '-created_date', 10000)
  });

  const { data: tiposArticulo = [] } = useQuery({
    queryKey: ['tiposArticulo'],
    queryFn: () => base44.entities.TipoArticulo.filter({ is_active: true })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('deleteAllProducts');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteAllOpen(false);
    }
  });

  const calculatePrices = (costoUnitario, tipoArticuloId) => {
    const tipo = tiposArticulo.find(t => t.id === tipoArticuloId);
    if (!tipo || !costoUnitario) return null;

    const costo = parseFloat(costoUnitario);
    
    // Precios minorista
    const precioMinimoMinorista = costo * (1 + tipo.margen_minorista);
    const precioListaMinorista = precioMinimoMinorista / (1 - tipo.descuento_efectivo);
    
    // Precios mayorista
    const precioMinimoMayorista = costo * (1 + tipo.margen_mayorista);
    const precioListaMayorista = precioMinimoMayorista / (1 - tipo.descuento_efectivo);

    return {
      precio_minimo_minorista: precioMinimoMinorista,
      precio_lista_minorista: precioListaMinorista,
      precio_minimo_mayorista: precioMinimoMayorista,
      precio_lista_mayorista: precioListaMayorista
    };
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || "",
        description: product.description || "",
        tipo_articulo_id: product.tipo_articulo_id || "",
        costo_unitario: product.costo_unitario?.toString() || "",
        category: product.category || "otros",
        supplier: product.supplier || "",
        stock: product.stock?.toString() || "",
        min_stock: product.min_stock?.toString() || "5",
        barcode: product.barcode || "",
        image_url: product.image_url || ""
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        tipo_articulo_id: "",
        costo_unitario: "",
        category: "otros",
        supplier: "",
        stock: "",
        min_stock: "5",
        barcode: "",
        image_url: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const generateBarcode = () => {
    const code = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    setFormData({ ...formData, barcode: code });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const tipo = tiposArticulo.find(t => t.id === formData.tipo_articulo_id);
    const prices = calculatePrices(formData.costo_unitario, formData.tipo_articulo_id);
    
    if (!prices) {
      alert("Debe seleccionar un tipo de artículo y un costo válido");
      return;
    }

    const data = {
      ...formData,
      tipo_articulo_nombre: tipo.nombre,
      costo_unitario: parseFloat(formData.costo_unitario),
      ...prices,
      stock: parseInt(formData.stock) || 0,
      min_stock: parseInt(formData.min_stock) || 5,
      is_active: true
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.includes(searchTerm);
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = async () => {
    const allProducts = await base44.entities.Product.filter({}, '-created_date', 100000);
    
    const headers = ["Nombre", "Descripción", "Tipo", "Categoría", "Costo Unitario", "P.Mínimo Minorista", "P.Lista Minorista", "P.Mínimo Mayorista", "P.Lista Mayorista", "Stock", "Stock Mínimo", "Código Barras", "Proveedor", "Activo"];
    const rows = allProducts.map(p => [
      p.name || "",
      p.description || "",
      p.tipo_articulo_nombre || "",
      p.category || "",
      p.costo_unitario || "",
      p.precio_minimo_minorista?.toFixed(2) || "",
      p.precio_lista_minorista?.toFixed(2) || "",
      p.precio_minimo_mayorista?.toFixed(2) || "",
      p.precio_lista_mayorista?.toFixed(2) || "",
      p.stock || 0,
      p.min_stock || 0,
      p.barcode || "",
      p.supplier || "",
      p.is_active !== false ? "true" : "false"
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
    setIsAdvancedImporterOpen(true);
  };

  const calculatedPrices = formData.tipo_articulo_id && formData.costo_unitario ? 
    calculatePrices(formData.costo_unitario, formData.tipo_articulo_id) : null;

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
    } catch (error) {
      alert("Error al subir imagen: " + error.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" />
            Productos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {products.length} producto{products.length !== 1 ? 's' : ''} en catálogo
          </p>
        </div>
        <div 
          className="flex gap-2 flex-wrap"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Link to={createPageUrl("TiposArticulo")}>
            <Button variant="outline" className="w-full sm:w-auto whitespace-nowrap">
              <Settings className="h-4 w-4 mr-2" />
              Tipos de Artículo
            </Button>
          </Link>
          <Button variant="outline" onClick={exportTemplate} className="w-full sm:w-auto whitespace-nowrap">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Plantilla
          </Button>
          <Button variant="outline" onClick={exportToCSV} className="w-full sm:w-auto whitespace-nowrap">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsAdvancedImporterOpen(true)}
            className={isDragging ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => setDeleteAllOpen(true)} variant="destructive" className="w-full sm:w-auto whitespace-nowrap">
            <Trash2 className="h-4 w-4 mr-2" />
            Borrar Todo
          </Button>
          <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid/List */}
      {viewMode === "grid" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedProducts.map((product) => (
              <Card key={product.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="aspect-square bg-slate-100 relative">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-slate-300" />
                  </div>
                )}
                {product.stock <= product.min_stock && (
                  <Badge className="absolute top-2 left-2 bg-red-500">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Stock bajo
                  </Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-white/80 hover:bg-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(product)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteMutation.mutate(product.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardContent className="p-4">
                <Badge className={`${categoryColors[product.category]} text-xs mb-2`}>
                  {CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                </Badge>
                <h3 className="font-semibold text-slate-800 truncate">{product.name}</h3>
                <p className="text-xs text-slate-500 mb-2">{product.tipo_articulo_nombre}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Minorista:</span>
                    <span className="font-bold text-blue-600">${product.precio_lista_minorista?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Mayorista:</span>
                    <span className="font-bold text-emerald-600">${product.precio_lista_mayorista?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t">
                    <span className="text-slate-400">Stock:</span>
                    <span>{product.stock}</span>
                  </div>
                </div>
                {product.barcode && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                    <Barcode className="h-3 w-3" />
                    {product.barcode}
                  </div>
                )}
              </CardContent>
              </Card>
              ))}
              </div>
              {filteredProducts.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <p className="text-xs text-slate-600">
               Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> de <span className="font-medium">{filteredProducts.length}</span> productos
              </p>
              <div className="flex gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 disabled={currentPage === 1}
                 className="h-8 px-4 text-xs"
               >
                 ← Anterior
               </Button>
               <span className="flex items-center text-xs text-slate-600 px-2">
                 Página <span className="font-medium mx-1">{currentPage}</span> de <span className="font-medium mx-1">{totalPages}</span>
               </span>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages}
                 className="h-8 px-4 text-xs"
               >
                 Siguiente →
               </Button>
              </div>
              </div>
              )}
              </div>
              ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Producto</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Tipo</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Categoría</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">P. Minorista</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">P. Mayorista</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-600">Stock</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="border-t hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <span className="font-medium text-slate-800">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{product.tipo_articulo_nombre}</td>
                    <td className="p-4">
                      <Badge className={`${categoryColors[product.category]} text-xs`}>
                        {CATEGORIES.find(c => c.value === product.category)?.label}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-medium text-blue-600">
                      ${product.precio_lista_minorista?.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-medium text-emerald-600">
                      ${product.precio_lista_mayorista?.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={product.stock <= product.min_stock ? "text-red-600 font-medium" : ""}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(product.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProducts.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-600">
                Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> de <span className="font-medium">{filteredProducts.length}</span> productos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-4 text-xs"
                >
                  ← Anterior
                </Button>
                <span className="flex items-center text-xs text-slate-600 px-2">
                  Página <span className="font-medium mx-1">{currentPage}</span> de <span className="font-medium mx-1">{totalPages}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-4 text-xs"
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No se encontraron productos
        </div>
      )}

      {/* Advanced CSV Importer */}
      <AdvancedCsvImporter
        isOpen={isAdvancedImporterOpen}
        onClose={() => setIsAdvancedImporterOpen(false)}
        tiposArticulo={tiposArticulo}
        products={products}
      />

      {/* Delete All Alert Dialog */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Borrar todos los productos</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>{products.length} producto{products.length !== 1 ? 's' : ''}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAllMutation.mutate()} className="bg-red-600 hover:bg-red-700">
              Eliminar Todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del producto"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del producto"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_articulo">Tipo de Artículo *</Label>
                <Select value={formData.tipo_articulo_id} onValueChange={(value) => setFormData({ ...formData, tipo_articulo_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposArticulo.map(tipo => (
                      <SelectItem key={tipo.id} value={tipo.id}>{tipo.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costo">Costo Unitario *</Label>
                <Input
                  id="costo"
                  type="number"
                  step="0.01"
                  value={formData.costo_unitario}
                  onChange={(e) => setFormData({ ...formData, costo_unitario: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {calculatedPrices && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-900">Precios Calculados Automáticamente</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Minorista</p>
                    <p className="text-xs text-blue-600">Mínimo: ${calculatedPrices.precio_minimo_minorista.toFixed(2)}</p>
                    <p className="text-sm font-bold text-blue-900">Lista: ${calculatedPrices.precio_lista_minorista.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-emerald-700 font-medium">Mayorista</p>
                    <p className="text-xs text-emerald-600">Mínimo: ${calculatedPrices.precio_minimo_mayorista.toFixed(2)}</p>
                    <p className="text-sm font-bold text-emerald-900">Lista: ${calculatedPrices.precio_lista_mayorista.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Inicial</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Stock Mínimo</Label>
                <Input
                  id="min_stock"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                  placeholder="5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Código de barras"
                />
                <Button type="button" variant="outline" onClick={generateBarcode}>
                  <Barcode className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url">Imagen del Producto</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    id="image_upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image_upload')?.click()}
                    disabled={isUploadingImage}
                    className="flex-1"
                  >
                    {isUploadingImage ? 'Subiendo...' : 'Seleccionar Imagen'}
                  </Button>
                  {formData.image_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      className="text-red-600"
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
                {formData.image_url && (
                  <div className="w-full h-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                    <img src={formData.image_url} alt="Preview" className="h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {editingProduct ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}