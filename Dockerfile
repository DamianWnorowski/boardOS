# ==============================
# Multi-stage Dockerfile for BoardOS Production Deployment
# ==============================

# Build stage
FROM node:20-alpine AS builder

LABEL maintainer="BoardOS Team"
LABEL description="BoardOS Construction Scheduler - Build Stage"

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with clean cache
RUN npm ci --only=production=false --frozen-lockfile && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build && \
    npm run docs:build

# ==============================
# Production stage
FROM nginx:1.25-alpine AS production

LABEL maintainer="BoardOS Team"
LABEL description="BoardOS Construction Scheduler - Production"

# Install security updates and tools
RUN apk update && apk upgrade && apk add --no-cache \
    curl \
    tzdata \
    tini

# Create nginx user and group
RUN addgroup -g 1001 nginx-app && \
    adduser -D -s /bin/sh -u 1001 -G nginx-app nginx-app

# Remove default nginx config
RUN rm -rf /usr/share/nginx/html/* && \
    rm /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder --chown=nginx-app:nginx-app /app/dist /usr/share/nginx/html

# Copy documentation
COPY --from=builder --chown=nginx-app:nginx-app /app/docs /usr/share/nginx/html/docs

# Create nginx configuration
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
# BoardOS Production Configuration
server {
    listen 8080;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self';" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Remove server tokens
    server_tokens off;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/javascript
        application/json
        application/xml
        text/css
        text/javascript
        text/plain
        text/xml;
    
    # Root directory
    root /usr/share/nginx/html;
    index index.html;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform, immutable";
        access_log off;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Documentation
    location /docs {
        alias /usr/share/nginx/html/docs;
        try_files $uri $uri/ /docs/index.html;
    }
    
    # SPA routing - must be last
    location / {
        try_files $uri $uri/ /index.html;
        
        # Security headers for HTML
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        internal;
        root /usr/share/nginx/html;
    }
}
EOF

# Update nginx main config for security
RUN sed -i 's/user nginx;/user nginx-app nginx-app;/' /etc/nginx/nginx.conf && \
    sed -i 's/worker_processes auto;/worker_processes 1;/' /etc/nginx/nginx.conf && \
    echo 'client_max_body_size 10M;' >> /etc/nginx/nginx.conf

# Create health check script
RUN cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/sh
# Health check script for Docker and Kubernetes
curl -f http://localhost:8080/health || exit 1
EOF
RUN chmod +x /usr/local/bin/health-check.sh

# Set proper permissions
RUN chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    chown -R nginx-app:nginx-app /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx-app:nginx-app /var/run/nginx.pid

# Switch to non-root user
USER nginx-app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/usr/local/bin/health-check.sh"]

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]