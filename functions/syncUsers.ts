import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can sync users
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all users from User entity
    const usersInDB = await base44.asServiceRole.entities.User.list();
    
    // Get current authenticated users (from external auth)
    // The current user is authenticated, we're getting data about all users
    const result = {
      total: usersInDB.length,
      users: usersInDB.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        created_date: u.created_date
      })),
      missing_users: [],
      admin_count: usersInDB.filter(u => u.role === 'admin').length
    };

    return Response.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});