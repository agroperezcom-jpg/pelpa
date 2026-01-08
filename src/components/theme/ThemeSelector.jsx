import React, { useState, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sun, Moon, Palette, Upload, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorPalettes = [
  { name: 'Azul Profesional', color: '#2563eb', description: 'Confianza y estabilidad' },
  { name: 'Verde Moderno', color: '#059669', description: 'Crecimiento y éxito' },
  { name: 'Púrpura Creativo', color: '#7c3aed', description: 'Innovación y dinamismo' },
  { name: 'Rojo Energético', color: '#dc2626', description: 'Pasión y urgencia' },
  { name: 'Ámbar Cálido', color: '#d97706', description: 'Calidez y confianza' },
  { name: 'Teal Sofisticado', color: '#0891b2', description: 'Equilibrio y calma' },
  { name: 'Rosa Elegante', color: '#db2777', description: 'Distinción y modernidad' },
  { name: 'Índigo Profesional', color: '#4f46e5', description: 'Profundidad y autoridad' }
];

export default function ThemeSelector() {
  const { theme, setTheme, brandColor, setBrandColor, brandIntensity, setBrandIntensity } = useTheme();
  const [previewColor, setPreviewColor] = useState(brandColor || '#2563eb');
  const [showPalettes, setShowPalettes] = useState(false);
  const fileInputRef = useRef(null);

  const themes = [
    {
      id: 'light',
      name: 'Tema Claro',
      description: 'Diseño limpio y profesional para uso prolongado',
      icon: Sun,
      preview: 'bg-gradient-to-br from-slate-50 to-slate-100'
    },
    {
      id: 'dark',
      name: 'Tema Oscuro',
      description: 'Interfaz moderna y elegante optimizada para la noche',
      icon: Moon,
      preview: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950'
    },
    {
      id: 'brand',
      name: 'Adaptado a tu Marca',
      description: 'Sistema personalizado según tu identidad visual',
      icon: Palette,
      preview: brandColor 
        ? `bg-gradient-to-br from-[${brandColor}]/20 to-[${brandColor}]/40`
        : 'bg-gradient-to-br from-blue-50 to-blue-100'
    }
  ];

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Extract dominant color from image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Sample center pixels
        const centerX = Math.floor(img.width / 2);
        const centerY = Math.floor(img.height / 2);
        const imageData = ctx.getImageData(centerX - 10, centerY - 10, 20, 20);
        
        // Calculate average color
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          // Skip transparent or very light/dark pixels
          const alpha = imageData.data[i + 3];
          const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
          
          if (alpha > 100 && brightness > 30 && brightness < 225) {
            r += imageData.data[i];
            g += imageData.data[i + 1];
            b += imageData.data[i + 2];
            count++;
          }
        }

        if (count > 0) {
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
          
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          setPreviewColor(hex);
          setBrandColor(hex);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleColorChange = (e) => {
    const color = e.target.value;
    setPreviewColor(color);
  };

  const handleApplyColor = () => {
    setBrandColor(previewColor);
    if (theme !== 'brand') {
      setTheme('brand');
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-base">Seleccionar Tema Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    isActive 
                      ? "border-primary bg-primary/5" 
                      : "border-border/40 hover:border-border/60 hover:bg-secondary/30"
                  )}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  
                  <div className={cn(
                    "w-full h-20 rounded-lg mb-3",
                    t.preview
                  )} />
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isActive ? "bg-primary/10" : "bg-secondary"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <span className="font-medium text-sm text-foreground">{t.name}</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t.description}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Brand Configuration */}
      {theme === 'brand' && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-base">Configuración de Marca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Subir Logo</Label>
              <p className="text-xs text-muted-foreground mb-2">
                El sistema detectará automáticamente el color principal de tu logo
              </p>
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar Logo
                </Button>
              </div>
            </div>

            {/* Color Palettes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Paletas de Color Predefinidas
                </Label>
                <button
                  onClick={() => setShowPalettes(!showPalettes)}
                  className="text-xs text-primary hover:underline"
                >
                  {showPalettes ? 'Ocultar' : 'Ver todas'}
                </button>
              </div>
              {showPalettes && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {colorPalettes.map((pal) => (
                    <button
                      key={pal.color}
                      onClick={() => {
                        setPreviewColor(pal.color);
                        setBrandColor(pal.color);
                        setTheme('brand');
                      }}
                      className="group flex flex-col gap-2"
                      title={pal.description}
                    >
                      <div 
                        className="h-16 rounded-lg border-2 border-border/40 group-hover:border-primary/50 transition-all"
                        style={{ backgroundColor: pal.color }}
                      />
                      <p className="text-xs font-medium text-foreground text-center group-hover:text-primary transition-colors">
                        {pal.name.split(' ')[0]}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Color Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Color Personalizado</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Crea tu propio color de marca
              </p>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    type="color"
                    value={previewColor}
                    onChange={handleColorChange}
                    className="h-12 cursor-pointer rounded-lg"
                  />
                </div>
                <Input
                  type="text"
                  value={previewColor}
                  onChange={(e) => setPreviewColor(e.target.value)}
                  className="flex-1 font-mono text-xs"
                  placeholder="#2563eb"
                />
                <Button onClick={handleApplyColor} className="whitespace-nowrap">
                  Aplicar
                </Button>
              </div>
            </div>

            {/* Color Intensity */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Intensidad del Color</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Controla qué tan presente está tu color en la interfaz
              </p>
              <Select value={brandIntensity} onValueChange={setBrandIntensity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="muy-suave">Muy Suave - Apenas perceptible</SelectItem>
                  <SelectItem value="suave">Suave - Presencia sutil</SelectItem>
                  <SelectItem value="moderado">Moderado - Visible pero elegante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {brandColor && (
              <div className="pt-4 border-t border-border/40">
                <Label className="text-sm font-medium mb-3 block">Vista Previa</Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button 
                      className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary-hover))] text-white"
                    >
                      Botón Primario
                    </Button>
                    <Button variant="outline">
                      Botón Secundario
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-[hsl(var(--brand-accent))] border border-[hsl(var(--brand-accent-foreground))]/20">
                    <p className="text-sm text-[hsl(var(--brand-accent-foreground))]">
                      Elemento con color de marca aplicado
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="alert-soft info flex gap-3">
              <Info className="h-4 w-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-medium mb-1">El color de tu marca se aplica con elegancia</p>
                <p className="text-sky-700/70">
                  Solo en botones primarios, estados activos e indicadores. 
                  Nunca como fondo dominante para mantener la legibilidad.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setTheme('light');
            setBrandColor(null);
            setBrandIntensity('suave');
            setPreviewColor('#2563eb');
          }}
          className="text-sm"
        >
          Restaurar Tema por Defecto
        </Button>
      </div>
    </div>
  );
}