import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Update user status (PENDING, ACTIVE, BLOCKED)
 * Only admin can perform this action
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (admin.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Only admins can update user status' }, { status: 403 });
    }

    const { user_id, new_status } = await req.json();

    if (!user_id || !new_status) {
      return Response.json({ error: 'user_id and new_status are required' }, { status: 400 });
    }

    if (!['PENDING', 'ACTIVE', 'BLOCKED'].includes(new_status)) {
      return Response.json({ error: 'Invalid status. Must be PENDING, ACTIVE, or BLOCKED' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Don't allow blocking admin users
    if (targetUser.role === 'admin' && new_status === 'BLOCKED') {
      return Response.json({ error: 'Cannot block admin users' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(user_id, {
      status: new_status,
      status_changed_at: new Date().toISOString(),
      status_changed_by: admin.email
    });

    console.log(`[USER_STATUS_CHANGE] User ${targetUser.email} status changed to ${new_status} by ${admin.email}`);

    return Response.json({
      success: true,
      message: `User status updated to ${new_status}`,
      user: {
        id: user_id,
        email: targetUser.email,
        status: new_status
      }
    });
  } catch (error) {
    console.error('Error in updateUserStatus:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});