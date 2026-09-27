# AURA — E-commerce Full Stack de Perfumes

<p align="center">
  <strong>E-commerce full stack especializado en perfumes de diseñador y perfumes árabes.</strong>
</p>

<p align="center">
  React + TypeScript · FastAPI · PostgreSQL · Mercado Pago · Gemini · Supabase · Resend
</p>

<p align="center">
  <a href="https://aura-ecommerce-phi.vercel.app"><strong>Ver demo en vivo</strong></a>
</p>

---

## Sobre el proyecto

**AURA** es un e-commerce desarrollado como proyecto de portafolio para construir una experiencia de compra completa, desde el catálogo y la autenticación hasta el pago, el control de inventario y la administración de pedidos.

El sistema está dividido en un **frontend SPA con React y TypeScript**, una **API REST con FastAPI** y una base de datos **PostgreSQL** administrada mediante SQLAlchemy y Alembic. Además, integra servicios externos para pagos, recomendaciones con inteligencia artificial, correo transaccional y almacenamiento de imágenes.

El objetivo del proyecto no es únicamente mostrar una interfaz, sino implementar lógica real de comercio electrónico: autenticación, roles, stock, checkout, pagos, webhooks, reembolsos, pedidos, correos y administración.

## Funcionalidades

### Tienda y experiencia del cliente

- Catálogo de perfumes con búsqueda, filtros y ordenamiento.
- Colecciones y marcas.
- Página de detalle de producto.
- Carrito de compras.
- Lista de favoritos asociada al usuario.
- Registro e inicio de sesión.
- Verificación de correo electrónico.
- Recuperación y restablecimiento de contraseña.
- Gestión de perfil y direcciones de entrega.
- Checkout autenticado.
- Historial de pedidos y detalle de cada compra.
- Sistema de reseñas y calificaciones de 1 a 5 estrellas.
- Edición y eliminación de reseñas propias.
- Asistente de recomendación de perfumes con IA.
- Recomendaciones conectadas con productos reales del catálogo.

### Pagos, pedidos e inventario

- Integración con **Mercado Pago** mediante el SDK oficial.
- Creación y procesamiento de pagos desde el checkout.
- Webhook para sincronizar el resultado del pago con el backend.
- Manejo de identificadores de Mercado Pago dentro del pedido.
- Claves de idempotencia para reducir operaciones duplicadas.
- Reserva temporal de stock al crear un pedido.
- Confirmación definitiva del stock después de un pago aprobado.
- Liberación automática del stock cuando una reserva vence.
- Estados de pedido: pendiente, confirmado, preparando, despachado, entregado y cancelado.
- Estados de pago: pendiente, pagado, fallido y reembolsado.
- Reembolsos de pagos desde el panel administrativo.
- Programación del procesamiento de pedidos de acuerdo con los horarios de atención de la tienda y la zona horaria de Lima.

### Panel administrativo

- Dashboard administrativo.
- Gestión de productos.
- Creación y edición de productos.
- Activación y desactivación de productos.
- Gestión de inventario y stock.
- Gestión de pedidos.
- Vista detallada de cada pedido.
- Cambio controlado del estado de los pedidos.
- Reembolsos desde administración.
- Gestión y consulta de clientes.
- Vista detallada de información de clientes.
- Carga y procesamiento de imágenes de productos.
- Conversión de imágenes a WebP antes de almacenarlas.
- Almacenamiento de imágenes en **Supabase Storage**.

### Correos transaccionales

AURA utiliza **Resend** y plantillas HTML para el envío de correos relacionados con el ciclo de vida de la cuenta y de las compras.

Entre los correos implementados se encuentran:

- Verificación de cuenta.
- Recuperación de contraseña.
- Confirmación de pago aprobado.
- Confirmación de reembolso.
- Pedido despachado.
- Pedido entregado.

Los correos de negocio utilizan un patrón de **email outbox**, almacenando los eventos pendientes en PostgreSQL para poder procesarlos con reintentos sin bloquear el flujo principal del pedido.

