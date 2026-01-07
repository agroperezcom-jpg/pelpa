import Analytics from './pages/Analytics';
import Calendar from './pages/Calendar';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import DashboardEjecutivo from './pages/DashboardEjecutivo';
import Expenses from './pages/Expenses';
import Finance from './pages/Finance';
import IVAMensual from './pages/IVAMensual';
import Inventory from './pages/Inventory';
import Marketing from './pages/Marketing';
import Presupuestos from './pages/Presupuestos';
import Products from './pages/Products';
import Projects from './pages/Projects';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Services from './pages/Services';
import Settings from './pages/Settings';
import TesoreriaV2 from './pages/TesoreriaV2';
import TiposArticulo from './pages/TiposArticulo';
import Treasury from './pages/Treasury';
import Proveedores from './pages/Proveedores';
import PagosProveedores from './pages/PagosProveedores';
import IngresosBrutos from './pages/IngresosBrutos';
import TableroFiscal from './pages/TableroFiscal';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Calendar": Calendar,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "DashboardEjecutivo": DashboardEjecutivo,
    "Expenses": Expenses,
    "Finance": Finance,
    "IVAMensual": IVAMensual,
    "Inventory": Inventory,
    "Marketing": Marketing,
    "Presupuestos": Presupuestos,
    "Products": Products,
    "Projects": Projects,
    "Purchases": Purchases,
    "Sales": Sales,
    "Services": Services,
    "Settings": Settings,
    "TesoreriaV2": TesoreriaV2,
    "TiposArticulo": TiposArticulo,
    "Treasury": Treasury,
    "Proveedores": Proveedores,
    "PagosProveedores": PagosProveedores,
    "IngresosBrutos": IngresosBrutos,
    "TableroFiscal": TableroFiscal,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};