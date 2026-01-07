import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Package,
  Briefcase,
  ShoppingCart,
  BarChart3,
  Megaphone,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  BookOpen,
  Warehouse,
  ChevronDown,
  Calendar as CalendarIcon,
  Receipt,
  Calculator,
  Landmark,
  ChevronLeft,
  ChevronRight,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Log session start
        const today = new Date().toISOString().split('T')[0];
        const existingLogs = await base44.entities.SessionLog.filter({
          user_email: userData.email,
          date: today
        });
        
        if (existingLogs.length === 0) {
          await base44.entities.SessionLog.create({
            user_email: userData.email,
            user_name: userData.full_name,
            login_time: new Date().toISOString(),
            date: today
          });
        }
      } catch (e) {
        console.log("Not logged in");
      }
    };
    loadUser();
  }, []);

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unreadMessages'],
    queryFn: () => base44.entities.ProjectMessage.filter({ is_read: false }),
    refetchInterval: 30000
  });

  const handleLogout = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (user) {
      const logs = await base44.entities.SessionLog.filter({
        user_email: user.email,
        date: today
      });
      if (logs.length > 0 && !logs[0].logout_time) {
        const loginTime = new Date(logs[0].login_time);
        const now = new Date();
        const duration = Math.round((now - loginTime) / 60000);
        await base44.entities.SessionLog.update(logs[0].id, {
          logout_time: now.toISOString(),
          duration_minutes: duration
        });
      }
    }
    base44.auth.logout();
  };

  const isAdmin = user?.role === 'admin';

  const navItems = [
    { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
    { name: "Calendario", page: "Calendar", icon: CalendarIcon },
    { name: "Clientes", page: "Clients", icon: Users },
    { name: "Productos", page: "Products", icon: Package },
    { name: "Servicios", page: "Services", icon: Briefcase },
    { name: "Inventario", page: "Inventory", icon: Warehouse },
    { name: "Compras", page: "Purchases", icon: ShoppingBag },
    { name: "Proyectos", page: "Projects", icon: BookOpen },
    { name: "Ventas", page: "Sales", icon: ShoppingCart },
    { name: "Gastos", page: "Expenses", icon: Receipt },
    { name: "Tesorería", page: "TesoreriaV2", icon: Landmark },
    { name: "Finanzas", page: "Finance", icon: Calculator },
    { name: "Marketing", page: "Marketing", icon: Megaphone },
    { name: "Análisis", page: "Analytics", icon: BarChart3 },
    ...(isAdmin ? [{ name: "Configuración", page: "Settings", icon: Settings }] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-slate-800">Librería</span>
        </div>
        <div className="relative">
          {unreadMessages.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
              {unreadMessages.length}
            </Badge>
          )}
          <Bell className="h-5 w-5 text-slate-500" />
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50 transition-all duration-300",
        "lg:translate-x-0",
        sidebarCollapsed ? "w-16" : "w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
            {!sidebarCollapsed ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-slate-800 text-sm">Gestión Librería</h1>
                    <p className="text-[10px] text-slate-400">Sistema Integral</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
            )}
          </div>

          {/* Toggle Button */}
          <div className="hidden lg:flex justify-end p-2 border-b border-slate-100">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    sidebarCollapsed && "justify-center"
                  )}
                  title={sidebarCollapsed ? item.name : ""}
                >
                  <Icon className={cn("h-4 w-4", isActive && "text-blue-600")} />
                  {!sidebarCollapsed && (
                    <>
                      {item.name}
                      {item.page === "Projects" && unreadMessages.length > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white text-[10px] h-5 min-w-5 flex items-center justify-center">
                          {unreadMessages.length}
                        </Badge>
                      )}
                    </>
                  )}
                  {sidebarCollapsed && item.page === "Projects" && unreadMessages.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          {user && (
            <div className="p-3 border-t border-slate-100">
              {!sidebarCollapsed ? (
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                    {user.full_name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.role === 'admin' ? 'Administrador' : 'Empleado'}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-red-500">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium cursor-pointer group relative"
                    title={user.full_name}
                  >
                    {user.full_name?.charAt(0) || "U"}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                      {user.full_name}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "pt-16 lg:pt-0 min-h-screen transition-all duration-300",
        sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
      )}>
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}