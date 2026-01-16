import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { usePermissionsEnforcement } from "@/components/permissions/usePermissionsEnforcement";
import { useExternalAuth } from "@/components/context/ExternalAuthContext";
import { useAutoLinkEmpleado } from "@/components/auth/useAutoLinkEmpleado";
import { SIDEBAR_STRUCTURE } from "@/components/config/sidebarStructure";
import UserProfile from "./UserProfile";
import {
  Search, ChevronRight, Menu, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function LayoutContent({ children, currentPageName }) {
  useAutoLinkEmpleado(); // Auto-link Empleado on first access
  const { user: externalUser } = useExternalAuth();
  const { canViewModule, isAdmin } = usePermissionsEnforcement();
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebarExpanded')) ?? true;
    } catch {
      return true;
    }
  });
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const location = useLocation();

  const { data: configuracionEmpresa = [] } = useQuery({
    queryKey: ['configuracionEmpresa'],
    queryFn: () => base44.entities.ConfiguracionEmpresa.list()
  });

  const config = configuracionEmpresa[0];
  const nombreEmpresa = config?.nombre_empresa || "Sistema";
  const tipografiaLogo = config?.tipografia_logo || "inter";

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



  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(sidebarExpanded));
  }, [sidebarExpanded]);



  const sectionIcons = {
    general: LayoutDashboard,
    ventas: ShoppingCart,
    compras: ShoppingBag,
    inventario: Package,
    tesoreria: DollarSign,
    proyectos: Briefcase,
    calendario: CalendarIcon,
    ajustes: Settings
  };

  const allModules = [
    {
      id: "general",
      name: "General",
      section: "general",
      icon: LayoutDashboard,
      permiso: null,
      items: [
        { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard, permiso: null },
      ]
    },
    {
      id: "ventas",
      name: "Ventas",
      section: "ventas",
      icon: ShoppingCart,
      permiso: "sales",
      items: [
        { name: "Ventas", page: "Sales", icon: ShoppingCart, permiso: "sales" },
        { name: "Presupuestos", page: "Presupuestos", icon: FileText, permiso: "sales" },
        { name: "Clientes", page: "Clients", icon: Users, permiso: "sales" },
        { name: "Servicios", page: "Services", icon: Wrench, permiso: "sales" },
        { name: "Talonarios", page: "Talonarios", icon: FileCheck, permiso: "sales" },
      ]
    },
    {
      id: "compras",
      name: "Compras",
      section: "compras",
      icon: ShoppingBag,
      permiso: "purchases",
      items: [
        { name: "Compras", page: "Purchases", icon: ShoppingBag, permiso: "purchases" },
        { name: "Proveedores", page: "Proveedores", icon: Building2, permiso: "purchases" },
        { name: "Pagos Proveedores", page: "PagosProveedores", icon: CreditCard, permiso: "purchases" },
      ]
    },
    {
      id: "inventario",
      name: "Productos",
      section: "inventario",
      icon: Package,
      permiso: "inventory",
      items: [
        { name: "Productos", page: "Products", icon: Package, permiso: "inventory" },
        { name: "Inventario", page: "Inventory", icon: Check, permiso: "inventory" },
        { name: "Control de Stock", page: "HistorialControlesStock", icon: ClipboardList, permiso: "inventory" },
      ]
    },
    {
      id: "proyectos",
      name: "Proyectos",
      section: "proyectos",
      icon: Briefcase,
      permiso: "projects",
      items: [
        { name: "Proyectos", page: "Projects", icon: Briefcase, permiso: "projects" },
        { name: "Órdenes de Trabajo", page: "WorkOrders", icon: Briefcase, permiso: "projects" },
      ]
    },
    {
      id: "calendario",
      name: "Agenda",
      section: "calendario",
      icon: CalendarIcon,
      permiso: "calendar",
      items: [
        { name: "Calendario", page: "Calendar", icon: CalendarIcon, permiso: "calendar" },
      ]
    },
    {
       id: "tesoreria",
       name: "Finanzas",
       section: "tesoreria",
       icon: DollarSign,
       permiso: "finance",
       items: [
         { name: "Tesorería", page: "TesoreriaV2", icon: Landmark, permiso: "finance" },
         { name: "Cheques", page: "Cheques", icon: CreditCard, permiso: "finance" },
         { name: "Gastos", page: "Expenses", icon: DollarSign, permiso: "finance" },
         { name: "Finanzas", page: "FinanzasHub", icon: BarChart3, permiso: "finance" },
         { name: "Estado de Resultados", page: "EstadoResultados", icon: FileText, permiso: "finance" },
         { name: "Analytics", page: "Analytics", icon: TrendingUp, permiso: "finance" },
       ]
     },
    {
      id: "ajustes",
      name: "Ajustes",
      section: "ajustes",
      icon: Settings,
      permiso: null,
      items: [
        { name: "Sistema", page: "Settings", icon: Settings, permiso: null },
      ]
    }
  ];

  const modules = allModules
    .map(module => {
      // Settings visible only to admins
      if (module.id === "ajustes") {
        return isAdmin ? module : null;
      }

      // General and other modules always visible
      if (!module.permiso) {
        return module;
      }

      // Check module permission
      if (!isAdmin && !canViewModule(module.permiso)) {
        return null;
      }

      // Filter items by permission
      const filteredItems = module.items.filter(item => {
        if (!item.permiso) return true;
        return isAdmin || canViewModule(item.permiso);
      });

      if (filteredItems.length === 0) {
        return null;
      }

      return {
        ...module,
        items: filteredItems
      };
    })
    .filter(Boolean);

  const allPages = modules.flatMap(m => m.items);
  const filteredPages = allPages.filter(p =>
    p.name.toLowerCase().includes(commandSearch.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background transition-theme">
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 z-40 flex flex-col transition-all duration-300 ease-out",
        "bg-slate-50 border-r border-slate-200/60",
        sidebarExpanded ? "w-64" : "w-0 border-0"
      )}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200/40 bg-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">
                  {nombreEmpresa.charAt(0).toUpperCase()}
                </span>
              </div>
              <span 
                className="font-semibold text-foreground tracking-tight truncate"
                style={{ fontFamily: fontFamilyMap[tipografiaLogo] }}
              >
                {nombreEmpresa}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 shrink-0">
            <button
              onClick={() => setCommandOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left text-sm">Buscar...</span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 scrollbar-thin pb-20">
            {modules.map((module) => {
              const SectionIcon = sectionIcons[module.section];
              return (
                <div key={module.id} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 px-3 py-2.5 mb-3">
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gradient-to-br from-slate-600 to-slate-700 flex-shrink-0">
                      {SectionIcon && <SectionIcon className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-widest truncate">
                      {module.name}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {module.items.map((item) => {
                      const isActive = currentPageName === item.page;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mx-1",
                            isActive 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                          )}
                        >
                          {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                          {!Icon && <span className="w-4 flex-shrink-0" />}
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="mt-auto border-t border-slate-200/40 bg-white p-3 shrink-0">
            <UserProfile />
          </div>
          </div>
          </aside>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300 ease-out min-h-screen",
        sidebarExpanded ? "ml-64" : "ml-0"
      )}>
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border/40 bg-card sticky top-0 z-30 transition-theme">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title={sidebarExpanded ? "Contraer menú" : "Expandir menú"}
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {modules.find(m => m.items.some(i => i.page === currentPageName))?.name}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              <span className="font-medium text-foreground">
                {allPages.find(p => p.page === currentPageName)?.name || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6 max-w-[1600px] mx-auto animate-fade-in">
          {children}
        </div>
      </main>

      {/* Command Palette */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="max-w-xl p-0 gap-0 bg-card rounded-xl border border-border/40 shadow-elevated overflow-hidden transition-theme">
          <div className="p-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar página..."
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                className="border-0 p-0 h-auto text-base focus-visible:ring-0 placeholder:text-muted-foreground/50"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto p-2">
            {filteredPages.map((page) => {
              const module = modules.find(m => m.items.some(i => i.page === page.page));
              const Icon = page.icon;
              
              return (
                <Link
                  key={page.page}
                  to={createPageUrl(page.page)}
                  onClick={() => {
                    setCommandOpen(false);
                    setCommandSearch("");
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-secondary">
                    {Icon ? (
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{page.name}</p>
                    <p className="text-xs text-muted-foreground">{module?.name}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                </Link>
              );
            })}
            
            {filteredPages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No se encontraron resultados
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-border/40 bg-secondary/30">
            <p className="text-xs text-muted-foreground text-center">
              Presiona <kbd className="px-1.5 py-0.5 bg-background rounded border border-border/60 text-[10px]">↵</kbd> para seleccionar · <kbd className="px-1.5 py-0.5 bg-background rounded border border-border/60 text-[10px]">Esc</kbd> para cerrar
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}