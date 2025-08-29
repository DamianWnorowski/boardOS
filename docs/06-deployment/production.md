---
title: Production Deployment Guide
category: deployment
tags: [deployment, production, optimization, hosting]
related: [/06-deployment/supabase-setup.md, /06-deployment/environment-variables.md]
last-updated: 2025-08-29
---

# Production Deployment Guide

## Quick Answer
Deploy BoardOS to production using `npm run build`, configure environment variables, set up a reverse proxy with NGINX/Apache, enable HTTPS, and optimize with CDN. The application runs as a static SPA that connects to Supabase backend.

## Prerequisites

### System Requirements
- Node.js 18+ and npm 9+
- 2GB RAM minimum (4GB recommended)
- 10GB storage for build artifacts and logs
- HTTPS certificate (Let's Encrypt recommended)
- Domain name configured with DNS

### Required Services
- Supabase project (database + auth)
- CDN (optional but recommended)
- Error tracking service (Sentry recommended)
- Analytics (optional)

## Build Process

### 1. Production Build

```bash
# Install dependencies
npm ci --production=false

# Run tests before build
npm test

# Create optimized production build
npm run build

# Build output in dist/ directory
ls -la dist/
```

### 2. Build Optimization

```javascript
// vite.config.ts optimizations
export default defineConfig({
  build: {
    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['framer-motion', '@dnd-kit/core', '@dnd-kit/sortable'],
          'supabase': ['@supabase/supabase-js'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // Asset optimization
    assetsInlineLimit: 4096,
    
    // Source maps for production debugging
    sourcemap: 'hidden',
    
    // Target modern browsers
    target: 'es2020'
  }
});
```

### 3. Environment Configuration

```bash
# Production .env file
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_APP_URL=https://boardos.yourdomain.com
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_ENVIRONMENT=production
```

## Deployment Options

### Option 1: Static Hosting (Recommended)

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure vercel.json
```

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### Netlify Deployment
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Option 2: VPS/Cloud Server

#### NGINX Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name boardos.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/boardos.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/boardos.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Root directory
    root /var/www/boardos/dist;
    index index.html;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy (if needed)
    location /api {
        proxy_pass https://your-project.supabase.co;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name boardos.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName boardos.yourdomain.com
    DocumentRoot /var/www/boardos/dist
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/boardos.yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/boardos.yourdomain.com/privkey.pem
    
    # Security Headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Enable compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
    </IfModule>
    
    # Cache static assets
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        Header set Cache-Control "max-age=31536000, public, immutable"
    </FilesMatch>
    
    # SPA routing
    <Directory /var/www/boardos/dist>
        Options -MultiViews
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteRule ^ index.html [QSA,L]
    </Directory>
</VirtualHost>
```

### Option 3: Docker Deployment

#### Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  boardos:
    build: .
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
    volumes:
      - ./ssl:/etc/nginx/ssl
      - ./logs:/var/log/nginx
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Performance Optimization

### 1. CDN Configuration

#### Cloudflare Setup
```javascript
// Cloudflare Page Rules
*.boardos.com/*
├── Cache Level: Cache Everything
├── Edge Cache TTL: 1 month
└── Browser Cache TTL: 1 year

// Exclude API routes
api.boardos.com/*
└── Cache Level: Bypass
```

### 2. Asset Optimization

```bash
# Image optimization
npx sharp-cli optimize images/**/*.{jpg,png} --output dist/images

# Font subsetting
npx subfont dist/index.html --inline-css --in-place

# Bundle analysis
npx vite-bundle-visualizer
```

### 3. Lazy Loading

```typescript
// Route-based code splitting
const Board = lazy(() => import('./components/Board'));
const Settings = lazy(() => import('./components/Settings'));
const Reports = lazy(() => import('./components/Reports'));

// Component lazy loading
const HeavyComponent = lazy(() => 
  import(/* webpackChunkName: "heavy" */ './components/HeavyComponent')
);
```

### 4. Service Worker

```javascript
// sw.js - Offline support
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('boardos-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/assets/logo.svg'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

## Monitoring & Logging

### 1. Application Monitoring

```typescript
// Sentry integration
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});
```

### 2. Performance Monitoring

```javascript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' }
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 3. Error Boundaries

```typescript
// Global error boundary
class GlobalErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Global error:', error, errorInfo);
    Sentry.captureException(error, {
      contexts: { react: errorInfo }
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

## Health Checks

### Application Health Endpoint
```typescript
// health.ts
export const healthCheck = async (): Promise<HealthStatus> => {
  const checks = {
    app: true,
    database: false,
    auth: false
  };
  
  try {
    // Check database connection
    const { error: dbError } = await supabase
      .from('jobs')
      .select('count')
      .single();
    checks.database = !dbError;
    
    // Check auth service
    const { error: authError } = await supabase.auth.getSession();
    checks.auth = !authError;
  } catch (error) {
    console.error('Health check failed:', error);
  }
  
  return {
    status: Object.values(checks).every(v => v) ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  };
};
```

## Deployment Checklist

### Pre-Deployment
- [ ] Run full test suite (`npm test`)
- [ ] Check bundle size (`npm run build -- --analyze`)
- [ ] Review environment variables
- [ ] Backup database
- [ ] Update dependencies (`npm audit`)
- [ ] Review security headers
- [ ] Test in staging environment

### Deployment
- [ ] Deploy database migrations
- [ ] Build production bundle
- [ ] Upload static assets to CDN
- [ ] Deploy application files
- [ ] Update DNS if needed
- [ ] Clear CDN cache
- [ ] Verify SSL certificates

### Post-Deployment
- [ ] Smoke test critical paths
- [ ] Check error tracking
- [ ] Monitor performance metrics
- [ ] Verify real-time features
- [ ] Check mobile responsiveness
- [ ] Test offline functionality
- [ ] Document deployment version

## Rollback Strategy

```bash
#!/bin/bash
# rollback.sh

# Store previous version
PREVIOUS_VERSION=$(cat .last-deployment)
CURRENT_VERSION=$(git rev-parse HEAD)

# Rollback function
rollback() {
  echo "Rolling back to $PREVIOUS_VERSION"
  
  # Restore previous build
  cp -r backups/$PREVIOUS_VERSION/* dist/
  
  # Clear CDN cache
  curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}'
  
  # Notify team
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"Rolled back to version $PREVIOUS_VERSION\"}"
}

# Health check after deployment
if ! curl -f https://boardos.yourdomain.com/health; then
  rollback
  exit 1
fi

echo $CURRENT_VERSION > .last-deployment
```

## Troubleshooting

### Common Issues

#### 1. Blank Page After Deployment
- Check browser console for errors
- Verify environment variables are set
- Check CORS configuration
- Verify file permissions

#### 2. Real-time Not Working
- Check WebSocket connections
- Verify Supabase real-time is enabled
- Check firewall rules for WSS

#### 3. Slow Performance
- Enable gzip compression
- Check CDN configuration
- Review bundle size
- Enable browser caching

#### 4. Authentication Issues
- Verify Supabase URL and keys
- Check redirect URLs in Supabase
- Verify HTTPS is enabled

The production deployment ensures BoardOS runs efficiently, securely, and reliably in production environments.