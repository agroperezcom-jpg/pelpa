import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Package,
  Landmark,
  BarChart3,
  Calendar as CalendarIcon,
  Briefcase,
  Settings,
  LogOut,
  Command,
  Star,
  StarOff,
  Search,
  BookOpen,
  ChevronRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setFavorites(userData.favoritos_menu || []);
      } catch (e) {
        console.log("Not logged in");
      }
    };
    loadUser();
  }, []);

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

  const handleLogout = async () => {
    base44.auth.logout();
  };

  const toggleFavorite = async (pageName) => {
    const newFavorites = favorites.includes(pageName)
      ? favorites.filter(f => f !== pageName)
      : [...favorites, pageName];
    
    setFavorites(newFavorites);
    await base44.auth.updateMe({ favoritos_menu: newFavorites });
  };

  const isAdmin = user?.role === 'admin';

  const modules = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: LayoutDashboard,
      color: "blue",
      pages: [
        { name: "Dashboard", page: "Dashboard", description: "Vista general" },
        { name: "Dashboard Ejecutivo", page: "DashboardEjecutivo", description: "Métricas clave" }
      ]
    },
    {
      id: "ventas",
      name: "Ventas",
      icon: ShoppingCart,
      color: "emerald",
      pages: [
        { name: "Ventas", page: "Sales", description: "Punto de venta" },
        { name: "Presupuestos", page: "Presupuestos", description: "Cotizaciones" },
        { name: "Clientes", page: "Clients", description: "Base de clientes" },
        { name: "Servicios", page: "Services", description: "Catálogo servicios" }
      ]
    },
    {
      id: "compras",
      name: "Compras",
      icon: ShoppingBag,
      color: "purple",
      pages: [
        { name: "Compras", page: "Purchases", description: "Registro de compras" },
        { name: "Proveedores", page: "Proveedores", description: "Base de proveedores" },
        { name: "Pagos Proveedores", page: "PagosProveedores", description: "Gestión de pagos" }
      ]
    },
    {
      id: "inventario",
      name: "Inventario",
      icon: Package,
      color: "orange",
      pages: [
        { name: "Productos", page: "Products", description: "Catálogo" },
        { name: "Inventario", page: "Inventory", description: "Stock y movimientos" }
      ]
    },
    {
      id: "tesoreria",
      name: "Tesorería",
      icon: Landmark,
      color: "indigo",
      pages: [
        { name: "Tesorería", page: "TesoreriaV2", description: "Bancos y cajas" },
        { name: "Cheques", page: "Cheques", description: "Gestión de cheques" },
        { name: "Gastos", page: "Expenses", description: "Registro de gastos" }
      ]
    },
    {
      id: "analisis",
      name: "Análisis",
      icon: BarChart3,
      color: "pink",
      pages: [
        { name: "Analytics", page: "Analytics", description: "Métricas avanzadas" },
        { name: "Tablero Fiscal", page: "TableroFiscal", description: "Vista fiscal" },
        { name: "IVA Mensual", page: "IVAMensual", description: "Períodos IVA" },
        { name: "Ingresos Brutos", page: "IngresosBrutos", description: "IIBB" },
        { name: "Finanzas", page: "Finance", description: "Estados financieros" }
      ]
    },
    {
      id: "proyectos",
      name: "Proyectos",
      icon: Briefcase,
      color: "teal",
      pages: [
        { name: "Proyectos", page: "Projects", description: "Gestión de proyectos" }
      ]
    },
    {
      id: "calendario",
      name: "Calendario",
      icon: CalendarIcon,
      color: "cyan",
      pages: [
        { name: "Calendario", page: "Calendar", description: "Agenda y eventos" }
      ]
    },
    ...(isAdmin ? [{
      id: "config",
      name: "Configuración",
      icon: Settings,
      color: "slate",
      pages: [
        { name: "Configuración", page: "Settings", description: "Sistema" }
      ]
    }] : [])
  ];

  const allPages = modules.flatMap(m => m.pages);
  const currentModule = modules.find(m => m.pages.some(p => p.page === currentPageName));

  const filteredPages = allPages.filter(p =>
    p.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
    p.description?.toLowerCase().includes(commandSearch.toLowerCase())
  );

  const colorClasses = {
    blue: "bg-blue-500 hover:bg-blue-600",
    emerald: "bg-emerald-500 hover:bg-emerald-600",
    purple: "bg-purple-500 hover:bg-purple-600",
    orange: "bg-orange-500 hover:bg-orange-600",
    indigo: "bg-indigo-500 hover:bg-indigo-600",
    pink: "bg-pink-500 hover:bg-pink-600",
    teal: "bg-teal-500 hover:bg-teal-600",
    cyan: "bg-cyan-500 hover:bg-cyan-600",
    slate: "bg-slate-500 hover:bg-slate-600"
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Dock Lateral */}
      <div className="fixed left-0 top-0 bottom-0 w-20 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-3 z-50">
        {/* Logo */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
          <BookOpen className="h-6 w-6 text-white" />
        </div>

        {/* Módulos */}
        {modules.map((module) => {
          const Icon = module.icon;
          const isActive = currentModule?.id === module.id || activeModule === module.id;
          return (
            <button
              key={module.id}
              onClick={() => setActiveModule(activeModule === module.id ? null : module.id)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative group",
                isActive ? colorClasses[module.color] + " text-white shadow-lg" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
              title={module.name}
            >
              <Icon className="h-5 w-5" />
              {isActive && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l" />}
              <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                {module.name}
              </div>
            </button>
          );
        })}

        {/* Command Palette */}
        <button
          onClick={() => setCommandOpen(true)}
          className="mt-auto w-12 h-12 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-all group"
          title="Buscar (Ctrl+K)"
        >
          <Command className="h-5 w-5" />
          <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            Buscar (Ctrl+K)
          </div>
        </button>

        {/* User Avatar */}
        {user && (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium cursor-pointer group relative"
            title={user.full_name}
          >
            {user.full_name?.charAt(0) || "U"}
            <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {user.full_name}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all group"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Panel Contextual */}
      <div className={cn(
        "fixed left-20 top-0 bottom-0 w-72 bg-white border-r border-slate-200 transition-all duration-300 z-40",
        activeModule ? "translate-x-0" : "-translate-x-full"
      )}>
        {activeModule && modules.find(m => m.id === activeModule) && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-slate-800">
                  {modules.find(m => m.id === activeModule)?.name}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setActiveModule(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                {modules.find(m => m.id === activeModule)?.pages.length} opciones
              </p>
            </div>

            {/* Favoritos */}
            {favorites.length > 0 && (
              <div className="px-4 py-3 border-b bg-amber-50">
                <p className="text-xs font-medium text-amber-900 mb-2">⭐ Favoritos</p>
                <div className="space-y-1">
                  {modules.find(m => m.id === activeModule)?.pages
                    .filter(p => favorites.includes(p.page))
                    .map(page => (
                      <Link
                        key={page.page}
                        to={createPageUrl(page.page)}
                        onClick={() => setActiveModule(null)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
                          currentPageName === page.page
                            ? "bg-amber-200 text-amber-900 font-medium"
                            : "text-amber-800 hover:bg-amber-100"
                        )}
                      >
                        <span>{page.name}</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* Páginas del módulo */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {modules.find(m => m.id === activeModule)?.pages.map(page => {
                const isFavorite = favorites.includes(page.page);
                const isActive = currentPageName === page.page;
                
                return (
                  <div key={page.page} className="group relative">
                    <Link
                      to={createPageUrl(page.page)}
                      onClick={() => setActiveModule(null)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 rounded-xl transition-all",
                        isActive
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex-1">
                        <p className={cn("font-medium text-sm", isActive && "text-slate-900")}>
                          {page.name}
                        </p>
                        {page.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{page.description}</p>
                        )}
                      </div>
                      {isActive && <ChevronRight className="h-4 w-4 text-slate-400 mt-0.5" />}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorite(page.page);
                      }}
                      className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isFavorite ? (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-slate-300 hover:text-amber-500" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Overlay */}
      {activeModule && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setActiveModule(null)}
        />
      )}

      {/* Command Palette */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar página
            </DialogTitle>
          </DialogHeader>
          <div className="p-2">
            <Input
              placeholder="Escribe para buscar..."
              value={commandSearch}
              onChange={(e) => setCommandSearch(e.target.value)}
              className="border-0 focus-visible:ring-0 text-lg"
              autoFocus
            />
          </div>
          <div className="max-h-96 overflow-y-auto pb-2">
            {filteredPages.map((page) => {
              const module = modules.find(m => m.pages.some(p => p.page === page.page));
              const isFavorite = favorites.includes(page.page);
              
              return (
                <Link
                  key={page.page}
                  to={createPageUrl(page.page)}
                  onClick={() => {
                    setCommandOpen(false);
                    setCommandSearch("");
                  }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      colorClasses[module?.color] || "bg-slate-500"
                    )}>
                      {React.createElement(module?.icon || LayoutDashboard, { className: "h-4 w-4 text-white" })}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{page.name}</p>
                      <p className="text-xs text-slate-400">{module?.name} • {page.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFavorite && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600" />
                  </div>
                </Link>
              );
            })}
            {filteredPages.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No se encontraron páginas
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
            <span>Navega con ↑↓ • Abre con Enter</span>
            <span className="font-mono">Ctrl+K</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        activeModule ? "ml-[368px]" : "ml-20"
      )}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}