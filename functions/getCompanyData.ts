import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Retrieves company data dynamically for sales documents
 * Called by PDF generation to fetch company info without hardcoding
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await req.json();

    if (!companyId) {
      return Response.json({ error: 'Missing companyId' }, { status: 400 });
    }

    // Get all companies
    const companies = await base44.entities.Company.list();
    const company = companies.find(c => c.id === companyId);

    if (!company) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    return Response.json({
      id: company.id,
      name: company.name,
      legal_name: company.legal_name,
      tax_id: company.tax_id,
      tipo_iva: company.tipo_iva,
      address: company.address,
      phone: company.phone,
      email: company.email,
      logo_url: company.logo_url
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});