# AURA — E-commerce Full Stack de Perfumes

**AURA** es un e-commerce full stack especializado en perfumes de diseñador y perfumes árabes. Fue desarrollado como proyecto de portafolio para aplicar frontend, backend, bases de datos, pagos, inteligencia artificial e integraciones con APIs externas.

🔗 **Demo:** https://aura-ecommerce-phi.vercel.app

## Cuentas de prueba

Puedes probar AURA sin registrarte.

| Tipo | Correo | Contraseña |
| --- | --- | --- |
| Cliente demo | `demo@example.com` | `AuraDemo2026!` |
| Administrador demo | `admin.demo@example.com` | `AuraDemo2026!` |

La cuenta de **administrador demo es de solo lectura**. Permite explorar el dashboard, inventario, pedidos y clientes, pero no puede modificar productos, cambiar estados ni realizar reembolsos.

## Funcionalidades

- Registro, inicio de sesión y autenticación con JWT.
- Verificación de correo y recuperación de contraseña.
- Catálogo con búsqueda, filtros, marcas y colecciones.
- Detalle de productos, carrito y favoritos.
- Gestión de direcciones y checkout.
- Pagos con Mercado Pago.
- Reserva y control automático de stock.
- Historial y seguimiento de pedidos.
- Reseñas y calificaciones de productos.
- Recomendador de perfumes con inteligencia artificial.
- Panel administrativo.
- Gestión de productos, clientes, pedidos e inventario.
- Reembolsos desde administración.
- Correos automáticos de pago, despacho, entrega y reembolso.
- Almacenamiento de imágenes en la nube.

## Tecnologías

### Frontend

- React
- TypeScript
- Vite
- React Router
- Lucide React
- Mercado Pago SDK

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT
- Argon2
- Alembic

### Base de datos

- PostgreSQL
- Supabase

## APIs y servicios utilizados

### Mercado Pago API

Utilizada para procesar pagos del checkout, recibir notificaciones mediante webhooks y realizar reembolsos desde el panel administrativo.

### Google Gemini API

Utilizada por el asistente inteligente de AURA para analizar lo que busca el usuario y recomendar perfumes disponibles en el catálogo.

### Resend API

Utilizada para enviar correos transaccionales como:

- verificación de cuenta;
- recuperación de contraseña;
- pago aprobado;
- pedido despachado;
- pedido entregado;
- reembolso confirmado.

### Supabase Storage API

Utilizada para almacenar las imágenes de los productos. El backend procesa las imágenes y las convierte a formato WebP antes de subirlas.

## Arquitectura

```text
React + TypeScript
        │
        ▼
      FastAPI
        │
        ▼
   PostgreSQL
        │
        ├── Mercado Pago API
        ├── Google Gemini API
        ├── Resend API
        └── Supabase Storage API
```

## Estructura

```text
aura-ecommerce-/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── alembic/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
│
└── README.MD
```

## Ejecución local

### Backend

```bash
cd backend
python -m venv venv
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload
```

Configura las variables utilizando:

```text
backend/.env.example
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Configura las variables utilizando:

```text
frontend/.env.example
```

## Variables principales

Backend:

```text
DATABASE_URL
JWT_SECRET_KEY
FRONTEND_URL
MERCADO_PAGO_ACCESS_TOKEN
MERCADO_PAGO_WEBHOOK_SECRET
RESEND_API_KEY
GEMINI_API_KEY
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_STORAGE_BUCKET
```

Frontend:

```text
VITE_API_URL
VITE_MERCADO_PAGO_PUBLIC_KEY
```

## Autor

**Jostyn Mendoza**


