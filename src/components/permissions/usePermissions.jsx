import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        // Fetch current user
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Check if blocked
        if (currentUser?.status === "blocked") {
          setIsBlocked(true);
          setLoading(false);
          return;
        }

        // If no role_id, no permissions
        if (!currentUser?.role_id) {
          setPermissions(new Set());
          setLoading(false);
          return;
        }

        // Fetch role permissions
        const rolePermissions = await base44.entities.RolePermission.filter({
          role_id: currentUser.role_id,
        });

        if (rolePermissions.length === 0) {
          setPermissions(new Set());
          setLoading(false);
          return;
        }

        // Fetch permission details
        const allPermissions = await base44.entities.Permission.list();

        // Build permission set: module_key.action
        const permSet = new Set();
        rolePermissions.forEach((rp) => {
          const perm = allPermissions.find((p) => p.id === rp.permission_id);
          if (perm) {
            permSet.add(`${perm.module_key}.${perm.action}`);
          }
        });

        setPermissions(permSet);
      } catch (error) {
        console.error("Error loading permissions:", error);
        setPermissions(new Set());
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const hasPermission = (moduleKey, action) => {
    if (isBlocked) return false;
    if (loading) return false;
    return permissions.has(`${moduleKey}.${action}`);
  };

  const canView = (moduleKey) => hasPermission(moduleKey, "view");
  const canCreate = (moduleKey) => hasPermission(moduleKey, "create");
  const canEdit = (moduleKey) => hasPermission(moduleKey, "edit");
  const canDelete = (moduleKey) => hasPermission(moduleKey, "delete");
  const canApprove = (moduleKey) => hasPermission(moduleKey, "approve");

  return {
    user,
    loading,
    isBlocked,
    permissions,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
  };
}