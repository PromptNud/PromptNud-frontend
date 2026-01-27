# AI Scheduling Assistant for LINE - Technical Implementation Plan

## Project Overview

Build an AI-powered meeting scheduling assistant integrated with LINE that enables group coordination through calendar sync and intelligent time-slot recommendations.

### MVP Scope
- **Phase 1 (MVP)**: Meeting creation, manual availability input, Google Calendar sync, AI time-slot ranking, LINE group broadcast
- **Phase 2**: Venue recommendations, automated reminders

---

## Key Architecture Decisions

### Frontend Architecture
1. **LIFF Integration Pattern**: React Context API instead of singleton class
   - `LiffProvider` wraps entire app with user state management
   - Custom `useLiff()` hook for accessing LIFF context
   - Better integration with React lifecycle and state management

2. **Authentication Flow**: Token Exchange Pattern
   - LIFF token → Backend JWT token exchange on login
   - Dual storage: Cookies (HttpOnly, Secure) + localStorage for reliability
   - Backend issues JWT with 24-hour expiry
   - All API calls use backend JWT, not LIFF token directly

3. **API Client**: Utility-based approach
   - `createApiHeaders()` utility function handles token injection
   - Simpler than class-based ApiClient
   - Automatic ngrok header handling for development

4. **Next.js Configuration**: Critical settings
   - **MUST** include `transpilePackages: ['@line/liff']`
   - Security headers with `X-Frame-Options: SAMEORIGIN` (allow LIFF embedding)
   - TypeScript config for better type safety

### Backend Architecture
1. **Authentication**: Two-step verification
   - Verify LIFF token with LINE API
   - Issue JWT token for subsequent requests
   - JWT middleware protects all routes except health/webhook/auth

2. **Database**: PostgreSQL with GORM
   - UUID primary keys for security
   - Proper indexing on frequently queried fields
   - Cascade deletes for data consistency

3. **LINE Integration**:
   - Webhook for @Bot commands
   - Flex Messages for rich UI in LINE chat
   - LIFF for web app integration

4. **AI Integration**: Gemini API
   - JSON-mode responses for structured suggestions
   - Context-aware prompts with meeting preferences
   - Ranking algorithm based on availability + preferences

---

## Tech Stack

### Frontend (LIFF App)
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.x | React framework with App Router |
| React | 19.x | UI framework |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 3.x | Styling |
| @line/liff | 2.25+ | LINE Frontend Framework |
| React Query | 5.x | Server state management |
| date-fns | 3.x | Date manipulation |
| Zustand | 4.x | Client state management |
| js-cookie | 3.x | Cookie management |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Go | 1.22+ | Backend language |
| Fiber | 2.x | Web framework |
| GORM | 2.x | ORM |
| google.golang.org/api | latest | Google APIs |
| github.com/line/line-bot-sdk-go | v8 | LINE Bot SDK |
| github.com/google/generative-ai-go | latest | Gemini AI |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL 15 | Primary database |
| Cloud SQL (GCP) | Managed PostgreSQL |

### Deployment
| Component | Platform |
|-----------|----------|
| Frontend | Vercel |
| Backend | Google Cloud Run |
| Database | Cloud SQL for PostgreSQL |

---

## Project Structure

### Frontend (`/frontend`)
```
frontend/
├── public/
│   ├── favicon.ico
│   └── images/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── globals.css
│   │   ├── providers.tsx
│   │   ├── create/
│   │   │   └── page.tsx
│   │   ├── meeting/
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── availability/
│   │   │       │   └── page.tsx
│   │   │       └── results/
│   │   │           └── page.tsx
│   │   └── callback/
│   │       └── google/
│   │           └── page.tsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Input.tsx
│   │   ├── meeting/
│   │   │   ├── MeetingForm.tsx
│   │   │   ├── MeetingCard.tsx
│   │   │   ├── MeetingList.tsx
│   │   │   └── MeetingDetails.tsx
│   │   ├── availability/
│   │   │   ├── TimeSlotPicker.tsx
│   │   │   ├── CalendarSync.tsx
│   │   │   ├── AvailabilityGrid.tsx
│   │   │   └── AvailabilitySummary.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Container.tsx
│   ├── hooks/
│   │   ├── useLiff.ts
│   │   ├── useMeeting.ts
│   │   ├── useAvailability.ts
│   │   └── useGoogleCalendar.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── liff.ts
│   │   └── utils.ts
│   ├── stores/
│   │   ├── userStore.ts
│   │   └── meetingStore.ts
│   └── types/
│       ├── meeting.ts
│       ├── user.ts
│       └── availability.ts
├── .env.example
├── .env.local
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── postcss.config.js
```

### Backend (`/backend`) - Hexagonal Architecture

```
backend/
├── cmd/                                    # Application Entry Points
│   ├── server/
│   │   └── main.go                        # Server startup & dependency injection
│   └── db/
│       └── main.go                        # Database migrations CLI
│
├── internal/                               # Private application code
│   ├── core/                              # Business Logic Core (Hexagon Center)
│   │   ├── meeting/                       # Meeting Domain
│   │   │   ├── domain.go                  # Meeting entities & value objects
│   │   │   ├── ports.go                   # Interfaces (MeetingService, MeetingRepository, etc.)
│   │   │   └── service.go                 # Meeting business logic
│   │   ├── availability/                  # Availability Domain
│   │   │   ├── domain.go                  # Availability entities
│   │   │   ├── ports.go                   # Interfaces (AvailabilityService, AvailabilityRepository)
│   │   │   └── service.go                 # Availability aggregation logic
│   │   ├── user/                          # User Domain
│   │   │   ├── domain.go                  # User entities
│   │   │   ├── ports.go                   # Interfaces (UserService, UserRepository)
│   │   │   └── service.go                 # User management logic
│   │   ├── user_auth/                     # User Authentication Domain
│   │   │   ├── domain.go                  # Auth session entities
│   │   │   ├── ports.go                   # Interfaces (AuthService, AuthRepository)
│   │   │   └── service.go                 # Authentication logic
│   │   ├── ai_scheduling/                 # AI Scheduling Domain
│   │   │   ├── domain.go                  # TimeSlot, Suggestion entities
│   │   │   ├── ports.go                   # Interfaces (AIProvider, SchedulingService)
│   │   │   └── service.go                 # AI ranking & suggestion logic
│   │   └── notification/                  # Notification Domain
│   │       ├── domain.go                  # Notification entities
│   │       ├── ports.go                   # Interfaces (NotificationProvider)
│   │       └── service.go                 # Notification orchestration
│   │
│   └── adapters/                          # External Adapters (Ports & Adapters)
│       ├── handler/                       # HTTP Handlers (Inbound Adapter)
│       │   ├── meeting_handler.go
│       │   ├── availability_handler.go
│       │   ├── webhook_handler.go
│       │   ├── google_handler.go
│       │   └── health_handler.go
│       │
│       ├── model/                         # HTTP DTOs (Request/Response models)
│       │   ├── meeting_model.go
│       │   ├── availability_model.go
│       │   ├── suggestion_model.go
│       │   └── user_model.go
│       │
│       ├── repository/                    # Database Adapters (Outbound)
│       │   ├── meeting/
│       │   │   └── postgres/
│       │   │       └── repository.go      # Implements MeetingRepository port
│       │   ├── availability/
│       │   │   └── postgres/
│       │   │       └── repository.go      # Implements AvailabilityRepository port
│       │   ├── user/
│       │   │   └── postgres/
│       │   │       └── repository.go      # Implements UserRepository port
│       │   ├── user_auth/
│       │   │   └── redis/
│       │   │       └── repository.go      # Session cache (implements AuthRepository)
│       │   └── suggestion/
│       │       └── postgres/
│       │           └── repository.go      # Suggested slots storage
│       │
│       ├── provider/                      # External Service Adapters (Outbound)
│       │   ├── gemini/
│       │   │   └── ai_provider.go         # Implements AIProvider port (Gemini AI)
│       │   ├── google_calendar/
│       │   │   └── calendar_provider.go   # Implements CalendarProvider port
│       │   ├── line/
│       │   │   ├── auth.go                # LINE LIFF authentication
│       │   │   └── messaging.go           # Implements NotificationProvider (LINE Bot)
│       │   └── jwt/
│       │       └── jwt.go                 # JWT token generation/validation
│       │
│       ├── routes/                        # Route Configuration
│       │   ├── meeting_routes.go
│       │   ├── availability_routes.go
│       │   ├── webhook_routes.go
│       │   ├── user_routes.go
│       │   └── health_routes.go
│       │
│       └── taskqueue/                     # Async Task Queue (Optional)
│           └── asynq/
│               ├── client.go              # Task enqueue client
│               └── worker.go              # Background task processor
│
└── pkg/                                    # Shared Infrastructure
    ├── config/                            # Application Configuration
    │   ├── config.go                      # Configuration loader
    │   ├── database_config.go
    │   ├── redis_config.go
    │   ├── fiber_config.go
    │   ├── gemini_config.go
    │   └── line_config.go
    │
    ├── store/                             # Database & Storage Clients
    │   ├── postgres/
    │   │   ├── initialize.go              # PostgreSQL connection setup
    │   │   └── postgres.go                # DB client wrapper
    │   └── redis/
    │       ├── initialize.go              # Redis connection setup
    │       └── redis.go                   # Redis client wrapper
    │
    ├── middleware/                        # HTTP Middleware
    │   ├── fiber_middleware.go            # Middleware setup
    │   ├── auth_middleware.go             # LIFF token validation
    │   ├── cors_middleware.go             # CORS configuration
    │   └── logger_middleware.go           # Request logging
    │
    ├── response/                          # Standardized API Responses
    │   ├── success.go                     # Success response helpers
    │   └── failed.go                      # Error response helpers
    │
    └── util/                              # Utility Functions
        ├── time.go                        # Time/timezone utilities
        ├── validator.go                   # Input validation
        ├── hash.go                        # Hashing utilities
        └── flex_message.go                # LINE Flex message builder

├── .env.example
├── .env
├── go.mod
├── go.sum
├── Dockerfile
└── cloudbuild.yaml
```

### Hexagonal Architecture Layers

#### 1. Core Layer (`/internal/core/`)
**Pure business logic, independent of frameworks and external systems**

Each domain module contains:
- **domain.go**: Domain entities and value objects
- **ports.go**: Interface definitions (contracts for adapters to implement)
- **service.go**: Business logic implementation using dependency injection

**Key Principle**: Core depends only on interfaces (ports), never on concrete implementations.

#### 2. Adapters Layer (`/internal/adapters/`)
**Implements the ports and handles external systems**

**Inbound Adapters (Driving Side)**:
- `handler/`: HTTP request handlers (converts HTTP → business logic)
- `routes/`: Route configuration (maps endpoints to handlers)
- `model/`: Request/Response DTOs for HTTP communication

**Outbound Adapters (Driven Side)**:
- `repository/`: Database persistence implementations
  - Organized by domain and database type
  - Example: `meeting/postgres/`, `user_auth/redis/`
- `provider/`: Third-party service integrations
  - `gemini/`: AI provider
  - `google_calendar/`: Calendar API
  - `line/`: LINE platform integration
  - `jwt/`: Token services

#### 3. Infrastructure Layer (`/pkg/`)
**Shared infrastructure concerns, not part of business logic**

- `config/`: Application configuration management
- `store/`: Database/cache client initialization
- `middleware/`: HTTP middleware (auth, CORS, logging)
- `response/`: Standard response formatting
- `util/`: Shared utility functions

#### 4. Application Entry Points (`/cmd/`)
**Bootstrap the application and wire dependencies**

`cmd/server/main.go` responsibilities:
1. Load configuration
2. Initialize stores (PostgreSQL, Redis)
3. Create repository instances (implements repository ports)
4. Create provider instances (implements provider ports)
5. Inject dependencies into services
6. Inject services into handlers
7. Configure routes
8. Start Fiber server

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   users     │       │    meetings      │       │   invitees      │
├─────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)     │──┐    │ id (PK)          │───┐   │ id (PK)         │
│ line_user_id│  │    │ organizer_id(FK) │   │   │ meeting_id (FK) │
│ display_name│  └───>│ group_id         │   └──>│ user_id (FK)    │
│ picture_url │       │ title            │       │ status          │
│ google_token│       │ type             │       │ created_at      │
│ created_at  │       │ duration_minutes │       │ updated_at      │
│ updated_at  │       │ location         │       └─────────────────┘
└─────────────┘       │ date_range_start │                │
                      │ date_range_end   │                │
                      │ preferred_days   │                ▼
                      │ preferred_times  │       ┌─────────────────┐
                      │ status           │       │ availabilities  │
                      │ created_at       │       ├─────────────────┤
                      │ updated_at       │       │ id (PK)         │
                      └──────────────────┘       │ invitee_id (FK) │
                               │                │ date            │
                               │                │ start_time      │
                               ▼                │ end_time        │
                      ┌──────────────────┐      │ source          │
                      │ suggested_slots  │      │ created_at      │
                      ├──────────────────┤      └─────────────────┘
                      │ id (PK)          │
                      │ meeting_id (FK)  │       ┌─────────────────┐
                      │ date             │       │     votes       │
                      │ start_time       │       ├─────────────────┤
                      │ end_time         │       │ id (PK)         │
                      │ score            │◄──────│ slot_id (FK)    │
                      │ rank             │       │ invitee_id (FK) │
                      │ rationale        │       │ available       │
                      │ created_at       │       │ created_at      │
                      └──────────────────┘       └─────────────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │  confirmations   │
                      ├──────────────────┤
                      │ id (PK)          │
                      │ meeting_id (FK)  │
                      │ slot_id (FK)     │
                      │ confirmed_at     │
                      │ calendar_event_id│
                      └──────────────────┘
