import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only allow current admins to set admin roles
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { email } = await req.json();

        if (!email) {
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }

        // Get all users and find the target user
        const users = await base44.asServiceRole.entities.User.list();
        const targetUser = users.find(u => u.email === email);

        if (!targetUser) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        // Update the user role to admin
        await base44.asServiceRole.entities.User.update(targetUser.id, { role: 'admin' });

        return Response.json({ 
            success: true, 
            message: `User ${email} updated to admin`,
            user: targetUser.email
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});