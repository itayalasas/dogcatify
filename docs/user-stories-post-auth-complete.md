pp/payment/ - Flujos de pago
```

---

### **HU-AP-006: Adopciones (Refugios)** {#hu-ap-006}

**Como** refugio de mascotas  
**Quiero** gestionar adopciones  
**Para** encontrar hogares responsables para las mascotas

#### **📋 Criterios de Aceptación:**

**Escenario 1: Publicar mascotas**
- **Dado** que soy un refugio
- **Cuando** agrego una mascota en adopción
- **Entonces** puedo incluir información completa de salud, comportamiento y requisitos

**Escenario 2: Gestionar contactos**
- **Dado** que publico mascotas
- **Cuando** recibo consultas
- **Entonces** puedo chatear con interesados y evaluar candidatos

**Escenario 3: Proceso de adopción**
- **Dado** que tengo candidatos
- **Cuando** evalúo la adopción
- **Entonces** puedo gestionar el proceso completo hasta la entrega

#### **🎯 Criterios de Éxito:**
- 80% de mascotas incluyen información completa
- 60% de consultas resultan en conversaciones
- 30% de conversaciones resultan en adopciones
- 95% de adopciones son exitosas

#### **📁 Archivos/Clases Relacionados:**
```
app/partner/add-adoption-pet.tsx - Agregar mascota
app/(partner-tabs)/chat-contacts.tsx - Contactos de adopción
app/services/shelter/[id].tsx - Vista pública de refugio
app/chat/adoption.tsx - Chat de adopción
```

---

### **HU-AP-007: Configuración de Mercado Pago** {#hu-ap-007}

**Como** aliado comercial  
**Quiero** configurar Mercado Pago  
**Para** recibir pagos con split automático de comisiones

#### **📋 Criterios de Aceptación:**

**Escenario 1: Configuración manual**
- **Dado** que soy un aliado verificado
- **Cuando** configuro Mercado Pago
- **Entonces** puedo ingresar mis credenciales manualmente

**Escenario 2: Validación de credenciales**
- **Dado** que ingreso credenciales
- **Cuando** las valido
- **Entonces** el sistema verifica que sean correctas antes de guardar

**Escenario 3: Split automático**
- **Dado** que tengo MP configurado
- **Cuando** se procesa un pago
- **Entonces** recibo automáticamente 95% y DogCatiFy retiene 5%

#### **🎯 Criterios de Éxito:**
- 80% de aliados configuran MP en primera semana
- 100% de splits se procesan automáticamente
- 0% de errores en división de pagos
- 95% de fondos llegan en < 24 horas

#### **📁 Archivos/Clases Relacionados:**
```
app/profile/mercadopago-config.tsx - Configuración MP
app/auth/mercadopago/callback.tsx - Callback OAuth
utils/mercadoPago.ts - Lógica de integración
```

---

### **HU-AP-008: Inteligencia de Negocio** {#hu-ap-008}

**Como** aliado comercial  
**Quiero** acceder a insights de mi negocio  
**Para** tomar decisiones informadas y crecer

#### **📋 Criterios de Aceptación:**

**Escenario 1: Métricas del mercado**
- **Dado** que accedo a inteligencia de negocio
- **Cuando** reviso los datos
- **Entonces** veo estadísticas del mercado local y oportunidades

**Escenario 2: Análisis de demanda**
- **Dado** que quiero entender la demanda
- **Cuando** reviso los insights
- **Entonces** veo servicios más solicitados y horarios pico

**Escenario 3: Recomendaciones**
- **Dado** que busco crecer
- **Cuando** reviso recomendaciones
- **Entonces** recibo sugerencias personalizadas basadas en datos

#### **🎯 Criterios de Éxito:**
- 60% de aliados acceden a insights mensualmente
- 40% implementan recomendaciones sugeridas
- 25% aumentan ingresos tras usar insights
- Datos se actualizan diariamente

#### **📁 Archivos/Clases Relacionados:**
```
app/partner/business-insights.tsx - Dashboard de insights
```

---

## ⚙️ **MÓDULO ADMINISTRADOR**

### **HU-AD-001: Gestión de Solicitudes** {#hu-ad-001}

**Como** administrador del sistema  
**Quiero** gestionar solicitudes de aliados  
**Para** mantener la calidad de la plataforma

#### **📋 Criterios de Aceptación:**

**Escenario 1: Revisar solicitudes**
- **Dado** que hay solicitudes pendientes
- **Cuando** accedo al panel de admin
- **Entonces** puedo ver todas las solicitudes con detalles completos

**Escenario 2: Aprobar/rechazar**
- **Dado** que reviso una solicitud
- **Cuando** tomo una decisión
- **Entonces** puedo aprobar o rechazar con comentarios

**Escenario 3: Notificaciones automáticas**
- **Dado** que proceso una solicitud
- **Cuando** cambio el estado
- **Entonces** se envía notificación automática al solicitante

#### **🎯 Criterios de Éxito:**
- 100% de solicitudes se procesan en < 48 horas
- 85% de solicitudes son aprobadas
- 100% de decisiones incluyen notificación
- 0% de solicitudes se pierden

#### **📁 Archivos/Clases Relacionados:**
```
app/(admin-tabs)/requests.tsx - Gestión de solicitudes
utils/notifications.ts - Sistema de notificaciones
```

---

### **HU-AD-002: Moderación de Contenido** {#hu-ad-002}

**Como** administrador  
**Quiero** moderar contenido de la plataforma  
**Para** mantener un ambiente seguro y apropiado

#### **📋 Criterios de Aceptación:**

**Escenario 1: Revisar publicaciones**
- **Dado** que hay contenido reportado
- **Cuando** accedo a moderación
- **Entonces** puedo revisar y tomar acciones sobre publicaciones

**Escenario 2: Gestionar usuarios**
- **Dado** que hay usuarios problemáticos
- **Cuando** los reviso
- **Entonces** puedo suspender o eliminar cuentas

**Escenario 3: Moderar lugares**
- **Dado** que usuarios contribuyen lugares
- **Cuando** los reviso
- **Entonces** puedo aprobar o rechazar lugares pet-friendly

#### **🎯 Criterios de Éxito:**
- 100% de reportes se revisan en < 24 horas
- 95% de contenido inapropiado se elimina
- 90% de lugares contribuidos se aprueban
- 0% de falsos positivos en moderación

#### **📁 Archivos/Clases Relacionados:**
```
app/(admin-tabs)/moderation.tsx - Panel de moderación
app/(admin-tabs)/users.tsx - Gestión de usuarios
app/(admin-tabs)/places.tsx - Moderación de lugares
```

---

### **HU-AD-003: Sistema de Promociones** {#hu-ad-003}

**Como** administrador  
**Quiero** gestionar promociones en la plataforma  
**Para** impulsar el engagement y apoyar a los aliados

#### **📋 Criterios de Aceptación:**

**Escenario 1: Crear promociones**
- **Dado** que quiero promocionar contenido
- **Cuando** creo una promoción
- **Entonces** puedo configurar imagen, texto, enlaces y audiencia objetivo

**Escenario 2: Programar promociones**
- **Dado** que tengo promociones creadas
- **Cuando** las programo
- **Entonces** se muestran automáticamente en el feed según fechas configuradas

**Escenario 3: Analizar rendimiento**
- **Dado** que tengo promociones activas
- **Cuando** reviso métricas
- **Entonces** puedo ver vistas, clics y engagement

#### **🎯 Criterios de Éxito:**
- 100% de promociones se muestran según programación
- 80% de promociones reciben al menos 100 vistas
- 15% de promociones generan clics
- Métricas se actualizan en tiempo real

#### **📁 Archivos/Clases Relacionados:**
```
app/(admin-tabs)/promotions.tsx - Gestión de promociones
components/PromotionCard.tsx - Visualización de promociones
```

---

### **HU-AD-004: Configuraciones del Sistema** {#hu-ad-004}

**Como** administrador  
**Quiero** configurar parámetros del sistema  
**Para** mantener la plataforma funcionando óptimamente

#### **📋 Criterios de Aceptación:**

**Escenario 1: Configurar Mercado Pago**
- **Dado** que gestiono la plataforma
- **Cuando** configuro MP marketplace
- **Entonces** puedo establecer credenciales y porcentajes de comisión

**Escenario 2: Gestionar configuraciones**
- **Dado** que necesito ajustar parámetros
- **Cuando** accedo a configuraciones
- **Entonces** puedo modificar settings globales del sistema

**Escenario 3: Monitorear sistema**
- **Dado** que superviso la plataforma
- **Cuando** reviso métricas
- **Entonces** puedo ver estadísticas generales y salud del sistema

#### **🎯 Criterios de Éxito:**
- 100% de configuraciones se aplican inmediatamente
- 0% de downtime por configuraciones
- 100% de transacciones MP se procesan correctamente
- Métricas disponibles 24/7

#### **📁 Archivos/Clases Relacionados:**
```
app/(admin-tabs)/settings.tsx - Configuraciones del sistema
app/(admin-tabs)/analytics.tsx - Métricas del sistema
```

---

## 🔗 **DEPENDENCIAS ENTRE HISTORIAS**

### **Dependencias Críticas:**
1. **HU-UC-001** (Perfil) → Prerequisito para todas las demás HU de usuario
2. **HU-UC-002** (Mascotas) → Prerequisito para HU-UC-003, HU-UC-006, HU-UC-008
3. **HU-AP-001** (Dashboard) → Prerequisito para todas las HU de aliado
4. **HU-AD-001** (Solicitudes) → Prerequisito para que existan aliados

### **Dependencias Técnicas:**
- Todas las HU dependen del sistema de autenticación
- HU de pagos dependen de configuración de Mercado Pago
- HU de chat dependen de sistema de notificaciones
- HU de ubicación dependen de geocodificación

---

## 📊 **MÉTRICAS GLOBALES DE ÉXITO**

### **Adopción de Usuarios:**
- 90% completan configuración inicial
- 80% usan al menos 3 funcionalidades principales
- 70% regresan semanalmente
- 60% se mantienen activos por 3+ meses

### **Engagement:**
- 75% interactúan con feed diariamente
- 50% realizan al menos una transacción mensual
- 40% contribuyen con contenido regularmente
- 30% refieren nuevos usuarios

### **Calidad del Servicio:**
- 95% de transacciones exitosas
- < 2 segundos tiempo de respuesta promedio
- 99.9% uptime del sistema
- < 1% tasa de errores críticos

---

## 🏗️ **ARQUITECTURA TÉCNICA GENERAL**

### **Frontend (React Native + Expo):**
- Navegación con Expo Router
- Estado global con Context API
- UI consistente con componentes reutilizables
- Autenticación biométrica nativa

### **Backend (Supabase):**
- Base de datos PostgreSQL
- Autenticación y autorización
- Storage para archivos multimedia
- Edge Functions para lógica de negocio

### **Integraciones:**
- Mercado Pago para pagos
- API Ninjas para información de razas
- Nominatim para geocodificación
- Expo Notifications para push notifications

### **Seguridad:**
- Row Level Security (RLS)
- Tokens JWT para autenticación
- Validación de entrada en cliente y servidor
- Encriptación de datos sensibles

---

*Documento generado para Azure DevOps - DogCatiFy v1.0*
*Fecha: Enero 2025*