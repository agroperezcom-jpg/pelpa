import Analytics from './pages/Analytics';
import Calendar from './pages/Calendar';
import Cheques from './pages/Cheques';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import DashboardEjecutivo from './pages/DashboardEjecutivo';
import EstadoResultados from './pages/EstadoResultados';
import Expenses from './pages/Expenses';
import Finance from './pages/Finance';
import HistorialControlesStock from './pages/HistorialControlesStock';
import IVAMensual from './pages/IVAMensual';
import IngresosBrutos from './pages/IngresosBrutos';
import Inventory from './pages/Inventory';
import Marketing from './pages/Marketing';
import PagosProveedores from './pages/PagosProveedores';
import Presupuestos from './pages/Presupuestos';
import Products from './pages/Products';
import ProjectTemplates from './pages/ProjectTemplates';
import Projects from './pages/Projects';
import Proveedores from './pages/Proveedores';
import Purchases from './pages/Purchases';
import RolesPermisos from './pages/RolesPermisos';
import Sales from './pages/Sales';
import Services from './pages/Services';
import Settings from './pages/Settings';
import SettingsRoles from './pages/SettingsRoles';
import SettingsUsers from './pages/SettingsUsers';
import TableroFiscal from './pages/TableroFiscal';
import Talonarios from './pages/Talonarios';
import TesoreriaV2 from './pages/TesoreriaV2';
import TiposArticulo from './pages/TiposArticulo';
import Treasury from './pages/Treasury';
import WorkOrders from './pages/WorkOrders';
import SettingsImpresoras from './pages/SettingsImpresoras';
import SettingsProyectos from './pages/SettingsProyectos';
import SettingsAutomatizaciones from './pages/SettingsAutomatizaciones';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Calendar": Calendar,
    "Cheques": Cheques,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "DashboardEjecutivo": DashboardEjecutivo,
    "EstadoResultados": EstadoResultados,
    "Expenses": Expenses,
    "Finance": Finance,
    "HistorialControlesStock": HistorialControlesStock,
    "IVAMensual": IVAMensual,
    "IngresosBrutos": IngresosBrutos,
    "Inventory": Inventory,
    "Marketing": Marketing,
    "PagosProveedores": PagosProveedores,
    "Presupuestos": Presupuestos,
    "Products": Products,
    "ProjectTemplates": ProjectTemplates,
    "Projects": Projects,
    "Proveedores": Proveedores,
    "Purchases": Purchases,
    "RolesPermisos": RolesPermisos,
    "Sales": Sales,
    "Services": Services,
    "Settings": Settings,
    "SettingsRoles": SettingsRoles,
    "SettingsUsers": SettingsUsers,
    "TableroFiscal": TableroFiscal,
    "Talonarios": Talonarios,
    "TesoreriaV2": TesoreriaV2,
    "TiposArticulo": TiposArticulo,
    "Treasury": Treasury,
    "WorkOrders": WorkOrders,
    "SettingsImpresoras": SettingsImpresoras,
    "SettingsProyectos": SettingsProyectos,
    "SettingsAutomatizaciones": SettingsAutomatizaciones,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};