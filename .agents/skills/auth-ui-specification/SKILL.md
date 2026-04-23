# Auth UI Specification

## Description
Complete field specifications with Zod schemas for every auth-related UI screen. Use this to build login, signup, OTP verification, password reset, and invite forms in any framework.

## Trigger
Use this skill when: "auth form", "login page", "signup page", "invite form", "password form", "build auth UI", "create login component"

## Password Requirements

All password fields (except login) must meet:
- Minimum 12 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*...)

## Login Form

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | text/email | Yes | Valid email format |
| password | password | Yes | Min 1 character after trim (login only requires non-empty) |

**Zod Schema:**
```typescript
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().trim().min(1, "Password is required"),
});
```

**Submit:** POST to `/api/v1/auth/login` with header `x-stellar-app: <app-id>`, then call `supabase.auth.setSession()` with the returned tokens.

**Error States:** "Invalid email or password", "Please verify your email before signing in", "Authentication failed"

## Signup Form

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | text/email | Yes | Valid email, not blacklisted (call validate-signup first) |
| fullName | text | Yes | Min 2 chars, must contain first and last name |
| password | password | Yes | See password requirements above |
| acceptTerms | checkbox | Yes | Must be true |

**Zod Schema:**
```typescript
const signupSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  fullName: z.string().trim().min(2).refine(
    (name) => name.split(" ").filter((w) => w.length > 0).length >= 2,
    { message: "Please enter both first and last name" }
  ),
  password: z.string().trim()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/\d/, "Must contain a number")
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Must contain special character"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms and Conditions",
  }),
});
```

**Submit:** POST to `/api/v1/auth/signup` with header `x-stellar-app: <app-id>`, then redirect to `/verify-otp?email=...&type=signup&name=...`

## Verify OTP Form

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | text (readonly) | Yes | From URL param |
| otp | text (numeric) | Yes | 8 digits |
| type | hidden | Yes | "signup" / "recovery" / "invite" |

**Zod Schema:**
```typescript
const verifyOtpSchema = z.object({
  email: z.string().email(),
  token: z.string().min(6),
  type: z.enum(["signup", "recovery", "invite"]),
});
```

**Submit:** POST to `/api/v1/auth/verify-otp`. For signup/invite: calls bootstrap-profile automatically, then redirect to app. For recovery: show change password modal.

## Reset Password Form

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | text/email | Yes | Valid email format |

**Submit:** POST to `/api/v1/auth/reset-password`. Always shows success message (security).

## Change Password Form

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| newPassword | password | Yes | See password requirements |
| confirmPassword | password | Yes | Must match newPassword |

**Submit:** Call `supabase.auth.updateUser({ password: newPassword })` directly (client-side, session must be active after OTP verification).

## Invite User Form

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | text/email | Yes | Valid email format |
| fullName | text | Yes | Min 2 chars, first and last name |
| role | select | No | "Member Admin" / "Member User" (defaults to "Member User") |

**Submit:** POST to `/api/v1/auth/invite-user`