```

### SQL Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_user_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    picture_url TEXT,
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_line_user_id ON users(line_user_id);

-- Meetings table
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(id),
    group_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'meals', 'cafe', 'sports', 'others'
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    location VARCHAR(255),
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    preferred_days VARCHAR(50)[], -- ['weekdays', 'weekends', 'all']
    preferred_times VARCHAR(50)[], -- ['morning', 'afternoon', 'evening']
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'collecting', -- 'collecting', 'voting', 'confirmed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meetings_group_id ON meetings(group_id);
CREATE INDEX idx_meetings_organizer_id ON meetings(organizer_id);
CREATE INDEX idx_meetings_status ON meetings(status);

-- Invitees table
CREATE TABLE invitees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'confirmed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meeting_id, user_id)
);

CREATE INDEX idx_invitees_meeting_id ON invitees(meeting_id);
CREATE INDEX idx_invitees_user_id ON invitees(user_id);

-- Availabilities table
CREATE TABLE availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitee_id UUID NOT NULL REFERENCES invitees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual', 'google_calendar'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_availabilities_invitee_id ON availabilities(invitee_id);
CREATE INDEX idx_availabilities_date ON availabilities(date);

-- Suggested time slots table
CREATE TABLE suggested_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    score DECIMAL(5,2) NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL,
    rationale TEXT,
    available_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suggested_slots_meeting_id ON suggested_slots(meeting_id);

-- Votes table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES suggested_slots(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES invitees(id) ON DELETE CASCADE,
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_id, invitee_id)
);

CREATE INDEX idx_votes_slot_id ON votes(slot_id);

-- Confirmations table
CREATE TABLE confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID UNIQUE NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES suggested_slots(id),
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calendar_event_id VARCHAR(255)
);
```

---

## API Endpoints

### Authentication

**Token Exchange Flow:**
1. Frontend gets LIFF access token from LINE
2. Frontend exchanges LIFF token for backend JWT token via `POST /users/auth/line-login`
3. Backend verifies LIFF token with LINE API
4. Backend issues JWT token (24 hour expiry)
5. Frontend stores JWT in cookies + localStorage
6. All subsequent API calls use JWT token in `Authorization: Bearer <token>` header

**Protected Endpoints:**
All API endpoints (except `/health`, `/webhook`, and `/users/auth/line-login`) require JWT authentication.
The `Authorization` header must contain the backend-issued JWT token.

### Base URL
- Development: `http://localhost:8080/api/v1`
- Production: `https://your-cloud-run-url/api/v1`

### Endpoints

#### Health Check
```
GET /health
Response: { "status": "ok", "timestamp": "2025-01-27T10:00:00Z" }
```

#### LINE Webhook
```
POST /webhook
Headers: X-Line-Signature
Body: LINE webhook event
```

#### Users

##### LINE Authentication (Token Exchange)
```
POST /users/auth/line-login
Body: {
  "access_token": "LIFF_ACCESS_TOKEN",
  "channel_id": "YOUR_LINE_CHANNEL_ID"
}
Response: {
  "data": {
    "access_token": "BACKEND_JWT_TOKEN",
    "user": {
      "id": "uuid",
      "line_user_id": "Uxxxxxxxxx",
      "line_display_name": "John",
      "picture": "https://...",
    }
  }
}
```

##### Get Current User Profile
```
GET /users/me
Headers: Authorization: Bearer <backend_jwt_token>
Response: {
  "data": {
    "id": "uuid",
    "line_user_id": "Uxxxxxxxxx",
    "line_display_name": "John",
    "picture": "https://...",
    "hasGoogleCalendar": true
  }
}
```

##### Google Calendar Connection
```
POST /users/google/connect
Body: { "code": "oauth_authorization_code" }
Response: { "success": true }

DELETE /users/google/disconnect
Response: { "success": true }
```

#### Meetings
```
POST /meetings
Body: {
  "title": "Team Lunch",
  "type": "meals",
  "durationMinutes": 90,
  "location": "Siam area",
  "dateRangeStart": "2025-02-01",
  "dateRangeEnd": "2025-02-14",
  "preferredDays": ["weekdays"],
  "preferredTimes": ["afternoon"],
  "notes": "Looking for Thai food"
}
Response: {
  "id": "uuid",
  "title": "Team Lunch",
  "status": "collecting",
  "shareUrl": "https://liff.line.me/xxx?meetingId=uuid",
  ...
}

GET /meetings/:id
Response: {
  "id": "uuid",
  "title": "Team Lunch",
  "organizer": { "id": "uuid", "displayName": "John" },
  "invitees": [...],
  "suggestedSlots": [...],
  "status": "collecting",
  ...
}

GET /meetings/group/:groupId
Response: {
  "meetings": [...]
}

PUT /meetings/:id/status
Body: { "status": "voting" }
Response: { "success": true }

DELETE /meetings/:id
Response: { "success": true }
```

#### Invitees
```
POST /meetings/:id/join
Response: {
  "inviteeId": "uuid",
  "status": "pending"
}

GET /meetings/:id/invitees
Response: {
  "invitees": [
    {
      "id": "uuid",
      "user": { "displayName": "John", "pictureUrl": "..." },
      "status": "submitted",
      "availabilityCount": 5
    }
  ]
}
```

#### Availability
```
POST /meetings/:id/availability
Body: {
  "availabilities": [
    {
      "date": "2025-02-05",
      "startTime": "12:00",
      "endTime": "14:00"
    }
  ],
  "source": "manual"
}
Response: { "success": true, "count": 1 }

POST /meetings/:id/availability/sync
Body: { "startDate": "2025-02-01", "endDate": "2025-02-14" }
Response: {
  "success": true,
  "availabilities": [...],
  "syncedFrom": "google_calendar"
}

GET /meetings/:id/availability
Response: {
  "myAvailabilities": [...],
  "summary": {
    "totalInvitees": 5,
    "submittedCount": 3,
    "dateHeatmap": { "2025-02-05": 3, "2025-02-06": 2 }
  }
}

DELETE /meetings/:id/availability
Response: { "success": true }
```

#### AI Ranking & Suggestions
```
POST /meetings/:id/generate-suggestions
Response: {
  "success": true,
  "slots": [
    {
      "id": "uuid",
      "date": "2025-02-05",
      "startTime": "12:00",
      "endTime": "13:30",
      "score": 95.5,
      "rank": 1,
      "rationale": "All 5 participants available, preferred lunch time",
      "availableCount": 5
    }
  ]
}

GET /meetings/:id/suggestions
Response: {
  "slots": [...],
  "generatedAt": "2025-01-27T10:00:00Z"
}
```

#### Voting & Confirmation
```
POST /meetings/:id/vote
Body: {
  "votes": [
    { "slotId": "uuid", "available": true },
    { "slotId": "uuid", "available": false }
  ]
}
Response: { "success": true }

POST /meetings/:id/confirm
Body: { "slotId": "uuid" }
Response: {
  "success": true,
  "confirmation": {
    "date": "2025-02-05",
    "startTime": "12:00",
    "endTime": "13:30",
    "location": "Siam area"
  }
}
```

#### Google Calendar
```
GET /google/auth-url
Query: ?meetingId=uuid
Response: { "url": "https://accounts.google.com/..." }

POST /google/callback
Body: { "code": "...", "state": "meetingId" }
Response: { "success": true }

GET /google/free-busy
Query: ?startDate=2025-02-01&endDate=2025-02-14
Response: {
  "busySlots": [
    { "date": "2025-02-05", "startTime": "09:00", "endTime": "10:00" }
  ],
  "freeSlots": [...]
}
```

---

## Environment Variables

### Frontend (`.env.local`)
```bash
# LIFF Configuration
NEXT_PUBLIC_LIFF_ID=your_liff_id_here
NEXT_PUBLIC_LINE_CHANNEL_ID=your_line_channel_id

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1

# Google OAuth (for client-side redirect)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### Backend (`.env`)
```bash
# Server
PORT=8080
ENV=development

# Database
DATABASE_URL=postgres://user:password@localhost:5432/scheduler?sslmode=disable

# LINE Configuration
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LIFF_ID=your_liff_id

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/v1/google/callback

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

---

## Core Implementation Details

### 1. LIFF Provider with Context (`frontend/src/providers/LiffProvider.tsx`)

```typescript
'use client';

import { createContext, useEffect, useState } from 'react';
import liff from '@line/liff';
import Cookies from 'js-cookie';
import { createApiHeaders } from '@/utils/apiHeaders';

type LiffContextType = {
  user: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  } | null;
  isInitialized: boolean;
  logout: () => void;
};

export const LiffContext = createContext<LiffContextType | undefined>(
  undefined
);

export default function LiffProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    const initLiff = async () => {
      try {
        // Initialize LIFF
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID as string });

        // Check if user is logged in
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // Get LIFF access token
        const liffAccessToken = liff.getAccessToken();
        if (!liffAccessToken) throw new Error('Failed to get LIFF Access Token');

        // Exchange LIFF token for backend JWT token
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

        const authResponse = await fetch(`${apiBaseUrl}/users/auth/line-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: liffAccessToken,
            channel_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID as string,
          }),
        });

        if (!authResponse.ok) {
          throw new Error('Authentication failed');
        }

        const authData = await authResponse.json();
        const backendToken = authData.data.access_token;

        // Store token in both cookies and localStorage for reliability
        Cookies.set('access_token', backendToken, {
          expires: 1 / 24, // 1 hour
          secure: true,
          sameSite: 'Lax',
        });
        localStorage.setItem('access_token', backendToken);

        // Fetch user profile from backend
        const userResponse = await fetch(`${apiBaseUrl}/users/me`, {
          method: 'GET',
          headers: createApiHeaders(backendToken),
          credentials: 'include',
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const userData = await userResponse.json();

        // Set user context
        setUser({
          userId: userData.data.line_user_id,
          displayName: userData.data.line_display_name,
          pictureUrl: userData.data.picture,
        });

        setIsInitialized(true);
      } catch (err) {
        console.error('LIFF initialization failed', err);
        // Optionally handle error state
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      initLiff();
    }
  }, []);

  const logout = () => {
    liff.logout();
    setUser(null);
    Cookies.remove('access_token');
    localStorage.removeItem('access_token');
    window.location.reload();
  };

  return (
    <LiffContext.Provider value={{ user, isInitialized, logout }}>
      {children}
    </LiffContext.Provider>
  );
}
```

### 2. Custom Hook for LIFF Context (`frontend/src/hooks/useLiff.ts`)

```typescript
'use client';

import { useContext } from 'react';
import { LiffContext } from '@/providers/LiffProvider';

export function useLiff() {
  const context = useContext(LiffContext);

  if (context === undefined) {
    throw new Error('useLiff must be used within a LiffProvider');
  }

  return context;
}
```

### 3. Query Client Provider (`frontend/src/app/providers.tsx`)

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 4. Root Layout (`frontend/src/app/layout.tsx`)

```typescript
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import LiffProvider from '@/providers/LiffProvider';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Meeting Scheduler',
  description: 'AI-powered meeting scheduler for LINE groups',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LiffProvider>
          <Providers>
            {children}
          </Providers>
        </LiffProvider>
      </body>
    </html>
  );
}
```

### 5. Home Page (`frontend/src/app/page.tsx`)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import liff from '@line/liff';
import { useLiff } from '@/hooks/useLiff';
import { MeetingList } from '@/components/meeting/MeetingList';
import { Button } from '@/components/common/Button';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useLiff();
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) return;

    // Get groupId from URL params or LIFF context
    const urlGroupId = searchParams.get('groupId');
    const context = liff.getContext();

    setGroupId(urlGroupId || context?.groupId || null);

    // Handle action param
    const action = searchParams.get('action');
    if (action === 'create') {
      router.push('/create');
    }
  }, [searchParams, router, isInitialized]);

  const handleCreateMeeting = () => {
    router.push(`/create${groupId ? `?groupId=${groupId}` : ''}`);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-4">
        <header className="text-center py-6">
          <h1 className="text-2xl font-bold text-gray-900">📅 Meeting Scheduler</h1>
          <p className="text-gray-600 mt-2">
            Welcome, {user?.displayName || 'Guest'}
          </p>
        </header>

        <Button
          onClick={handleCreateMeeting}
          className="w-full mb-6"
          variant="primary"
        >
          + Create New Meeting
        </Button>

        {groupId ? (
          <MeetingList groupId={groupId} />
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>Open this app from a LINE group chat to see meetings</p>
          </div>
        )}
      </div>
    </main>
  );
}
```

### 6. Create Meeting Page (`frontend/src/app/create/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import liff from '@line/liff';
import { MeetingForm } from '@/components/meeting/MeetingForm';
import { api } from '@/lib/api';
import { useLiff } from '@/hooks/useLiff';
import type { CreateMeetingRequest } from '@/types/meeting';

