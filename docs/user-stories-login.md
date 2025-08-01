# Historias de Usuario - Módulo de Login
## DogCatiFy - Sistema de Autenticación

---

## 📋 **ÉPICA: Sistema de Autenticación DogCatiFy**

### **Descripción General:**
Como sistema de gestión para mascotas, necesito un módulo de autenticación robusto que permita el acceso seguro a diferentes tipos de usuarios (clientes/aliados y administradores) con funcionalidades específicas según su rol.

---

## 🏷️ **HISTORIA DE USUARIO 1: Login de Clientes y Aliados**

### **Como** cliente o aliado de DogCatiFy
### **Quiero** poder iniciar sesión de forma segura en la aplicación
### **Para** acceder a las funcionalidades específicas de mi rol

---

### **📝 Criterios de Aceptación:**

#### **AC1: Inicio de Sesión Básico**
- **DADO** que soy un usuario registrado (cliente o aliado)
- **CUANDO** ingreso mi email y contraseña válidos
- **ENTONCES** debo ser autenticado exitosamente y redirigido al dashboard correspondiente

#### **AC2: Validación de Credenciales**
- **DADO** que ingreso credenciales incorrectas
- **CUANDO** intento iniciar sesión
- **ENTONCES** debo recibir un mensaje de error específico:
  - "Credenciales incorrectas" para email/contraseña inválidos
  - "Usuario no encontrado" si el email no existe
  - "Email no confirmado" si la cuenta no está verificada

#### **AC3: Confirmación de Email**
- **DADO** que mi email no está confirmado
- **CUANDO** intento iniciar sesión
- **ENTONCES** debo recibir un mensaje indicando que confirme mi email con opción de reenviar confirmación

#### **AC4: Autenticación Biométrica**
- **DADO** que tengo autenticación biométrica habilitada
- **CUANDO** abro la aplicación
- **ENTONCES** debo poder usar Face ID/Touch ID para iniciar sesión rápidamente

#### **AC5: Recordar Contraseña**
- **DADO** que marco la opción "Recordar contraseña"
- **CUANDO** cierro y abro la aplicación
- **ENTONCES** mis credenciales deben estar pre-llenadas

#### **AC6: Recuperación de Contraseña**
- **DADO** que olvidé mi contraseña
- **CUANDO** selecciono "¿Olvidaste tu contraseña?"
- **ENTONCES** debo poder ingresar mi email y recibir un enlace de recuperación

#### **AC7: Redirección por Rol**
- **DADO** que soy un cliente autenticado
- **CUANDO** inicio sesión exitosamente
- **ENTONCES** debo ser redirigido a las pestañas principales (Home, Mascotas, Tienda, Servicios, Lugares, Perfil)

- **DADO** que soy un aliado autenticado
- **CUANDO** inicio sesión exitosamente
- **ENTONCES** debo poder acceder tanto a las funciones de cliente como al dashboard de aliado

#### **AC8: Manejo de Sesiones**
- **DADO** que mi sesión expira
- **CUANDO** intento realizar una acción
- **ENTONCES** debo ser redirigido al login con un mensaje apropiado

---

### **🔧 Clases y Componentes Relacionados:**

#### **Contextos:**
- `AuthContext.tsx` - Manejo global del estado de autenticación
- `BiometricContext.tsx` - Gestión de autenticación biométrica

#### **Pantallas:**
- `app/auth/login.tsx` - Pantalla principal de login
- `app/auth/register.tsx` - Registro de nuevos usuarios
- `app/auth/forgot-password.tsx` - Recuperación de contraseña
- `app/auth/confirm.tsx` - Confirmación de email
- `app/auth/callback.tsx` - Callback de autenticación OAuth

#### **Utilidades:**
- `lib/supabase.ts` - Cliente y funciones de Supabase
- `utils/emailConfirmation.ts` - Sistema de confirmación de email personalizado
- `contexts/LanguageContext.tsx` - Soporte multiidioma

#### **Componentes UI:**
- `components/ui/Input.tsx` - Campos de entrada
- `components/ui/Button.tsx` - Botones de acción
- `components/ui/Card.tsx` - Contenedores de contenido

---

### **📋 Tareas de Desarrollo:**

1. **Implementar validación de credenciales**
   - Integración con Supabase Auth
   - Manejo de errores específicos
   - Validación de formato de email

2. **Configurar autenticación biométrica**
   - Detección de hardware biométrico
   - Almacenamiento seguro de credenciales
   - Flujo de habilitación/deshabilitación

3. **Sistema de confirmación de email**
   - Tokens personalizados de confirmación
   - Envío de emails de confirmación
   - Validación de tokens

4. **Manejo de sesiones**
   - Persistencia de sesión
   - Renovación automática de tokens
   - Detección de expiración

5. **Recuperación de contraseña**
   - Envío de enlaces de recuperación
   - Validación de tokens de recuperación
   - Actualización segura de contraseñas

---

## 🏷️ **HISTORIA DE USUARIO 2: Login de Administrador**

### **Como** administrador del sistema DogCatiFy
### **Quiero** poder acceder a un panel de administración especializado
### **Para** gestionar usuarios, aliados, contenido y configuraciones del sistema

---

### **📝 Criterios de Aceptación:**

#### **AC1: Acceso Administrativo**
- **DADO** que soy un administrador (email: admin@dogcatify.com)
- **CUANDO** inicio sesión con credenciales válidas
- **ENTONCES** debo ser redirigido automáticamente al panel de administración

#### **AC2: Dashboard Administrativo**
- **DADO** que soy un administrador autenticado
- **CUANDO** accedo al sistema
- **ENTONCES** debo ver pestañas específicas de administración:
  - Solicitudes de Aliados
  - Gestión de Usuarios
  - Gestión de Contenido
  - Promociones
  - Configuraciones del Sistema

