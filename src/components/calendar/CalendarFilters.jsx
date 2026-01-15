import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase, CheckSquare, Target, Calendar, Megaphone, DollarSign } from "lucide-react";

export default function CalendarFilters({ 
  layers, 
  setLayers, 
  selectedProject,
  setSelectedProject,
  selectedUser,
  setSelectedUser,
  projects,
  users
}) {
  const toggleLayer = (layer) => {
    setLayers({ ...layers, [layer]: !layers[layer] });
  };

  const layerOptions = [
    { key: "projects", label: "Proyectos", icon: Briefcase, color: "text-purple-600" },
    { key: "phases", label: "Fases", icon: Target, color: "text-blue-600" },
    { key: "tasks", label: "Tareas Proyecto", icon: CheckSquare, color: "text-green-600" },
    { key: "freeTasks", label: "Tareas Libres", icon: Calendar, color: "text-slate-600" },
    { key: "milestones", label: "Hitos", icon: Target, color: "text-amber-600" },
    { key: "campaigns", label: "Campañas", icon: Megaphone, color: "text-pink-600" },
    { key: "events", label: "Eventos", icon: Calendar, color: "text-slate-400" },
    { key: "expenses", label: "Gastos a Pagar", icon: DollarSign, color: "text-red-600" }
  ];

  const activeLayersCount = Object.values(layers).filter(Boolean).length;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Capas */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Capas visibles</Label>
              <Badge variant="outline" className="text-xs">
                {activeLayersCount} activas
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {layerOptions.map((layer) => {
                const Icon = layer.icon;
                return (
                  <div key={layer.key} className="flex items-center gap-2">
                    <Checkbox
                      id={layer.key}
                      checked={layers[layer.key]}
                      onCheckedChange={() => toggleLayer(layer.key)}
                    />
                    <label
                      htmlFor={layer.key}
                      className="flex items-center gap-1.5 text-sm cursor-pointer"
                    >
                      <Icon className={`h-3.5 w-3.5 ${layer.color}`} />
                      <span>{layer.label}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filtros */}
          <div className="lg:w-80 flex gap-3">
            <div className="flex-1 space-y-2">
              <Label className="text-xs">Proyecto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label className="text-xs">Usuario</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}