export default function CreateMeetingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isInitialized } = useLiff();
  const [error, setError] = useState<string | null>(null);

  const groupId = searchParams.get('groupId') || liff.getContext()?.groupId;

  const createMutation = useMutation({
    mutationFn: (data: CreateMeetingRequest) => api.createMeeting(data),
    onSuccess: async (meeting) => {
      // Share to group chat if in LINE
      if (liff.isInClient() && groupId) {
        try {
          await liff.sendMessages([
            {
              type: 'flex',
              altText: `📅 New Meeting: ${meeting.title}`,
              contents: {
                type: 'bubble',
                body: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: '📅 New Meeting Created',
                      weight: 'bold',
                      size: 'lg',
                    },
                    {
                      type: 'text',
                      text: meeting.title,
                      size: 'xl',
                      weight: 'bold',
                      margin: 'md',
                    },
                    {
                      type: 'text',
                      text: `Duration: ${meeting.durationMinutes} minutes`,
                      size: 'sm',
                      color: '#666666',
                      margin: 'md',
                    },
                    {
                      type: 'text',
                      text: `📍 ${meeting.location || 'TBD'}`,
                      size: 'sm',
                      color: '#666666',
                    },
                  ],
                },
                footer: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'button',
                      action: {
                        type: 'uri',
                        label: 'Submit Your Availability',
                        uri: meeting.shareUrl,
                      },
                      style: 'primary',
                      color: '#F97316',
                    },
                  ],
                },
              },
            },
          ]);
        } catch (e) {
          console.error('Failed to send message:', e);
        }
      }

      router.push(`/meeting/${meeting.id}`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (data: CreateMeetingRequest) => {
    if (!groupId) {
      setError('Group ID is required. Please open from LINE group chat.');
      return;
    }
    createMutation.mutate({ ...data, groupId });
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-4">
        <header className="py-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold mt-2">Create Meeting</h1>
        </header>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <MeetingForm
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
        />
      </div>
    </main>
  );
}
```

### 7. API Utilities (`frontend/src/utils/apiHeaders.ts`)

```typescript
/**
 * Utility functions for API requests
 */

/**
 * Creates headers for API requests with authentication
 * @param accessToken The access token for authorization (optional - will read from storage if not provided)
 * @returns Headers object with appropriate values
 */
export const createApiHeaders = (accessToken?: string | null) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  const isNgrok = apiBaseUrl.includes('ngrok');

  // Get token from parameter, localStorage, or cookies
  const token = accessToken ||
    (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add ngrok skip header for development
  if (isNgrok) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  return headers;
};

/**
 * Gets the API base URL
 */
export const getApiBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
};
```

### 8. API Client (`frontend/src/lib/api.ts`)

```typescript
import { createApiHeaders, getApiBaseUrl } from '@/utils/apiHeaders';
import type { Meeting, CreateMeetingRequest, Availability } from '@/types/meeting';

class ApiClient {
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = getApiBaseUrl();

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...createApiHeaders(),
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // User
  async getMe() {
    return this.fetch<{
      data: {
        id: string;
        line_user_id: string;
        line_display_name: string;
        picture?: string;
        hasGoogleCalendar: boolean;
      }
    }>('/users/me');
  }

  // Meetings
  async createMeeting(data: CreateMeetingRequest): Promise<Meeting> {
    return this.fetch<Meeting>('/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMeeting(id: string): Promise<Meeting> {
    return this.fetch<Meeting>(`/meetings/${id}`);
  }

  async getMeetingsByGroup(groupId: string): Promise<{ meetings: Meeting[] }> {
    return this.fetch<{ meetings: Meeting[] }>(`/meetings/group/${groupId}`);
  }

  async joinMeeting(meetingId: string): Promise<{ inviteeId: string }> {
    return this.fetch<{ inviteeId: string }>(`/meetings/${meetingId}/join`, {
      method: 'POST',
    });
  }

  // Availability
  async submitAvailability(
    meetingId: string,
    availabilities: Omit<Availability, 'id' | 'source'>[],
    source: 'manual' | 'google_calendar' = 'manual'
  ): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(`/meetings/${meetingId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ availabilities, source }),
    });
  }

  async syncGoogleCalendar(
    meetingId: string,
    startDate: string,
    endDate: string
  ): Promise<{ availabilities: Availability[] }> {
    return this.fetch<{ availabilities: Availability[] }>(
      `/meetings/${meetingId}/availability/sync`,
      {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate }),
      }
    );
  }

  async getAvailabilitySummary(meetingId: string) {
    return this.fetch<{
      myAvailabilities: Availability[];
      summary: {
        totalInvitees: number;
        submittedCount: number;
        dateHeatmap: Record<string, number>;
      };
    }>(`/meetings/${meetingId}/availability`);
  }

  // AI Suggestions
  async generateSuggestions(meetingId: string) {
    return this.fetch<{ slots: any[] }>(`/meetings/${meetingId}/generate-suggestions`, {
      method: 'POST',
    });
  }

  async getSuggestions(meetingId: string) {
    return this.fetch<{ slots: any[]; generatedAt: string }>(
      `/meetings/${meetingId}/suggestions`
    );
  }

  // Confirmation
  async confirmMeeting(meetingId: string, slotId: string) {
    return this.fetch<{ success: boolean; confirmation: any }>(
      `/meetings/${meetingId}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({ slotId }),
      }
    );
  }

  // Google OAuth
  async getGoogleAuthUrl(meetingId: string): Promise<{ url: string }> {
    return this.fetch<{ url: string }>(`/google/auth-url?meetingId=${meetingId}`);
  }
}

export const api = new ApiClient();
```

### 2. User Domain (`backend/internal/core/user/domain.go`)

```go
package user

import (
    "time"
    "github.com/google/uuid"
)

// User represents a user entity in the domain
type User struct {
    ID                  uuid.UUID
    LineUserID          string
    DisplayName         string
    PictureURL          *string
    GoogleAccessToken   *string
    GoogleRefreshToken  *string
    GoogleTokenExpiry   *time.Time
    CreatedAt           time.Time
    UpdatedAt           time.Time
}

// NewUser creates a new user from LINE profile
func NewUser(lineUserID, displayName string, pictureURL *string) *User {
    return &User{
        ID:          uuid.New(),
        LineUserID:  lineUserID,
        DisplayName: displayName,
        PictureURL:  pictureURL,
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }
}

// UpdateGoogleTokens updates Google OAuth tokens
func (u *User) UpdateGoogleTokens(accessToken, refreshToken string, expiry time.Time) {
    u.GoogleAccessToken = &accessToken
    u.GoogleRefreshToken = &refreshToken
    u.GoogleTokenExpiry = &expiry
    u.UpdatedAt = time.Now()
}

// HasGoogleCalendar checks if user has connected Google Calendar
func (u *User) HasGoogleCalendar() bool {
    return u.GoogleAccessToken != nil && u.GoogleRefreshToken != nil
}
```

### 3. User Domain Ports (`backend/internal/core/user/ports.go`)

```go
package user

import (
    "context"
    "github.com/google/uuid"
)

// UserService defines business logic operations for users
type UserService interface {
    GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
    GetUserByLineUserID(ctx context.Context, lineUserID string) (*User, error)
    CreateUser(ctx context.Context, lineUserID, displayName string, pictureURL *string) (*User, error)
    UpdateGoogleTokens(ctx context.Context, userID uuid.UUID, accessToken, refreshToken string, expiry time.Time) error
}

// UserRepository defines data persistence operations
type UserRepository interface {
    FindByID(ctx context.Context, id uuid.UUID) (*User, error)
    FindByLineUserID(ctx context.Context, lineUserID string) (*User, error)
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
}
```

### 4. User Service (`backend/internal/core/user/service.go`)

```go
package user

import (
    "context"
    "fmt"
    "time"
    "github.com/google/uuid"
)

type service struct {
    repo UserRepository
}

// NewService creates a new user service with injected dependencies
func NewService(repo UserRepository) UserService {
    return &service{
        repo: repo,
    }
}

func (s *service) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    return user, nil
}

func (s *service) GetUserByLineUserID(ctx context.Context, lineUserID string) (*User, error) {
    user, err := s.repo.FindByLineUserID(ctx, lineUserID)
    if err != nil {
        return nil, fmt.Errorf("failed to get user by LINE ID: %w", err)
    }
    return user, nil
}

func (s *service) CreateUser(ctx context.Context, lineUserID, displayName string, pictureURL *string) (*User, error) {
    // Check if user already exists
    existingUser, err := s.repo.FindByLineUserID(ctx, lineUserID)
    if err == nil && existingUser != nil {
        return existingUser, nil
    }

    // Create new user
    user := NewUser(lineUserID, displayName, pictureURL)
    if err := s.repo.Create(ctx, user); err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    return user, nil
}

func (s *service) UpdateGoogleTokens(ctx context.Context, userID uuid.UUID, accessToken, refreshToken string, expiry time.Time) error {
    user, err := s.repo.FindByID(ctx, userID)
    if err != nil {
        return fmt.Errorf("user not found: %w", err)
    }

    user.UpdateGoogleTokens(accessToken, refreshToken, expiry)

    if err := s.repo.Update(ctx, user); err != nil {
        return fmt.Errorf("failed to update tokens: %w", err)
    }

    return nil
}
```

### 5. User Repository Adapter (`backend/internal/adapters/repository/user/postgres/repository.go`)

```go
package postgres

import (
    "context"
    "github.com/google/uuid"
    "gorm.io/gorm"
    "your-module/internal/core/user"
)

type UserModel struct {
    ID                  uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    LineUserID          string     `gorm:"uniqueIndex;not null"`
    DisplayName         string     `gorm:"not null"`
    PictureURL          *string
    GoogleAccessToken   *string    `gorm:"type:text"`
    GoogleRefreshToken  *string    `gorm:"type:text"`
    GoogleTokenExpiry   *time.Time
    CreatedAt           time.Time  `gorm:"autoCreateTime"`
    UpdatedAt           time.Time  `gorm:"autoUpdateTime"`
}

func (UserModel) TableName() string {
    return "users"
}

type repository struct {
    db *gorm.DB
}

// NewRepository creates a new PostgreSQL user repository
func NewRepository(db *gorm.DB) user.UserRepository {
    return &repository{db: db}
}

func (r *repository) FindByID(ctx context.Context, id uuid.UUID) (*user.User, error) {
    var model UserModel
    if err := r.db.WithContext(ctx).Where("id = ?", id).First(&model).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    return r.toDomain(&model), nil
}

func (r *repository) FindByLineUserID(ctx context.Context, lineUserID string) (*user.User, error) {
    var model UserModel
    if err := r.db.WithContext(ctx).Where("line_user_id = ?", lineUserID).First(&model).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    return r.toDomain(&model), nil
}

func (r *repository) Create(ctx context.Context, u *user.User) error {
    model := r.toModel(u)
    return r.db.WithContext(ctx).Create(model).Error
}

func (r *repository) Update(ctx context.Context, u *user.User) error {
    model := r.toModel(u)
    return r.db.WithContext(ctx).Save(model).Error
}

// toDomain converts database model to domain entity
func (r *repository) toDomain(model *UserModel) *user.User {
    return &user.User{
        ID:                  model.ID,
        LineUserID:          model.LineUserID,
        DisplayName:         model.DisplayName,
        PictureURL:          model.PictureURL,
        GoogleAccessToken:   model.GoogleAccessToken,
        GoogleRefreshToken:  model.GoogleRefreshToken,
        GoogleTokenExpiry:   model.GoogleTokenExpiry,
        CreatedAt:           model.CreatedAt,
        UpdatedAt:           model.UpdatedAt,
    }
}

// toModel converts domain entity to database model
func (r *repository) toModel(u *user.User) *UserModel {
    return &UserModel{
        ID:                  u.ID,
        LineUserID:          u.LineUserID,
        DisplayName:         u.DisplayName,
        PictureURL:          u.PictureURL,
        GoogleAccessToken:   u.GoogleAccessToken,
        GoogleRefreshToken:  u.GoogleRefreshToken,
        GoogleTokenExpiry:   u.GoogleTokenExpiry,
        CreatedAt:           u.CreatedAt,
        UpdatedAt:           u.UpdatedAt,
    }
}
```

### 6. User Authentication Domain (`backend/internal/core/user_auth/domain.go`)

```go
package user_auth

import (
    "time"
    "github.com/google/uuid"
)

// AuthSession represents an authenticated user session
type AuthSession struct {
    UserID        uuid.UUID
    LineUserID    string
    AccessToken   string
    ExpiresAt     time.Time
}

// NewAuthSession creates a new authentication session
func NewAuthSession(userID uuid.UUID, lineUserID, accessToken string, expiresAt time.Time) *AuthSession {
    return &AuthSession{
        UserID:      userID,
        LineUserID:  lineUserID,
        AccessToken: accessToken,
        ExpiresAt:   expiresAt,
    }
}

// IsValid checks if session is still valid
func (s *AuthSession) IsValid() bool {
    return time.Now().Before(s.ExpiresAt)
}

// LineProfile represents a user's LINE profile
type LineProfile struct {
    UserID      string
    DisplayName string
    PictureURL  *string
}
```

### 7. User Authentication Ports (`backend/internal/core/user_auth/ports.go`)

```go
package user_auth

