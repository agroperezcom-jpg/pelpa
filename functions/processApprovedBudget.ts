import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { presupuestoId, pagos, generaIVA, generaIIBB } = await req.json();

    // Obtener presupuesto
    const presupuestos = await base44.asServiceRole.entities.Presupuesto.filter({ id: presupuestoId });
    const presupuesto = presupuestos[0];

    if (!presupuesto) {
      throw new Error("Presupuesto no encontrado");
    }

    // Validaciones
    if (!presupuesto.cliente_id) {
      throw new Error("No se puede aceptar un presupuesto sin cliente");
    }
    if (!presupuesto.items || presupuesto.items.length === 0) {
      throw new Error("No se puede aceptar un presupuesto sin items");
    }
    if (new Date(presupuesto.validez_hasta) < new Date()) {
      throw new Error("No se puede aceptar un presupuesto vencido");
    }
    if (!pagos || pagos.length === 0) {
      throw new Error("Debe registrar el cobro del presupuesto");
    }

    const totalCobrado = pagos.reduce((acc, p) => acc + p.importe, 0);
    if (Math.abs(totalCobrado - presupuesto.total_presupuesto) > 0.01) {
      throw new Error("Debe cobrarse el 100% del presupuesto para aceptarlo");
    }

    // 1) Crear VENTA
    const netoGravado = generaIVA ? presupuesto.total_presupuesto / 1.21 : presupuesto.total_presupuesto;
    const ivaCalculado = generaIVA ? presupuesto.total_presupuesto - netoGravado : 0;

    let tipoComprobante;
    if (generaIVA) {
      const clientes = await base44.asServiceRole.entities.Client.filter({ id: presupuesto.cliente_id });
      const cliente = clientes[0];
      tipoComprobante = cliente?.tipo_iva === "RESP_INSCRIPTO" ? "A" : "B";
    } else {
      tipoComprobante = "X";
    }

    // Buscar o crear tipo de comprobante
    const tiposComprobante = await base44.asServiceRole.entities.TipoComprobante.list();
    let tipoComprobanteRecord = tiposComprobante.find(tc => tc.codigo === tipoComprobante);

    if (!tipoComprobanteRecord) {
      tipoComprobanteRecord = await base44.asServiceRole.entities.TipoComprobante.create({
        codigo: tipoComprobante,
        descripcion: tipoComprobante === "B" ? "Factura B - Con IVA" : "Ticket X - Sin IVA",
        prefijo: tipoComprobante,
        longitud_numero: 4,
        ultimo_numero: 0,
        is_active: true
      });
    }

    const nuevoNumero = tipoComprobanteRecord.ultimo_numero + 1;
    const numeroFormateado = String(nuevoNumero).padStart(tipoComprobanteRecord.longitud_numero, '0');
    const numeroComprobante = `${tipoComprobanteRecord.prefijo}-${numeroFormateado}`;

    await base44.asServiceRole.entities.TipoComprobante.update(tipoComprobanteRecord.id, {
      ultimo_numero: nuevoNumero
    });

    const venta = await base44.asServiceRole.entities.Sale.create({
      client_id: presupuesto.cliente_id,
      client_name: presupuesto.cliente_name,
      client_tipo_iva: presupuesto.cliente_tipo_iva,
      employee_email: user.email,
      employee_name: user.full_name,
      origen: "PRESUPUESTO",
      presupuesto_origen_id: presupuestoId,
      tipo_lista: "MINORISTA",
      tipo_venta: "CONTADO",
      estado: "CONFIRMADA",
      genera_iva: generaIVA,
      tipo_comprobante: tipoComprobante,
      numero_comprobante: numeroComprobante,
      items: presupuesto.items,
      subtotal: presupuesto.subtotal,
      discount: presupuesto.descuento || 0,
      neto_gravado: netoGravado,
      iva_21: ivaCalculado,
      total: presupuesto.total_presupuesto,
      notes: `Generada automáticamente desde presupuesto ${presupuesto.numero_presupuesto} - COBRADO`,
      project_id: null
    });

    // 2) Generar IVA Ventas si corresponde
    if (generaIVA) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const fechaStr = `${year}-${month}-${day}`;
      const periodoStr = `${year}-${month}`;

      await base44.asServiceRole.entities.IVAVenta.create({
        venta_id: venta.id,
        fecha: fechaStr,
        tipo_comprobante: tipoComprobante,
        numero_comprobante: numeroComprobante,
        cliente_nombre: venta.client_name,
        cliente_tipo_iva: venta.client_tipo_iva,
        neto_gravado: netoGravado,
        iva_21: ivaCalculado,
        total: presupuesto.total_presupuesto,
        periodo: periodoStr
      });
    }

    // 3) Generar IIBB Ventas si corresponde
    if (generaIIBB) {
      const configuracionIIBB = await base44.asServiceRole.entities.ConfiguracionIIBB.list();
      const configIIBB = configuracionIIBB[0];
      if (configIIBB) {
        const netoGravadoIIBB = generaIVA ? netoGravado : presupuesto.total_presupuesto;
        const importeIIBB = netoGravadoIIBB * configIIBB.alicuota_iibb;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const fechaStr = `${year}-${month}-${day}`;
        const periodoStr = `${year}-${month}`;

        await base44.asServiceRole.entities.IIBBVenta.create({
          venta_id: venta.id,
          fecha: fechaStr,
          periodo: periodoStr,
          cliente_nombre: venta.client_name,
          neto_gravado: netoGravadoIIBB,
          alicuota: configIIBB.alicuota_iibb,
          importe_iibb: importeIIBB,
          numero_comprobante: numeroComprobante
        });
      }
    }

    // 4) Registrar COBROS en TESORERÍA
    for (const pago of pagos) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const fechaStr = `${year}-${month}-${day}`;

      await base44.asServiceRole.entities.MovimientoTesoreria.create({
        fecha: fechaStr,
        tipo: "INGRESO",
        medio_pago_id: pago.medio_pago_id,
        medio_pago_nombre: pago.medio_pago_nombre,
        banco_id: pago.banco_id,
        banco_nombre: pago.banco_nombre,
        caja_id: pago.caja_id,
        caja_nombre: pago.caja_nombre,
        importe: pago.importe,
        referencia_tipo: "presupuesto",
        referencia_id: presupuestoId,
        observaciones: `Cobro presupuesto ${presupuesto.numero_presupuesto} - ${presupuesto.cliente_name}`
      });

      // Actualizar saldos de bancos/cajas
      if (pago.banco_id) {
        const bancos = await base44.asServiceRole.entities.Banco.filter({ id: pago.banco_id });
        const banco = bancos[0];
        await base44.asServiceRole.entities.Banco.update(pago.banco_id, {
          saldo_actual: (banco?.saldo_actual || 0) + pago.importe
        });
      }
      if (pago.caja_id) {
        const cajas = await base44.asServiceRole.entities.Caja.filter({ id: pago.caja_id });
        const caja = cajas[0];
        await base44.asServiceRole.entities.Caja.update(pago.caja_id, {
          saldo_actual: (caja?.saldo_actual || 0) + pago.importe
        });
      }
    }

    // 5) Crear PROYECTO PMS desde presupuesto
    let tipoProyecto = "venta_especial";
    let plantilla = null;

    // Obtener plantilla si fue asignada
    console.log('=== DEBUG: Iniciando creación de proyecto ===');
    console.log('Presupuesto.plantilla_proyecto_id:', presupuesto.plantilla_proyecto_id);
    
    if (presupuesto.plantilla_proyecto_id) {
      console.log('Buscando plantilla con ID:', presupuesto.plantilla_proyecto_id);
      const plantillas = await base44.asServiceRole.entities.ProjectTemplate.filter({ 
        id: presupuesto.plantilla_proyecto_id 
      });
      plantilla = plantillas[0];
      console.log('Plantilla encontrada:', plantilla ? `SI (${plantilla.name})` : 'NO');
      
      if (plantilla) {
        console.log('Fases en plantilla:', plantilla.phases?.length || 0);
        console.log('Tareas en plantilla:', plantilla.tasks?.length || 0);
        
        if (plantilla.type && plantilla.type.length > 0) {
          tipoProyecto = plantilla.type[0];
          console.log('Tipo de proyecto de plantilla:', tipoProyecto);
        }
      }
    } else {
      console.log('⚠️ El presupuesto NO tiene plantilla_proyecto_id asignado');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const fechaStr = `${year}-${month}-${day}`;

    const proyectoData = {
      name: `Proyecto - ${presupuesto.numero_presupuesto}`,
      description: presupuesto.observaciones || `Proyecto generado automáticamente desde presupuesto ${presupuesto.numero_presupuesto}`,
      client_id: presupuesto.cliente_id,
      client_name: presupuesto.cliente_name,
      type: tipoProyecto,
      status: "aprobado",
      priority: "media",
      start_date: fechaStr,
      responsible_email: user.email,
      responsible_name: user.full_name,
      estimated_budget: presupuesto.total_presupuesto,
      actual_budget: 0,
      origen_proyecto: "presupuesto",
      presupuesto_id: presupuestoId
    };

    const proyecto = await base44.asServiceRole.entities.Project.create(proyectoData);
    console.log('✅ Proyecto creado con ID:', proyecto.id);

    // 6) Aplicar plantilla: crear fases y tareas
    if (plantilla) {
      console.log('=== Aplicando plantilla al proyecto ===');
      const phaseMap = {};

      // Crear fases de la plantilla
      if (plantilla.phases && plantilla.phases.length > 0) {
        console.log(`Creando ${plantilla.phases.length} fases...`);
        for (const phaseTemplate of plantilla.phases) {
          console.log(`  - Creando fase: ${phaseTemplate.name} (orden: ${phaseTemplate.order})`);
          const newPhase = await base44.asServiceRole.entities.ProjectPhase.create({
            project_id: proyecto.id,
            name: phaseTemplate.name,
            description: phaseTemplate.description || "",
            order: phaseTemplate.order || 0,
            status: "pendiente",
            duration_days: phaseTemplate.duration_days || 0,
            duration_hours: phaseTemplate.duration_hours || 0
          });
          console.log(`    ✅ Fase creada con ID: ${newPhase.id}`);
          phaseMap[phaseTemplate.name] = newPhase.id;
        }
        console.log('Mapeo de fases:', phaseMap);
      } else {
        console.log('⚠️ La plantilla no tiene fases definidas');
      }

      // Crear tareas de la plantilla
      if (plantilla.tasks && plantilla.tasks.length > 0) {
        console.log(`Creando ${plantilla.tasks.length} tareas...`);
        for (const taskTemplate of plantilla.tasks) {
          const phaseId = taskTemplate.phase_name ? phaseMap[taskTemplate.phase_name] : null;
          console.log(`  - Creando tarea: ${taskTemplate.name} (fase: ${taskTemplate.phase_name || 'SIN FASE'}, phaseId: ${phaseId || 'null'})`);

          await base44.asServiceRole.entities.ProjectTask.create({
            project_id: proyecto.id,
            phase_id: phaseId,
            name: taskTemplate.name,
            description: taskTemplate.description || "",
            priority: taskTemplate.priority || "media",
            status: "pendiente",
            duration_days: taskTemplate.duration_days || 0,
            duration_hours: taskTemplate.duration_hours || 0
          });
          console.log(`    ✅ Tarea creada`);
        }
      } else {
        console.log('⚠️ La plantilla no tiene tareas definidas');
      }
      console.log('=== Plantilla aplicada completamente ===');
    } else {
      console.log('⚠️ NO se aplicó plantilla porque no hay plantilla asignada');
    }

    // 7) Actualizar venta con proyecto_id
    await base44.asServiceRole.entities.Sale.update(venta.id, {
      project_id: proyecto.id
    });

    // 8) Actualizar presupuesto
    await base44.asServiceRole.entities.Presupuesto.update(presupuestoId, {
      estado: "ACEPTADO",
      venta_id: venta.id,
      proyecto_id: proyecto.id,
      fecha_aceptacion: new Date().toISOString(),
      aceptado_por: user.email,
      genera_iva: generaIVA,
      genera_iibb: generaIIBB,
      neto_gravado: netoGravado,
      iva_21: ivaCalculado
    });

    return Response.json({ 
      success: true, 
      venta, 
      proyecto 
    });

  } catch (error) {
    console.error('Error processing approved budget:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});