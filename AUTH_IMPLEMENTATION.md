# Auth Module - MongoDB Implementation

**Status:** ✅ Complete
**Framework:** NestJS + MongoDB
**Functionality:** Login, Register, Logout

---

## 📋 API Endpoints

### 1. Register User

```
POST /auth/register
```

**Request Body:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "role": "CASHIER"
}
```

**Response (201):**

```json
{
  "message": "Registration successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "CASHIER",
    "is_active": true,
    "createdAt": "2025-12-26T10:30:00Z",
    "updatedAt": "2025-12-26T10:30:00Z"
  }
}
```

**Cookies Set:**

- `access_token`: 15 minutes expiry
- `refresh_token`: 7 days expiry

---

### 2. Login User

```
POST /auth/login
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "CASHIER",
    "is_active": true
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid email or password
- `401 Unauthorized`: User account is inactive

---

### 3. Logout User

```
POST /auth/logout
```

**Request:** No body required

**Response (200):**

```json
{
  "message": "Logout successful"
}
```

**Effect:** Clears `access_token` and `refresh_token` cookies

---

### 4. Refresh Token (Optional)

```
POST /auth/refresh
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**

```json
{
  "message": "Token refreshed",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

---

## 🔒 Authentication Flow

### 1. **Registration**

```
User → Register (first_name, last_name, email, password)
       ↓
    Create User in MongoDB (password hashed)
       ↓
    Generate JWT tokens (access + refresh)
       ↓
    Set cookies + Return tokens
```

### 2. **Login**

```
User → Login (email, password)
       ↓
    Find user by email
       ↓
    Verify password with bcrypt
       ↓
    Check if user is active
       ↓
    Generate JWT tokens
       ↓
    Set cookies + Return tokens
```

### 3. **Logout**

```
User → Logout
       ↓
    Clear cookies (access_token, refresh_token)
       ↓
    Return success message
```

---

## 🗄️ Database Schema

### Users Collection

```typescript
{
  _id: ObjectId,
  first_name: String,       // Required
  last_name?: String,       // Optional
  email: String,            // Required, Unique, Lowercase
  password: String,         // Hashed with bcrypt
  role: "ADMIN" | "CASHIER", // Default: CASHIER
  is_active: Boolean,       // Default: true
  is_deleted?: Boolean,     // Soft delete
  deleted_at?: Date,        // Soft delete timestamp
  createdAt: Date,          // Automatic
  updatedAt: Date           // Automatic
}
```

### Indexes

- `email: 1` (unique)
- `is_active: 1`
- `role: 1`

---

## 🔑 User Roles

| Role      | Description                                 |
| --------- | ------------------------------------------- |
| `ADMIN`   | Full system access, management capabilities |
| `CASHIER` | Point of sale operations, sales entry       |

---

## 🛡️ Security Features

1. **Password Hashing**: bcryptjs with 10 rounds
2. **JWT Tokens**:
   - Access Token: 15 minutes
   - Refresh Token: 7 days
3. **Secure Cookies**:
   - `httpOnly: true` (prevent XSS)
   - `secure: true` (HTTPS only)
   - `sameSite: strict` (CSRF protection)
4. **User Status Check**: Only active users can login
5. **Input Validation**: Class-validator on all DTOs

---

## 📝 Configuration

### Environment Variables (.env)

```bash
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/erp_database
```

---

## 🧪 Testing with cURL

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "password": "SecurePassword123",
    "role": "CASHIER"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'
```

### Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Cookie: access_token=TOKEN; refresh_token=TOKEN"
```

---

## 📚 Files Modified

1. **auth.service.ts** - Core authentication logic (login, register, logout)
2. **auth.controller.ts** - API endpoints
3. **auth.module.ts** - Module configuration
4. **users.service.ts** - User CRUD operations
5. **users.schema.ts** - MongoDB schema update
6. **create-user.dto.ts** - User registration DTO
7. **login.dto.ts** - Login DTO
8. **app.module.ts** - Auth module import

---

## ✅ Features Implemented

- ✅ User Registration with email validation
- ✅ User Login with password verification
- ✅ User Logout with cookie clearing
- ✅ JWT token generation (access + refresh)
- ✅ Secure password hashing (bcrypt)
- ✅ User role management (ADMIN, CASHIER)
- ✅ User status checking (is_active)
- ✅ Input validation with class-validator
- ✅ MongoDB integration
- ✅ Swagger API documentation ready

---

## 🚀 Next Steps (Optional)

1. Implement JWT Guards for protected routes
2. Add refresh token rotation
3. Implement token blacklist (logout all sessions)
4. Add email verification flow
5. Add password reset functionality
6. Implement 2FA (Two-Factor Authentication)
7. Add login history/audit trail
8. Implement session management

---

**Last Updated:** December 26, 2025
**Status:** Ready for Testing