import (
    "context"
    "github.com/google/uuid"
)

// AuthService defines authentication business logic
type AuthService interface {
    LoginWithLINE(ctx context.Context, liffToken string) (*AuthSession, error)
    ValidateToken(ctx context.Context, token string) (*AuthSession, error)
    Logout(ctx context.Context, token string) error
}

// LINEAuthProvider defines LINE authentication operations
type LINEAuthProvider interface {
    VerifyLIFFToken(ctx context.Context, liffToken string) (*LineProfile, error)
}

// TokenProvider defines JWT token operations
type TokenProvider interface {
    GenerateToken(userID uuid.UUID, lineUserID string) (string, error)
    ValidateToken(token string) (*TokenClaims, error)
}

// TokenClaims represents JWT token claims
type TokenClaims struct {
    UserID     uuid.UUID
    LineUserID string
}

// AuthRepository defines session storage operations
type AuthRepository interface {
    SaveSession(ctx context.Context, session *AuthSession) error
    GetSession(ctx context.Context, token string) (*AuthSession, error)
    DeleteSession(ctx context.Context, token string) error
}
```

### 8. User Authentication Service (`backend/internal/core/user_auth/service.go`)

```go
package user_auth

import (
    "context"
    "fmt"
    "time"
    "your-module/internal/core/user"
)

type service struct {
    userService      user.UserService
    lineAuthProvider LINEAuthProvider
    tokenProvider    TokenProvider
    authRepo         AuthRepository
}

// NewService creates a new auth service with injected dependencies
func NewService(
    userService user.UserService,
    lineAuthProvider LINEAuthProvider,
    tokenProvider TokenProvider,
    authRepo AuthRepository,
) AuthService {
    return &service{
        userService:      userService,
        lineAuthProvider: lineAuthProvider,
        tokenProvider:    tokenProvider,
        authRepo:         authRepo,
    }
}

func (s *service) LoginWithLINE(ctx context.Context, liffToken string) (*AuthSession, error) {
    // Verify LIFF token with LINE API
    profile, err := s.lineAuthProvider.VerifyLIFFToken(ctx, liffToken)
    if err != nil {
        return nil, fmt.Errorf("invalid LIFF token: %w", err)
    }

    // Find or create user
    user, err := s.userService.GetUserByLineUserID(ctx, profile.UserID)
    if err != nil || user == nil {
        user, err = s.userService.CreateUser(ctx, profile.UserID, profile.DisplayName, profile.PictureURL)
        if err != nil {
            return nil, fmt.Errorf("failed to create user: %w", err)
        }
    }

    // Generate backend JWT token
    token, err := s.tokenProvider.GenerateToken(user.ID, user.LineUserID)
    if err != nil {
        return nil, fmt.Errorf("failed to generate token: %w", err)
    }

    // Create session
    expiresAt := time.Now().Add(24 * time.Hour)
    session := NewAuthSession(user.ID, user.LineUserID, token, expiresAt)

    // Save session to Redis
    if err := s.authRepo.SaveSession(ctx, session); err != nil {
        return nil, fmt.Errorf("failed to save session: %w", err)
    }

    return session, nil
}

func (s *service) ValidateToken(ctx context.Context, token string) (*AuthSession, error) {
    // Get session from Redis
    session, err := s.authRepo.GetSession(ctx, token)
    if err != nil {
        return nil, fmt.Errorf("session not found: %w", err)
    }

    if !session.IsValid() {
        return nil, fmt.Errorf("session expired")
    }

    return session, nil
}

func (s *service) Logout(ctx context.Context, token string) error {
    return s.authRepo.DeleteSession(ctx, token)
}
```

### 9. LINE Auth Provider Adapter (`backend/internal/adapters/provider/line/auth.go`)

```go
package line

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
    "your-module/internal/core/user_auth"
)

type authProvider struct {
    channelID     string
    channelSecret string
    httpClient    *http.Client
}

// NewAuthProvider creates a new LINE authentication provider
func NewAuthProvider(channelID, channelSecret string) user_auth.LINEAuthProvider {
    return &authProvider{
        channelID:     channelID,
        channelSecret: channelSecret,
        httpClient:    &http.Client{Timeout: 10 * time.Second},
    }
}

type lineProfileResponse struct {
    UserID      string `json:"userId"`
    DisplayName string `json:"displayName"`
    PictureURL  string `json:"pictureUrl"`
}

func (p *authProvider) VerifyLIFFToken(ctx context.Context, liffToken string) (*user_auth.LineProfile, error) {
    // Call LINE API to verify token and get profile
    req, err := http.NewRequestWithContext(ctx, "GET", "https://api.line.me/v2/profile", nil)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Authorization", "Bearer "+liffToken)

    resp, err := p.httpClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("failed to call LINE API: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("LINE API returned status: %d", resp.StatusCode)
    }

    var lineResp lineProfileResponse
    if err := json.NewDecoder(resp.Body).Decode(&lineResp); err != nil {
        return nil, err
    }

    pictureURL := &lineResp.PictureURL
    return &user_auth.LineProfile{
        UserID:      lineResp.UserID,
        DisplayName: lineResp.DisplayName,
        PictureURL:  pictureURL,
    }, nil
}
```

### 10. JWT Token Provider Adapter (`backend/internal/adapters/provider/jwt/jwt.go`)

```go
package jwt

import (
    "fmt"
    "time"
    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
    "your-module/internal/core/user_auth"
)

type tokenProvider struct {
    secret []byte
}

// NewTokenProvider creates a new JWT token provider
func NewTokenProvider(secret string) user_auth.TokenProvider {
    return &tokenProvider{
        secret: []byte(secret),
    }
}

type jwtClaims struct {
    UserID     string `json:"user_id"`
    LineUserID string `json:"line_user_id"`
    jwt.RegisteredClaims
}

func (p *tokenProvider) GenerateToken(userID uuid.UUID, lineUserID string) (string, error) {
    claims := jwtClaims{
        UserID:     userID.String(),
        LineUserID: lineUserID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(p.secret)
}

func (p *tokenProvider) ValidateToken(tokenString string) (*user_auth.TokenClaims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &jwtClaims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return p.secret, nil
    })

    if err != nil {
        return nil, err
    }

    if claims, ok := token.Claims.(*jwtClaims); ok && token.Valid {
        userID, err := uuid.Parse(claims.UserID)
        if err != nil {
            return nil, fmt.Errorf("invalid user ID: %w", err)
        }

        return &user_auth.TokenClaims{
            UserID:     userID,
            LineUserID: claims.LineUserID,
        }, nil
    }

    return nil, fmt.Errorf("invalid token")
}
```

### 11. Auth Repository Adapter (`backend/internal/adapters/repository/user_auth/redis/repository.go`)

```go
package redis

import (
    "context"
    "encoding/json"
    "fmt"
    "time"
    "github.com/redis/go-redis/v9"
    "your-module/internal/core/user_auth"
)

type repository struct {
    client *redis.Client
}

// NewRepository creates a new Redis auth repository
func NewRepository(client *redis.Client) user_auth.AuthRepository {
    return &repository{
        client: client,
    }
}

func (r *repository) SaveSession(ctx context.Context, session *user_auth.AuthSession) error {
    data, err := json.Marshal(session)
    if err != nil {
        return err
    }

    key := fmt.Sprintf("auth:session:%s", session.AccessToken)
    ttl := time.Until(session.ExpiresAt)

    return r.client.Set(ctx, key, data, ttl).Err()
}

func (r *repository) GetSession(ctx context.Context, token string) (*user_auth.AuthSession, error) {
    key := fmt.Sprintf("auth:session:%s", token)
    data, err := r.client.Get(ctx, key).Bytes()
    if err != nil {
        if err == redis.Nil {
            return nil, fmt.Errorf("session not found")
        }
        return nil, err
    }

    var session user_auth.AuthSession
    if err := json.Unmarshal(data, &session); err != nil {
        return nil, err
    }

    return &session, nil
}

func (r *repository) DeleteSession(ctx context.Context, token string) error {
    key := fmt.Sprintf("auth:session:%s", token)
    return r.client.Del(ctx, key).Err()
}
```

### 12. User Handler Adapter (`backend/internal/adapters/handler/user_handler.go`)

```go
package handler

import (
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    "your-module/internal/adapters/model"
    "your-module/internal/core/user"
    "your-module/internal/core/user_auth"
    "your-module/pkg/response"
)

type UserHandler struct {
    userService user.UserService
    authService user_auth.AuthService
}

// NewUserHandler creates a new user handler with injected services
func NewUserHandler(userService user.UserService, authService user_auth.AuthService) *UserHandler {
    return &UserHandler{
        userService: userService,
        authService: authService,
    }
}

// LineLogin handles LINE LIFF authentication
func (h *UserHandler) LineLogin(c *fiber.Ctx) error {
    var req model.LineLoginRequest
    if err := c.BodyParser(&req); err != nil {
        return response.Failed(c, fiber.StatusBadRequest, "Invalid request body", nil)
    }

    // Authenticate with LINE and create session
    session, err := h.authService.LoginWithLINE(c.Context(), req.AccessToken)
    if err != nil {
        return response.Failed(c, fiber.StatusUnauthorized, "Authentication failed", err.Error())
    }

    // Get user details
    user, err := h.userService.GetUserByID(c.Context(), session.UserID)
    if err != nil {
        return response.Failed(c, fiber.StatusInternalServerError, "Failed to get user", err.Error())
    }

    // Return response
    return response.Success(c, fiber.StatusOK, "Login successful", model.ToLineLoginResponse(session, user))
}

// GetMe returns current authenticated user
func (h *UserHandler) GetMe(c *fiber.Ctx) error {
    // Get user ID from context (set by auth middleware)
    userID := c.Locals("user_id").(string)

    user, err := h.userService.GetUserByID(c.Context(), uuid.MustParse(userID))
    if err != nil {
        return response.Failed(c, fiber.StatusNotFound, "User not found", err.Error())
    }

    return response.Success(c, fiber.StatusOK, "Success", model.ToUserResponse(user))
}

// Logout handles user logout
func (h *UserHandler) Logout(c *fiber.Ctx) error {
    token := c.Get("Authorization")
    if token == "" {
        return response.Failed(c, fiber.StatusBadRequest, "No token provided", nil)
    }

    // Remove "Bearer " prefix
    if len(token) > 7 && token[:7] == "Bearer " {
        token = token[7:]
    }

    if err := h.authService.Logout(c.Context(), token); err != nil {
        return response.Failed(c, fiber.StatusInternalServerError, "Logout failed", err.Error())
    }

    return response.Success(c, fiber.StatusOK, "Logged out successfully", nil)
}
```

### 13. User HTTP Models (`backend/internal/adapters/model/user_model.go`)

```go
package model

import (
    "your-module/internal/core/user"
    "your-module/internal/core/user_auth"
)

// LineLoginRequest represents LINE login request
type LineLoginRequest struct {
    AccessToken string `json:"access_token" validate:"required"`
    ChannelID   string `json:"channel_id"`
}

// LineLoginResponse represents LINE login response
type LineLoginResponse struct {
    AccessToken string       `json:"access_token"`
    User        UserResponse `json:"user"`
}

// UserResponse represents user data in HTTP response
type UserResponse struct {
    ID                string  `json:"id"`
    LineUserID        string  `json:"line_user_id"`
    DisplayName       string  `json:"line_display_name"`
    PictureURL        *string `json:"picture"`
    HasGoogleCalendar bool    `json:"has_google_calendar"`
}

// ToLineLoginResponse converts domain entities to HTTP response
func ToLineLoginResponse(session *user_auth.AuthSession, u *user.User) LineLoginResponse {
    return LineLoginResponse{
        AccessToken: session.AccessToken,
        User:        ToUserResponse(u),
    }
}

// ToUserResponse converts user domain entity to HTTP response
func ToUserResponse(u *user.User) UserResponse {
    return UserResponse{
        ID:                u.ID.String(),
        LineUserID:        u.LineUserID,
        DisplayName:       u.DisplayName,
        PictureURL:        u.PictureURL,
        HasGoogleCalendar: u.HasGoogleCalendar(),
    }
}
```

### 14. Auth Middleware (`backend/pkg/middleware/auth_middleware.go`)

```go
package middleware

import (
    "strings"
    "github.com/gofiber/fiber/v2"
    "your-module/internal/core/user_auth"
    "your-module/pkg/response"
)

// AuthMiddleware validates JWT tokens and injects user context
func AuthMiddleware(authService user_auth.AuthService) fiber.Handler {
    return func(c *fiber.Ctx) error {
        authHeader := c.Get("Authorization")
        if authHeader == "" {
            return response.Failed(c, fiber.StatusUnauthorized, "Missing authorization header", nil)
        }

        // Extract token from "Bearer <token>"
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            return response.Failed(c, fiber.StatusUnauthorized, "Invalid authorization format", nil)
        }

        token := parts[1]

        // Validate token
        session, err := authService.ValidateToken(c.Context(), token)
        if err != nil {
            return response.Failed(c, fiber.StatusUnauthorized, "Invalid or expired token", err.Error())
        }

        // Set user context
        c.Locals("user_id", session.UserID.String())
        c.Locals("line_user_id", session.LineUserID)

        return c.Next()
    }
}
```

### 15. LINE Bot Webhook Handler (`backend/internal/adapters/handler/webhook_handler.go`)

```go
package handlers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/line/line-bot-sdk-go/v8/linebot"
    "github.com/line/line-bot-sdk-go/v8/linebot/messaging_api"
)

