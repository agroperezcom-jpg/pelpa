import Analytics from './pages/Analytics';
import Calendar from './pages/Calendar';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Finance from './pages/Finance';
import Inventory from './pages/Inventory';
import Marketing from './pages/Marketing';
import Products from './pages/Products';
import Projects from './pages/Projects';
import Sales from './pages/Sales';
import Services from './pages/Services';
import Settings from './pages/Settings';
import TiposArticulo from './pages/TiposArticulo';
import Treasury from './pages/Treasury';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Calendar": Calendar,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "Expenses": Expenses,
    "Finance": Finance,
    "Inventory": Inventory,
    "Marketing": Marketing,
    "Products": Products,
    "Projects": Projects,
    "Sales": Sales,
    "Services": Services,
    "Settings": Settings,
    "TiposArticulo": TiposArticulo,
    "Treasury": Treasury,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};