## Inteligencia artificial

El asistente de AURA utiliza **Google Gemini** desde el backend.

El flujo de recomendación no se limita a mostrar una respuesta de texto. El backend analiza la intención del usuario, combina esa información con el catálogo disponible y devuelve productos reales que pueden mostrarse directamente en el chat.

Ejemplos de consultas:

- "Quiero un perfume fresco para usar todos los días."
- "Busco algo árabe, dulce y de noche."
- "Recomiéndame un perfume elegante para una cita."

## Arquitectura

```text
┌───────────────────────────────┐
│        React + TypeScript     │
│        Vite · SPA · Vercel    │
└───────────────┬───────────────┘
                │ HTTP / JSON
                ▼
┌───────────────────────────────┐
│             FastAPI           │
│      API REST + lógica        │
│          de negocio           │
└───────────────┬───────────────┘
                │ SQLAlchemy
                ▼
┌───────────────────────────────┐
│          PostgreSQL           │
│     migraciones con Alembic   │
└───────────────────────────────┘

Servicios externos:
├── Mercado Pago      → pagos y reembolsos
├── Google Gemini     → recomendaciones con IA
├── Resend            → correos transaccionales
└── Supabase Storage  → imágenes de productos
```

El backend también ejecuta procesos periódicos para liberar reservas de stock vencidas y procesar correos pendientes del outbox.

## Stack tecnológico

| Área | Tecnologías |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Lucide React |
| Backend | Python, FastAPI, Pydantic |
| ORM y BD | SQLAlchemy 2, PostgreSQL, psycopg 3 |
| Migraciones | Alembic |
| Autenticación | JWT, Argon2 |
| Pagos | Mercado Pago SDK |
| IA | Google Gemini |
| Email | Resend, Jinja2 |
| Imágenes | Pillow, Supabase Storage |
| Deploy frontend | Vercel |

## Modelo de datos principal

La aplicación utiliza, entre otras, las siguientes entidades:

- `users`
- `products`
- `addresses`
- `favorites`
- `orders`
- `order_items`
- `reviews`
- `business_hours`
- `email_outbox`

Los cambios de esquema se gestionan mediante migraciones de **Alembic**.

## Flujo de una compra

```text
Cliente
  │
  ├─ agrega productos al carrito
  │
  ├─ selecciona una dirección
  │
  ▼
FastAPI crea el pedido
  │
  ├─ valida productos y stock
  ├─ reserva unidades
  └─ deja el pago pendiente
  │
  ▼
Mercado Pago
  │
  ├─ aprobado ──────► stock confirmado
  │                   pedido confirmado
  │                   correo en outbox
  │
  └─ rechazado/
     reserva vencida ► stock liberado
                        pedido cancelado
```

Después del pago, el administrador puede avanzar el pedido por las etapas de preparación, despacho y entrega. Los cambios relevantes generan sus respectivos correos transaccionales.

## Estructura del proyecto

```text
aura-ecommerce-/
│
├── backend/
│   ├── alembic/
│   │   └── versions/
│   ├── app/
│   │   ├── core/
│   │   ├── dependencies/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── templates/
│   │   ├── database.py
│   │   └── main.py
│   ├── scripts/
│   ├── .env.example
│   ├── alembic.ini
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── data/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
└── README.MD
```

## Ejecución local

### Requisitos

Necesitas tener instalados:

- Git.
- Node.js y npm compatibles con Vite 8.
- Python.
- PostgreSQL o una instancia PostgreSQL remota.
- Credenciales de los servicios externos que quieras utilizar.

### 1. Clonar el repositorio

```bash
git clone https://github.com/JostynM/aura-ecommerce-.git
cd aura-ecommerce-
```

### 2. Configurar el backend

```bash
cd backend

python -m venv venv
```

En Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

En macOS/Linux:

```bash
source venv/bin/activate
```

Instala las dependencias:

