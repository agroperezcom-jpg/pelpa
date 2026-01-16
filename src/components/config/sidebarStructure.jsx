
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Package, Landmark, BarChart3,
  Calendar as CalendarIcon, Briefcase, Settings, FileText, Users, Wrench, 
  FileCheck, Building2, CreditCard, Check, ClipboardList, TrendingUp, DollarSign
} from "lucide-react";

export const SIDEBAR_STRUCTURE = [
  {
    id: "general",
    name: "General",
    section: "general",
    icon: LayoutDashboard,
    permiso: null,
    items: [
      { id: "dashboard", name: "Dashboard", page: "Dashboard", icon: LayoutDashboard, permiso: null },
    ]
  },
  {
    id: "ventas",
    name: "Ventas",
    section: "ventas",
    icon: ShoppingCart,
    permiso: "sales",
    items: [
      { id: "sales", name: "Ventas", page: "Sales", icon: ShoppingCart, permiso: "sales" },
      { id: "presupuestos", name: "Presupuestos", page: "Presupuestos", icon: FileText, permiso: "sales" },
      { id: "clients", name: "Clientes", page: "Clients", icon: Users, permiso: "sales" },
      { id: "services", name: "Servicios", page: "Services", icon: Wrench, permiso: "sales" },
      { id: "talonarios", name: "Talonarios", page: "Talonarios", icon: FileCheck, permiso: "sales" },
    ]
  },
  {
    id: "compras",
    name: "Compras",
    section: "compras",
    icon: ShoppingBag,
    permiso: "purchases",
    items: [
      { id: "purchases", name: "Compras", page: "Purchases", icon: ShoppingBag, permiso: "purchases" },
      { id: "proveedores", name: "Proveedores", page: "Proveedores", icon: Building2, permiso: "purchases" },
      { id: "pagos_proveedores", name: "Pagos Proveedores", page: "PagosProveedores", icon: CreditCard, permiso: "purchases" },
      { id: "productos", name: "Productos", page: "Products", icon: Package, permiso: "inventory" },
      { id: "inventario", name: "Inventario", page: "Inventory", icon: Check, permiso: "inventory" },
      { id: "control_stock", name: "Control de Stock", page: "HistorialControlesStock", icon: ClipboardList, permiso: "inventory" },
    ]
  },
  {
    id: "proyectos",
    name: "Proyectos",
    section: "proyectos",
    icon: Briefcase,
    permiso: "projects",
    items: [
      { id: "projects", name: "Proyectos", page: "Projects", icon: Briefcase, permiso: "projects" },
      { id: "work_orders", name: "Órdenes de Trabajo", page: "WorkOrders", icon: Briefcase, permiso: "projects" },
    ]
  },
  {
    id: "calendario",
    name: "Agenda",
    section: "calendario",
    icon: CalendarIcon,
    permiso: "calendar",
    items: [
      { id: "calendar", name: "Calendario", page: "Calendar", icon: CalendarIcon, permiso: "calendar" },
    ]
  },
  {
    id: "tesoreria",
    name: "Finanzas",
    section: "tesoreria",
    icon: DollarSign,
    permiso: "finance",
    items: [
      { id: "tesoreria", name: "Tesorería", page: "TesoreriaV2", icon: Landmark, permiso: "finance" },
      { id: "cheques", name: "Cheques", page: "Cheques", icon: CreditCard, permiso: "finance" },
      { id: "gastos", name: "Gastos", page: "Expenses", icon: DollarSign, permiso: "finance" },
      { id: "finanzas", name: "Finanzas", page: "FinanzasHub", icon: BarChart3, permiso: "finance" },
      { id: "estado_resultados", name: "Estado de Resultados", page: "EstadoResultados", icon: FileText, permiso: "finance" },
      { id: "analytics", name: "Analytics", page: "Analytics", icon: TrendingUp, permiso: "finance" },
    ]
  },
  {
    id: "ajustes",
    name: "Ajustes",
    section: "ajustes",
    icon: Settings,
    permiso: null,
    items: [
      { id: "settings", name: "Sistema", page: "Settings", icon: Settings, permiso: null },
    ]
  }
];
