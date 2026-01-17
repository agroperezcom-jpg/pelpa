import React from "react";
import { usePermissionsEnforcement } from "@/components/permissions/usePermissionsEnforcement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PermissionTabs({ 
  tabs,
  defaultValue,
  ...props 
}) {
  const { hasPermission, isLoading } = usePermissionsEnforcement();

  if (isLoading) {
    return null;
  }

  // Filtrar tabs según permisos (sin bypass para admin)
  const filteredTabs = tabs.filter(tab => {
    if (!tab.permiso) return true;
    
    const { modulo, accion } = tab.permiso;
    return hasPermission(modulo, accion);
  });

  // Si no hay tabs después del filtro, no mostrar nada
  if (filteredTabs.length === 0) {
    return null;
  }

  // Determinar el valor por defecto válido
  const validDefaultValue = filteredTabs.find(t => t.value === defaultValue) 
    ? defaultValue 
    : filteredTabs[0].value;

  return (
    <Tabs defaultValue={validDefaultValue} {...props}>
      <TabsList>
        {filteredTabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {filteredTabs.map(tab => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}