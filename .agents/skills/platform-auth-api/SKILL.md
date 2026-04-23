# Platform Auth API Reference

## Description
Complete API reference for calling platform-auth endpoints from a consumer app. Includes endpoint specs, request/response types, error codes, and example fetch calls.

## Trigger
Use this skill when: "call platform-auth", "auth API", "bootstrap endpoint", "invite endpoint", "auth endpoint", "API reference"

## Configuration

Set `PLATFORM_AUTH_URL` in your `.env.local`:
```env
PLATFORM_AUTH_URL=https://auth.stellarone.ai
```

For client-origin tracing, send this header on auth requests:
```http
x-stellar-app: evaluate
```
Use one of your app identifiers (e.g. `evaluate`, `deployment`, `hypercare`, `success`).

## Endpoints

### POST /api/v1/auth/login
- **Auth:** None
- **Headers (recommended):** `x-stellar-app: <app-id>`
- **Body:** `{ email: string, password: string }`
- **Response:** `{ session: object, user: object, needsBootstrap?: boolean }`
- **Errors:** `INVALID_CREDENTIALS` (401), `EMAIL_NOT_CONFIRMED` (401), `AUTH_FAILED` (401), `NO_SESSION` (401)

### POST /api/v1/auth/logout
- **Auth:** Bearer user JWT
- **Body:** None
- **Response:** `{ success: true }`
- **Errors:** `AUTH_FAILED` (401), `LOGOUT_FAILED` (400)

### POST /api/v1/auth/signup
- **Auth:** None
- **Headers (recommended):** `x-stellar-app: <app-id>`
- **Body:** `{ email: string, password: string, fullName: string }`
- **Response:** `{ success: true, user: { id, email }, requiresConfirmation: true, emailSent: boolean }`
- **Errors:** `DOMAIN_BLACKLISTED` (400), `USER_EXISTS` (400), `PENDING_INVITATION` (400), `CREATE_FAILED` (500)

### POST /api/v1/auth/verify-otp
- **Auth:** None
- **Body:** `{ email: string, token: string, type: "signup"|"recovery"|"invite", fullName?: string }`
- **Response:** `{ success: true, session: object, user: object, type: string, bootstrapResult?: object }`
- **Errors:** `AUTH_FAILED` (401)

### POST /api/v1/auth/reset-password
- **Auth:** None
- **Body:** `{ email: string, callbackUrl?: string }`
- **Response:** `{ success: true, message: string }` (always succeeds for security)

### POST /api/v1/auth/resend-otp
- **Auth:** None
- **Body:** `{ email: string, type: "signup"|"recovery" }`
- **Response:** `{ success: true }`
- **Errors:** `TOKEN_FAILED` (500), `EMAIL_CONFIG_ERROR` (500), `EMAIL_FAILED` (500)

### POST /api/v1/auth/bootstrap-profile
- **Auth:** Bearer user JWT
- **Body:** `{ fullName?: string }`
- **Response:** `{ success: true, organizationId: string, role: string, isEmployee: boolean, isNewOrg: boolean }`

### POST /api/v1/auth/invite-user
- **Auth:** Bearer service role key
- **Body:** `{ email: string, fullName: string, role?: "Member Admin"|"Member User", organizationId?: string }`
- **Response:** `{ success: true, user: { id, email, full_name }, organizationId: string }`
- **Errors:** `DOMAIN_BLACKLISTED` (400), `USER_EXISTS` (400), `RECENT_INVITATION_EXISTS` (429)

### POST /api/v1/auth/custom-access-token
- **Auth:** Bearer service role key (called by Supabase hook)
- **Body:** `{ user_id: string, claims: object }`
- **Response:** `{ claims: object }` (enriched with org_id, is_employee, organization_role, organization_domain)

### POST /api/v1/auth/validate-signup
- **Auth:** Bearer service role key
- **Headers (recommended):** `x-stellar-app: <app-id>`
- **Body:** `{ email: string }`
- **Response:** `{ valid: boolean, error?: string }`

### POST /api/v1/auth/accept-terms
- **Auth:** Bearer user JWT
- **Body:** `{ userId: string }`
- **Response:** `{ success: true, acceptedPolicies: string[] }`

### GET /api/v1/health
- **Auth:** None
- **Response:** `{ status: "ok", service: "platform-auth", timestamp: string }`

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_FAILED | Authentication failed (invalid credentials or token) |
| INVALID_CREDENTIALS | Login failed due to invalid email/password combination |
| EMAIL_NOT_CONFIRMED | User must verify email before signing in |
| CONFIG_ERROR | Server missing required environment variables |
| EMAIL_CONFIG_ERROR | Email service (Resend) not configured |
| NO_SESSION | Login succeeded but no session was returned |
| VALIDATION_ERROR | Request body failed Zod validation |
| DOMAIN_BLACKLISTED | Email domain is on the blacklist |
| USER_EXISTS | An account already exists with this email |
| PENDING_INVITATION | User has a pending invitation |
| CREATE_FAILED | Failed to create user or resource |
| EMAIL_FAILED | Failed to send email |
| TOKEN_FAILED | Failed to generate OTP token |
| LOGOUT_FAILED | Logout operation failed |
| RECENT_INVITATION_EXISTS | Invitation sent too recently (5 min cooldown) |
| PROFILE_CONFLICT | Profile ownership conflict during bootstrap |
| NOT_FOUND | Resource not found |
| INTERNAL_ERROR | Unexpected server error |

## Example: Login Flow

```typescript
const res = await fetch("/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

const data = await res.json();

if (data.session) {
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  if (data.needsBootstrap) {
    await fetch("/api/v1/auth/bootstrap-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });
  }
}
```
