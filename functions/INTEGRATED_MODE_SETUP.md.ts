# Integrated Mode Setup Guide

This application runs in **INTEGRATED MODE** - all authentication is handled externally by an Authentication Gateway. Base44 acts as the application engine only.

## Architecture

```
[External Auth Gateway]
        ↓
  [Injects Context]
        ↓
  [Base44 App Engine]
        ↓
   [White-Label UI]
```

## How It Works

1. **External Gateway validates user credentials**
2. **Gateway injects auth context** into the application
3. **Base44 trusts the context completely**
4. **Base44 uses context for authorization only**
5. **No Base44 emails, branding, or authentication UI**

## Setup Instructions

### 1. Inject Auth Context (in HTML entry point)

Before the React app loads, inject the user context:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Meta tags, fonts, etc -->
  </head>
  <body>
    <div id="root"></div>

    <!-- SET AUTH CONTEXT BEFORE REACT LOADS -->
    <script>
      window.__AUTH_CONTEXT__ = {
        user_email: "juan@empresa.com",
        user_full_name: "Juan Pérez",
        company_id: "comp_abc123",
        role: "admin",                    // 'admin' or 'user'
        environment_mode: "DEMO"          // 'DEMO' or 'PRODUCCION'
      };

      // Optional: Setup logout handler
      window.__AUTH_GATEWAY_LOGOUT__ = () => {
        // Redirect to your auth gateway logout endpoint
        window.location.href = "https://auth-gateway.example.com/logout";
      };
    </script>

    <!-- Then load React -->
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### 2. Wrap App with ExternalAuthProvider

In your main application entry point:

```jsx
import { ExternalAuthProvider } from '@/components/context/ExternalAuthContext';
import ContextGuard from '@/components/auth/ContextGuard';
import Layout from './Layout';

export default function App() {
  return (
    <ExternalAuthProvider>
      <ContextGuard>
        <Layout>
          {/* Your pages */}
        </Layout>
      </ContextGuard>
    </ExternalAuthProvider>
  );
}
```

### 3. Use Auth Context in Components

```jsx
import { useExternalAuth } from '@/components/context/ExternalAuthContext';

export default function MyComponent() {
  const { 
    user,              // { email, full_name, role }
    isAdmin,           // boolean
    isDemo,            // boolean
    isProduction,      // boolean
    companyId          // string
  } = useExternalAuth();

  return (
    <div>
      <p>Logged in as: {user.full_name}</p>
      {isAdmin && <p>You have admin privileges</p>}
      {isDemo && <p>Running in DEMO mode</p>}
    </div>
  );
}
```

## Required Context Fields

| Field | Type | Values | Required |
|-------|------|--------|----------|
| `user_email` | string | User's email | ✓ |
| `user_full_name` | string | User's full name | ✓ |
| `company_id` | string | Company identifier | ✓ |
| `role` | string | `admin` or `user` | ✓ |
| `environment_mode` | string | `DEMO` or `PRODUCCION` | ✓ |

## Data Filtering

All queries automatically filter by `company_id` from the context. Users **cannot**:
- Switch companies
- Access data from other companies
- Modify company context

## User Management

User management is **fully external**. Inside Base44:
- Users are referenced only by `email`
- No password logic
- No status management
- No user creation UI

## Environment Modes

### DEMO Mode
- Demo features enabled
- Master reset available
- Demo banners visible
- Testing data safe

### PRODUCCION Mode
- Master reset **disabled**
- Demo features disabled
- Full production behavior

## Error Handling

If context is invalid or missing:
- No login UI shown
- Generic error message displayed: "Acceso no autorizado"
- User cannot proceed

## Logout Handling

Implement logout via the gateway:

```jsx
import { useExternalAuth } from '@/components/context/ExternalAuthContext';

function LogoutButton() {
  const handleLogout = () => {
    if (window.__AUTH_GATEWAY_LOGOUT__) {
      window.__AUTH_GATEWAY_LOGOUT__();
    }
  };

  return <button onClick={handleLogout}>Cerrar Sesión</button>;
}
```

## Security Considerations

1. **Context is read-only** - Base44 cannot modify it
2. **No Base44 auth endpoints** - All auth external
3. **Company isolation** - All queries filtered by company_id
4. **Token validation** - Done by external gateway
5. **Session management** - Handled externally

## Troubleshooting

### "Acceso no autorizado" error

Check:
- [ ] `window.__AUTH_CONTEXT__` is set before React loads
- [ ] All required fields are present
- [ ] Role is 'admin' or 'user'
- [ ] environment_mode is 'DEMO' or 'PRODUCCION'
- [ ] company_id is not empty

### User sees login screen

This should never happen in integrated mode. Check:
- [ ] ExternalAuthProvider wraps the app
- [ ] ContextGuard is active
- [ ] Context is properly injected

## Example: Full HTML Setup

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sistema ERP</title>
  </head>
  <body>
    <div id="root"></div>

    <script>
      // Inject auth context from external gateway
      const authToken = new URLSearchParams(window.location.search).get('token');
      
      // Decode token or get context from gateway
      window.__AUTH_CONTEXT__ = {
        user_email: "juan@empresa.com",
        user_full_name: "Juan Pérez",
        company_id: "comp_abc123",
        role: "admin",
        environment_mode: "DEMO"
      };

      // Setup logout handler
      window.__AUTH_GATEWAY_LOGOUT__ = () => {
        window.location.href = `https://auth-gateway.example.com/logout?redirect=${window.location.origin}`;
      };
    </script>

    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

## No Base44 Visibility

This application is **fully white-label**:
- ✗ No Base44 logo
- ✗ No Base44 name  
- ✗ No Base44 branding
- ✗ No Base44 emails
- ✗ No Base44 auth screens
- ✓ 100% company branding
- ✓ Professional SaaS appearance