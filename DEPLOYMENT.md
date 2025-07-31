# AI Travel & Health Planner - Deployment Guide

This document provides comprehensive instructions for deploying the AI Travel & Health Planner application using Docker and Kubernetes.

## Prerequisites

- Docker 20.10+
- Kubernetes 1.24+
- kubectl configured for your cluster
- Helm 3.0+ (optional, for easier deployments)
- Node.js 18+ (for local development)

## Environment Setup

### 1. Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

**Critical Environment Variables to Configure:**

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Strong random keys for JWT tokens
- `PII_ENCRYPTION_KEY`: 32-character key for encrypting sensitive data
- `STRIPE_SECRET_KEY`: Stripe payment processing key
- `OPENAI_API_KEY`: For AI trip planning features
- All external API keys for travel services

### 2. Kubernetes Secrets

**Important:** Never commit actual secrets to version control. Use Kubernetes secrets or external secret management systems.

```bash
# Create secrets from environment file
kubectl create secret generic travel-agent-secrets \
  --from-env-file=.env \
  --namespace=travel-agent
```

## Deployment Methods

### Method 1: Docker Compose (Development/Testing)

For local development and testing:

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- Application: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Grafana: http://localhost:3001 (admin/admin123)
- Prometheus: http://localhost:9090

### Method 2: Kubernetes Deployment (Production)

#### Automated Deployment Script

Use the provided deployment script for easy deployment:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Build Docker image
./scripts/deploy.sh build latest

# Full deployment
./scripts/deploy.sh deploy latest production

# With monitoring stack
./scripts/deploy.sh deploy latest production with-monitoring

# Check deployment status
./scripts/deploy.sh status

# Rollback if needed
./scripts/deploy.sh rollback

# Cleanup (removes everything)
./scripts/deploy.sh cleanup
```

#### Manual Kubernetes Deployment

1. **Create Namespace:**
```bash
kubectl apply -f k8s/namespace.yaml
```

2. **Apply Secrets:**
```bash
# Edit k8s/secrets.yaml with your actual secrets first
kubectl apply -f k8s/secrets.yaml
```

3. **Apply Configuration:**
```bash
kubectl apply -f k8s/configmap.yaml
```

4. **Deploy Database:**
```bash
kubectl apply -f k8s/postgres.yaml
# Wait for database to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n travel-agent --timeout=300s
```

5. **Deploy Redis:**
```bash
kubectl apply -f k8s/redis.yaml
# Wait for Redis to be ready
kubectl wait --for=condition=ready pod -l app=redis -n travel-agent --timeout=300s
```

6. **Run Database Migrations:**
```bash
kubectl run migrations-$(date +%s) \
  --image=travel-agent:latest \
  --rm -i --restart=Never \
  --namespace=travel-agent \
  --env="DATABASE_URL=$(kubectl get secret travel-agent-secrets -n travel-agent -o jsonpath='{.data.DATABASE_URL}' | base64 -d)" \
  -- npx prisma migrate deploy
```

7. **Deploy Application:**
```bash
kubectl apply -f k8s/app.yaml
# Wait for application to be ready
kubectl rollout status deployment/travel-agent-app -n travel-agent
```

8. **Deploy Nginx (Load Balancer):**
```bash
kubectl apply -f k8s/nginx.yaml
```

9. **Deploy Monitoring (Optional):**
```bash
kubectl apply -f k8s/monitoring.yaml
```

10. **Deploy Backup Jobs:**
```bash
kubectl apply -f k8s/backup-cronjob.yaml
```

## Security Configuration

### 1. TLS/SSL Certificates

For production, configure SSL certificates:

```bash
# Using cert-manager with Let's Encrypt
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@your-domain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 2. Network Policies

Apply network policies for enhanced security:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: travel-agent-network-policy
  namespace: travel-agent
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: travel-agent
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
  - to:
    - namespaceSelector:
        matchLabels:
          name: travel-agent
EOF
```

## Monitoring and Observability

### 1. Health Checks

The application provides comprehensive health checks:

```bash
# Check application health
curl http://your-domain.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {"status": "healthy", "response_time": 25},
    "redis": {"status": "healthy"},
    "response_time": "30ms"
  }
}
```

### 2. Metrics and Logging

- **Prometheus**: Metrics collection on port 9090
- **Grafana**: Dashboards and visualization on port 3000
- **Application logs**: Available via `kubectl logs`

```bash
# View application logs
kubectl logs -f deployment/travel-agent-app -n travel-agent

