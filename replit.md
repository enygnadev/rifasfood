# RifaFood - Digital Raffle Platform

## Overview

RifaFood is a digital raffle (rifa) platform built with Next.js that mimics the iFood delivery app experience. The system allows users to purchase raffle numbers, tracks progress toward goals, automatically locks purchases when goals are met, runs countdown timers, and executes transparent automated drawings. The platform emphasizes gamification, urgency psychology, and high-conversion UX patterns.

**Core Product Flow:**
1. Users browse active raffles displayed as cards (iFood-style)
2. Users purchase numbers - the system awards bonus numbers as raffles approach their goal
3. When a raffle hits its goal, purchases lock and a 10-minute countdown begins
4. Automated drawing occurs using auditable SHA-256 RNG
5. Winners are announced and raffles can restart for new rounds

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4 with custom animations (fade-in, pulse, shake, shimmer)
- **State Management**: React Context for cart and authentication
- **Real-time Updates**: Firebase Firestore onSnapshot listeners for live raffle data
- **Component Structure**: 
  - Pages under `src/app/(pages)/` with client/server component separation
  - Shared components in `src/components/`
  - Dynamic imports for code splitting (Hero, HowItWorks)

### Backend Architecture
- **API Routes**: Next.js API routes under `src/app/api/`
- **Admin APIs**: Protected by `x-admin-secret` header validation
- **Payment Processing**: Pluggable payment provider system
  - Default: `simulated` (no real payments)
  - Optional: Stripe integration via `PAYMENT_PROVIDER=stripe`
- **Rate Limiting**: Hybrid Redis/in-memory rate limiter (`src/lib/rateLimiter.ts`)
- **Webhook Processing**: Stripe webhook handler with signature verification

### Data Storage
- **Primary Database**: Firebase Firestore
  - Collections: `rifas`, `compras`, `historico`, `users`, `usuarios`, `logs_audit`
  - Composite index required: `(status ASC, timerExpiresAt ASC)` on `rifas`
- **Caching**: Optional Redis via `REDIS_URL` for rate limiting
- **Admin SDK**: Firebase Admin for server-side operations

### Authentication
- **Provider**: Firebase Authentication
- **Strategy**: Anonymous sign-in by default, with optional email/password registration
- **Session**: Client-side auth state via `AuthProvider` context
- **Admin Access**: Secret-based API authentication (not user roles)

### Background Processing
- **Firebase Cloud Functions**: Scheduled job (`checkAndRunSorteios`) runs every minute
  - Queries raffles in "contagem" status with expired timers
  - Executes drawings and updates winner records
- **Drawing Algorithm**: SHA-256 hash-based deterministic RNG with auditable seed

### Key Design Patterns
- **Transactional Updates**: Firestore transactions for purchase processing to prevent race conditions
- **Audit Logging**: All significant events logged to `logs_audit` collection
- **Progressive Enhancement**: Bonus numbers awarded based on raffle progress percentage
- **Lock Mechanism**: Raffles lock when goal is reached, preventing further purchases

## External Dependencies

### Firebase Services
- **Firestore**: Primary database for all application data
- **Authentication**: User identity management
- **Cloud Functions**: Scheduled background jobs for automated drawings
- **Cloud Messaging (FCM)**: Push notifications for winners and updates

### Payment Providers
- **Stripe** (optional): Checkout sessions for card payments
  - Requires: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Simulated**: Default mock payment for development

### Infrastructure
- **Redis** (optional): Distributed rate limiting via `REDIS_URL`
- **Sentry** (optional): Error tracking via `SENTRY_DSN`

### Required Environment Variables
```
# Firebase Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase Admin (server)
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY

# Application
ADMIN_SECRET          # Required for admin API access
PAYMENT_PROVIDER      # "simulated" or "stripe"

# Optional
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
REDIS_URL
SENTRY_DSN
```

### Development Commands
- `npm run dev` - Start Next.js dev server on port 5000
- `npm run emulate` - Start Firebase emulators (Firestore, Functions)
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run deploy:indexes` - Deploy Firestore indexes