#### **AC3: Gestión de Solicitudes de Aliados**
- **DADO** que hay solicitudes pendientes de aliados
- **CUANDO** accedo a la sección de solicitudes
- **ENTONCES** debo poder:
  - Ver lista de solicitudes pendientes
  - Revisar documentos y información del negocio
  - Aprobar o rechazar solicitudes
  - Enviar notificaciones automáticas

#### **AC4: Gestión de Usuarios**
- **DADO** que necesito moderar usuarios
- **CUANDO** accedo a gestión de usuarios
- **ENTONCES** debo poder:
  - Ver lista de todos los usuarios
  - Suspender/activar cuentas
  - Ver estadísticas de usuarios
  - Gestionar reportes de contenido

#### **AC5: Gestión de Contenido**
- **DADO** que necesito moderar contenido
- **CUANDO** accedo a gestión de contenido
- **ENTONCES** debo poder:
  - Ver publicaciones reportadas
  - Eliminar contenido inapropiado
  - Gestionar comentarios
  - Moderar álbumes de fotos

#### **AC6: Sistema de Promociones**
- **DADO** que quiero crear promociones
- **CUANDO** accedo al módulo de promociones
- **ENTONCES** debo poder:
  - Crear nuevas promociones
  - Asignar promociones a aliados específicos
  - Configurar fechas de inicio y fin
  - Ver estadísticas de clicks y vistas

#### **AC7: Configuraciones del Sistema**
- **DADO** que necesito configurar el sistema
- **CUANDO** accedo a configuraciones
- **ENTONCES** debo poder:
  - Configurar Mercado Pago para marketplace
  - Gestionar configuraciones de email
  - Configurar notificaciones push
  - Gestionar configuraciones generales

#### **AC8: Seguridad Administrativa**
- **DADO** que soy administrador
- **CUANDO** mi sesión está inactiva por más de 30 minutos
- **ENTONCES** debo ser deslogueado automáticamente por seguridad

---

### **🔧 Clases y Componentes Relacionados:**

#### **Pantallas de Administración:**
- `app/(admin-tabs)/_layout.tsx` - Layout de pestañas de admin
- `app/(admin-tabs)/requests.tsx` - Gestión de solicitudes de aliados
- `app/(admin-tabs)/users.tsx` - Gestión de usuarios
- `app/(admin-tabs)/content.tsx` - Moderación de contenido
- `app/(admin-tabs)/promotions.tsx` - Sistema de promociones
- `app/(admin-tabs)/settings.tsx` - Configuraciones del sistema

#### **Componentes Específicos:**
- Validación de rol de administrador en `AuthContext`
- Redirección automática según tipo de usuario
- Protección de rutas administrativas

#### **Funcionalidades Administrativas:**
- Aprobación/rechazo de aliados
- Moderación de contenido
- Gestión de promociones
- Configuración de marketplace
- Estadísticas y reportes

---

### **📋 Tareas de Desarrollo:**

1. **Implementar detección de rol administrativo**
   - Validación por email específico
   - Redirección automática al panel admin

2. **Desarrollar gestión de solicitudes**
   - CRUD de solicitudes de aliados
   - Sistema de aprobación/rechazo
   - Notificaciones automáticas

3. **Crear sistema de moderación**
   - Moderación de publicaciones
   - Gestión de reportes
   - Suspensión de usuarios

4. **Implementar gestión de promociones**
   - Creación de promociones
   - Asignación a aliados
   - Tracking de métricas

5. **Configurar panel de configuraciones**
   - Configuración de Mercado Pago
   - Configuración de emails
   - Configuraciones generales

---

## 🔗 **DEPENDENCIAS ENTRE HISTORIAS:**

- **HU1** es prerequisito para **HU2**
- Ambas historias comparten el contexto de autenticación base
- El sistema de confirmación de email aplica a ambos tipos de usuarios
- La autenticación biométrica solo aplica a HU1 (clientes/aliados)

---

## 📊 **MÉTRICAS DE ÉXITO:**

### **Para HU1 (Clientes/Aliados):**
- Tiempo de login < 3 segundos
- Tasa de éxito de login > 95%
- Adopción de autenticación biométrica > 60%
- Tiempo de recuperación de contraseña < 5 minutos

### **Para HU2 (Administradores):**
- Tiempo de acceso a funciones admin < 2 segundos
- Tiempo de procesamiento de solicitudes < 24 horas
- Efectividad de moderación > 90%
- Tiempo de respuesta del sistema < 1 segundo

---

## 🏗️ **ARQUITECTURA TÉCNICA:**

### **Backend:**
- Supabase Auth para autenticación
- Row Level Security (RLS) para autorización
- Tokens JWT para sesiones
- Confirmación de email personalizada

### **Frontend:**
- React Context para estado global
- Expo Router para navegación
- Expo Local Authentication para biometría
- Expo Secure Store para credenciales

### **Seguridad:**
- Encriptación de credenciales almacenadas
- Validación de tokens en servidor
- Protección contra ataques de fuerza bruta
- Sesiones con expiración automática

---

## 📱 **PLATAFORMAS SOPORTADAS:**
- iOS (nativo)
- Android (nativo)  
- Web (responsive)

---

## 🔄 **FLUJOS DE USUARIO:**

### **Flujo Cliente/Aliado:**
1. Pantalla de login → Validación → Dashboard principal
2. Registro → Confirmación email → Login → Dashboard
3. Olvidé contraseña → Email recuperación → Nueva contraseña → Login

### **Flujo Administrador:**
1. Login admin → Validación rol → Panel administrativo
2. Gestión desde panel → Acciones administrativas → Logs de auditoría

---

*Documento generado para Azure DevOps - DogCatiFy v1.0*