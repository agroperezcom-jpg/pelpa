import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can create users in DB
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, full_name } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.list();
    const userExists = existingUsers.find(u => u.email === email);

    if (userExists) {
      return Response.json({ 
        success: false,
        error: 'User already exists in database',
        user: userExists
      }, { status: 400 });
    }

    // Create user manually with basic data (since users are usually created by auth gateway)
    // This is a workaround for users who accepted invitations but don't exist in DB
    const newUser = await base44.asServiceRole.entities.User.create({
      email,
      full_name: full_name || email.split('@')[0],
      role: 'user'
    });

    return Response.json({ 
      success: true,
      message: `User ${email} created in database`,
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});