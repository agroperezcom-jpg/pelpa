import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Annulates a sale and manages document number reuse
 * 
 * Rules:
 * - Document number is NOT reused (fiscal consistency)
 * - If talonario allows reuse, the number is added to numeros_liberados
 * - Stock is reverted
 * - Financial movements are reverted
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id, motivo } = await req.json();

    if (!sale_id || !motivo) {
      return Response.json({ error: 'Missing sale_id or motivo' }, { status: 400 });
    }

    // Fetch sale
    const sales = await base44.entities.Sale.list();
    const sale = sales.find(s => s.id === sale_id);

    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    if (sale.estado === "ANULADA") {
      return Response.json({ error: 'Sale is already annulated' }, { status: 400 });
    }

    // Liberate document number if talonario allows it
    if (sale.talonario_id) {
      const talonarios = await base44.entities.Talonario.list();
      const talonario = talonarios.find(t => t.id === sale.talonario_id);

      if (talonario && talonario.permite_reutilizar) {
        // Extract numeric part from numero_comprobante (format: "B 0003-00001245")
        const parts = sale.numero_comprobante.split('-');
        if (parts.length === 2) {
          const numeroComprobante = parseInt(parts[1]);
          const numerosLiberados = talonario.numeros_liberados || [];
          
          await base44.entities.Talonario.update(talonario.id, {
            numeros_liberados: [...numerosLiberados, numeroComprobante].sort((a, b) => a - b)
          });
        }
      }
    }

    // Revert stock for products
    const products = await base44.entities.Product.list();
    for (const item of sale.items.filter(i => i.type === 'product')) {
      const product = products.find(p => p.id === item.item_id);
      if (product) {
        await base44.entities.Product.update(product.id, {
          stock: product.stock + item.quantity
        });

        await base44.entities.InventoryMovement.create({
          company_id: sale.company_id,
          product_id: product.id,
          product_name: product.name,
          type: 'ingreso',
          quantity: item.quantity,
          previous_stock: product.stock,
          new_stock: product.stock + item.quantity,
          reason: 'Annulation',
          reference: `Sale annulation ${sale.numero_comprobante}`
        });
      }
    }

    // Update sale
    await base44.entities.Sale.update(sale_id, {
      estado: "ANULADA",
      fecha_anulacion: new Date().toISOString(),
      motivo_anulacion: motivo,
      usuario_anulacion: user.email
    });

    return Response.json({
      success: true,
      message: "Sale annulated successfully",
      numero_comprobante: sale.numero_comprobante
    });
  } catch (error) {
    console.error("Error annulating sale:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});