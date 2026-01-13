import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

/**
 * Create a new user with PENDING status
 * Generates temporary password internally - NO platform emails sent
 * Admin must communicate credentials through custom channels
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Only admins can create users' }, { status: 403 });
    }

    const { email, full_name, role } = await req.json();

    if (!email || !full_name || !role) {
      return Response.json({ error: 'email, full_name, and role are required' }, { status: 400 });
    }

    if (!['admin', 'user'].includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0) {
      return Response.json({ error: 'User already exists' }, { status: 400 });
    }

    // Generate temporary password (12 chars: uppercase, lowercase, numbers, special)
    const tempPassword = generateTemporaryPassword();

    // Create user with PENDING status
    const newUser = await base44.asServiceRole.entities.User.create({
      email,
      full_name,
      role,
      status: 'PENDING',
      temporary_password_hash: hashPassword(tempPassword),
      must_change_password: true,
      created_at: new Date().toISOString()
    });

    // Log the user creation
    console.log(`[USER_CREATION] User created: ${email} by ${user.email}`);

    return Response.json({
      success: true,
      message: 'User created successfully with PENDING status',
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        status: newUser.status,
        role: newUser.role
      },
      temporary_password: tempPassword,
      note: 'IMPORTANT: Share this temporary password with the user through a secure channel. This is the only time it will be shown.'
    });
  } catch (error) {
    console.error('Error in createUserWithStatus:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Generate a secure temporary password
 * 12 characters: uppercase, lowercase, numbers, special chars
 */
function generateTemporaryPassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*-_';

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  const allChars = uppercase + lowercase + numbers + special;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Simple hash for temporary password (NOT for production passwords)
 * For production, use proper bcrypt/argon2
 */
function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = crypto.createHash('sha256').update(data).digest();
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}