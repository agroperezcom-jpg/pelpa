/**
 * INTEGRATED MODE INITIALIZATION
 * 
 * This function should be called from the HTML entry point BEFORE React loads
 * It validates and injects the external auth context
 * 
 * Usage in HTML:
 * <script>
 *   window.__AUTH_CONTEXT__ = {
 *     user_email: "user@example.com",
 *     user_full_name: "Juan Pérez",
 *     company_id: "comp_123",
 *     role: "admin",
 *     environment_mode: "DEMO"
 *   };
 *   
 *   window.__AUTH_GATEWAY_LOGOUT__ = () => {
 *     // Handle logout in your auth gateway
 *     window.location.href = "/auth/logout";
 *   };
 * </script>
 */

export function initializeIntegratedMode() {
  console.log('[Integrated Mode] Initializing...');

  // Validate context exists
  if (!window.__AUTH_CONTEXT__) {
    console.error('[Integrated Mode] Missing window.__AUTH_CONTEXT__');
    return false;
  }

  const ctx = window.__AUTH_CONTEXT__;
  
  // Validate required fields
  const required = ['user_email', 'user_full_name', 'company_id', 'role', 'environment_mode'];
  const missing = required.filter(field => !ctx[field]);
  
  if (missing.length > 0) {
    console.error(`[Integrated Mode] Missing fields: ${missing.join(', ')}`);
    return false;
  }

  // Validate values
  if (!['admin', 'user'].includes(ctx.role)) {
    console.error('[Integrated Mode] Invalid role:', ctx.role);
    return false;
  }

  if (!['DEMO', 'PRODUCCION'].includes(ctx.environment_mode)) {
    console.error('[Integrated Mode] Invalid environment_mode:', ctx.environment_mode);
    return false;
  }

  console.log('[Integrated Mode] ✓ Context validated');
  console.log(`[Integrated Mode] User: ${ctx.user_email} | Role: ${ctx.role} | Mode: ${ctx.environment_mode}`);
  
  return true;
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  window.__initializeIntegratedMode__ = initializeIntegratedMode;
}