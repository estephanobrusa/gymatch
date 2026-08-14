 # Gymatch

Gymatch es una plataforma social enfocada en conectar personas que buscan compañeros de entrenamiento compatibles según ubicación, gimnasio, objetivos fitness y horarios.

El producto está inspirado en mecánicas tipo Tinder, pero orientado exclusivamente a fitness y accountability deportivo.

---

# Objetivo del MVP

Validar si usuarios están dispuestos a usar una app social fitness para:

- encontrar gym partners
- entrenar acompañados
- mejorar consistencia
- socializar dentro del fitness
- encontrar personas compatibles por objetivos y horarios

---

# Stack Tecnológico

## Frontend

- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- ShadCN UI
- React Query / TanStack Query
- Zustand (estado local simple)
- PWA support

---

## Backend

Se evita Strapi.

Razones:
- complejidad innecesaria
- limitado para realtime social apps
- poco eficiente para matching/swipe/chat
- arquitectura demasiado CMS-oriented

Se utilizará:

- Supabase
  - PostgreSQL
  - Auth
  - Realtime
  - Storage
  - Row Level Security
- Prisma ORM
- Next.js Route Handlers
- Server Actions

---

## Base de datos

### Producción
- PostgreSQL (Supabase)

### Local
- PostgreSQL local via Docker

NO usar SQLite.

Razón:
- diferencias peligrosas con PostgreSQL
- incompatibilidad parcial con features avanzadas
- realtime/testing inconsistente

---

# Arquitectura General

Frontend:
Next.js SSR + Client Components

Backend:
Next.js API Layer + Supabase

Realtime:
Supabase Realtime

Storage:
Supabase Storage

Deployment:
Docker + VPS + Dockploy

CI/CD:
GitHub Actions

---

# MVP Features

## Auth

- Login Google OAuth
- Registro automático
- Username único
- Edad mínima: 18

---

## Perfil Usuario

### MVP Fields

- username
- nombre
- edad
- bio
- ciudad
- fotos (máximo 5)
- gimnasio principal
- objetivos fitness
- experiencia
- horarios entrenamiento
- distancia máxima
- disciplinas fitness

### Campos NO necesarios inicialmente

- Instagram
- verificación facial
- métricas fitness avanzadas
- stories
- feed social

---

# Matching

## Swipe System

### Swipe Right
Usuario interesado.

### Swipe Left
Usuario descartado.

### Match
Ocurre únicamente cuando:
- ambos usuarios hicieron swipe right

Solo después del match:
- se habilita chat

---

# Features Premium (desactivadas inicialmente)

Sistema preparado desde MVP:

- super likes
- rewind
- likes ilimitados
- boost visibility
- ver quién dio like

Inicialmente:
- todo gratis
- feature flags para activar monetización futura

---

# Geolocalización

## Sistema

- rango configurable por usuario
- matching basado en distancia

---

## Gimnasios

Se utilizará:
- Google Places API

Features:
- autocomplete
- coordenadas reales
- nombres normalizados

Razón:
evitar datos basura y duplicados.

---

# Chat Realtime

## Tecnología

Supabase Realtime

Razón:
- suficientemente escalable para MVP
- simple
- integrado con PostgreSQL
- evita websocket server custom

---

## Chat MVP

- mensajes realtime
- unread count básico
- conversaciones 1 a 1
- timestamps

---

## NO incluir inicialmente

- typing indicators
- voice messages
- media attachments
- read receipts complejos
- online presence avanzada

---

# Fotos

## MVP

- máximo 5 fotos
- upload hacia Supabase Storage
- resize frontend
- validación formato

---

## Futuro

- moderación IA
- detección NSFW
- verificación facial

---

# Seguridad

## MVP

- Google OAuth
- Row Level Security
- rate limiting básico
- protección endpoints privados

---

## Futuro

- selfie verification
- detección bots
- moderación automática
- antifraud

---

# Report & Block System

## Reportes

Categorías:
- fake profile
- harassment
- sexual content
- spam
- underage
- offensive behavior

---

## Block System

Cuando un usuario bloquea:
- desaparece match
- desaparece chat
- desaparece perfil
- se evita rematching

---

# GDPR

## Requisitos mínimos

- eliminar cuenta
- eliminar chats asociados
- eliminar fotos
- exportar datos futuro

---

# Push Notifications

Preparado desde MVP:

- nuevo match
- nuevo mensaje
- super like futuro
- boost futuro

---

# Mobile Strategy

## Fase 1
Next.js PWA

## Fase 2
React Native Expo

Razón:
- validar producto primero
- reutilizar lógica backend

---

# Infraestructura

## VPS

Deployment:
- Docker Compose
- Dockploy

---

## Servicios

- Next.js app
- PostgreSQL (Supabase)
- Redis futuro
- reverse proxy nginx/caddy

---

# CI/CD

## GitHub Actions

Pipeline:
- lint
- typecheck
- tests futuros
- docker build
- deploy automático VPS

---

# Arquitectura de Carpetas

/apps
  /web

/packages
  /ui
  /config
  /types
  /eslint-config

---

# Entidades Principales DB

## users

- id
- username
- birthdate
- bio
- city
- gender
- gym_id
- max_distance
- created_at

---

## user_photos

- id
- user_id
- url
- order

---

## gyms

- id
- google_place_id
- name
- lat
- lng

---

## swipes

