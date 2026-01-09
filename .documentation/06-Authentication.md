# Authentication System

This document describes the authentication and user management system in FundThesis.

## Table of Contents

- [Overview](#overview)
- [Authentication Provider](#authentication-provider)
- [Architecture](#architecture)
- [User Management](#user-management)
- [Session Management](#session-management)
- [Security Features](#security-features)

---

## Overview

FundThesis uses **Better-Auth** for authentication, a modern, self-hosted authentication library that provides email/password and OAuth authentication without relying on external services.

### Key Features

- **Email/Password Authentication:** Traditional sign-up and login
- **OAuth Integration:** Google sign-in support
- **Session Management:** Secure session-based authentication
- **User Profiles:** User account management
- **Self-Hosted:** No dependency on external auth services

---

## Authentication Provider

### Better-Auth

**What is Better-Auth?**
- Modern authentication library for Next.js
- Self-hosted (no external service required)
- Type-safe with TypeScript
- Flexible and extensible

**Why Better-Auth?**
- **Control:** Full control over authentication logic
- **Privacy:** User data stays in our database
- **Cost:** No per-user pricing
- **Flexibility:** Easy to customize and extend

### Configuration

**Frontend (`Frontend/src/lib/auth.ts`):**
```typescript
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: getBaseUrl(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      enabled: true,
    },
  },
});
```

---

## Architecture

### Authentication Flow

```
User Registration/Login
    │
    ▼
Better-Auth API Route (/api/auth/*)
    │
    ├─→ Email/Password Validation
    ├─→ OAuth Provider (Google)
    └─→ Session Creation
    │
    ▼
Prisma Database
    │
    ├─→ User Record (User table)
    ├─→ Account Record (Account table)
    └─→ Session Record (Session table)
    │
    ▼
Session Token (HTTP-only Cookie)
    │
    ▼
Protected Routes (Frontend)
```

### Database Schema

**User Model:**
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified Boolean?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]
}
```

**Session Model:**
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  user      User     @relation(...)
}
```

**Account Model:**
```prisma
model Account {
  id           String    @id @default(cuid())
  userId       String
  accountId    String
  providerId   String    // 'credential' or 'google'
  accessToken  String?
  refreshToken String?
  password     String?   // Hashed
  user         User      @relation(...)
}
```

---

## User Management

### Registration

**Email/Password:**
1. User provides email and password
2. Password is hashed (Better-Auth handles this)
3. User record created in database
4. Verification email sent (if enabled)
5. Session created automatically

**Google OAuth:**
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth
3. User authorizes application
4. Google returns user info
5. Account linked or created
6. Session created

### Login

**Email/Password:**
1. User provides email and password
2. Credentials validated
3. Session created
4. Session token stored in HTTP-only cookie

**Google OAuth:**
1. User clicks "Sign in with Google"
2. OAuth flow completes
3. Existing account found or created
4. Session created

### User Profile

**Stored Information:**
- Name
- Email
- Profile image (if provided)
- Account creation date
- Email verification status

**Profile Management:**
- Users can update name and email
- Profile image can be uploaded
- Email verification can be requested

---

## Session Management

### Session Creation

**Process:**
1. User authenticates (login or OAuth)
2. Better-Auth generates unique session token
3. Token stored in database (Session table)
4. Token sent to client as HTTP-only cookie
5. Cookie expires based on session expiration

### Session Validation

**Frontend:**
- Session token automatically sent with requests
- Better-Auth validates token on protected routes
- User context available via `useAuth()` hook

**Backend:**
- FastAPI validates session tokens
- Extracts user ID from token
- Provides user context to endpoints

### Session Expiration

**Default:** Sessions expire after a configured period (typically 30 days)

**Refresh:** Sessions can be refreshed to extend expiration

**Logout:** Session deleted from database and cookie cleared

---

## Security Features

### Password Security

- **Hashing:** Passwords hashed using secure algorithms (bcrypt/argon2)
- **Never Stored:** Plain text passwords never stored
- **Validation:** Password strength requirements (minimum 8 characters)

### Session Security

- **HTTP-Only Cookies:** Prevents JavaScript access to session tokens
- **Secure Cookies:** Only sent over HTTPS in production
- **Token Rotation:** Session tokens can be rotated
- **Expiration:** Automatic session expiration

### OAuth Security

- **State Parameter:** Prevents CSRF attacks
- **PKCE:** Proof Key for Code Exchange (if supported)
- **Token Storage:** OAuth tokens stored securely
- **Refresh Tokens:** Automatic token refresh

### API Security

- **Rate Limiting:** Prevents brute force attacks
- **CORS:** Restricted to authorized origins
- **Input Validation:** All inputs validated and sanitized
- **SQL Injection:** Prevented by Prisma ORM

---

## Frontend Integration

### Auth Provider

**Component:** `Frontend/src/providers/AuthProvider.tsx`

**Purpose:** Provides authentication context to entire application

**Usage:**
```typescript
const { user, isLoading, signOut } = useAuth();
```

### Protected Routes

**Implementation:**
- Check authentication status
- Redirect to login if not authenticated
- Show loading state during auth check

**Example:**
```typescript
useEffect(() => {
  if (!isAuthLoading && !user) {
    router.replace('/auth');
  }
}, [isAuthLoading, user, router]);
```

### Auth Pages

**Login/Signup:** `Frontend/src/app/auth/page.tsx`

**Features:**
- Email/password form
- Google OAuth button
- Form validation
- Error handling
- Loading states

---

## Backend Integration

### Session Validation

**Implementation:** `backend/app/core/auth.py`

**Process:**
1. Extract session token from request
2. Query database for session
3. Validate token and expiration
4. Return user information
5. Provide user context to endpoints

### Protected Endpoints

**Example:**
```python
from app.core.auth import get_current_user

@router.get("/api/user/profile")
async def get_profile(user: User = Depends(get_current_user)):
    return {"name": user.name, "email": user.email}
```

---

## Environment Variables

### Frontend

```env
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Backend

```env
DATABASE_URL="postgresql://..."  # Shared with frontend
```

---

## User Data

### Stored Data

**User Table:**
- User ID (unique identifier)
- Name (optional)
- Email (required, unique)
- Email verification status
- Profile image URL (optional)
- Timestamps (created, updated)

**Account Table:**
- Account ID
- Provider (email/password or Google)
- OAuth tokens (if applicable)
- Hashed password (if email/password)

**Session Table:**
- Session ID
- User ID
- Session token
- Expiration date
- IP address (optional)
- User agent (optional)

### Privacy

- **Minimal Data:** Only necessary information stored
- **No Financial Data:** No bank accounts or payment info
- **GDPR Compliant:** Users can request data export/deletion
- **Secure Storage:** All data encrypted at rest

---

## Future Enhancements

### Planned Features

1. **Email Verification:** Verify email addresses
2. **Password Reset:** Forgot password functionality
3. **Two-Factor Authentication:** Additional security layer
4. **Social Logins:** More OAuth providers (GitHub, Microsoft)
5. **Account Linking:** Link multiple accounts to one user

### Security Improvements

1. **Rate Limiting:** Per-user rate limits
2. **IP Whitelisting:** Optional IP-based restrictions
3. **Device Management:** Track and manage devices
4. **Audit Logs:** Log authentication events

---

## Troubleshooting

### Common Issues

**"Invalid credentials"**
- Check email/password are correct
- Verify user exists in database
- Check password hashing is working

**"Session expired"**
- User needs to log in again
- Check session expiration settings
- Verify cookies are being set

**"OAuth error"**
- Verify Google OAuth credentials
- Check redirect URIs are configured
- Ensure CORS is properly configured

---

## Conclusion

FundThesis uses Better-Auth for a modern, secure, self-hosted authentication system. The system supports both email/password and Google OAuth, with secure session management and user data storage in PostgreSQL.

**Status:** ✅ Production Ready  
**Security:** High (industry-standard practices)  
**Features:** Email/password + Google OAuth
