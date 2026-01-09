import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const menuItems = [
    { name: "Dashboard", page: "Dashboard" },
    { name: "Ventas", page: "Sales" },
    { name: "Compras", page: "Purchases" },
    { name: "Productos", page: "Products" },
    { name: "Inventario", page: "Inventory" },
    { name: "Clientes", page: "Clients" },
    { name: "Tesorería", page: "TesoreriaV2" },
    { name: "Proyectos", page: "Projects" },
    { name: "Calendario", page: "Calendar" },
    { name: "Analytics", page: "Analytics" },
    { name: "Finanzas", page: "Finance" },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={`fixed lg:relative w-64 h-screen bg-white border-r border-slate-200 transform lg:transform-none transition-transform duration-300 z-40 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800">Sistema</h1>
        </div>
        
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-60px-60px)]">
          {menuItems.map((item) => (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPageName === item.page
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
            <p className="text-sm font-medium text-slate-800 truncate">{user.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full mt-2"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between lg:justify-start sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h2 className="text-lg font-semibold text-slate-800 flex-1 lg:flex-none">
            {menuItems.find(m => m.page === currentPageName)?.name || "Dashboard"}
          </h2>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}