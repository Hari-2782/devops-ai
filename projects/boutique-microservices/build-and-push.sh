#!/bin/bash
ECR_REGISTRY="423535493604.dkr.ecr.us-east-1.amazonaws.com"

# Backend services
SERVICES=("auth" "gateway" "order-service" "orders" "product-service" "user-service")

for service in "${SERVICES[@]}"; do
    echo "========================================"
    echo "Building $service..."
    echo "========================================"
    docker build -t $service backend/services/$service/
    docker tag $service:latest $ECR_REGISTRY/$service:latest
    docker push $ECR_REGISTRY/$service:latest
    echo "✓ $service pushed successfully"
    echo ""
done

# Frontend
echo "========================================"
echo "Building frontend..."
echo "========================================"
docker build -t frontend frontend/
docker tag frontend:latest $ECR_REGISTRY/frontend:latest
docker push $ECR_REGISTRY/frontend:latest
echo "✓ frontend pushed successfully"

echo "========================================"
echo "All images built and pushed!"
echo "========================================"
