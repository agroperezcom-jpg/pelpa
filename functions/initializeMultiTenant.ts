import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Backend function to initialize multi-tenant architecture
 * - Creates default company
 * - Migrates existing data to default company
 * - MUST be run ONCE to activate multi-tenant mode
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const DEFAULT_COMPANY_NAME = "Empresa Principal";
    const DEFAULT_COMPANY_TAX_ID = "XX-XXXXXXX-X";

    // Step 1: Check if default company already exists
    let defaultCompany;
    try {
      const companies = await base44.entities.Company.list();
      defaultCompany = companies.find(c => c.name === DEFAULT_COMPANY_NAME);
    } catch (error) {
      console.log("Company entity does not exist yet or is empty");
    }

    // Step 2: Create default company if it doesn't exist
    if (!defaultCompany) {
      defaultCompany = await base44.entities.Company.create({
        name: DEFAULT_COMPANY_NAME,
        legal_name: DEFAULT_COMPANY_NAME,
        tax_id: DEFAULT_COMPANY_TAX_ID,
        tipo_iva: "RESP_INSCRIPTO",
        address: "",
        phone: "",
        email: "",
        logo_url: "",
        is_active: true
      });
      console.log("Default company created:", defaultCompany.id);
    }

    const DEFAULT_COMPANY_ID = defaultCompany.id;

    // Step 3: Migrate existing data to default company
    const migrateEntity = async (entityName, batchSize = 100) => {
      try {
        const records = await base44.entities[entityName].list('-created_date', 10000);
        const recordsToMigrate = records.filter(r => !r.company_id);

        if (recordsToMigrate.length === 0) {
          console.log(`${entityName}: All records already migrated`);
          return { entity: entityName, migrated: 0 };
        }

        let migrated = 0;
        for (let i = 0; i < recordsToMigrate.length; i += batchSize) {
          const batch = recordsToMigrate.slice(i, i + batchSize);
          
          for (const record of batch) {
            try {
              await base44.entities[entityName].update(record.id, {
                company_id: DEFAULT_COMPANY_ID
              });
              migrated++;
            } catch (updateError) {
              console.error(`Error updating ${entityName} ${record.id}:`, updateError.message);
            }
          }
        }

        console.log(`${entityName}: ${migrated} records migrated`);
        return { entity: entityName, migrated };
      } catch (error) {
        console.error(`Error migrating ${entityName}:`, error.message);
        return { entity: entityName, migrated: 0, error: error.message };
      }
    };

    // List of business entities to migrate
    const entitiesToMigrate = [
      'Sale',
      'Client',
      'Product',
      'Service',
      'InventoryMovement',
      'Account',
      'Transaction',
      'Expense',
      'Cobro',
      'Check'
    ];

    const migrationResults = [];
    for (const entity of entitiesToMigrate) {
      const result = await migrateEntity(entity);
      migrationResults.push(result);
    }

    return Response.json({
      success: true,
      message: "Multi-tenant initialization completed",
      defaultCompany: {
        id: DEFAULT_COMPANY_ID,
        name: DEFAULT_COMPANY_NAME
      },
      migration: migrationResults
    });
  } catch (error) {
    console.error("Initialization error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});