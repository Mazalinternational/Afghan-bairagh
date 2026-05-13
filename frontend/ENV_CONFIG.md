# Frontend Environment Configuration

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Update the values in `.env` based on your environment

## Environment Variables

### Required Variables

- **REACT_APP_API_URL**: Backend API base URL (no `/api` suffix)
  - Development: `http://localhost:8000` (`.env`)
  - Production: `https://afghanflags.com` (`.env.production`; `api.js` also defaults to this if the var is missing in a production build)
  - Subdomain API only: `https://api.afghanflags.com`

### Optional Variables

- **REACT_APP_NAME**: Application name (default: Afghan Flag Management System)
- **REACT_APP_VERSION**: Application version
- **REACT_APP_ENABLE_AUTH**: Enable/disable authentication (true/false)
- **REACT_APP_ENABLE_DARK_MODE**: Enable/disable dark mode (true/false)

## Different Environments

### Development (.env)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENABLE_AUTH=false
```

### Production (`frontend/.env.production` — used by `npm run build`)
```env
REACT_APP_API_URL=https://afghanflags.com
```
Override for a one-off build:
```bash
set REACT_APP_API_URL=https://afghanflags.com&& npm run build
```
(Unix: `REACT_APP_API_URL=https://afghanflags.com npm run build`)

### Testing (.env.test)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENABLE_AUTH=false
```

## Usage in Code

Access environment variables using `process.env`:

```javascript
const apiUrl = process.env.REACT_APP_API_URL;
const appName = process.env.REACT_APP_NAME;
```

## Important Notes

- All React environment variables must start with `REACT_APP_`
- Changes to `.env` require restarting the development server
- `.env` files are ignored by git (see `.gitignore`)
- Never commit sensitive data to `.env` files
- Use `.env.example` as a template for team members
