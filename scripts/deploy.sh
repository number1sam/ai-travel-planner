#!/bin/bash

# Deployment script for Travel Agent application
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="travel-agent"
APP_NAME="travel-agent"
IMAGE_TAG=${1:-latest}
ENVIRONMENT=${2:-production}

echo -e "${GREEN}🚀 Starting deployment of ${APP_NAME} (${IMAGE_TAG}) to ${ENVIRONMENT}${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    if ! command_exists kubectl; then
        echo -e "${RED}❌ kubectl is not installed${NC}"
        exit 1
    fi
    
    if ! command_exists docker; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Build Docker image
build_image() {
    echo -e "${YELLOW}Building Docker image...${NC}"
    
    # Build the application
    docker build -t ${APP_NAME}:${IMAGE_TAG} .
    
    # Tag for registry (modify for your registry)
    # docker tag ${APP_NAME}:${IMAGE_TAG} your-registry.com/${APP_NAME}:${IMAGE_TAG}
    
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
}

# Push image to registry
push_image() {
    echo -e "${YELLOW}Pushing image to registry...${NC}"
    
    # Push to registry (uncomment and modify for your registry)
    # docker push your-registry.com/${APP_NAME}:${IMAGE_TAG}
    
    echo -e "${GREEN}✅ Image pushed to registry${NC}"
}

# Create namespace if it doesn't exist
create_namespace() {
    echo -e "${YELLOW}Creating namespace if it doesn't exist...${NC}"
    
    if ! kubectl get namespace ${NAMESPACE} >/dev/null 2>&1; then
        kubectl apply -f k8s/namespace.yaml
        echo -e "${GREEN}✅ Namespace created${NC}"
    else
        echo -e "${GREEN}✅ Namespace already exists${NC}"
    fi
}

# Apply secrets (ensure they exist)
apply_secrets() {
    echo -e "${YELLOW}Applying secrets...${NC}"
    
    # Check if secrets file exists
    if [ ! -f "k8s/secrets.yaml" ]; then
        echo -e "${RED}❌ secrets.yaml not found. Please create it from secrets.yaml.template${NC}"
        exit 1
    fi
    
    kubectl apply -f k8s/secrets.yaml
    echo -e "${GREEN}✅ Secrets applied${NC}"
}

# Apply configuration
apply_config() {
    echo -e "${YELLOW}Applying configuration...${NC}"
    
    kubectl apply -f k8s/configmap.yaml
    echo -e "${GREEN}✅ Configuration applied${NC}"
}

# Deploy database
deploy_database() {
    echo -e "${YELLOW}Deploying PostgreSQL...${NC}"
    
    kubectl apply -f k8s/postgres.yaml
    
    # Wait for PostgreSQL to be ready
    echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
    kubectl wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE} --timeout=300s
    
    echo -e "${GREEN}✅ PostgreSQL deployed and ready${NC}"
}

# Deploy Redis
deploy_redis() {
    echo -e "${YELLOW}Deploying Redis...${NC}"
    
    kubectl apply -f k8s/redis.yaml
    
    # Wait for Redis to be ready
    echo -e "${YELLOW}Waiting for Redis to be ready...${NC}"
    kubectl wait --for=condition=ready pod -l app=redis -n ${NAMESPACE} --timeout=300s
    
    echo -e "${GREEN}✅ Redis deployed and ready${NC}"
}

# Run database migrations
run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    
    # Create a temporary pod to run migrations
    kubectl run migrations-$(date +%s) \
        --image=${APP_NAME}:${IMAGE_TAG} \
        --rm -i --restart=Never \
        --namespace=${NAMESPACE} \
        --env="DATABASE_URL=$(kubectl get secret travel-agent-secrets -n ${NAMESPACE} -o jsonpath='{.data.DATABASE_URL}' | base64 -d)" \
        -- npx prisma migrate deploy
    
    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Deploy application
deploy_app() {
    echo -e "${YELLOW}Deploying application...${NC}"
    
    # Update image tag in deployment
    sed -i.bak "s|image: travel-agent:latest|image: ${APP_NAME}:${IMAGE_TAG}|g" k8s/app.yaml
    
    kubectl apply -f k8s/app.yaml
    
    # Wait for deployment to be ready
    echo -e "${YELLOW}Waiting for application to be ready...${NC}"
    kubectl rollout status deployment/travel-agent-app -n ${NAMESPACE} --timeout=600s
    
    # Restore original file
    mv k8s/app.yaml.bak k8s/app.yaml
    
    echo -e "${GREEN}✅ Application deployed and ready${NC}"
}

