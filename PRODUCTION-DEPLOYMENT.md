# 🚀 BoardOS Production Deployment Guide

This guide provides step-by-step instructions for deploying BoardOS to production with enterprise-grade security, monitoring, and reliability.

## 📋 Pre-Deployment Checklist

### 1. Security Validation
```bash
# Run security checks
npm run security:check

# Verify all security files exist
ls -la public/.well-known/security.txt
ls -la Dockerfile
ls -la docker-compose.yml
```

### 2. Environment Setup
```bash
# Copy and configure production environment
cp .env.example .env.production

# Required variables:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your_production_anon_key
# VITE_APP_URL=https://yourdomain.com
# VITE_SENTRY_DSN=https://your-sentry-dsn
# VITE_ENVIRONMENT=production
```

### 3. Test Production Build
```bash
# Build and test locally
npm run prod:preview

# Verify health endpoint
curl -f http://localhost:5174/health
```

## 🐳 Docker Deployment (Recommended)

### Quick Start
```bash
# Production deployment
npm run docker:prod

# Verify deployment
npm run health:docker
```

### Manual Docker Setup
```bash
# 1. Build the image
docker build -t boardos:latest .

# 2. Create network
docker network create boardos-network

# 3. Run production stack
docker-compose -f docker-compose.yml up -d

# 4. Check services
docker-compose ps
docker-compose logs boardos
```

### With Monitoring
```bash
# Start with full monitoring stack
npm run monitoring:start

# Access services:
# - App: http://localhost
# - Traefik Dashboard: http://localhost:8080
# - Prometheus: http://localhost:9090  
# - Grafana: http://localhost:3000
```

## ☁️ Cloud Platform Deployment

### Vercel (Static Hosting)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

### Netlify
```bash
# Build command: npm run build
# Publish directory: dist
# Environment variables: Configure in Netlify UI
```

### Railway
```bash
# Connect GitHub repo to Railway
# Set environment variables
# Deploy automatically on push
```

### AWS/Azure/GCP
See detailed cloud deployment guides in `docs/06-deployment/`

## 🔒 Security Configuration

### 1. SSL/TLS Setup
```bash
# Let's Encrypt with Traefik (automatic)
# Certificates stored in ./data/letsencrypt/

# Manual certificate setup
mkdir -p ./ssl
# Copy your certificates to ./ssl/
```

### 2. Firewall Rules
```bash
# Allow only necessary ports
# 80 (HTTP - redirects to HTTPS)
# 443 (HTTPS)
# 22 (SSH - restrict to admin IPs)
```

### 3. Security Headers Verification
```bash
# Test security headers
curl -I https://yourdomain.com | grep -E "(X-|Content-Security|Strict-Transport)"
```

## 📊 Monitoring & Alerting

### Health Checks
```bash
# Application health
curl https://yourdomain.com/health

# Docker health
docker exec boardos-app /usr/local/bin/health-check.sh

# Detailed health (in browser console)
window.healthCheck.full()
```

### Log Aggregation
```bash
# View application logs
docker-compose logs -f boardos

# Prometheus metrics
curl http://localhost:9090/metrics

# Loki logs
curl http://localhost:3100/ready
```

### Alerting Setup
1. Configure Prometheus alerts in `config/alerts.yml`
2. Set up notification channels (Slack, email, PagerDuty)
3. Test alert delivery

## 💾 Backup & Recovery

### Automated Backups
```bash
# Create backup
npm run backup:create

# Backups stored in ./backups/ with rotation
# Automated daily backups at 2 AM UTC
```

### Manual Backup
```bash
# Export application data
docker exec -it boardos-app tar czf /tmp/app-data.tar.gz /usr/share/nginx/html

# Export Docker volumes
docker run --rm -v boardos_letsencrypt-data:/data -v $(pwd)/backups:/backup alpine \
  tar czf /backup/volumes-$(date +%Y%m%d).tar.gz -C /data .
```

### Disaster Recovery
```bash
# Restore from backup
cd backups
tar xzf latest-backup.tar.gz
# Follow restoration procedures in disaster recovery plan
```

## 🔧 Maintenance

### Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and deploy
npm run prod:deploy
docker-compose up -d --build

# Verify deployment
npm run health:docker
```

### Scaling
```bash
# Horizontal scaling with Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.yml boardos

# Or with Kubernetes
kubectl apply -f k8s/
```

### Performance Optimization
```bash
# Enable CDN caching for static assets
# Configure Cloudflare or AWS CloudFront

# Database optimization
# Monitor query performance in Supabase dashboard
# Set up read replicas if needed
```

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check environment variables
docker exec boardos-app env | grep VITE_

# Check logs
docker-compose logs boardos
```

#### SSL Certificate Issues
```bash
# Check certificate status
docker exec boardos-proxy traefik healthcheck

# Renew certificates manually
docker exec boardos-proxy rm -rf /letsencrypt/acme.json
docker-compose restart traefik
```

#### Database Connection Issues
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" "https://your-project.supabase.co/rest/v1/resources?limit=1"
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Analyze bundle size
npm run build -- --analyze

# Monitor with Prometheus
# Access http://localhost:9090
```

### Emergency Procedures

#### Immediate Rollback
```bash
# Stop current deployment
docker-compose down

# Deploy previous version
git checkout PREVIOUS_VERSION
npm run docker:prod
```

#### Database Recovery
```bash
# Restore from Supabase backup
# Use Point-in-Time Recovery in Supabase dashboard
```

## 📞 Support & Monitoring

### Health Monitoring URLs
- **Application Health**: `https://yourdomain.com/health`
- **Traefik Dashboard**: `https://traefik.yourdomain.com`
- **Prometheus Metrics**: `https://metrics.yourdomain.com`
- **Status Page**: `https://status.yourdomain.com`

### Critical Alerts
Configure alerts for:
- Application down (health check fails)
- High error rate (>1% 5xx responses)
- Certificate expiry (30 days warning)
- Disk space low (<20% free)
- Memory usage high (>80%)

### Contact Information
- **Security Issues**: security@boardos.com
- **Technical Support**: support@boardos.com
- **Emergency Contact**: +1-555-BOARDOS

## 📈 Performance Baselines

### Target Metrics
- **Page Load Time**: <3 seconds (95th percentile)
- **API Response Time**: <200ms (average)
- **Uptime**: 99.9%
- **Error Rate**: <0.1%
- **Security Score**: A+ (SSLLabs)

### Monitoring Dashboard
Access comprehensive metrics at: `https://dashboard.yourdomain.com`

---

## 🎉 Deployment Complete!

Your BoardOS application is now running in production with:

✅ **Enterprise Security** - CSP, HSTS, security headers  
✅ **High Availability** - Docker Swarm or Kubernetes ready  
✅ **Comprehensive Monitoring** - Metrics, logs, alerts  
✅ **Automated Backups** - Daily backups with retention  
✅ **SSL/TLS Encryption** - Automatic certificate management  
✅ **Performance Optimization** - CDN, compression, caching  

**Next Steps:**
1. Set up monitoring alerts
2. Configure backup notifications  
3. Schedule security audits
4. Plan capacity scaling
5. Document incident response procedures

For detailed configuration options, see the complete documentation in `docs/06-deployment/`.