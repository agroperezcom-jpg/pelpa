import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sets or updates the master reset PIN for a company
 * Called by admin users from settings
 * 
 * PIN is hashed before storage using SHA-256 + salt
 * Never stored in plain text
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { company_id, reset_pin, enable_reset } = await req.json();

    if (!company_id || !reset_pin || reset_pin.length < 4) {
      return Response.json({ error: 'Missing company_id, reset_pin, or PIN too short (min 4 chars)' }, { status: 400 });
    }

    // Verify company exists
    const companies = await base44.entities.Company.list();
    const company = companies.find(c => c.id === company_id);

    if (!company) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    // Hash the PIN with salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(reset_pin + saltHex);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const master_reset_pin_hashed = `${saltHex}:${hashHex}`;

    // Check if config already exists
    let resetConfig;
    try {
      const resetConfigs = await base44.entities.CompanyResetConfig.list();
      resetConfig = resetConfigs.find(c => c.company_id === company_id);
    } catch (e) {
      console.log("CompanyResetConfig entity may not exist yet");
    }

    if (resetConfig) {
      // Update existing
      await base44.entities.CompanyResetConfig.update(resetConfig.id, {
        master_reset_pin_hashed,
        reset_enabled: enable_reset === true
      });
    } else {
      // Create new
      await base44.entities.CompanyResetConfig.create({
        company_id,
        master_reset_pin_hashed,
        reset_enabled: enable_reset === true
      });
    }

    return Response.json({
      success: true,
      message: `Reset PIN configured and reset ${enable_reset ? 'enabled' : 'disabled'}`,
      company_id: company_id,
      company_name: company.name,
      reset_enabled: enable_reset === true
    });
  } catch (error) {
    console.error("Error setting reset PIN:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});