```bash
pip install -r requirements.txt
```

Copia `backend/.env.example` como `backend/.env` y completa las variables necesarias.

Ejecuta las migraciones:

```bash
alembic upgrade head
```

Inicia FastAPI:

```bash
python -m uvicorn app.main:app --reload
```

La API quedará disponible por defecto en:

```text
http://127.0.0.1:8000
```

La documentación Swagger puede consultarse en:

```text
http://127.0.0.1:8000/docs
```

### 3. Configurar el frontend

Desde la raíz del proyecto:

```bash
cd frontend
npm install
```

Copia `frontend/.env.example` como `frontend/.env` y configura las variables.

Después inicia Vite:

```bash
npm run dev
```

El frontend se ejecutará normalmente en:

```text
http://localhost:5173
```

## Variables de entorno

### Backend

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `JWT_SECRET_KEY` | Firma de tokens JWT |
| `FRONTEND_URL` | URL permitida del frontend y enlaces de correo |
| `MERCADO_PAGO_ACCESS_TOKEN` | Acceso privado a Mercado Pago |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Secreto utilizado por el webhook de pagos |
| `RESEND_API_KEY` | Envío de correos transaccionales |
| `GEMINI_API_KEY` | Acceso a Google Gemini |
| `SUPABASE_URL` | URL del proyecto de Supabase |
| `SUPABASE_SECRET_KEY` | Credencial privada para Storage |
| `SUPABASE_STORAGE_BUCKET` | Bucket de imágenes de productos |

### Frontend

| Variable | Uso |
| --- | --- |
| `VITE_API_URL` | URL pública del backend |
| `VITE_MERCADO_PAGO_PUBLIC_KEY` | Clave pública utilizada por Mercado Pago en el navegador |

> Nunca deben subirse archivos `.env` ni credenciales reales al repositorio.

## Scripts útiles

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### Backend

```bash
python -m uvicorn app.main:app --reload
alembic upgrade head
alembic current
alembic heads
```

El directorio `backend/scripts/` también incluye utilidades para migrar datos de demostración e imágenes hacia Supabase.

## API

FastAPI organiza las rutas por módulos:

```text
/auth
/addresses
/products
/orders
/users
/reviews
/payments
/favorites
/recommendations
```

Al ejecutar el backend, Swagger permite explorar los endpoints disponibles y sus esquemas directamente desde `/docs`.

## Seguridad y consistencia

El proyecto incorpora varias medidas para mantener consistente el flujo de compra:

- Hash de contraseñas con Argon2.
- Autenticación mediante JWT.
- Separación de permisos entre cliente y administrador.
- Validación del stock desde el backend.
- Bloqueos de filas durante operaciones sensibles de inventario.
- Reservas de stock con fecha de expiración.
- Procesamiento idempotente de operaciones de pago y reembolso.
- Variables sensibles fuera del código fuente.
- Correos desacoplados mediante email outbox.
- Migraciones versionadas con Alembic.

## Deploy

El frontend se encuentra desplegado en **Vercel**:

**https://aura-ecommerce-phi.vercel.app**

La configuración del proyecto permite conectar el frontend desplegado con la API FastAPI mediante `VITE_API_URL`. PostgreSQL y Supabase Storage se utilizan para persistencia e imágenes respectivamente.

## Estado del proyecto

AURA cuenta actualmente con un flujo funcional de e-commerce de extremo a extremo y está orientado a demostración y portafolio.

Como siguientes mejoras técnicas se pueden incorporar pruebas automatizadas, CI/CD, observabilidad, rate limiting y una mayor cobertura de pruebas de integración para los servicios externos.

## Autor

**Jostyn Mendoza**

GitHub: https://github.com/JostynM

---

Este proyecto fue desarrollado para fortalecer conocimientos de desarrollo **full stack**, diseño de APIs, bases de datos, autenticación, integraciones externas, lógica de negocio e inteligencia artificial aplicada a una experiencia real de e-commerce.