- id
- swiper_id
- target_user_id
- direction

---

## matches

- id
- user_1
- user_2
- created_at

---

## conversations

- id
- match_id

---

## messages

- id
- conversation_id
- sender_id
- content
- created_at

---

## reports

- id
- reporter_id
- target_user_id
- reason
- created_at

---

## blocks

- id
- blocker_id
- blocked_user_id

---

# Riesgos Técnicos

## 1. Matching algorithm

No complicar inicialmente.

Evitar:
- IA
- scoring complejo
- recomendaciones avanzadas

Usar:
- distancia
- gimnasio
- objetivos

---

## 2. Realtime scaling

Supabase Realtime funciona bien para MVP.
Si escala:
- migrar parte del chat
- usar event-driven architecture

---

## 3. Moderación

Las apps sociales mueren rápido sin moderación.
Debe priorizarse temprano.

---

# Roadmap

## MVP

- auth
- onboarding
- perfiles
- upload fotos
- swipe
- match
- realtime chat
- report/block

---

## V1.1 — Gym Specialization

Objetivo: dejar de ser una app genérica y mostrar el contexto fitness real de cada usuario.

### Perfil Fitness (extensión del perfil MVP)

- **Tipo de entrenamiento**: Gym, CrossFit, Calistenia, Pilates, Funcional, Boxeo, Natación, Running
- **Gimnasio principal**: via Google Places API (autocomplete, coordenadas reales)
- **Objetivos** (multi-select): Perder peso, Ganar músculo, Mantenerme, Mejorar rendimiento, Competir
- **Experiencia**: Principiante, Intermedio, Avanzado
- **Frecuencia semanal**: 1-2 días, 3-4 días, 5-6 días, Todos los días
- **Horarios habituales** (multi-select): Mañana (6-9), Mañana (9-12), Mediodía, Tarde, Noche, Noche tardía

### Rutina del día — "¿Qué entrenás hoy?"

El usuario publica su entrenamiento del día. Visible en la card del feed.

- **Músculo / grupo**: Piernas, Pecho, Espalda, Hombros, Brazos, Full body, Cardio, WOD, Clase grupal
- **Tipo de sesión**: Normal, Intenso, PR day 🔥, Recuperación
- Duración: 24hs, se renueva cada día

### Decisiones técnicas v1.1

- **Timezone**: `todayMuscleGroup` se deriva server-side con UTC (`Date.getDay()`). Cuando escale, agregar `timezone String?` al modelo User y cambiar una línea en `getDiscoveryFeed`. Deferred deliberadamente para MVP.
- **Templates de rutina**: son sugerencias de punto de partida. El usuario puede editar cada día libremente después de aplicar un template.

### Lo que NO entra en v1.1

- Score de compatibilidad / matching inteligente
- Filtros del feed por entrenamiento
- Integración con wearables
- Planes de entrenamiento / workout log
- Grupos o comunidades
- Timezone por usuario (deferred — ver decisiones técnicas)

---

## V2

Ver especificación completa: [docs/v2.md](./docs/v2.md)

Resumen:
- Design system (font, paleta, bottom nav, SVG buttons)
- Back navigation en onboarding
- Seed script con usuarios mock realistas
- GymSearch UI conectada al backend de Google Places existente
- Perfil editable (fotos, gym, bio, disciplinas, horarios, experiencia, objetivos)
- Onboarding steps 4 y 5 (fitness + routine) para nuevos usuarios
- V1.1 schema: todayMuscleGroup + SessionType en discovery card

---

## V3

Ver especificación completa: [docs/v3.md](./docs/v3.md)

Resumen:
- Boost, Top Picks, Passport, Smart Photos
- Daily swipe limit, Rewind lógica, Super Like lógica, Likes recibidos
- Activity status, Verified badge, Fitness tags, Prompts, Spotify, Instagram
- Monetización: Gymatch Plus, Gymatch Gold, à la carte
- Chat: GIFs, voice notes, icebreakers, unmatch, video call
- Comunidad: grupos de entrenamiento, eventos, social feed
- social feed
- challenges
- AI recommendations

---

# Recomendaciones Críticas

## NO sobreingenierizar

No usar:
- microservices
- kubernetes
- event buses complejos
- custom websocket infra

Con 1000 usuarios:
- arquitectura simple gana

---

# Costos Iniciales Aproximados

## MVP

Supabase:
- free/pro tier inicial

VPS:
- 10€–20€/mes

Google Places:
- bajo costo al inicio

Dominio:
- ~10€/año

Total aproximado:
20€–50€/mes

---

# Decisiones de Implementación (auto-documentadas)

## Auth (SDD change: auth)

- **Google OAuth** via Supabase Auth + @supabase/ssr
- **ADMIN_DATABASE_URL**: puerto 5432 directo (bypassa RLS para syncUser via Prisma service role)
- **Split gate pattern**: middleware.ts = auth gate (Edge), (protected)/layout.tsx = onboarding gate (Node.js)
- **Onboarding completo** = username + birthDate + al menos 1 foto
- **Storage bucket**: `profile-photos`, URLs públicas (MVP)
- **Photo constraints**: max 5 MB, jpeg/png/webp
- **Username**: 3–30 chars, alphanumeric + underscores
- **Age minimum**: 18 años
- **No Zustand auth store** (deferred — server-first approach)
- **Server Actions** para mutations de onboarding (no API routes)