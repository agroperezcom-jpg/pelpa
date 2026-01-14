import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/components/permissions/usePermissions";
import { useExternalAuth } from "@/components/context/ExternalAuthContext";
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Package, Landmark, BarChart3,
  Calendar as CalendarIcon, Briefcase, Settings, Shield, LogOut, Search,
  ChevronRight, Menu, X, FileText, Bell, Users, Wrench, FileCheck, Building2,
  CreditCard, Percent, TrendingUp, DollarSign, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function LayoutContent({ children, currentPageName }) {
  // Now useExternalAuth is called inside a component that's a child of the provider
  const { user: externalUser, isAdmin: externalIsAdmin } = useExternalAuth();
  
  // Debug logging
  console.log('[LayoutContent] External Auth:', { externalUser, externalIsAdmin });
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebarPinned')) ?? false;
    } catch {
      return false;
    }
  });
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const location = useLocation();
  const { hasPermission, getAllowedModules, isAdmin, loading: permissionsLoading } = usePermissions();

  const { data: configuracionEmpresa = [] } = useQuery({
    queryKey: ['configuracionEmpresa'],
    queryFn: () => base44.modules.configuracion.configuracionEmpresa.list()
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

  // Use external auth context
  useEffect(() => {
    if (externalUser) {
      setUser({
        email: externalUser.email,
        full_name: externalUser.full_name,
        role: externalUser.role
      });
    }
  }, [externalUser]);

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
    if (!sidebarPinned) {
      setSidebarOpen(false);
    }
  }, [location, sidebarPinned]);

  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(sidebarPinned));
  }, [sidebarPinned]);

  const handleLogout = async () => {
    if (window.__AUTH_GATEWAY_LOGOUT__) {
      window.__AUTH_GATEWAY_LOGOUT__();
    } else {
      console.warn('No external logout handler configured');
    }
  };

  const allowedModules = permissionsLoading ? [] : getAllowedModules(externalIsAdmin);
  
  console.log('[LayoutContent] Permission check:', { 
    externalIsAdmin, 
    permissionsLoading, 
    allowedModules,
    totalModules: allModules.length
  });

  const sectionIcons = {
    general: LayoutDashboard,
    ventas: ShoppingCart,
    compras: ShoppingBag,
    inventario: Package,
    tesoreria: DollarSign,
    proyectos: Briefcase,
    calendario: CalendarIcon,
    configuracion: Settings
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
      permiso: "ventas",
      items: [
        { name: "Ventas", page: "Sales", icon: ShoppingCart, permiso: "ventas" },
        { name: "Presupuestos", page: "Presupuestos", icon: FileText, permiso: "presupuestos" },
        { name: "Clientes", page: "Clients", icon: Users, permiso: "clientes" },
        { name: "Servicios", page: "Services", icon: Wrench, permiso: "ventas" },
        { name: "Talonarios", page: "Talonarios", icon: FileCheck, permiso: "talonarios" },
      ]
    },
    {
      id: "compras",
      name: "Compras",
      section: "compras",
      icon: ShoppingBag,
      permiso: "compras",
      items: [
        { name: "Compras", page: "Purchases", icon: ShoppingBag, permiso: "compras" },
        { name: "Proveedores", page: "Proveedores", icon: Building2, permiso: "proveedores" },
        { name: "Pagos Proveedores", page: "PagosProveedores", icon: CreditCard, permiso: "compras" },
      ]
    },
    {
      id: "inventario",
      name: "Productos",
      section: "inventario",
      icon: Package,
      permiso: "inventario",
      items: [
        { name: "Productos", page: "Products", icon: Package, permiso: "productos" },
        { name: "Stock", page: "Inventory", icon: Check, permiso: "inventario" },
        { name: "Control de Stock", page: "HistorialControlesStock", icon: BarChart3, permiso: "control_stock" },
      ]
    },
    {
      id: "proyectos",
      name: "Proyectos",
      section: "proyectos",
      icon: Briefcase,
      permiso: "proyectos",
      items: [
        { name: "Proyectos", page: "Projects", icon: Briefcase, permiso: "proyectos" },
        { name: "Órdenes de Trabajo", page: "WorkOrders", icon: Briefcase, permiso: "proyectos" },
      ]
    },
    {
      id: "calendario",
      name: "Agenda",
      section: "calendario",
      icon: CalendarIcon,
      permiso: "calendario",
      items: [
        { name: "Calendario", page: "Calendar", icon: CalendarIcon, permiso: "calendario" },
      ]
    },
    {
      id: "tesoreria",
      name: "Finanzas",
      section: "tesoreria",
      icon: DollarSign,
      permiso: "tesoreria",
      items: [
        { name: "Tesorería", page: "TesoreriaV2", icon: Landmark, permiso: "tesoreria" },
        { name: "Cheques", page: "Cheques", icon: CreditCard, permiso: "cheques" },
        { name: "Gastos", page: "Expenses", icon: DollarSign, permiso: "gastos" },
        { name: "Dashboard Ejecutivo", page: "DashboardEjecutivo", icon: BarChart3, permiso: "analytics" },
        { name: "Estado de Resultados", page: "EstadoResultados", icon: FileText, permiso: "analytics" },
        { name: "Analytics", page: "Analytics", icon: TrendingUp, permiso: "analytics" },
        { name: "Tablero Fiscal", page: "TableroFiscal", icon: FileText, permiso: "tablero_fiscal" },
        { name: "IVA Mensual", page: "IVAMensual", icon: Percent, permiso: "iva_mensual" },
        { name: "Ingresos Brutos", page: "IngresosBrutos", icon: Percent, permiso: "ingresos_brutos" },
        { name: "Finanzas", page: "Finance", icon: DollarSign, permiso: "analytics" },
      ]
    },
    {
      id: "configuracion",
      name: "Configuración",
      section: "configuracion",
      icon: Settings,
      permiso: null,
      items: [
        { name: "Empresa", page: "Settings", icon: Building2, permiso: null },
        { name: "Usuarios", page: "SettingsUsers", icon: Users, permiso: null },
        { name: "Roles y Permisos", page: "SettingsRoles", icon: Shield, permiso: null },
      ]
    }
  ];

  const modules = allModules
    .map(module => {
      console.log('[LayoutContent] Processing module:', module.id, { 
        isConfiguracion: module.id === "configuracion",
        externalIsAdmin,
        hasPermiso: module.permiso
      });

      // Hide configuracion module for non-admins (strict admin-only access)
      if (module.id === "configuracion") {
        if (!externalIsAdmin) {
          console.log('[LayoutContent] ❌ Configuración HIDDEN - not admin');
          return null;
        } else {
          console.log('[LayoutContent] ✅ Configuración SHOWN - admin access confirmed');
          return module;
        }
      }

      if (!module.permiso) {
        return module;
      }

      const hasModuleAccess = externalIsAdmin || allowedModules.includes(module.permiso);
      if (!hasModuleAccess) {
        return null;
      }

      const filteredItems = module.items.filter(item => {
        if (!item.permiso) return true;
        return externalIsAdmin || allowedModules.includes(item.permiso);
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

  console.log('[LayoutContent] Final modules:', modules.map(m => m.id));

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
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/90 backdrop-blur-sm border-b border-border/40 z-50 flex items-center justify-between px-4 transition-theme">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>

        <span 
          className="text-sm font-medium text-foreground"
          style={{ fontFamily: fontFamilyMap[tipografiaLogo] }}
        >
          {allPages.find(p => p.page === currentPageName)?.name || "Dashboard"}
        </span>
        
        <button 
          onClick={() => setCommandOpen(true)}
          className="p-2 -mr-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <Search className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Toggle Button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-6 top-20 z-45 p-3 rounded-full bg-card border border-border/40 shadow-lg hover:shadow-xl hover:bg-secondary transition-all duration-200 lg:hidden"
          title="Abrir menú"
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 w-64 bg-gradient-to-b from-slate-50 to-slate-100/50 border-r border-slate-200/60 z-50 transition-theme",
        "transition-transform duration-300 ease-out",
        "lg:translate-x-0",
        sidebarOpen || sidebarPinned ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200/40 bg-white/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {nombreEmpresa.charAt(0).toUpperCase()}
                </span>
              </div>
              <span 
                className="font-semibold text-foreground tracking-tight"
                style={{ fontFamily: fontFamilyMap[tipografiaLogo] }}
              >
                {nombreEmpresa}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSidebarPinned(!sidebarPinned)}
                className="hidden sm:flex p-1.5 rounded-lg hover:bg-secondary transition-colors"
                title={sidebarPinned ? "Desfijar" : "Fijar"}
              >
                {sidebarPinned ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                )}
              </button>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <button
              onClick={() => setCommandOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-secondary/60 rounded-lg hover:bg-secondary transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Buscar...</span>
              <kbd className="hidden sm:inline-flex text-xs px-1.5 py-0.5 bg-background rounded border border-border/60">⌘K</kbd>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
            {modules.map((module) => {
              const SectionIcon = sectionIcons[module.section];
              return (
                <div key={module.id} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 px-3 py-2.5 mb-3">
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gradient-to-br from-slate-600 to-slate-700">
                      {SectionIcon && <SectionIcon className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-widest">
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

          {/* User Section */}
          {user && (
            <div className="p-3 border-t border-border/40">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">
                    {getInitials(user.full_name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="pt-14 lg:pt-0">
          <header className="hidden lg:flex h-14 items-center justify-between px-6 border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 z-30 transition-theme">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {modules.find(m => m.items.some(i => i.page === currentPageName))?.name}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              <span className="font-medium text-foreground">
                {allPages.find(p => p.page === currentPageName)?.name || "Dashboard"}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
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