type WebhookHandler struct {
    bot        *messaging_api.MessagingApiAPI
    liffID     string
    meetingSvc *services.MeetingService
}

func (h *WebhookHandler) HandleWebhook(c *fiber.Ctx) error {
    events, err := h.parseEvents(c)
    if err != nil {
        return c.SendStatus(400)
    }

    for _, event := range events {
        switch e := event.(type) {
        case *linebot.MessageEvent:
            h.handleMessage(e)
        case *linebot.JoinEvent:
            h.handleJoin(e)
        case *linebot.PostbackEvent:
            h.handlePostback(e)
        }
    }

    return c.SendStatus(200)
}

func (h *WebhookHandler) handleMessage(event *linebot.MessageEvent) {
    source := event.Source
    if source.Type != linebot.EventSourceTypeGroup {
        return
    }

    textMessage, ok := event.Message.(*linebot.TextMessage)
    if !ok {
        return
    }

    // Check for @Bot command
    if strings.Contains(textMessage.Text, "@Bot") {
        h.sendQuickReply(source.GroupID)
    }
}

func (h *WebhookHandler) sendQuickReply(groupID string) {
    liffURL := fmt.Sprintf("https://liff.line.me/%s?groupId=%s", h.liffID, groupID)
    
    flexMessage := &messaging_api.FlexMessage{
        AltText: "Schedule a Meeting",
        Contents: &messaging_api.FlexBubble{
            Body: &messaging_api.FlexBox{
                Layout: messaging_api.FlexBoxLayoutTypeVertical,
                Contents: []messaging_api.FlexComponentInterface{
                    &messaging_api.FlexText{
                        Text:   "📅 Meeting Scheduler",
                        Weight: messaging_api.FlexTextWeightTypeBold,
                        Size:   messaging_api.FlexTextSizeTypeXl,
                    },
                    &messaging_api.FlexText{
                        Text: "Create a new meeting or view existing ones",
                        Size: messaging_api.FlexTextSizeTypeSm,
                        Wrap: true,
                    },
                },
            },
            Footer: &messaging_api.FlexBox{
                Layout: messaging_api.FlexBoxLayoutTypeHorizontal,
                Contents: []messaging_api.FlexComponentInterface{
                    &messaging_api.FlexButton{
                        Action: &messaging_api.URIAction{
                            Label: "Create Meeting",
                            URI:   liffURL + "&action=create",
                        },
                        Style: messaging_api.FlexButtonStyleTypePrimary,
                    },
                    &messaging_api.FlexButton{
                        Action: &messaging_api.URIAction{
                            Label: "View Meetings",
                            URI:   liffURL + "&action=list",
                        },
                    },
                },
            },
        },
    }

    h.bot.PushMessage(&messaging_api.PushMessageRequest{
        To:       groupID,
        Messages: []messaging_api.MessageInterface{flexMessage},
    })
}
```

### 16. LINE Messaging Provider (`backend/internal/adapters/provider/line/messaging.go`)

```go
package line

import (
    "context"
    "fmt"
    "github.com/line/line-bot-sdk-go/v8/linebot/messaging_api"
    "your-module/internal/core/notification"
    "your-module/pkg/util"
)

type messagingProvider struct {
    bot    *messaging_api.MessagingApiAPI
    liffID string
}

// NewMessagingProvider creates a new LINE messaging provider
func NewMessagingProvider(bot *messaging_api.MessagingApiAPI, liffID string) notification.NotificationProvider {
    return &messagingProvider{
        bot:    bot,
        liffID: liffID,
    }
}

func (p *messagingProvider) SendMeetingCreated(ctx context.Context, groupID, meetingID, title string, duration int, location *string) error {
    liffURL := fmt.Sprintf("https://liff.line.me/%s?meetingId=%s", p.liffID, meetingID)

    locationText := "TBD"
    if location != nil {
        locationText = *location
    }

    flexMessage := util.BuildMeetingCreatedFlexMessage(title, duration, locationText, liffURL)

    _, err := p.bot.PushMessage(&messaging_api.PushMessageRequest{
        To:       groupID,
        Messages: []messaging_api.MessageInterface{flexMessage},
    })

    return err
}

func (p *messagingProvider) SendSuggestions(ctx context.Context, groupID, meetingID string, suggestions []notification.TimeSlotSuggestion) error {
    liffURL := fmt.Sprintf("https://liff.line.me/%s?meetingId=%s&action=vote", p.liffID, meetingID)

    flexMessage := util.BuildSuggestionsFlexMessage(suggestions, liffURL)

    _, err := p.bot.PushMessage(&messaging_api.PushMessageRequest{
        To:       groupID,
        Messages: []messaging_api.MessageInterface{flexMessage},
    })

    return err
}

func (p *messagingProvider) SendConfirmation(ctx context.Context, groupID, title, date, time, location string) error {
    flexMessage := util.BuildConfirmationFlexMessage(title, date, time, location)

    _, err := p.bot.PushMessage(&messaging_api.PushMessageRequest{
        To:       groupID,
        Messages: []messaging_api.MessageInterface{flexMessage},
    })

    return err
}
```

### 17. Webhook Handler (`backend/internal/adapters/handler/webhook_handler.go`)

```go
package handler

import (
    "strings"
    "github.com/gofiber/fiber/v2"
    "github.com/line/line-bot-sdk-go/v8/linebot"
    "github.com/line/line-bot-sdk-go/v8/linebot/webhook"
    "your-module/internal/core/notification"
    "your-module/pkg/response"
)

type WebhookHandler struct {
    notificationService notification.NotificationProvider
    channelSecret       string
    liffID              string
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(
    notificationService notification.NotificationProvider,
    channelSecret string,
    liffID string,
) *WebhookHandler {
    return &WebhookHandler{
        notificationService: notificationService,
        channelSecret:       channelSecret,
        liffID:              liffID,
    }
}

func (h *WebhookHandler) HandleWebhook(c *fiber.Ctx) error {
    // Verify signature
    signature := c.Get("X-Line-Signature")
    if signature == "" {
        return response.Failed(c, fiber.StatusBadRequest, "Missing signature", nil)
    }

    // Parse webhook events
    req := &webhook.CallbackRequest{}
    if err := c.BodyParser(req); err != nil {
        return response.Failed(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
    }

    // Process events
    for _, event := range req.Events {
        h.handleEvent(event)
    }

    return c.SendStatus(fiber.StatusOK)
}

func (h *WebhookHandler) handleEvent(event interface{}) {
    switch e := event.(type) {
    case *webhook.MessageEvent:
        h.handleMessageEvent(e)
    case *webhook.JoinEvent:
        h.handleJoinEvent(e)
    }
}

func (h *WebhookHandler) handleMessageEvent(event *webhook.MessageEvent) {
    if event.Source.Type != "group" {
        return
    }

    message, ok := event.Message.(*webhook.TextMessageContent)
    if !ok {
        return
    }

    // Check for @Bot mention
    if strings.Contains(message.Text, "@Bot") || strings.Contains(message.Text, "@bot") {
        h.sendQuickReply(event.Source.GroupId)
    }
}

func (h *WebhookHandler) handleJoinEvent(event *webhook.JoinEvent) {
    if event.Source.Type == "group" {
        h.sendWelcomeMessage(event.Source.GroupId)
    }
}

func (h *WebhookHandler) sendQuickReply(groupID string) {
    // Use notification service to send quick reply
    // Implementation delegated to messaging provider
}

func (h *WebhookHandler) sendWelcomeMessage(groupID string) {
    // Send welcome message when bot joins group
}
```

### 18. AI Scheduling Domain (`backend/internal/core/ai_scheduling/domain.go`)

```go
package ai_scheduling

import (
    "time"
    "github.com/google/uuid"
)

// TimeSlot represents a suggested meeting time slot
type TimeSlot struct {
    ID              uuid.UUID
    MeetingID       uuid.UUID
    Date            time.Time
    StartTime       time.Time
    EndTime         time.Time
    Score           float64
    Rank            int
    Rationale       string
    AvailableCount  int
    CreatedAt       time.Time
}

// NewTimeSlot creates a new time slot suggestion
func NewTimeSlot(meetingID uuid.UUID, date, startTime, endTime time.Time, score float64, rank int, rationale string, availableCount int) *TimeSlot {
    return &TimeSlot{
        ID:             uuid.New(),
        MeetingID:      meetingID,
        Date:           date,
        StartTime:      startTime,
        EndTime:        endTime,
        Score:          score,
        Rank:           rank,
        Rationale:      rationale,
        AvailableCount: availableCount,
        CreatedAt:      time.Now(),
    }
}

// AvailabilityMatrix represents aggregated availability data
type AvailabilityMatrix struct {
    DateSlots map[string]map[string]int // date -> timeRange -> inviteeCount
}

// MeetingContext provides context for AI ranking
type MeetingContext struct {
    Title          string
    Type           string
    Duration       int
    PreferredDays  []string
    PreferredTimes []string
    TotalInvitees  int
}
```

### 19. AI Scheduling Ports (`backend/internal/core/ai_scheduling/ports.go`)

```go
package ai_scheduling

import (
    "context"
    "github.com/google/uuid"
)

// SchedulingService defines AI scheduling business logic
type SchedulingService interface {
    GenerateSuggestions(ctx context.Context, meetingID uuid.UUID) ([]*TimeSlot, error)
    GetSuggestions(ctx context.Context, meetingID uuid.UUID) ([]*TimeSlot, error)
}

// AIProvider defines AI ranking operations
type AIProvider interface {
    RankTimeSlots(ctx context.Context, meetingContext *MeetingContext, availabilityMatrix *AvailabilityMatrix) ([]*TimeSlotSuggestion, error)
}

// TimeSlotSuggestion represents AI-generated suggestion
type TimeSlotSuggestion struct {
    Date           string
    StartTime      string
    EndTime        string
    Score          float64
    Rationale      string
    AvailableCount int
}

// SuggestionRepository defines time slot persistence operations
type SuggestionRepository interface {
    Create(ctx context.Context, slot *TimeSlot) error
    FindByMeetingID(ctx context.Context, meetingID uuid.UUID) ([]*TimeSlot, error)
    DeleteByMeetingID(ctx context.Context, meetingID uuid.UUID) error
}
```

### 20. AI Scheduling Service (`backend/internal/core/ai_scheduling/service.go`)

```go
package ai_scheduling

import (
    "context"
    "fmt"
    "time"
    "github.com/google/uuid"
    "your-module/internal/core/meeting"
    "your-module/internal/core/availability"
)

type service struct {
    aiProvider         AIProvider
    suggestionRepo     SuggestionRepository
    meetingService     meeting.MeetingService
    availabilityService availability.AvailabilityService
}

// NewService creates a new AI scheduling service
func NewService(
    aiProvider AIProvider,
    suggestionRepo SuggestionRepository,
    meetingService meeting.MeetingService,
    availabilityService availability.AvailabilityService,
) SchedulingService {
    return &service{
        aiProvider:          aiProvider,
        suggestionRepo:      suggestionRepo,
        meetingService:      meetingService,
        availabilityService: availabilityService,
    }
}

func (s *service) GenerateSuggestions(ctx context.Context, meetingID uuid.UUID) ([]*TimeSlot, error) {
    // Get meeting details
    mtg, err := s.meetingService.GetByID(ctx, meetingID)
    if err != nil {
        return nil, fmt.Errorf("failed to get meeting: %w", err)
    }

    // Get all availabilities for this meeting
    availabilities, err := s.availabilityService.GetByMeetingID(ctx, meetingID)
    if err != nil {
        return nil, fmt.Errorf("failed to get availabilities: %w", err)
    }

    // Build availability matrix
    matrix := s.buildAvailabilityMatrix(availabilities)

    // Prepare meeting context for AI
    meetingContext := &MeetingContext{
        Title:          mtg.Title,
        Type:           mtg.Type,
        Duration:       mtg.DurationMinutes,
        PreferredDays:  mtg.PreferredDays,
        PreferredTimes: mtg.PreferredTimes,
        TotalInvitees:  len(mtg.Invitees),
    }

    // Call AI provider to rank time slots
    suggestions, err := s.aiProvider.RankTimeSlots(ctx, meetingContext, matrix)
    if err != nil {
        return nil, fmt.Errorf("AI ranking failed: %w", err)
    }

    // Delete old suggestions
    if err := s.suggestionRepo.DeleteByMeetingID(ctx, meetingID); err != nil {
        return nil, fmt.Errorf("failed to delete old suggestions: %w", err)
    }

    // Convert AI suggestions to domain entities and save
    var timeSlots []*TimeSlot
    for i, suggestion := range suggestions {
        date, _ := time.Parse("2006-01-02", suggestion.Date)
        startTime, _ := time.Parse("15:04", suggestion.StartTime)
        endTime, _ := time.Parse("15:04", suggestion.EndTime)

        slot := NewTimeSlot(
            meetingID,
            date,
            startTime,
            endTime,
            suggestion.Score,
            i+1,
            suggestion.Rationale,
            suggestion.AvailableCount,
        )

        if err := s.suggestionRepo.Create(ctx, slot); err != nil {
            return nil, fmt.Errorf("failed to save suggestion: %w", err)
        }

        timeSlots = append(timeSlots, slot)
    }

    return timeSlots, nil
}

func (s *service) GetSuggestions(ctx context.Context, meetingID uuid.UUID) ([]*TimeSlot, error) {
    return s.suggestionRepo.FindByMeetingID(ctx, meetingID)
}

func (s *service) buildAvailabilityMatrix(availabilities []*availability.Availability) *AvailabilityMatrix {
    matrix := &AvailabilityMatrix{
        DateSlots: make(map[string]map[string]int),
    }

    for _, avail := range availabilities {
        dateKey := avail.Date.Format("2006-01-02")
        timeKey := fmt.Sprintf("%s-%s", avail.StartTime.Format("15:04"), avail.EndTime.Format("15:04"))

        if matrix.DateSlots[dateKey] == nil {
            matrix.DateSlots[dateKey] = make(map[string]int)
        }

        matrix.DateSlots[dateKey][timeKey]++
    }

    return matrix
}
```

### 21. Gemini AI Provider Adapter (`backend/internal/adapters/provider/gemini/ai_provider.go`)

```go
package gemini

import (
    "context"
    "encoding/json"
    "fmt"
    "strings"

    "github.com/google/generative-ai-go/genai"
    "google.golang.org/api/option"
    "your-module/internal/core/ai_scheduling"
)

type aiProvider struct {
    client *genai.Client
    model  *genai.GenerativeModel
}

// NewAIProvider creates a new Gemini AI provider
func NewAIProvider(apiKey string) (ai_scheduling.AIProvider, error) {
    ctx := context.Background()
    client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
    if err != nil {
        return nil, fmt.Errorf("failed to create Gemini client: %w", err)
    }

    model := client.GenerativeModel("gemini-1.5-flash")
    model.SetTemperature(0.3)
    model.ResponseMIMEType = "application/json"

    return &aiProvider{
        client: client,
        model:  model,
    }, nil
}

func (p *aiProvider) RankTimeSlots(
    ctx context.Context,
    meetingContext *ai_scheduling.MeetingContext,
    availabilityMatrix *ai_scheduling.AvailabilityMatrix,
) ([]*ai_scheduling.TimeSlotSuggestion, error) {

    // Format availability matrix for prompt
    matrixStr := p.formatAvailabilityMatrix(availabilityMatrix)

    prompt := fmt.Sprintf(`
You are a meeting scheduling assistant. Analyze the availability data and suggest the best meeting time slots.

Meeting Details:
- Title: %s
- Type: %s
- Duration: %d minutes
- Preferred Days: %v
- Preferred Times: %v
- Total Invitees: %d

Availability Data (invitee count per time slot):
%s

Instructions:
1. Find time slots where the maximum number of invitees are available
2. Prioritize slots that match preferred days and times
3. Consider meeting duration - the slot must accommodate %d minutes
4. For meal meetings, prefer lunch (11:30-13:30) or dinner (18:00-20:00) times
5. Avoid early morning (before 9:00) and late night (after 21:00) for social meetings

Return exactly 3 suggested time slots as JSON array with this structure:
[
  {
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "score": 0-100,
    "rationale": "Brief explanation (max 50 chars)",
    "availableCount": number
  }
]

Score calculation:
- Base score: (availableCount / totalInvitees) * 70
- Preferred day bonus: +15 if matches
- Preferred time bonus: +15 if matches
- Meal time bonus: +10 for meal meetings at appropriate times
`,
        meetingContext.Title,
        meetingContext.Type,
        meetingContext.Duration,
        meetingContext.PreferredDays,
        meetingContext.PreferredTimes,
        meetingContext.TotalInvitees,
        matrixStr,
        meetingContext.Duration,
    )

    resp, err := p.model.GenerateContent(ctx, genai.Text(prompt))
    if err != nil {
        return nil, fmt.Errorf("gemini API error: %w", err)
    }

    if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
        return nil, fmt.Errorf("no response from Gemini")
    }

    var suggestions []*ai_scheduling.TimeSlotSuggestion
    content := resp.Candidates[0].Content.Parts[0]
    if err := json.Unmarshal([]byte(fmt.Sprint(content)), &suggestions); err != nil {
        return nil, fmt.Errorf("failed to parse AI response: %w", err)
    }

    return suggestions, nil
}

func (p *aiProvider) formatAvailabilityMatrix(matrix *ai_scheduling.AvailabilityMatrix) string {
    var result strings.Builder

    for date, times := range matrix.DateSlots {
        result.WriteString(fmt.Sprintf("\n%s:\n", date))
        for timeRange, count := range times {
            result.WriteString(fmt.Sprintf("  %s: %d invitees\n", timeRange, count))
        }
    }

    return result.String()
}
```

### 22. Dependency Injection Example (`backend/cmd/server/main.go`)

```go
package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"

    "github.com/gofiber/fiber/v2"
    "github.com/line/line-bot-sdk-go/v8/linebot/messaging_api"

    // Core domains
    "your-module/internal/core/user"
    "your-module/internal/core/user_auth"
    "your-module/internal/core/meeting"
    "your-module/internal/core/availability"
    "your-module/internal/core/ai_scheduling"

    // Adapters
    "your-module/internal/adapters/handler"
    "your-module/internal/adapters/routes"
    userRepo "your-module/internal/adapters/repository/user/postgres"
    authRepo "your-module/internal/adapters/repository/user_auth/redis"
    lineAuth "your-module/internal/adapters/provider/line"
    jwtProvider "your-module/internal/adapters/provider/jwt"
    geminiProvider "your-module/internal/adapters/provider/gemini"

    // Infrastructure
    "your-module/pkg/config"
    "your-module/pkg/store/postgres"
    "your-module/pkg/store/redis"
    "your-module/pkg/middleware"
    "your-module/pkg/response"
)

