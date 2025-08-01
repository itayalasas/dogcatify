# Historias de Usuario - Sistema Post-Autenticación
## DogCatiFy - Módulos Completos para Azure DevOps

---

## 📋 **ÍNDICE DE HISTORIAS DE USUARIO**

### **👤 MÓDULO USUARIO CLIENTE**
- [HU-UC-001: Gestión de Perfil de Usuario](#hu-uc-001)
- [HU-UC-002: Gestión de Mascotas](#hu-uc-002)
- [HU-UC-003: Álbumes y Fotos](#hu-uc-003)
- [HU-UC-004: Feed Social y Publicaciones](#hu-uc-004)
- [HU-UC-005: Tienda y Compras](#hu-uc-005)
- [HU-UC-006: Servicios y Reservas](#hu-uc-006)
- [HU-UC-007: Lugares Pet-Friendly](#hu-uc-007)
- [HU-UC-008: Chat y Adopciones](#hu-uc-008)

### **🏢 MÓDULO ALIADO/PARTNER**
- [HU-AP-001: Dashboard de Aliado](#hu-ap-001)
- [HU-AP-002: Gestión de Servicios](#hu-ap-002)
- [HU-AP-003: Gestión de Productos](#hu-ap-003)
- [HU-AP-004: Agenda y Reservas](#hu-ap-004)
- [HU-AP-005: Gestión de Pedidos](#hu-ap-005)
- [HU-AP-006: Adopciones (Refugios)](#hu-ap-006)
- [HU-AP-007: Configuración de Mercado Pago](#hu-ap-007)
- [HU-AP-008: Inteligencia de Negocio](#hu-ap-008)

### **⚙️ MÓDULO ADMINISTRADOR**
- [HU-AD-001: Gestión de Solicitudes](#hu-ad-001)
- [HU-AD-002: Moderación de Contenido](#hu-ad-002)
- [HU-AD-003: Sistema de Promociones](#hu-ad-003)
- [HU-AD-004: Configuraciones del Sistema](#hu-ad-004)

---

## 👤 **MÓDULO USUARIO CLIENTE**

### **HU-UC-001: Gestión de Perfil de Usuario** {#hu-uc-001}

**Como** usuario autenticado  
**Quiero** gestionar mi perfil personal  
**Para** mantener mi información actualizada y personalizar mi experiencia

#### **📋 Criterios de Aceptación:**

**Escenario 1: Visualizar perfil**
- **Dado** que soy un usuario autenticado
- **Cuando** accedo a la sección de perfil
- **Entonces** puedo ver mi información personal, estadísticas y opciones de configuración

**Escenario 2: Editar información personal**
- **Dado** que estoy en mi perfil
- **Cuando** selecciono "Editar perfil"
- **Entonces** puedo modificar nombre, foto, teléfono, ubicación y biografía

**Escenario 3: Configurar ubicación detallada**
- **Dado** que estoy editando mi perfil
- **Cuando** ingreso mi dirección completa
- **Entonces** el sistema puede geocodificar mi ubicación y completar datos automáticamente

**Escenario 4: Configurar autenticación biométrica**
- **Dado** que mi dispositivo soporta biometría
- **Cuando** habilito la autenticación biométrica
- **Entonces** puedo usar Face ID/Touch ID para futuros inicios de sesión

#### **🎯 Criterios de Éxito:**
- 95% de usuarios completan su perfil básico
- 70% de usuarios configuran ubicación detallada
- 60% de usuarios habilitan autenticación biométrica
- Tiempo promedio de edición < 3 minutos

#### **📁 Archivos/Clases Relacionados:**
```
app/(tabs)/profile.tsx - Pantalla principal de perfil
app/profile/edit.tsx - Formulario de edición
contexts/AuthContext.tsx - Gestión de autenticación
contexts/BiometricContext.tsx - Autenticación biométrica
lib/supabase.ts - Funciones de base de datos
components/ui/Input.tsx - Componentes de formulario
```

#### **🔧 Tareas de Desarrollo:**
1. Implementar pantalla de perfil con estadísticas
2. Crear formulario de edición con validaciones
3. Integrar geocodificación con Nominatim
4. Configurar autenticación biométrica
5. Implementar subida de fotos de perfil
6. Crear sistema de configuraciones de usuario

---

### **HU-UC-002: Gestión de Mascotas** {#hu-uc-002}

**Como** dueño de mascotas  
**Quiero** gestionar los perfiles de mis mascotas  
**Para** llevar un registro completo de su información y cuidados

#### **📋 Criterios de Aceptación:**

**Escenario 1: Agregar nueva mascota**
- **Dado** que soy un usuario autenticado
- **Cuando** selecciono "Agregar mascota"
- **Entonces** puedo crear un perfil completo con información básica, foto y datos de salud

**Escenario 2: Seleccionar raza con información**
- **Dado** que estoy agregando una mascota
- **Cuando** selecciono la raza
- **Entonces** el sistema muestra información específica de la raza (peso ideal, temperamento, etc.)

**Escenario 3: Gestionar registros de salud**
- **Dado** que tengo una mascota registrada
- **Cuando** accedo a su perfil
- **Entonces** puedo agregar vacunas, enfermedades, alergias y seguimiento de peso

**Escenario 4: Crear álbumes de fotos**
- **Dado** que tengo una mascota
- **Cuando** agrego fotos
- **Entonces** puedo organizarlas en álbumes y compartirlas en el feed

#### **🎯 Criterios de Éxito:**
- 90% de usuarios registran al menos una mascota
- 75% completan información de salud básica
- 60% suben al menos 3 fotos por mascota
- 50% crean álbumes organizados

#### **📁 Archivos/Clases Relacionados:**
```
app/(tabs)/pets.tsx - Lista de mascotas
app/pets/add.tsx - Formulario de nueva mascota
app/pets/[id].tsx - Detalle de mascota
app/pets/breed-selector.tsx - Selector de razas
app/pets/health/ - Módulo de salud
app/pets/albums/ - Gestión de álbumes
app/pets/behavior/[id].tsx - Evaluación de comportamiento
components/PetCard.tsx - Tarjeta de mascota
```

#### **🔧 Tareas de Desarrollo:**
1. Crear formulario de registro de mascotas
2. Integrar API de razas (API Ninjas)
3. Implementar módulo de salud completo
4. Desarrollar sistema de álbumes
5. Crear evaluación de comportamiento
6. Implementar seguimiento de peso con gráficas

---

### **HU-UC-003: Álbumes y Fotos** {#hu-uc-003}

**Como** dueño de mascotas  
**Quiero** organizar y compartir fotos de mis mascotas  
**Para** crear recuerdos y conectar con otros dueños

#### **📋 Criterios de Aceptación:**

**Escenario 1: Crear álbum de fotos**
- **Dado** que tengo una mascota registrada
- **Cuando** selecciono "Agregar fotos"
- **Entonces** puedo crear álbumes temáticos con múltiples fotos

**Escenario 2: Validación de contenido**
- **Dado** que estoy subiendo fotos
- **Cuando** selecciono imágenes
- **Entonces** el sistema valida que contengan mascotas

**Escenario 3: Compartir en feed**
- **Dado** que tengo un álbum creado
- **Cuando** marco "Compartir en feed"
- **Entonces** se crea una publicación automáticamente en el feed social

#### **🎯 Criterios de Éxito:**
- 70% de usuarios crean al menos un álbum
- 85% de fotos subidas pasan validación de contenido
- 60% de álbumes se comparten en el feed
- Tiempo promedio de creación < 2 minutos

#### **📁 Archivos/Clases Relacionados:**
```
app/pets/albums/add/[id].tsx - Agregar fotos
app/pets/albums/[id].tsx - Detalle de álbum
utils/petDetection.ts - Validación de contenido
lib/supabase.ts - Almacenamiento de imágenes
```

---

### **HU-UC-004: Feed Social y Publicaciones** {#hu-uc-004}

**Como** miembro de la comunidad  
**Quiero** ver y interactuar con publicaciones de otros usuarios  
**Para** conectar con la comunidad de mascotas

#### **📋 Criterios de Aceptación:**

**Escenario 1: Visualizar feed personalizado**
- **Dado** que soy un usuario autenticado
- **Cuando** accedo al inicio
- **Entonces** veo un feed con publicaciones de mascotas y promociones intercaladas

**Escenario 2: Interactuar con publicaciones**
- **Dado** que veo una publicación
- **Cuando** interactúo con ella
- **Entonces** puedo dar like, comentar, compartir y seguir al autor

**Escenario 3: Sistema de comentarios**
- **Dado** que veo una publicación
- **Cuando** abro los comentarios
- **Entonces** puedo ver, agregar y responder comentarios con hilos de conversación

#### **🎯 Criterios de Éxito:**
- 80% de usuarios interactúan diariamente con el feed
- 65% dan like a publicaciones
- 40% comentan en publicaciones
- 25% comparten contenido

#### **📁 Archivos/Clases Relacionados:**
```
app/(tabs)/index.tsx - Feed principal
app/index.tsx - Feed alternativo
components/PostCard.tsx - Tarjeta de publicación
components/PromotionCard.tsx - Tarjeta de promoción
components/FollowButton.tsx - Botón de seguir
```

---

### **HU-UC-005: Tienda y Compras** {#hu-uc-005}

**Como** dueño de mascotas  
**Quiero** comprar productos para mis mascotas  
**Para** satisfacer sus necesidades desde la aplicación

#### **📋 Criterios de Aceptación:**

**Escenario 1: Explorar catálogo**
- **Dado** que accedo a la tienda
- **Cuando** navego por categorías
- **Entonces** puedo filtrar, buscar y ver productos disponibles

**Escenario 2: Gestionar carrito**
- **Dado** que encuentro productos de interés
- **Cuando** los agrego al carrito
- **Entonces** puedo modificar cantidades y proceder al checkout

**Escenario 3: Proceso de compra**
- **Dado** que tengo productos en el carrito
- **Cuando** procedo al pago
- **Entonces** puedo pagar con Mercado Pago y recibir confirmación

**Escenario 4: Seguimiento de pedidos**
- **Dado** que realicé una compra
- **Cuando** accedo a "Mis Pedidos"
- **Entonces** puedo ver el estado y detalles de mis pedidos

#### **🎯 Criterios de Éxito:**
- 60% de usuarios exploran la tienda
- 35% agregan productos al carrito
- 25% completan una compra
- 90% de pagos se procesan exitosamente

#### **📁 Archivos/Clases Relacionados:**
```
app/(tabs)/shop.tsx - Catálogo de productos
app/products/[id].tsx - Detalle de producto
app/cart/index.tsx - Carrito de compras
app/orders/ - Gestión de pedidos
contexts/CartContext.tsx - Estado del carrito
utils/mercadoPago.ts - Integración de pagos
components/ProductCard.tsx - Tarjeta de producto
```

---

### **HU-UC-006: Servicios y Reservas** {#hu-uc-006}

**Como** dueño de mascotas  
**Quiero** encontrar y reservar servicios para mis mascotas  
**Para** cuidar su salud y bienestar

#### **📋 Criterios de Aceptación:**

**Escenario 1: Explorar servicios**
- **Dado** que busco servicios
- **Cuando** accedo a la sección de servicios
- **Entonces** puedo filtrar por categoría y ver proveedores disponibles

**Escenario 2: Ver detalles del proveedor**
- **Dado** que encuentro un proveedor
- **Cuando** accedo a su perfil
- **Entonces** puedo ver servicios, horarios, reseñas y información de contacto

**Escenario 3: Realizar reserva**
- **Dado** que selecciono un servicio
- **Cuando** procedo a reservar
- **Entonces** puedo elegir mascota, fecha, hora y agregar notas especiales

**Escenario 4: Gestionar citas**
- **Dado** que tengo reservas
- **Cuando** accedo al historial
- **Entonces** puedo ver citas pasadas, próximas y dejar reseñas

#### **🎯 Criterios de Éxito:**
- 70% de usuarios exploran servicios
- 45% realizan al menos una reserva
- 80% de reservas se confirman
- 60% de usuarios dejan reseñas

#### **📁 Archivos/Clases Relacionados:**
```
app/(tabs)/services.tsx - Catálogo de servicios
app/services/partner/[id].tsx - Perfil de proveedor
app/services/[id].tsx - Detalle de servicio
app/services/booking.tsx - Proceso de reserva
app/pets/appointments/[id].tsx - Historial de citas
components/ServiceCard.tsx - Tarjeta de servicio
```

---

### **HU-UC-007: Lugares Pet-Friendly** {#hu-uc-007}

**Como** dueño de mascotas  
**Quiero** encontrar lugares que acepten mascotas  
**Para** disfrutar actividades con mis compañeros

#### **📋 Criterios de Aceptación:**

**Escenario 1: Explorar lugares**
- **Dado** que busco lugares pet-friendly
- **Cuando** accedo a la sección de lugares
- **Entonces** puedo filtrar por categoría y ver lugares cercanos

**Escenario 2: Ver información detallada**
- **Dado** que encuentro un lugar de interés
- **Cuando** accedo a sus detalles
- **Entonces** puedo ver servicios para mascotas, contacto y ubicación

**Escenario 3: Contactar lugar**
- **Dado** que quiero visitar un lugar
- **Cuando** selecciono contactar
- **Entonces** puedo llamar o ver la ubicación en mapas

**Escenario 4: Contribuir con lugares**
- **Dado** que conozco un lugar pet-friendly
- **Cuando** selecciono "Agregar lugar"
- **Entonces** puedo enviarlo para revisión y aprobación

#### **🎯 Criterios de Éxito:**
- 50% de usuarios exploran lugares
- 30% contactan lugares
- 15% contribuyen con nuevos lugares
- 85% de lugares contribuidos son aprobados

#### **📁 Archivos/Clases Relacionados:**
```
app/(tabs)/places.tsx - Lista de lugares
app/places/add.tsx - Agregar lugar
```

---

### **HU-UC-008: Chat y Adopciones** {#hu-uc-008}

**Como** usuario interesado en adopción  
**Quiero** comunicarme con refugios  
**Para** adoptar una mascota de manera responsable

#### **📋 Criterios de Aceptación:**

**Escenario 1: Explorar mascotas en adopción**
- **Dado** que busco adoptar
- **Cuando** accedo a refugios
- **Entonces** puedo ver mascotas disponibles con información completa

**Escenario 2: Iniciar conversación**
- **Dado** que me interesa una mascota
- **Cuando** selecciono "Adopción"
- **Entonces** se inicia un chat con el refugio

**Escenario 3: Comunicación en tiempo real**
- **Dado** que tengo una conversación activa
- **Cuando** envío mensajes
- **Entonces** la comunicación es en tiempo real con notificaciones

#### **🎯 Criterios de Éxito:**
- 40% de usuarios exploran adopciones
- 20% inician conversaciones
- 15% completan procesos de adopción
- 95% de mensajes se entregan en < 2 segundos

#### **📁 Archivos/Clases Relacionados:**
```
app/services/shelter/[id].tsx - Refugios y adopciones
app/chat/[id].tsx - Chat individual
app/chat/adoption.tsx - Chat de adopción
contexts/NotificationContext.tsx - Notificaciones
```

---

## 🏢 **MÓDULO ALIADO/PARTNER**

### **HU-AP-001: Dashboard de Aliado** {#hu-ap-001}

**Como** aliado comercial  
**Quiero** tener un dashboard centralizado  
**Para** gestionar mi negocio de manera eficiente

#### **📋 Criterios de Aceptación:**

**Escenario 1: Acceso al dashboard**
- **Dado** que soy un aliado verificado
- **Cuando** accedo al modo aliado
- **Entonces** veo un dashboard con métricas del día y acciones rápidas

**Escenario 2: Métricas en tiempo real**
- **Dado** que estoy en el dashboard
- **Cuando** reviso las estadísticas
- **Entonces** veo citas del día, ingresos, clientes y estado de pedidos

**Escenario 3: Acciones rápidas**
- **Dado** que necesito gestionar mi negocio
- **Cuando** uso las acciones rápidas
- **Entonces** puedo acceder directamente a agenda, servicios, clientes y pedidos

#### **🎯 Criterios de Éxito:**
- 90% de aliados acceden al dashboard diariamente
- Tiempo promedio de navegación < 30 segundos
- 80% usan acciones rápidas regularmente
- Métricas se actualizan en < 5 segundos

#### **📁 Archivos/Clases Relacionados:**
```
app/(partner-tabs)/dashboard.tsx - Dashboard principal
app/(partner-tabs)/_layout.tsx - Navegación de aliado
app/(partner-tabs)/business-selector.tsx - Selector de negocios
```

---

### **HU-AP-002: Gestión de Servicios** {#hu-ap-002}

**Como** proveedor de servicios  
**Quiero** gestionar mis servicios ofrecidos  
**Para** atraer clientes y organizar mi oferta

#### **📋 Criterios de Aceptación:**

**Escenario 1: Configurar servicios**
- **Dado** que soy un aliado
- **Cuando** accedo a gestión de servicios
- **Entonces** puedo agregar, editar y desactivar servicios

**Escenario 2: Configurar horarios**
- **Dado** que ofrezco servicios con cita
- **Cuando** configuro mi agenda
- **Entonces** puedo establecer horarios por día y duración de slots

**Escenario 3: Gestionar reservas**
- **Dado** que recibo reservas
- **Cuando** accedo a mi agenda
- **Entonces** puedo confirmar, completar o cancelar citas

#### **🎯 Criterios de Éxito:**
- 95% de aliados configuran al menos un servicio
- 80% establecen horarios de trabajo
- 90% de reservas se gestionan en < 24 horas
- 75% de servicios incluyen fotos

#### **📁 Archivos/Clases Relacionados:**
```
app/(partner-tabs)/services.tsx - Gestión de servicios
app/partner/add-service.tsx - Agregar servicio
app/partner/configure-schedule-page.tsx - Configurar horarios
app/(partner-tabs)/bookings.tsx - Gestión de reservas
app/partner/agenda.tsx - Agenda diaria
```

---

### **HU-AP-003: Gestión de Productos** {#hu-ap-003}

**Como** tienda de mascotas  
**Quiero** gestionar mi inventario de productos  
**Para** vender a través de la plataforma

#### **📋 Criterios de Aceptación:**

**Escenario 1: Gestionar catálogo**
- **Dado** que tengo una tienda
- **Cuando** accedo a gestión de productos
- **Entonces** puedo agregar, editar y controlar stock de productos

**Escenario 2: Configurar detalles**
- **Dado** que agrego un producto
- **Cuando** completo la información
- **Entonces** puedo incluir fotos, descripción, precio y características

**Escenario 3: Gestionar pedidos**
- **Dado** que recibo pedidos
- **Cuando** accedo a gestión de pedidos
- **Entonces** puedo actualizar estados y procesar envíos

#### **🎯 Criterios de Éxito:**
- 90% de tiendas suben al menos 10 productos
- 85% incluyen fotos en productos
- 95% de pedidos se procesan en < 48 horas
- 70% de productos mantienen stock actualizado

#### **📁 Archivos/Clases Relacionados:**
```
app/(partner-tabs)/products.tsx - Gestión de productos
app/partner/add-service.tsx - Agregar producto (modo tienda)
app/partner/orders.tsx - Gestión de pedidos
app/partner/edit-product.tsx - Editar producto
```

---

### **HU-AP-004: Agenda y Reservas** {#hu-ap-004}

**Como** proveedor de servicios  
**Quiero** gestionar mi agenda de citas  
**Para** organizar mi tiempo y atender clientes eficientemente

#### **📋 Criterios de Aceptación:**

**Escenario 1: Vista de agenda**
- **Dado** que tengo servicios con cita
- **Cuando** accedo a mi agenda
- **Entonces** puedo ver citas por día con filtros de fecha

**Escenario 2: Gestionar reservas**
- **Dado** que recibo una reserva
- **Cuando** la reviso
- **Entonces** puedo confirmar, rechazar o reprogramar

**Escenario 3: Actualizar estados**
- **Dado** que tengo citas confirmadas
- **Cuando** completo el servicio
- **Entonces** puedo marcar como completada y solicitar reseña

#### **🎯 Criterios de Éxito:**
- 95% de reservas se gestionan en < 4 horas
- 85% de citas confirmadas se completan
- 70% de servicios completados reciben reseña
- 0% de conflictos de horarios

#### **📁 Archivos/Clases Relacionados:**
```
app/partner/agenda.tsx - Agenda diaria
app/(partner-tabs)/bookings.tsx - Gestión de reservas
app/partner/configure-schedule-page.tsx - Configuración de horarios
```

---

### **HU-AP-005: Gestión de Pedidos** {#hu-ap-005}

**Como** tienda aliada  
**Quiero** gestionar los pedidos de mis productos  
**Para** cumplir con las ventas y mantener clientes satisfechos

#### **📋 Criterios de Aceptación:**

**Escenario 1: Recibir pedidos**
- **Dado** que vendo productos
- **Cuando** recibo un pedido
- **Entonces** puedo ver detalles completos y información del cliente

**Escenario 2: Procesar pedidos**
- **Dado** que tengo pedidos pendientes
- **Cuando** los proceso
- **Entonces** puedo actualizar estados y gestionar envíos

**Escenario 3: Integración con Mercado Pago**
- **Dado** que uso Mercado Pago
- **Cuando** se procesa un pago
- **Entonces** recibo automáticamente mi parte (95%) con split de comisiones

#### **🎯 Criterios de Éxito:**
- 100% de pedidos se registran correctamente
- 95% se procesan en < 24 horas
- 90% de pagos se dividen automáticamente
- 85% de envíos se completan a tiempo

#### **📁 Archivos/Clases Relacionados:**
```
app/partner/orders.tsx - Gestión de pedidos
utils/mercadoPago.ts - Split de pagos
app/payment/ - Flujos de pago
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