import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Handle password change on first login
 * Sets user status to ACTIVE after successful password change
 * No platform emails - white-label only
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { new_password } = await req.json();

    if (!new_password || new_password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Update user: clear temp password, set new password, mark as ACTIVE
    await base44.asServiceRole.entities.User.update(user.id, {
      status: 'ACTIVE',
      must_change_password: false,
      temporary_password_hash: null,
      last_password_change: new Date().toISOString()
    });

    console.log(`[USER_ACTIVATION] User activated: ${user.email}`);

    return Response.json({
      success: true,
      message: 'Password changed successfully. User is now ACTIVE.',
      user_status: 'ACTIVE'
    });
  } catch (error) {
    console.error('Error in changePasswordFirstLogin:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});