import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Trash2, CheckCircle2 } from "lucide-react";

export default function DeleteProductsDialog({ isOpen, onClose, products }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const queryClient = useQueryClient();

  const deleteProductsMutation = useMutation({
    mutationFn: async (productIds) => {
      for (const id of productIds) {
        await base44.entities.Product.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleClose();
    }
  });

  const handleClose = () => {
    setSearchTerm("");
    setSelectedProducts(new Set());
    onClose();
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  const toggleProduct = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleDelete = () => {
    if (selectedProducts.size === 0) return;
    const confirmed = window.confirm(
      `¿Eliminar ${selectedProducts.size} producto${selectedProducts.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`
    );
    if (confirmed) {
      deleteProductsMutation.mutate(Array.from(selectedProducts));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Eliminar Productos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                indeterminate={selectedProducts.size > 0 && selectedProducts.size < filteredProducts.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium text-slate-700">
                Seleccionar todos ({filteredProducts.length})
              </span>
            </div>
            <Badge variant="secondary">
              {selectedProducts.size} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Products List */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="space-y-2 p-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => toggleProduct(product.id)}
                >
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => toggleProduct(product.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Stock: {product.stock}
                      </Badge>
                      {product.barcode && (
                        <span className="text-xs text-slate-400">{product.barcode}</span>
                      )}
                    </div>
                  </div>
                  {selectedProducts.has(product.id) && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  )}
                </div>
              ))}

              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No hay productos que coincidan
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            disabled={selectedProducts.size === 0 || deleteProductsMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteProductsMutation.isPending 
              ? "Eliminando..." 
              : `Eliminar ${selectedProducts.size > 0 ? selectedProducts.size : ''} producto${selectedProducts.size !== 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}