# Deploy Nginx
deploy_nginx() {
    echo -e "${YELLOW}Deploying Nginx...${NC}"
    
    kubectl apply -f k8s/nginx.yaml
    
    # Wait for Nginx to be ready
    echo -e "${YELLOW}Waiting for Nginx to be ready...${NC}"
    kubectl rollout status deployment/nginx -n ${NAMESPACE} --timeout=300s
    
    echo -e "${GREEN}✅ Nginx deployed and ready${NC}"
}

# Deploy monitoring (optional)
deploy_monitoring() {
    if [ "$3" = "with-monitoring" ]; then
        echo -e "${YELLOW}Deploying monitoring stack...${NC}"
        
        kubectl apply -f k8s/monitoring.yaml
        
        echo -e "${GREEN}✅ Monitoring stack deployed${NC}"
    fi
}

# Deploy backup jobs
deploy_backup_jobs() {
    echo -e "${YELLOW}Deploying backup jobs...${NC}"
    
    kubectl apply -f k8s/backup-cronjob.yaml
    
    echo -e "${GREEN}✅ Backup jobs deployed${NC}"
}

# Health check
health_check() {
    echo -e "${YELLOW}Performing health check...${NC}"
    
    # Get service external IP
    EXTERNAL_IP=$(kubectl get service nginx -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    
    if [ -z "$EXTERNAL_IP" ]; then
        echo -e "${YELLOW}⚠️  External IP not yet assigned. Using port-forward for health check...${NC}"
        kubectl port-forward service/nginx 8080:80 -n ${NAMESPACE} &
        PORT_FORWARD_PID=$!
        sleep 5
        
        if curl -f http://localhost:8080/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed${NC}"
        else
            echo -e "${RED}❌ Health check failed${NC}"
            kill $PORT_FORWARD_PID
            exit 1
        fi
        
        kill $PORT_FORWARD_PID
    else
        if curl -f http://${EXTERNAL_IP}/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed${NC}"
            echo -e "${GREEN}🌐 Application available at: http://${EXTERNAL_IP}${NC}"
        else
            echo -e "${RED}❌ Health check failed${NC}"
            exit 1
        fi
    fi
}

# Show deployment status
show_status() {
    echo -e "${YELLOW}Deployment Status:${NC}"
    echo "===================="
    
    kubectl get pods -n ${NAMESPACE}
    echo ""
    kubectl get services -n ${NAMESPACE}
    echo ""
    kubectl get ingress -n ${NAMESPACE}
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Rollback function
rollback() {
    echo -e "${YELLOW}Rolling back deployment...${NC}"
    
    kubectl rollout undo deployment/travel-agent-app -n ${NAMESPACE}
    kubectl rollout status deployment/travel-agent-app -n ${NAMESPACE}
    
    echo -e "${GREEN}✅ Rollback completed${NC}"
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}Cleaning up resources...${NC}"
    
    kubectl delete namespace ${NAMESPACE}
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Main deployment flow
main() {
    case "${1}" in
        "build")
            check_prerequisites
            build_image
            ;;
        "deploy")
            check_prerequisites
            create_namespace
            apply_secrets
            apply_config
            deploy_database
            deploy_redis
            run_migrations
            deploy_app
            deploy_nginx
            deploy_monitoring
            deploy_backup_jobs
            health_check
            show_status
            ;;
        "rollback")
            rollback
            ;;
        "cleanup")
            cleanup
            ;;
        "status")
            show_status
            ;;
        *)
            echo "Usage: $0 {build|deploy|rollback|cleanup|status} [image_tag] [environment] [with-monitoring]"
            echo ""
            echo "Commands:"
            echo "  build     - Build Docker image"
            echo "  deploy    - Full deployment"
            echo "  rollback  - Rollback to previous version"
            echo "  cleanup   - Remove all resources"
            echo "  status    - Show deployment status"
            echo ""
            echo "Examples:"
            echo "  $0 build latest"
            echo "  $0 deploy latest production"
            echo "  $0 deploy latest production with-monitoring"
            echo "  $0 rollback"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'echo -e "${RED}❌ Deployment interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"