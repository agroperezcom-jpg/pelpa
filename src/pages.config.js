import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Services from './pages/Services';
import Inventory from './pages/Inventory';
import Projects from './pages/Projects';
import Sales from './pages/Sales';
import Marketing from './pages/Marketing';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Clients": Clients,
    "Products": Products,
    "Services": Services,
    "Inventory": Inventory,
    "Projects": Projects,
    "Sales": Sales,
    "Marketing": Marketing,
    "Analytics": Analytics,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};