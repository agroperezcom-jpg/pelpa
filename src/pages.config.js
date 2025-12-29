import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Services from './pages/Services';
import Inventory from './pages/Inventory';
import Projects from './pages/Projects';
import Sales from './pages/Sales';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Clients": Clients,
    "Products": Products,
    "Services": Services,
    "Inventory": Inventory,
    "Projects": Projects,
    "Sales": Sales,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};