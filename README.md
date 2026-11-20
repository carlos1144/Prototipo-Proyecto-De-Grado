# Sistema Web Seguro para la Gestión Censal y Expedición de Documentos
**Resguardo Indígena de Pueblo Nuevo — Caldono, Cauca**  
*Proyecto de Grado (202016907) · Ingeniería de Sistemas · UNAD*

**Autores:** Carlos Ulcue Campo · Luis David Galeano Mercado  
**Tutor:** Daniel Andrés Guzmán Arevalo  

---

## 1. Cómo evaluarlo sin instalar nada (Recomendado para Tutor / Jurados)

El prototipo cuenta con entorno web desplegado y acceso demostrativo para evaluación académica sin afectar datos reales del Cabildo:

1. Ingrese a la aplicación web desplegada (o a `http://localhost:3000` si se ejecuta en local).
2. **Para probar el flujo ciudadano (sin crear cuenta):**
   - En inicio, haga clic en **Trámites y documentos** (`/tramites`).
   - Seleccione cualquier constancia, aval o certificado para pasar a **Autoservicio** (`/autoservicio`).
   - Puede consultar requisitos con la cédula de prueba **`1061724890`** (u otro registro de los 30 comuneros ficticios incluidos en `src/lib/catalog.ts`).
   - En trámites con costo se abre la pasarela digital simulada (**Nequi / PSE / Tarjeta**), la cual acepta cualquier número respetando la cantidad de dígitos indicada (10 para celular, 16 para tarjeta, **6 para clave dinámica**).
   - El PDF descargado queda protegido con contraseña igual al **número de documento de identidad** del titular y contiene código **QR verificable** en la pestaña *Validar código / QR*.
3. **Para probar el portal de funcionarios (`/ingreso`):**
   - Haga clic en **Acceso funcionarios** en la barra superior.
   - Pulse **Entrar en Modo Revisión (Tutor / Evaluador)** para explorar inmediatamente los 5 roles (*Administrador, Gobernador, Secretario, Tesorero y Trabajador Social*) con datos de prueba, o inicie sesión con una cuenta Google autorizada.

---

## 2. Requisitos previos para ejecución local en PC

Por tratarse de una aplicación web moderna (**React 19 + TypeScript + Vite + TanStack Router + Firebase/Cloud Firestore**), solo requiere tener instalado en el equipo:

- **Node.js versión LTS** (v20 o v22, incluye `npm`): [https://nodejs.org](https://nodejs.org)
- **Git** (para clonar desde GitHub): [https://git-scm.com](https://git-scm.com)

> **Nota para usuarios de Windows:**
> - Clone el proyecto en una ruta corta **fuera de OneDrive** (por ejemplo, `C:\Proyectos\`) para evitar bloqueos de sincronización o límite de longitud de rutas en Windows.
> - Si PowerShell bloquea `npm`, ejecute una sola vez:
>   ```powershell
>   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
>   ```

---

## 3. Instalación y ejecución local paso a paso

```bash
# 1. Clonar el repositorio en una ruta corta
git clone https://github.com/carlos1144/Prototipo-Proyecto-De-Grado.git
cd Prototipo-Proyecto-De-Grado

# 2. Instalar dependencias (solo la primera vez)
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
```

Abra exactamente **`http://localhost:3000`** en el navegador.

> **Importante sobre el acceso con Google en local:**  
> Para usar *Ingresar con cuenta institucional* (Google OAuth) desde un equipo local, abra exactamente `http://localhost:3000` (no por IP `192.168.x.x`) y verifique que `localhost` esté listado en **Firebase Console → Authentication → Settings → Authorized domains**. En caso contrario, utilice el botón **Entrar en Modo Revisión (Tutor / Evaluador)** en `/ingreso`, que no depende de OAuth externo.

---

## 4. Comandos de verificación técnica

```bash
npm run lint    # Verificación estricta de tipos TypeScript (tsc --noEmit)
npm run build   # Compilación de producción con Vite
```

---

## 5. Protección de datos (TRL 5)

En cumplimiento de la **Ley 1581 de 2012** y los principios **CARE**, todos los registros incluidos en este prototipo (`CENSO_SEMILLA`) son **ficticios** y de uso exclusivamente académico.