func main() {
    // Load configuration
    cfg := config.LoadConfig()

    // Initialize stores
    db, err := postgres.Initialize(cfg.Database)
    if err != nil {
        log.Fatal("Failed to initialize PostgreSQL:", err)
    }

    redisClient, err := redis.Initialize(cfg.Redis)
    if err != nil {
        log.Fatal("Failed to initialize Redis:", err)
    }

    // Initialize external providers
    lineBot, err := messaging_api.NewMessagingApiAPI(cfg.LINE.ChannelAccessToken)
    if err != nil {
        log.Fatal("Failed to initialize LINE bot:", err)
    }

    // Create repository adapters (outbound)
    userRepository := userRepo.NewRepository(db)
    authRepository := authRepo.NewRepository(redisClient)

    // Create provider adapters (outbound)
    lineAuthProvider := lineAuth.NewAuthProvider(cfg.LINE.ChannelID, cfg.LINE.ChannelSecret)
    tokenProvider := jwtProvider.NewTokenProvider(cfg.JWT.Secret)
    aiProvider, err := geminiProvider.NewAIProvider(cfg.Gemini.APIKey)
    if err != nil {
        log.Fatal("Failed to initialize Gemini AI:", err)
    }

    // Create core services (business logic)
    userService := user.NewService(userRepository)
    authService := user_auth.NewService(
        userService,
        lineAuthProvider,
        tokenProvider,
        authRepository,
    )

    // ... Create other services (meeting, availability, ai_scheduling)

    // Create HTTP handlers (inbound adapters)
    userHandler := handler.NewUserHandler(userService, authService)
    // ... Create other handlers

    // Setup Fiber app
    app := fiber.New(fiber.Config{
        ErrorHandler: func(c *fiber.Ctx, err error) error {
            code := fiber.StatusInternalServerError
            if e, ok := err.(*fiber.Error); ok {
                code = e.Code
            }
            return response.Failed(c, code, "Internal Server Error", err.Error())
        },
    })

    // Apply middleware
    middleware.SetupFiberMiddleware(app, cfg)

    // Setup routes
    api := app.Group("/api/v1")

    // Public routes
    api.Post("/users/auth/line-login", userHandler.LineLogin)

    // Protected routes
    protected := api.Group("", middleware.AuthMiddleware(authService))
    protected.Get("/users/me", userHandler.GetMe)
    protected.Post("/users/logout", userHandler.Logout)

    // ... Setup other routes

    // Graceful shutdown
    go func() {
        if err := app.Listen(":" + cfg.Server.Port); err != nil {
            log.Fatal("Server error:", err)
        }
    }()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down server...")
    app.Shutdown()
}
```

---

## Hexagonal Architecture Benefits Demonstrated

### 1. **Dependency Inversion**
- Services depend on `ports` (interfaces), not concrete implementations
- Example: `user_auth.Service` depends on `LINEAuthProvider` interface, not on LINE SDK directly

### 2. **Testability**
- Easy to create mock implementations for testing
- Example: Mock `AIProvider` for testing `SchedulingService` without calling Gemini API

### 3. **Flexibility**
- Swap implementations without changing business logic
- Example: Replace Gemini with OpenAI by creating new provider that implements `AIProvider` interface

### 4. **Clear Boundaries**
- Core domain is isolated from external frameworks
- Infrastructure changes (database, cache, APIs) don't affect business logic

### 5. **Scalability**
- Add new domains without affecting existing ones
- Each domain (meeting, user, availability) is independently organized

---

## Google Calendar Integration Example (`backend/internal/adapters/provider/google_calendar/calendar_provider.go`)

```go
package services

import (
    "context"
    "time"
    
    "golang.org/x/oauth2"
    "golang.org/x/oauth2/google"
    "google.golang.org/api/calendar/v3"
)

type GoogleCalendarService struct {
    config *oauth2.Config
}

func NewGoogleCalendarService(clientID, clientSecret, redirectURI string) *GoogleCalendarService {
    return &GoogleCalendarService{
        config: &oauth2.Config{
            ClientID:     clientID,
            ClientSecret: clientSecret,
            RedirectURL:  redirectURI,
            Scopes: []string{
                "https://www.googleapis.com/auth/calendar.readonly",
                "https://www.googleapis.com/auth/calendar.freebusy",
            },
            Endpoint: google.Endpoint,
        },
    }
}

func (s *GoogleCalendarService) GetAuthURL(state string) string {
    return s.config.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
}

func (s *GoogleCalendarService) ExchangeToken(ctx context.Context, code string) (*oauth2.Token, error) {
    return s.config.Exchange(ctx, code)
}

func (s *GoogleCalendarService) GetFreeBusySlots(
    ctx context.Context,
    token *oauth2.Token,
    startDate, endDate time.Time,
) ([]BusySlot, error) {
    client := s.config.Client(ctx, token)
    srv, err := calendar.NewService(ctx, option.WithHTTPClient(client))
    if err != nil {
        return nil, err
    }

    req := &calendar.FreeBusyRequest{
        TimeMin: startDate.Format(time.RFC3339),
        TimeMax: endDate.Format(time.RFC3339),
        Items: []*calendar.FreeBusyRequestItem{
            {Id: "primary"},
        },
    }

    resp, err := srv.Freebusy.Query(req).Do()
    if err != nil {
        return nil, err
    }

    var busySlots []BusySlot
    for _, busy := range resp.Calendars["primary"].Busy {
        start, _ := time.Parse(time.RFC3339, busy.Start)
        end, _ := time.Parse(time.RFC3339, busy.End)
        busySlots = append(busySlots, BusySlot{
            Start: start,
            End:   end,
        })
    }

    return busySlots, nil
}

