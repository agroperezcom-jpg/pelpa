import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Verificar que es admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todos los productos sin límite
    const allProducts = await base44.asServiceRole.entities.Product.filter({}, '-created_date', 100000);

    if (allProducts.length === 0) {
      return Response.json({ success: true, deletedCount: 0 });
    }

    // Borrar todos en paralelo
    await Promise.all(allProducts.map(product => 
      base44.asServiceRole.entities.Product.delete(product.id)
    ));

    return Response.json({ 
      success: true, 
      deletedCount: allProducts.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});