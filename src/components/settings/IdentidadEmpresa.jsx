import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Building2, Type, Eye, RotateCcw, Save, Upload } from "lucide-react";

const tipografias = {
  corporativa: [
    { value: "inter", label: "Inter", preview: "Inter" },
    { value: "ibm-plex-sans", label: "IBM Plex Sans", preview: "IBM Plex Sans" },
    { value: "source-sans-3", label: "Source Sans 3", preview: "Source Sans 3" }
  ],
  moderna: [
    { value: "poppins", label: "Poppins", preview: "Poppins" },
    { value: "manrope", label: "Manrope", preview: "Manrope" },
    { value: "dm-sans", label: "DM Sans", preview: "DM Sans" }
  ],
  sofisticada: [
    { value: "playfair-display", label: "Playfair Display", preview: "Playfair Display" },
    { value: "cormorant", label: "Cormorant", preview: "Cormorant" },
    { value: "libre-baskerville", label: "Libre Baskerville", preview: "Libre Baskerville" }
  ],
  minimalista: [
    { value: "montserrat", label: "Montserrat", preview: "Montserrat" },
    { value: "nunito", label: "Nunito", preview: "Nunito" }
  ]
};

const fontFamilyMap = {
  "inter": "'Inter', sans-serif",
  "ibm-plex-sans": "'IBM Plex Sans', sans-serif",
  "source-sans-3": "'Source Sans 3', sans-serif",
  "poppins": "'Poppins', sans-serif",
  "manrope": "'Manrope', sans-serif",
  "dm-sans": "'DM Sans', sans-serif",
  "playfair-display": "'Playfair Display', serif",
  "cormorant": "'Cormorant', serif",
  "libre-baskerville": "'Libre Baskerville', serif",
  "montserrat": "'Montserrat', sans-serif",
  "nunito": "'Nunito', sans-serif"
};

export default function IdentidadEmpresa() {
  const [formData, setFormData] = useState({
    nombre_empresa: "",
    tipografia_logo: "inter",
    categoria_tipografia: "corporativa",
    modo_visualizacion: "nombre"
  });

  const queryClient = useQueryClient();

  const { data: configuraciones = [] } = useQuery({
    queryKey: ['configuracionEmpresa'],
    queryFn: () => base44.entities.ConfiguracionEmpresa.list()
  });

  const configuracion = configuraciones[0];

  useEffect(() => {
    if (configuracion) {
      setFormData({
        nombre_empresa: configuracion.nombre_empresa || "",
        tipografia_logo: configuracion.tipografia_logo || "inter",
        categoria_tipografia: configuracion.categoria_tipografia || "corporativa",
        modo_visualizacion: configuracion.modo_visualizacion || "nombre"
      });
    }
  }, [configuracion]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (configuracion?.id) {
        return await base44.entities.ConfiguracionEmpresa.update(configuracion.id, data);
      } else {
        return await base44.entities.ConfiguracionEmpresa.create({
          ...data,
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracionEmpresa'] });
      // Recargar la página para aplicar cambios en el Layout
      window.location.reload();
    }
  });

  const handleSave = () => {
    if (!formData.nombre_empresa.trim()) {
      alert("El nombre de la empresa es obligatorio");
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({
      nombre_empresa: "Sistema",
      tipografia_logo: "inter",
      categoria_tipografia: "corporativa",
      modo_visualizacion: "nombre"
    });
  };

  const tipografiasCategoria = tipografias[formData.categoria_tipografia] || tipografias.corporativa;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-slate-600" />
            <CardTitle>Identidad de la Empresa</CardTitle>
          </div>
          <p className="text-sm text-slate-600">
            Personaliza el nombre y la tipografía de tu sistema
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nombre de la Empresa */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Nombre de la Empresa *</Label>
            <Input
              value={formData.nombre_empresa}
              onChange={(e) => setFormData({ ...formData, nombre_empresa: e.target.value })}
              placeholder="Ej: Mi Empresa S.A."
              className="text-base"
              maxLength={40}
            />
            <p className="text-xs text-slate-500">
              Este nombre aparecerá en toda la interfaz del sistema
            </p>
          </div>

          {/* Categoría de Tipografía */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Estilo de Marca</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.keys(tipografias).map((categoria) => (
                <button
                  key={categoria}
                  onClick={() => {
                    setFormData({ 
                      ...formData, 
                      categoria_tipografia: categoria,
                      tipografia_logo: tipografias[categoria][0].value
                    });
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.categoria_tipografia === categoria
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-semibold capitalize">{categoria}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Tipografía */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Type className="h-4 w-4" />
              Tipografía del Nombre
            </Label>
            <Select 
              value={formData.tipografia_logo} 
              onValueChange={(v) => setFormData({ ...formData, tipografia_logo: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tipografiasCategoria.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span style={{ fontFamily: fontFamilyMap[font.value] }}>
                      {font.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Solo afecta al nombre de la empresa en el logo, no al resto del sistema
            </p>
          </div>

          {/* Preview */}
          <div className="border-2 border-slate-200 rounded-xl p-8 bg-white">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Vista Previa
              </Label>
              <Badge variant="outline" className="text-xs">
                {formData.categoria_tipografia}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">
                  {formData.nombre_empresa ? formData.nombre_empresa.charAt(0).toUpperCase() : 'S'}
                </span>
              </div>
              <span 
                className="text-2xl font-semibold text-slate-800 tracking-tight"
                style={{ fontFamily: fontFamilyMap[formData.tipografia_logo] }}
              >
                {formData.nombre_empresa || "Sistema"}
              </span>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-slate-500 mb-2">Aspecto en el sidebar:</p>
              <div className="bg-slate-100 rounded-lg p-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {formData.nombre_empresa ? formData.nombre_empresa.charAt(0).toUpperCase() : 'S'}
                    </span>
                  </div>
                  <span 
                    className="font-semibold text-slate-800 tracking-tight"
                    style={{ fontFamily: fontFamilyMap[formData.tipografia_logo] }}
                  >
                    {formData.nombre_empresa || "Sistema"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar predeterminado
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              disabled={!formData.nombre_empresa.trim()}
            >
              <Save className="h-4 w-4" />
              Guardar Cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Type className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Tipografía curada para identidad profesional
              </p>
              <p className="text-xs text-blue-700">
                Las tipografías seleccionadas garantizan legibilidad, elegancia y coherencia visual. 
                Solo afectan al nombre de tu empresa en el logo, manteniendo el resto del sistema intacto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}