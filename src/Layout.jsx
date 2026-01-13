import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/components/permissions/usePermissions";
import { ExternalAuthProvider } from "@/components/context/ExternalAuthContext";
import { CompanyProvider } from "@/components/context/CompanyContext";
import { useExternalAuth } from "@/components/context/ExternalAuthContext";
import { Toaster } from 'react-hot-toast';
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
        Shield,
        LogOut,
        Search,
        ChevronRight,
        Menu,
        X,
        FileText,
        Bell,
        Users,
        Wrench,
        FileCheck,
        Building2,
        CreditCard,
        Percent,
        TrendingUp,
        DollarSign,
        Check
      } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function Layout({ children, currentPageName }) {
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
  const { user: externalUser, isAdmin: externalIsAdmin } = useExternalAuth();
  const { hasPermission, getAllowedModules, isAdmin, loading: permissionsLoading } = usePermissions();



  return (
    <ExternalAuthProvider>
      <CompanyProvider>
        <ThemeProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
            }}
          />
          <LayoutContent currentPageName={currentPageName}>
            {children}
          </LayoutContent>
        </ThemeProvider>
      </CompanyProvider>
    </ExternalAuthProvider>
  );
}