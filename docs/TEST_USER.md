# Test User

Single test account for agent login testing.

## Credentials

```
Email:    test@example.com
Password: TestPassword123
```

## Create (User Only)

```bash
pnpm task db:seed -- --mode=user-only
```

## Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'
```

Or use `/auth/login` page.
