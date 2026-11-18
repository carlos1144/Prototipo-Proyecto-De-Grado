# Security Specification & Payload-First TDD — Resguardo Indígena Pueblo Nuevo

## 1. Data Invariants
1. **RN1 (Active Census Gate)**: A `solicitudes` document cannot be created unless `censo_consultas/{docKey}` exists and has `estado_censal == 'activo'`.
2. **RN3 & PII Isolation**: Full `censo` records containing personal details (`fecha_nacimiento`, `telefono`, `cabeza_familia`) are readable and writable ONLY by verified Cabildo staff (`isStaff()`). Unauthenticated users can never `list` `censo`, `censo_consultas`, `solicitudes`, `documentos_emitidos`, `auditoria`, or `funcionarios`.
3. **RN5 & RN6 (No Client Bypass of Approval/Payment)**: On `solicitudes` creation by unauthenticated self-service, `pagado` MUST be `false` (or `tarifa_cop == 0`), `recibo_pago` cannot be forged, and if `requiere_visto_bueno == true`, `visto_bueno_estado` MUST be `'pendiente'` and `estado` MUST be `'pendiente_visto_bueno'`.
4. **RN7 (Append-Only Audit Trail)**: `auditoria/{auditId}` forbids `update` and `delete` for all roles, including `admin`.
5. **Terminal State Locking**: Once a `solicitud` reaches `'emitido'`, `'rechazado'`, or `'anulado'`, non-admin staff cannot alter its state.
6. **Temporal Integrity**: All `createdAt`, `updatedAt`, `fecha_emision`, `fecha_pago`, and `timestamp` fields are validated against `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Blanket Census Scraping**: Unauthenticated `list` on `/censo` -> `PERMISSION_DENIED`.
2. **Public Projection Scraping**: Unauthenticated `list` on `/censo_consultas` -> `PERMISSION_DENIED`.
3. **Inactive Member Request**: `create` on `/solicitudes/RAD-2026-999` for a `docKey` with `estado_censal == 'inactivo'` -> `PERMISSION_DENIED`.
4. **Approval Bypass**: Unauthenticated `create` on `/solicitudes` for `aval_estudio` with `visto_bueno_estado: 'aprobado'` -> `PERMISSION_DENIED`.
5. **Payment Bypass**: Unauthenticated `create` on `/solicitudes` for a paid certificate with `pagado: true` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection**: `create` on `/solicitudes` with extra field `isAdminBypass: true` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: `create` on `/solicitudes/` with a 500-char ID or invalid characters -> `PERMISSION_DENIED`.
8. **Audit Tampering (Update)**: Authenticated `admin` `update` on `/auditoria/{id}` -> `PERMISSION_DENIED`.
9. **Audit Tampering (Delete)**: Authenticated `admin` `delete` on `/auditoria/{id}` -> `PERMISSION_DENIED`.
10. **Role Self-Escalation**: Authenticated non-admin user updating `/funcionarios/{uid}` to `rol: 'admin'` -> `PERMISSION_DENIED`.
11. **Unverified Email Spoofing**: Authenticated user with `email_verified: false` attempting staff write -> `PERMISSION_DENIED`.
12. **Treasury Payment Forgery**: Staff with role `'secretario'` attempting to create `/pagos_tesoreria/{id}` -> `PERMISSION_DENIED`.