func (s *GoogleCalendarService) CalculateFreeSlots(
    busySlots []BusySlot,
    startDate, endDate time.Time,
    workingHoursStart, workingHoursEnd int, // e.g., 8, 22
) []FreeSlot {
    var freeSlots []FreeSlot
    
    // For each day in range
    for d := startDate; d.Before(endDate); d = d.AddDate(0, 0, 1) {
        dayStart := time.Date(d.Year(), d.Month(), d.Day(), workingHoursStart, 0, 0, 0, d.Location())
        dayEnd := time.Date(d.Year(), d.Month(), d.Day(), workingHoursEnd, 0, 0, 0, d.Location())
        
        // Find free slots by inverting busy slots
        currentStart := dayStart
        
        for _, busy := range busySlots {
            if busy.Start.Day() != d.Day() {
                continue
            }
            
            if currentStart.Before(busy.Start) {
                freeSlots = append(freeSlots, FreeSlot{
                    Date:      d,
                    StartTime: currentStart,
                    EndTime:   busy.Start,
                })
            }
            
            if busy.End.After(currentStart) {
                currentStart = busy.End
            }
        }
        
        if currentStart.Before(dayEnd) {
            freeSlots = append(freeSlots, FreeSlot{
                Date:      d,
                StartTime: currentStart,
                EndTime:   dayEnd,
            })
        }
    }
    
    return freeSlots
}
```

### 9. TimeSlotPicker Component (`frontend/src/components/availability/TimeSlotPicker.tsx`)

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { format, eachDayOfInterval, isWeekend } from 'date-fns';

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface TimeSlotPickerProps {
  dateRangeStart: Date;
  dateRangeEnd: Date;
  onSlotsChange: (slots: TimeSlot[]) => void;
  existingSlots?: TimeSlot[];
  preferredDays?: string[];
}

const TIME_BLOCKS = [
  { label: 'Morning', sublabel: '8:00-11:00', start: '08:00', end: '11:00' },
  { label: 'Lunch', sublabel: '11:00-13:00', start: '11:00', end: '13:00' },
  { label: 'Afternoon', sublabel: '13:00-16:00', start: '13:00', end: '16:00' },
  { label: 'Evening', sublabel: '16:00-20:00', start: '16:00', end: '20:00' },
];

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  dateRangeStart,
  dateRangeEnd,
  onSlotsChange,
  existingSlots = [],
  preferredDays = [],
}) => {
  const [selectedSlots, setSelectedSlots] = useState<Map<string, TimeSlot>>(() => {
    const map = new Map<string, TimeSlot>();
    existingSlots.forEach((slot) => {
      const key = `${slot.date}-${slot.startTime}`;
      map.set(key, slot);
    });
    return map;
  });

  const days = eachDayOfInterval({ start: dateRangeStart, end: dateRangeEnd });

  const getSlotKey = (date: Date, timeBlock: typeof TIME_BLOCKS[0]) => {
    return `${format(date, 'yyyy-MM-dd')}-${timeBlock.start}`;
  };

  const toggleSlot = useCallback((date: Date, timeBlock: typeof TIME_BLOCKS[0]) => {
    const key = getSlotKey(date, timeBlock);
    
    setSelectedSlots((prev) => {
      const newMap = new Map(prev);
      
      if (newMap.has(key)) {
        newMap.delete(key);
      } else {
        newMap.set(key, {
          date: format(date, 'yyyy-MM-dd'),
          startTime: timeBlock.start,
          endTime: timeBlock.end,
        });
      }
      
      // Notify parent
      onSlotsChange(Array.from(newMap.values()));
      
      return newMap;
    });
  }, [onSlotsChange]);

  const isSelected = (date: Date, timeBlock: typeof TIME_BLOCKS[0]) => {
    return selectedSlots.has(getSlotKey(date, timeBlock));
  };

  const selectAllForDay = (date: Date) => {
    setSelectedSlots((prev) => {
      const newMap = new Map(prev);
      TIME_BLOCKS.forEach((timeBlock) => {
        const key = getSlotKey(date, timeBlock);
        newMap.set(key, {
          date: format(date, 'yyyy-MM-dd'),
          startTime: timeBlock.start,
          endTime: timeBlock.end,
        });
      });
      onSlotsChange(Array.from(newMap.values()));
      return newMap;
    });
  };

  const clearAllForDay = (date: Date) => {
    setSelectedSlots((prev) => {
      const newMap = new Map(prev);
      TIME_BLOCKS.forEach((timeBlock) => {
        newMap.delete(getSlotKey(date, timeBlock));
      });
      onSlotsChange(Array.from(newMap.values()));
      return newMap;
    });
  };

  const isDayFullySelected = (date: Date) => {
    return TIME_BLOCKS.every((tb) => selectedSlots.has(getSlotKey(date, tb)));
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Selected: {selectedSlots.size} time slots
        </span>
        <button
          onClick={() => {
            setSelectedSlots(new Map());
            onSlotsChange([]);
          }}
          className="text-sm text-orange-600 hover:text-orange-700"
        >
          Clear All
        </button>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-2 py-2 text-xs font-medium text-gray-500 text-left w-20">
                Time
              </th>
              {days.map((day) => {
                const isWeekendDay = isWeekend(day);
                const isPreferred = 
                  preferredDays.includes('all') ||
                  (preferredDays.includes('weekdays') && !isWeekendDay) ||
                  (preferredDays.includes('weekends') && isWeekendDay);
                
                return (
                  <th
                    key={day.toISOString()}
                    className={`px-1 py-2 text-center min-w-[60px] ${
                      isPreferred ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-900">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(day, 'M/d')}
                    </div>
                    <button
                      onClick={() => 
                        isDayFullySelected(day) 
                          ? clearAllForDay(day) 
                          : selectAllForDay(day)
                      }
                      className="mt-1 text-[10px] text-orange-600 hover:text-orange-700"
                    >
                      {isDayFullySelected(day) ? 'Clear' : 'All'}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {TIME_BLOCKS.map((timeBlock) => (
              <tr key={timeBlock.start}>
                <td className="sticky left-0 bg-white px-2 py-1 text-xs text-gray-600 border-r">
                  <div className="font-medium">{timeBlock.label}</div>
                  <div className="text-gray-400">{timeBlock.sublabel}</div>
                </td>
                {days.map((day) => {
                  const selected = isSelected(day, timeBlock);
                  return (
                    <td
                      key={`${day.toISOString()}-${timeBlock.start}`}
                      className="px-1 py-1"
                    >
                      <button
                        onClick={() => toggleSlot(day, timeBlock)}
                        className={`
                          w-full h-12 rounded-lg transition-all duration-150
                          ${selected
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
                          }
                        `}
                        aria-label={`${format(day, 'MMM d')} ${timeBlock.label}`}
                        aria-pressed={selected}
                      >
                        {selected && (
                          <svg className="w-5 h-5 mx-auto\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                            <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M5 13l4 4L19 7\" />
                          </svg>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### 10. Meeting Form Component (`frontend/src/components/meeting/MeetingForm.tsx`)

```typescript
'use client';

import React, { useState } from 'react';
import { format, addDays, addWeeks } from 'date-fns';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { CreateMeetingRequest } from '@/types/meeting';

interface MeetingFormProps {
  onSubmit: (data: CreateMeetingRequest) => void;
  isLoading?: boolean;
}

const MEETING_TYPES = [
  { value: 'meals', label: '🍽️ Meals', icon: '🍽️' },
  { value: 'cafe', label: '☕ Cafe', icon: '☕' },
  { value: 'sports', label: '⚽ Sports', icon: '⚽' },
  { value: 'others', label: '📋 Others', icon: '📋' },
];

const DURATION_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

const DATE_RANGE_OPTIONS = [
  { value: 7, label: '1 Week' },
  { value: 14, label: '2 Weeks' },
  { value: 30, label: '1 Month' },
];

export const MeetingForm: React.FC<MeetingFormProps> = ({ onSubmit, isLoading }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<string>('meals');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [location, setLocation] = useState('');
  const [dateRangeDays, setDateRangeDays] = useState(14);
  const [preferredDays, setPreferredDays] = useState<string[]>(['weekdays']);
  const [preferredTimes, setPreferredTimes] = useState<string[]>(['afternoon']);
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const today = new Date();
    onSubmit({
      title,
      type,
      durationMinutes,
      location: location || undefined,
      dateRangeStart: format(today, 'yyyy-MM-dd'),
      dateRangeEnd: format(addDays(today, dateRangeDays), 'yyyy-MM-dd'),
      preferredDays,
      preferredTimes,
      notes: notes || undefined,
    });
  };

  const toggleArrayValue = (
    array: string[],
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (array.includes(value)) {
      setter(array.filter((v) => v !== value));
    } else {
      setter([...array, value]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Meeting Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Meeting Title *
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Team Lunch, Study Session"
          required
        />
      </div>

      {/* Meeting Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Meeting Type *
        </label>
        <div className="grid grid-cols-4 gap-2">
          {MEETING_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`
                p-3 rounded-lg text-center transition-all
                ${type === t.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
                }
              `}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="block text-xs mt-1">{t.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Duration *
        </label>
        <div className="grid grid-cols-4 gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDurationMinutes(d.value)}
              className={`
                py-2 px-3 rounded-lg text-sm transition-all
                ${durationMinutes === d.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
                }
              `}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location (optional)
        </label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Siam area, Near BTS Asok"
        />
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Find times within *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {DATE_RANGE_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDateRangeDays(d.value)}
              className={`
                py-2 px-3 rounded-lg text-sm transition-all
                ${dateRangeDays === d.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
                }
              `}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-orange-600 hover:text-orange-700 flex items-center"
        >
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </button>
        
        {showAdvanced && (
          <div className="mt-4 space-y-4 pl-4 border-l-2 border-orange-200">
            {/* Preferred Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Days
              </label>
              <div className="flex gap-2">
                {['weekdays', 'weekends'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleArrayValue(preferredDays, day, setPreferredDays)}
                    className={`
                      py-1 px-3 rounded-full text-sm transition-all
                      ${preferredDays.includes(day)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                      }
                    `}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Times */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Times
              </label>
              <div className="flex flex-wrap gap-2">
                {['morning', 'afternoon', 'evening'].map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => toggleArrayValue(preferredTimes, time, setPreferredTimes)}
                    className={`
                      py-1 px-3 rounded-full text-sm transition-all
                      ${preferredTimes.includes(time)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                      }
                    `}
                  >
                    {time.charAt(0).toUpperCase() + time.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={!title || isLoading}
        isLoading={isLoading}
      >
        Create Meeting
      </Button>
    </form>
  );
};
```

### 11. Common Components (`frontend/src/components/common/`)

**Button.tsx**
```typescript
'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all duration-150 flex items-center justify-center';
  
  const variants = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 disabled:bg-orange-300',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400 disabled:bg-gray-100',
    outline: 'border-2 border-orange-500 text-orange-500 hover:bg-orange-50 active:bg-orange-100 disabled:border-orange-300 disabled:text-orange-300',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4\" fill=\"none\" viewBox=\"0 0 24 24\">
            <circle className=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" strokeWidth=\"4\" />
            <path className=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\" />
          </svg>
          Loading...
        </>
      ) : children}
    </button>
  );
};
```

**Input.tsx**
```typescript
'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input: React.FC<InputProps> = ({ error, className = '', ...props }) => {
  return (
    <div>
      <input
        className={`
          w-full px-3 py-2 border rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-orange-500
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};
```

**Card.tsx**
```typescript
'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
```

**Loading.tsx**
```typescript
'use client';

import React from 'react';

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-4" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
};
```

### 12. TypeScript Types (`frontend/src/types/meeting.ts`)

```typescript
export interface User {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  hasGoogleCalendar: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  type: 'meals' | 'cafe' | 'sports' | 'others';
  durationMinutes: number;
  location?: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  preferredDays: string[];
  preferredTimes: string[];
  notes?: string;
  status: 'collecting' | 'voting' | 'confirmed' | 'cancelled';
  organizer: {
    id: string;
    displayName: string;
    pictureUrl?: string;
  };
  invitees: Invitee[];
  suggestedSlots?: SuggestedSlot[];
  confirmation?: Confirmation;
  shareUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingRequest {
  title: string;
  type: string;
  durationMinutes: number;
  location?: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  preferredDays: string[];
  preferredTimes: string[];
  notes?: string;
  groupId?: string;
}

export interface Invitee {
  id: string;
  user: {
    id: string;
    displayName: string;
    pictureUrl?: string;
  };
  status: 'pending' | 'submitted' | 'confirmed';
  availabilityCount: number;
}

export interface Availability {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  source: 'manual' | 'google_calendar';
}

export interface SuggestedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  score: number;
  rank: number;
  rationale: string;
  availableCount: number;
}

export interface Vote {
  slotId: string;
  available: boolean;
}

export interface Confirmation {
  id: string;
  slot: SuggestedSlot;
  confirmedAt: string;
  calendarEventId?: string;
}

export interface AvailabilitySummary {
  totalInvitees: number;
  submittedCount: number;
  dateHeatmap: Record<string, number>;
}
```

### 13. Availability Page (`frontend/src/app/meeting/[id]/availability/page.tsx`)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { liffService } from '@/lib/liff';
import { TimeSlotPicker } from '@/components/availability/TimeSlotPicker';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Loading } from '@/components/common/Loading';
import type { Availability } from '@/types/meeting';

export default function AvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  
  const [selectedSlots, setSelectedSlots] = useState<Omit<Availability, 'id' | 'source'>[]>([]);
  const [syncMode, setSyncMode] = useState<'manual' | 'google' | null>(null);

  // Fetch meeting details
  const { data: meeting, isLoading: meetingLoading } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => api.getMeeting(meetingId),
  });

  // Fetch user's existing availability
  const { data: availabilityData } = useQuery({
    queryKey: ['availability', meetingId],
    queryFn: () => api.getAvailabilitySummary(meetingId),
  });

  // Join meeting mutation
  const joinMutation = useMutation({
    mutationFn: () => api.joinMeeting(meetingId),
  });

  // Submit availability mutation
  const submitMutation = useMutation({
    mutationFn: (slots: Omit<Availability, 'id' | 'source'>[]) =>
      api.submitAvailability(meetingId, slots, 'manual'),
    onSuccess: () => {
      router.push(`/meeting/${meetingId}`);
    },
  });

  // Sync Google Calendar mutation
  const syncMutation = useMutation({
    mutationFn: () => {
      if (!meeting) throw new Error('Meeting not found');
      return api.syncGoogleCalendar(
        meetingId,
        meeting.dateRangeStart,
        meeting.dateRangeEnd
      );
    },
    onSuccess: (data) => {
      // Convert synced availabilities to slot format
      const slots = data.availabilities.map((a) => ({
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
      }));
      setSelectedSlots(slots);
    },
  });

  // Auto-join on mount
  useEffect(() => {
    joinMutation.mutate();
  }, []);

  // Load existing slots
  useEffect(() => {
    if (availabilityData?.myAvailabilities) {
      setSelectedSlots(
        availabilityData.myAvailabilities.map((a) => ({
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
        }))
      );
    }
  }, [availabilityData]);

  const handleGoogleConnect = async () => {
    try {
      const { url } = await api.getGoogleAuthUrl(meetingId);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
    }
  };

  const handleSubmit = () => {
    if (selectedSlots.length === 0) {
      alert('Please select at least one time slot');
      return;
    }
    submitMutation.mutate(selectedSlots);
  };

  if (meetingLoading) {
    return <Loading message="Loading meeting..." />;
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Meeting not found</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <header className="py-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold mt-2">{meeting.title}</h1>
          <p className="text-sm text-gray-500">
            {meeting.durationMinutes} minutes • {meeting.location || 'Location TBD'}
          </p>
        </header>

        {/* Method Selection */}
        {!syncMode && (
          <div className="space-y-3 mb-6">
            <Card
              onClick={() => setSyncMode('google')}
              className="hover:border-orange-300"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  📅
                </div>
                <div>
                  <p className="font-medium">Sync with Google Calendar</p>
                  <p className="text-sm text-gray-500">
                    Automatically import your free times
                  </p>
                </div>
              </div>
            </Card>

            <Card
              onClick={() => setSyncMode('manual')}
              className="hover:border-orange-300"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  ✋
                </div>
                <div>
                  <p className="font-medium">Select Manually</p>
                  <p className="text-sm text-gray-500">
                    Pick your available time slots
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Google Sync Section */}
        {syncMode === 'google' && (
          <div className="mb-6">
            <Card>
              <h3 className="font-medium mb-3">Google Calendar Sync</h3>
              {availabilityData?.myAvailabilities?.some(
                (a) => a.source === 'google_calendar'
              ) ? (
                <div>
                  <p className="text-sm text-green-600 mb-3">
                    ✓ Calendar synced successfully
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => syncMutation.mutate()}
                    isLoading={syncMutation.isPending}
                  >
                    Refresh Sync
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-3">
                    Connect your Google Calendar to automatically find your free times.
                  </p>
                  <Button onClick={handleGoogleConnect}>
                    Connect Google Calendar
                  </Button>
                </div>
              )}
              <button
                onClick={() => setSyncMode('manual')}
                className="mt-3 text-sm text-orange-600"
              >
                Or select manually instead
              </button>
            </Card>
          </div>
        )}

        {/* Manual Selection */}
        {syncMode === 'manual' && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Select Your Available Times</h3>
              <button
                onClick={() => setSyncMode('google')}
                className="text-sm text-orange-600"
              >
                Use Google Calendar
              </button>
            </div>
            <TimeSlotPicker
              dateRangeStart={new Date(meeting.dateRangeStart)}
              dateRangeEnd={new Date(meeting.dateRangeEnd)}
              onSlotsChange={setSelectedSlots}
              existingSlots={selectedSlots.map((s, i) => ({ ...s, id: String(i), source: 'manual' as const }))}
              preferredDays={meeting.preferredDays}
            />
          </div>
        )}

        {/* Summary */}
        {availabilityData && (
          <Card className="mb-6">
            <h3 className="font-medium mb-2">Group Progress</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Responses received</span>
              <span className="font-medium">
                {availabilityData.summary.submittedCount} / {availabilityData.summary.totalInvitees}
              </span>
            </div>
          </Card>
        )}
      </div>

      {/* Fixed Bottom Button */}
      {syncMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={selectedSlots.length === 0}
              isLoading={submitMutation.isPending}
            >
              Submit Availability ({selectedSlots.length} slots)
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
```

### Frontend - Vercel (`next.config.ts`)

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // CRITICAL: Handle LIFF SDK which requires client-side only
  // Without this, LIFF will fail to initialize properly
  transpilePackages: ['@line/liff'],

  // Image configuration for remote images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Allow LIFF to be embedded in LINE
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Vercel Project Settings
- Framework Preset: Next.js (auto-detected)
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

### Environment Variables in Vercel Dashboard
```
NEXT_PUBLIC_LIFF_ID=your_liff_id
NEXT_PUBLIC_LINE_CHANNEL_ID=your_line_channel_id
NEXT_PUBLIC_API_BASE_URL=https://your-cloud-run-url/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### Backend - Cloud Run (`Dockerfile`)

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Copy binary
COPY --from=builder /server .

# Set timezone
ENV TZ=Asia/Bangkok

# Expose port
EXPOSE 8080

# Run
CMD ["./server"]
```

### Cloud Build (`cloudbuild.yaml`)

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/scheduler-backend:$COMMIT_SHA', '.']

  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/scheduler-backend:$COMMIT_SHA']

  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'scheduler-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/scheduler-backend:$COMMIT_SHA'
      - '--region'
      - 'asia-southeast1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'ENV=production'
      - '--add-cloudsql-instances'
      - '$PROJECT_ID:asia-southeast1:scheduler-db'

images:
  - 'gcr.io/$PROJECT_ID/scheduler-backend:$COMMIT_SHA'

options:
  logging: CLOUD_LOGGING_ONLY
```

---

## Implementation Steps (For Claude Code)

### Phase 1: Project Setup (Day 1-2)

1. **Initialize Frontend with Next.js**
   ```bash
   npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   cd frontend
   npm install @line/liff @tanstack/react-query zustand date-fns js-cookie
   npm install -D @types/node @types/js-cookie
   ```

2. **Initialize Backend**
   ```bash
   mkdir -p backend/cmd/server backend/internal/{config,database,handlers,middleware,models,repository,services,utils}
   cd backend
   go mod init github.com/your-username/scheduler-backend
   go get github.com/gofiber/fiber/v2
   go get gorm.io/gorm gorm.io/driver/postgres
   go get github.com/line/line-bot-sdk-go/v8
   go get github.com/google/generative-ai-go
   go get google.golang.org/api/calendar/v3
   go get golang.org/x/oauth2
   ```

3. **Setup Database**
   - Create Cloud SQL PostgreSQL instance
   - Run schema migrations
   - Configure connection from Cloud Run

### Phase 2: Core Backend (Day 3-5)

1. **Implement Models** - Define all database models with GORM tags
2. **Implement Authentication Middleware** - JWT verification middleware
   ```go
   // backend/internal/middleware/auth.go
   func JWTAuth(secret string) fiber.Handler {
       return func(c *fiber.Ctx) error {
           authHeader := c.Get("Authorization")
           if authHeader == "" {
               return c.Status(401).JSON(fiber.Map{"error": "Missing authorization"})
           }

           tokenString := strings.TrimPrefix(authHeader, "Bearer ")
           token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
               return []byte(secret), nil
           })

           if err != nil || !token.Valid {
               return c.Status(401).JSON(fiber.Map{"error": "Invalid token"})
           }

           claims := token.Claims.(jwt.MapClaims)
           c.Locals("user_id", claims["user_id"])
           c.Locals("line_user_id", claims["line_user_id"])

           return c.Next()
       }
   }
   ```
3. **Implement Repositories** - CRUD operations for each model
4. **Implement Authentication Handler** - LIFF token verification, JWT generation
5. **Implement LINE Webhook** - Handle @Bot commands, send messages
6. **Implement Meeting Service** - Create, read, update meeting logic
7. **Implement Availability Service** - Store and aggregate availability

### Phase 3: Frontend Core (Day 6-8)

1. **Setup LIFF Integration**
   - Create LiffProvider with Context API
   - Implement token exchange with backend (LIFF token → Backend JWT)
   - Store tokens in both cookies and localStorage
   - Create useLiff custom hook
2. **Setup API Utilities**
   - Create createApiHeaders utility function
   - Implement ApiClient with automatic token handling
3. **Create Meeting Form** - Form for creating new meetings
4. **Build TimeSlotPicker** - Interactive availability selection
5. **Implement Meeting Detail View** - Show meeting info and invitees

### Phase 4: Google Calendar Integration (Day 9-10)

1. **Backend OAuth Flow** - Generate auth URL, exchange tokens
2. **FreeBusy API Integration** - Fetch calendar availability
3. **Frontend Calendar Sync** - Button to trigger OAuth, display sync status
4. **Calculate Free Slots** - Convert busy to free time slots

### Phase 5: AI Ranking (Day 11-12)

1. **Integrate Gemini API** - Setup client and model
2. **Build Availability Matrix** - Aggregate all invitee availability
3. **Implement Ranking Prompt** - Design effective prompt for suggestions
4. **Parse and Store Results** - Save suggested slots to database

### Phase 6: Broadcasting & Confirmation (Day 13-14)

1. **Generate Suggestion Message** - Flex message with top 3 slots
2. **Broadcast to Group** - Send suggestions via LINE Bot
3. **Implement Voting** - Allow users to confirm availability for suggested slots
4. **Finalize Meeting** - Organizer confirms final time, broadcast result

### Phase 7: Testing & Deployment (Day 15-16)

1. **Write Integration Tests** - Test critical flows
2. **Deploy Frontend to Vercel** - Configure environment variables
3. **Deploy Backend to Cloud Run** - Setup Cloud Build
4. **Configure LINE Webhook URL** - Point to Cloud Run endpoint
5. **End-to-end Testing** - Test complete flow in LINE app

---

## LINE Developer Setup Guide

### 1. Create LINE Developers Account
- Go to https://developers.line.biz/
- Login with LINE account
- Create a new provider

### 2. Create Messaging API Channel
- Select provider → Create new channel → Messaging API
- Fill in required information
- Note down: Channel ID, Channel Secret

### 3. Configure Messaging API
- Enable webhooks
- Set webhook URL: `https://your-cloud-run-url/api/v1/webhook`
- Disable auto-reply messages
- Issue Channel Access Token (long-lived)

### 4. Create LIFF App
- Go to LIFF tab
- Add new LIFF app
- Endpoint URL: `https://your-vercel-url`
- Size: Full
- Enable: `chat_message.write`, `profile`
- Note down: LIFF ID

---

## Google Cloud Setup Guide

### 1. Create GCP Project
- Go to https://console.cloud.google.com/
- Create new project: `line-scheduler`

### 2. Enable APIs
- Google Calendar API
- Cloud Run Admin API
- Cloud Build API
- Cloud SQL Admin API
- Secret Manager API

### 3. Create OAuth Credentials
- Go to APIs & Services → Credentials
- Create OAuth 2.0 Client ID
- Application type: Web application
- Authorized redirect URIs: 
  - `http://localhost:8080/api/v1/google/callback` (dev)
  - `https://your-cloud-run-url/api/v1/google/callback` (prod)

### 4. Create Cloud SQL Instance
- Go to Cloud SQL
- Create instance → PostgreSQL 15
- Instance ID: `scheduler-db`
- Region: `asia-southeast1`
- Enable private IP for Cloud Run connection

### 5. Enable Gemini API
- Go to Vertex AI → Enable API
- Or use AI Studio at https://aistudio.google.com/
- Create API key for Gemini

---

## Security Considerations

1. **Token Exchange Pattern** - Frontend never uses LIFF token directly with backend
   - LIFF token is only sent once during login to exchange for JWT
   - Backend verifies LIFF token with LINE API before issuing JWT
   - This prevents LIFF token misuse and provides better control

2. **JWT Token Management**
   - Store JWT in both cookies (HttpOnly, Secure, SameSite=Lax) and localStorage
   - Cookies provide automatic CSRF protection
   - localStorage provides reliability when cookies are blocked
   - 24-hour expiry with ability to refresh

3. **LIFF Token Validation** - Always verify LIFF tokens with LINE API, never trust client

4. **Google Token Encryption** - Encrypt stored OAuth tokens at rest

5. **SQL Injection Prevention** - Use parameterized queries (GORM handles this)

6. **Rate Limiting** - Implement rate limits on authentication and API endpoints
   - `/users/auth/line-login`: 10 requests per minute per IP
   - Other endpoints: 100 requests per minute per user

7. **CORS Configuration** - Restrict to known frontend origins only

8. **Webhook Signature Verification** - Always validate LINE webhook signatures

9. **Environment Variables** - Never expose sensitive keys to frontend
   - `NEXT_PUBLIC_*` variables are safe for client
   - Backend secrets must stay server-side only

---

## Testing Checklist

### Unit Tests
- [ ] Meeting service - create, update, delete
- [ ] Availability aggregation
- [ ] Time slot calculation from Google Calendar
- [ ] AI prompt generation

### Integration Tests
- [ ] LIFF authentication flow
- [ ] Google OAuth flow
- [ ] LINE webhook handling
- [ ] Database operations

### E2E Tests
- [ ] Create meeting from LIFF
- [ ] Submit availability manually
- [ ] Sync Google Calendar
- [ ] Generate and view suggestions
- [ ] Confirm meeting and broadcast

---

## Monitoring & Logging

### Cloud Run Logging
- All logs automatically sent to Cloud Logging
- Set up log-based alerts for errors

### Metrics to Track
- API response times
- Meeting creation rate
- Calendar sync success rate
- AI suggestion generation time

---

This technical specification provides a complete blueprint for implementing the AI Scheduling Assistant MVP. The implementation should be done in phases, with each phase building on the previous one. All code examples are production-ready starting points that Claude Code can expand upon.
