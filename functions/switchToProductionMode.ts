import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { company_id, reset_pin } = await req.json();

    if (!company_id || !reset_pin) {
      return Response.json({ error: 'company_id and reset_pin are required' }, { status: 400 });
    }

    // Fetch company
    const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
    if (companies.length === 0) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = companies[0];

    // Check if already in production
    if (company.environment_mode === 'PRODUCCION') {
      return Response.json({ error: 'Company is already in production mode' }, { status: 400 });
    }

    // Execute master reset with reset_pin
    const resetResult = await base44.functions.invoke('masterCompanyReset', {
      company_id,
      reset_pin
    });

    if (!resetResult.data.success) {
      return Response.json({ error: resetResult.data.error || 'Reset failed' }, { status: 400 });
    }

    // Update company to production mode
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.Company.update(company_id, {
      environment_mode: 'PRODUCCION',
      production_activated_at: now
    });

    // Log the mode change
    await base44.asServiceRole.entities.CompanyModeAuditLog.create({
      company_id,
      company_name: company.name,
      user_email: user.email,
      user_name: user.full_name,
      action: 'SWITCH_TO_PRODUCTION',
      from_mode: 'DEMO',
      to_mode: 'PRODUCCION',
      timestamp: now
    });

    return Response.json({
      success: true,
      message: 'Successfully switched to production mode',
      production_activated_at: now
    });
  } catch (error) {
    console.error('Error in switchToProductionMode:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});