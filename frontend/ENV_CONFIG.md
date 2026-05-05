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

- **REACT_APP_API_URL**: Backend API base URL
  - Development: `http://localhost:8000`
  - Production: `https://api.yourdomain.com`

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

### Production (.env.production)
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENABLE_AUTH=true
```

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