# View all pod logs
kubectl logs -f -l app=travel-agent-app -n travel-agent
```

### 3. Alerts

Key alerts configured:
- High error rate (>10% for 10 minutes)
- High memory usage (>90%)
- Database/Redis connectivity issues
- Application down

## Backup and Disaster Recovery

### 1. Automated Backups

Backup jobs run automatically:
- **PostgreSQL**: Daily at 2 AM
- **Redis**: Daily at 3 AM
- **Security cleanup**: Daily at 4 AM

### 2. Manual Backup

```bash
# Trigger manual backup
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n travel-agent
```

### 3. Restore from Backup

```bash
# List available backups
kubectl exec -it postgres-pod -n travel-agent -- ls /backups

# Restore from backup
kubectl exec -it postgres-pod -n travel-agent -- \
  psql $DATABASE_URL < /backups/postgres-backup-YYYYMMDD-HHMMSS.sql
```

## Scaling

### 1. Horizontal Pod Autoscaling

The application is configured with HPA:
- Min replicas: 3
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

### 2. Manual Scaling

```bash
# Scale application pods
kubectl scale deployment travel-agent-app --replicas=5 -n travel-agent

# Scale database (not recommended for production)
kubectl scale deployment postgres --replicas=1 -n travel-agent
```

### 3. Cluster Autoscaling

Configure cluster autoscaling based on your cloud provider:

**AWS EKS:**
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues:**
```bash
# Check database pod logs
kubectl logs -f deployment/postgres -n travel-agent

# Test database connectivity
kubectl run db-test --image=postgres:15-alpine --rm -it --restart=Never -n travel-agent -- psql $DATABASE_URL
```

2. **Application Not Starting:**
```bash
# Check application logs
kubectl logs -f deployment/travel-agent-app -n travel-agent

# Describe pod for more details
kubectl describe pod -l app=travel-agent-app -n travel-agent
```

3. **Out of Memory Issues:**
```bash
# Check resource usage
kubectl top pods -n travel-agent

# Increase memory limits in k8s/app.yaml
```

### Debug Mode

Enable debug logging:

```bash
kubectl set env deployment/travel-agent-app LOG_LEVEL=debug -n travel-agent
```

## Security Checklist

- [ ] All secrets are stored in Kubernetes secrets, not in code
- [ ] Database passwords are strong and rotated regularly
- [ ] TLS/SSL certificates are configured and auto-renewing
- [ ] Network policies are applied
- [ ] GDPR compliance features are enabled
- [ ] Audit logging is enabled
- [ ] Security monitoring is active
- [ ] Backup encryption is enabled
- [ ] Rate limiting is configured

## Performance Optimization

### 1. Database Optimization

```sql
-- Create additional indexes for performance
CREATE INDEX CONCURRENTLY idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX CONCURRENTLY idx_trips_user_status ON trips(user_id, status);
CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp ON audit_logs(timestamp);
```

### 2. Redis Configuration

Optimize Redis for caching:

```yaml
# In k8s/redis.yaml
command:
  - redis-server
  - --maxmemory
  - 1gb
  - --maxmemory-policy
  - allkeys-lru
  - --save
  - ""  # Disable RDB persistence for pure cache
```

### 3. Application Optimization

- Use Redis for session storage
- Implement proper caching strategies
- Optimize database queries
- Use CDN for static assets

## Maintenance

### Regular Tasks

1. **Weekly:**
   - Review security alerts
   - Check backup integrity
   - Monitor resource usage

2. **Monthly:**
   - Update dependencies
   - Rotate secrets
   - Review and clean up old data

3. **Quarterly:**
   - Security audit
   - Performance review
   - Disaster recovery testing

### Updates and Upgrades

```bash
# Update application
./scripts/deploy.sh deploy v1.1.0 production

# Update Kubernetes resources
kubectl apply -f k8s/ -n travel-agent

# Rolling update with zero downtime
kubectl set image deployment/travel-agent-app app=travel-agent:v1.1.0 -n travel-agent
```

## Support

For deployment issues:

1. Check application logs: `kubectl logs -f deployment/travel-agent-app -n travel-agent`
2. Verify configuration: `kubectl get configmap travel-agent-config -o yaml -n travel-agent`
3. Check resource usage: `kubectl top pods -n travel-agent`
4. Review ingress: `kubectl describe ingress travel-agent-ingress -n travel-agent`

For more detailed troubleshooting, enable debug logging and check the monitoring dashboards in Grafana.