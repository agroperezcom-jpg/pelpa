import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/components/context/CompanyContext";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Upload, Loader2, Lock, Trash2 } from "lucide-react";
import CompanyResetDialog from "./CompanyResetDialog";

/**
 * Company Configuration Component
 * Allows admins to manage company data
 * All UI labels are in Spanish
 */
export default function CompanyConfiguration({ isAdmin = false }) {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: "",
    legal_name: "",
    tax_id: "",
    tipo_iva: "RESP_INSCRIPTO",
    address: "",
    phone: "",
    email: "",
    logo_url: "",
    is_active: true
  });
  
  const [logoPreview, setLogoPreview] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Fetch current company data
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list()
  });

  useEffect(() => {
    if (currentCompanyId && companies.length > 0) {
      const company = companies.find(c => c.id === currentCompanyId);
      if (company) {
        setFormData({
          name: company.name || "",
          legal_name: company.legal_name || "",
          tax_id: company.tax_id || "",
          tipo_iva: company.tipo_iva || "RESP_INSCRIPTO",
          address: company.address || "",
          phone: company.phone || "",
          email: company.email || "",
          logo_url: company.logo_url || "",
          is_active: company.is_active !== false
        });
        if (company.logo_url) {
          setLogoPreview(company.logo_url);
        }
      }
    }
  }, [currentCompanyId, companies]);

  // Save company mutation
  const saveCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name || !formData.tax_id) {
        throw new Error("El nombre comercial y CUIT son obligatorios");
      }

      // Validate CUIT format (11 digits)
      if (!/^\d{11}$/.test(formData.tax_id.replace(/[^0-9]/g, ''))) {
        throw new Error("El CUIT debe contener 11 dígitos");
      }

      const currentCompany = companies.find(c => c.id === currentCompanyId);
      if (!currentCompany) {
        throw new Error("Empresa no encontrada");
      }

      return await base44.entities.Company.update(currentCompanyId, {
        name: formData.name,
        legal_name: formData.legal_name,
        tax_id: formData.tax_id,
        tipo_iva: formData.tipo_iva,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        logo_url: formData.logo_url,
        is_active: formData.is_active
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success("Datos de la empresa guardados correctamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al guardar los datos");
    }
  });

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: file_url }));
      setLogoPreview(file_url);
      toast.success("Logo cargado correctamente");
    } catch (error) {
      toast.error("Error al cargar el logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-700" />
            <div>
              <CardTitle className="text-base">Datos de la Empresa</CardTitle>
              <CardDescription>Gestiona la información de tu empresa</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex gap-2 border-b mb-6">
            <button
              onClick={() => setActiveTab("general")}
              className={`pb-2 px-2 text-sm font-medium transition-colors ${
                activeTab === "general"
                  ? "text-slate-900 border-b-2 border-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              General
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("advanced")}
                className={`pb-2 px-2 text-sm font-medium transition-colors ${
                  activeTab === "advanced"
                    ? "text-slate-900 border-b-2 border-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Avanzado
              </button>
            )}
          </div>

          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-6">
          {/* Logo Section */}
          <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
            <Label className="block text-sm font-medium mb-3">Logo de la Empresa</Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="w-20 h-20 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                </div>
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
                  <Upload className="h-4 w-4 text-slate-600" />
                  <span className="text-sm text-slate-700">{isUploadingLogo ? "Cargando..." : "Cargar logo"}</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo || !isAdmin}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Main Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre comercial */}
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre comercial <span className="text-red-600">*</span>
              </Label>
              <Input
                id="nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: MiEmpresa S.A."
                disabled={!isAdmin}
                className={!isAdmin ? "bg-slate-50" : ""}
              />
            </div>

            {/* Razón social */}
            <div className="space-y-2">
              <Label htmlFor="legal_name">Razón social</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                placeholder="Razón social de la empresa"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-slate-50" : ""}
              />
            </div>

            {/* CUIT */}
            <div className="space-y-2">
              <Label htmlFor="tax_id">
                CUIT <span className="text-red-600">*</span>
              </Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="XX-XXXXXXXX-X"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-slate-50" : ""}
              />
              <p className="text-xs text-slate-500">Ingresa 11 dígitos sin guiones</p>
            </div>

            {/* Tipo de IVA */}
            <div className="space-y-2">
              <Label htmlFor="tipo_iva">Tipo de IVA</Label>
              <Select 
                value={formData.tipo_iva}
                onValueChange={(value) => setFormData({ ...formData, tipo_iva: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger disabled={!isAdmin} className={!isAdmin ? "bg-slate-50" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESP_INSCRIPTO">Responsable Inscripto</SelectItem>
                  <SelectItem value="MONOTRIBUTO">Monotributo</SelectItem>
                  <SelectItem value="EXENTO">Exento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle, número, piso"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-slate-50" : ""}
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+54 9 11 XXXX-XXXX"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-slate-50" : ""}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contacto@empresa.com"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-slate-50" : ""}
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="is_active">Estado</Label>
              <Select 
                value={formData.is_active ? "active" : "inactive"}
                onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                disabled={!isAdmin}
              >
                <SelectTrigger disabled={!isAdmin} className={!isAdmin ? "bg-slate-50" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Save Button */}
          {isAdmin && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={() => saveCompanyMutation.mutate()}
                disabled={saveCompanyMutation.isPending}
                className="bg-slate-700 hover:bg-slate-800"
              >
                {saveCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          )}

          {!isAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ℹ️ Solo los administradores pueden editar estos datos
            </div>
          )}
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === "advanced" && isAdmin && (
           <div className="space-y-6">
             <div className="p-6 bg-red-50 border border-red-200 rounded-lg space-y-4">
               <div>
                 <h3 className="text-sm font-semibold text-red-900 flex items-center gap-2">
                   <Lock className="h-4 w-4" />
                   Reseteo Maestro de Datos
                 </h3>
                 <p className="text-xs text-red-700 mt-2">
                   Elimina permanentemente todos los datos operativos, financieros y de planificación de la empresa.
                 </p>
               </div>
               <ul className="text-xs text-red-700 list-disc list-inside space-y-1 ml-2">
                 <li>Todas las ventas e invoices</li>
                 <li>Inventario y stock</li>
                 <li>Cuentas y movimientos financieros</li>
                 <li>Gastos y pagos</li>
                 <li>Calendario, tareas y proyectos</li>
                 <li>Clientes y proveedores</li>
               </ul>
               <p className="text-xs font-medium text-red-900">
                 ⚠️ Esta acción es PERMANENTE y NO se puede deshacer
               </p>
               <Button
                 onClick={() => setShowResetDialog(true)}
                 className="w-full bg-red-600 hover:bg-red-700 text-white mt-4"
               >
                 <Trash2 className="h-4 w-4 mr-2" />
                 Resetear Todos los Datos
               </Button>
             </div>
           </div>
          )}
          </CardContent>
          </Card>

          {/* Reset Dialog */}
          <CompanyResetDialog isOpen={showResetDialog} onClose={() => setShowResetDialog(false)} />
          </>
          );
          }