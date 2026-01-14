import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can invite users
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Invite user as admin
    const result = await base44.users.inviteUser(email, "admin");

    return Response.json({ 
      success: true,
      message: `User ${email} invited as admin`,
      result 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});