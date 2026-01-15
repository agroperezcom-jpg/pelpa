import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook to check user permissions
 * Returns permission status and enforcement helper
 */
export function usePermissionsEnforcement() {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        // Blocked users cannot access the system
        if (currentUser?.status === "blocked") {
          await base44.auth.logout();
          return;
        }

        setUser(currentUser);

        // Admin has all permissions
        if (currentUser?.role === "admin") {
          setPermissions([]);
          setLoading(false);
          return;
        }

        // Fetch role-based permissions
        const allPermissions = await base44.entities.Permission.list();
        const userPermissions = allPermissions.filter(
          p => p.role_id === currentUser?.role_id
        );
        setPermissions(userPermissions);
      } catch (error) {
        console.error("Permission load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  /**
   * Check if user has permission for a specific action on a module
   * @param module - Module key (e.g., "inventory", "sales")
   * @param action - Action (e.g., "view", "create", "edit", "delete")
   * @returns boolean
   */
  const hasPermission = (module, action) => {
    // Admin always has all permissions
    if (user?.role === "admin") return true;

    const perm = permissions.find(
      p => p.module === module && p.action === action && p.allowed === true
    );
    return !!perm;
  };

  /**
   * Check if user can view a module
   */
  const canViewModule = (module) => hasPermission(module, "view");

  /**
   * Check if user can perform an action
   */
  const canCreate = (module) => hasPermission(module, "create");
  const canEdit = (module) => hasPermission(module, "edit");
  const canDelete = (module) => hasPermission(module, "delete");

  return {
    user,
    loading,
    hasPermission,
    canViewModule,
    canCreate,
    canEdit,
    canDelete,
    isAdmin: user?.role === "admin",
    isBlocked: user?.status === "blocked"
  };
}