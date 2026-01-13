# Intelligent Document Numbering & Non-Fiscal Documents
## Argentina Implementation Guide

---

## Overview

This system implements professional document numbering for Argentina with two separate workflows:

1. **FISCAL DOCUMENTS** - Tax-related, using Talonarios (numeric booklets)
2. **NON-FISCAL DOCUMENTS** - Internal use, independent numbering

### Multi-Company Safety
All numbering is scoped by `company_id`. Documents from different companies never share numbers.

---

## PART 1: FISCAL DOCUMENT NUMBERING

### Concept: Talonario (Numeric Booklet)

A **Talonario** represents an official booklet of numbered documents authorized by AFIP.

Each Talonario is unique per:
- **Company** (`company_id`)
- **Type** (`tipo_comprobante`: X, B, or A)
- **Point of Sale** (`punto_venta`: e.g., 0003)

### Display Format

Documents are displayed as:

```
TIPO PUNTO_VENTA-NUMERO

Example: B 0003-00001245
```

### Workflow

#### 1. Create a Talonario

```json
POST /entities/Talonario

{
  "company_id": "empresa_001",
  "name": "Factura B - PV 0003",
  "tipo_comprobante": "B",
  "punto_venta": "0003",
  "numero_desde": 1,
  "numero_hasta": 10000,
  "is_active": true
}
```

#### 2. Confirm a Sale (Assign Number)

```javascript
const response = await base44.functions.invoke('confirmSaleWithNumber', {
  sale_id: 'sale_001',
  company_id: 'empresa_001',
  talonario_id: 'talonario_001'
});
```

#### 3. Annulate a Document

```javascript
const response = await base44.functions.invoke('annulateFiscalDocument', {
  sale_id: 'sale_001',
  company_id: 'empresa_001',
  talonario_id: 'talonario_001',
  motivo_anulacion: 'Error en datos',
  liberar_numero: true
});
```

---

## PART 2: NON-FISCAL DOCUMENTS

### Types

#### A) PRESUPUESTOS (P-XXXXXX)
- Entity: `Presupuesto`
- PDF Label: `DOCUMENTO NO FISCAL - Presupuesto`
- No Talonario needed
- Independent counter per company

#### B) ORDEN DE TRABAJO (OT-XXXXXX)
- Entity: `Project` with `is_work_order=true`
- PDF Label: `DOCUMENTO INTERNO - Orden de Trabajo`
- Production workflow tracking
- Independent counter per company

#### C) REMITO INTERNO (R-XXXXXX)
- Entity: `Remito`
- PDF Label: `DOCUMENTO NO FISCAL - Remito Interno`
- Linked to Sale or Work Order
- Proof of delivery
- Independent counter per company

### Create Non-Fiscal Document

```javascript
const response = await base44.functions.invoke('createNonFiscalDocument', {
  company_id: 'empresa_001',
  document_type: 'PRESUPUESTO',  // or 'REMITO', 'ORDEN_TRABAJO'
  entity_id: 'presupuesto_abc123'
});

// Result: numero = "P-000001"
```

---

## PART 3: DATA ISOLATION

All numbers scoped by `company_id`:

```
✅ Empresa A has P-000001 to P-000050
✅ Empresa B has P-000001 to P-000025
(No overlap - completely independent)
```

---

## PART 4: VALIDATION

**Before confirming Sale:**
```javascript
Sale.company_id === Talonario.company_id ✓
Sale.tipo_comprobante === Talonario.tipo_comprobante ✓
Talonario.is_active === true ✓
```

---

## PART 5: NON-BREAKING GUARANTEES

✅ All existing data remains valid
✅ Existing Sales unchanged
✅ Existing Talonarios continue working
✅ Existing Presupuestos unaffected
✅ No data migration required

---

## Quick Reference

### Fiscal
- **Sales** → B 0003-00001245 (Talonario required)

### Non-Fiscal
- **Presupuestos** → P-000001
- **Órdenes de Trabajo** → OT-000045
- **Remitos Internos** → R-000089