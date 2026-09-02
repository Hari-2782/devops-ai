# Commands Reference

Complete command reference for deploying, managing, and troubleshooting the DevOps + AIOps platform.

---

## Table of Contents
1. [Prerequisites Setup](#prerequisites-setup)
2. [AWS & Infrastructure](#aws--infrastructure)
3. [Kubernetes Operations](#kubernetes-operations)
4. [Application Deployment](#application-deployment)
5. [Monitoring Commands](#monitoring-commands)
6. [Logging Commands](#logging-commands)
7. [GitOps Commands](#gitops-commands)
8. [CI/CD Commands](#cicd-commands)
9. [AIOps Commands](#aiops-commands)
10. [Database Commands](#database-commands)
11. [Debugging Commands](#debugging-commands)
12. [Maintenance Commands](#maintenance-commands)

---

## Prerequisites Setup

### Install AWS CLI
```bash
# Linux/macOS
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version
```

### Install kubectl
```bash
# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# macOS
brew install kubectl

# Verify
kubectl version --client
```

### Install Helm
```bash
# Linux/macOS
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify
helm version
```

### Install Terraform
```bash
# Linux
wget https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_amd64.zip
unzip terraform_1.5.7_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# macOS
brew install terraform

# Verify
terraform version
```

### Install eksctl (Optional)
```bash
# Linux
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# macOS
brew install eksctl

# Verify
eksctl version
```

### Install ArgoCD CLI (Optional)
```bash
# Linux
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/

# macOS
brew install argocd

# Verify
argocd version --client
```

---

## AWS & Infrastructure

### Configure AWS CLI
```bash
# Interactive configuration
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region name: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity

# Output shows:
# {
#     "UserId": "AIDAXXXXXXXXXX",
#     "Account": "423535493604",
#     "Arn": "arn:aws:iam::423535493604:user/hari"
# }
```

### Provision Infrastructure with Terraform
```bash
# Navigate to Infrastructure directory
cd projects/Infrastructure

# Initialize Terraform
terraform init

# View planned changes
terraform plan

# Apply infrastructure (creates EKS cluster, VPC, etc.)
terraform apply -auto-approve

# Show outputs
terraform output

# Destroy infrastructure (careful!)
terraform destroy -auto-approve
```

### Create EKS Cluster with eksctl
```bash
# Create cluster (alternative to Terraform)
eksctl create cluster \
  --name eks-cluster \
  --region us-east-1 \
  --version 1.27 \
  --nodegroup-name eks-nodes \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 4 \
  --managed

# Update kubeconfig
aws eks update-kubeconfig --name eks-cluster --region us-east-1

# Verify cluster
kubectl get nodes

# Delete cluster
eksctl delete cluster --name eks-cluster --region us-east-1
```

### ECR Operations
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  423535493604.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repositories
for service in frontend gateway auth product-service order-service orders user-service; do
  aws ecr create-repository \
    --repository-name boutique/$service \
    --region us-east-1 \
    --image-scanning-configuration scanOnPush=true \
    || echo "Repository $service already exists"
done

# List repositories
aws ecr describe-repositories --region us-east-1

# List images in a repository
aws ecr describe-images \
  --repository-name boutique/gateway \
  --region us-east-1

# Delete image
aws ecr batch-delete-image \
  --repository-name boutique/gateway \
  --image-ids imageTag=old-tag \
  --region us-east-1
```

---

## Kubernetes Operations

### Basic kubectl Commands
```bash
# Configure kubectl to use EKS cluster
aws eks update-kubeconfig --name eks-cluster --region us-east-1

# Get cluster info
kubectl cluster-info

# Get all namespaces
kubectl get namespaces

# Get all resources in a namespace
kubectl get all -n boutique

# Get pods
kubectl get pods -n boutique
kubectl get pods -n boutique -o wide  # More details
kubectl get pods --all-namespaces     # All namespaces
kubectl get pods -n boutique -w       # Watch mode

# Get services
kubectl get svc -n boutique

# Get deployments
kubectl get deployments -n boutique

# Get statefulsets
kubectl get statefulsets -n boutique

# Get events
kubectl get events -n boutique --sort-by='.lastTimestamp'
```

### Create Namespaces
```bash
# Create namespaces
kubectl create namespace boutique
kubectl create namespace monitoring
kubectl create namespace argocd
kubectl create namespace amazon-cloudwatch

# Or apply from file
kubectl apply -f gitops/namespace.yml
```

### Apply Manifests
```bash
# Apply single file
kubectl apply -f gitops/namespace.yml

# Apply directory
kubectl apply -f gitops/k8s/database/

# Apply with Kustomize
kubectl apply -k gitops/

# Delete resources
kubectl delete -f gitops/k8s/database/
```

### Describe Resources
```bash
# Describe pod (shows events, status, volumes)
kubectl describe pod <pod-name> -n boutique

# Describe service
kubectl describe svc gateway -n boutique

# Describe node
kubectl describe node <node-name>
```

### Scale Deployments
```bash
# Scale deployment
kubectl scale deployment gateway -n boutique --replicas=3

# Check replicas
kubectl get deployment gateway -n boutique
```

### Restart Deployments
```bash
# Restart deployment (rolling restart)
kubectl rollout restart deployment/gateway -n boutique

# Check rollout status
kubectl rollout status deployment/gateway -n boutique

# View rollout history
kubectl rollout history deployment/gateway -n boutique

# Rollback to previous version
kubectl rollout undo deployment/gateway -n boutique
```

### Labels and Annotations
```bash
# Add label to service
kubectl label svc gateway -n boutique app=gateway

# Remove label
kubectl label svc gateway -n boutique app-

# Add annotation
kubectl annotate serviceaccount fluent-bit \
  -n amazon-cloudwatch \
  eks.amazonaws.com/role-arn=arn:aws:iam::423535493604:role/FluentBitCloudWatchRole

# Show labels
kubectl get svc -n boutique --show-labels
```

---

## Application Deployment

### Build Docker Images
```bash
# Navigate to service directory
cd projects/boutique-microservices

# Set variables
export AWS_ACCOUNT_ID=423535493604
export AWS_REGION=us-east-1
export COMMIT_SHA=$(git rev-parse --short HEAD)

# Build single service
docker build -t boutique/gateway:latest \
  -f backend/services/gateway/Dockerfile \
  backend/services/gateway

# Tag for ECR
docker tag boutique/gateway:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/boutique/gateway:$COMMIT_SHA

# Push to ECR
docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/boutique/gateway:$COMMIT_SHA

# Build all services
for service in frontend gateway auth product-service order-service orders user-service; do
  echo "Building $service..."
  
  docker build -t boutique/$service:latest \
    -f $service/Dockerfile $service
  
  docker tag boutique/$service:latest \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/boutique/$service:$COMMIT_SHA
  
  docker push \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/boutique/$service:$COMMIT_SHA
done
```

### Deploy Application
```bash
# Deploy via kubectl
kubectl apply -f gitops/secrets.yml
kubectl apply -f gitops/k8s/database/
kubectl apply -f gitops/k8s/backend/
kubectl apply -f gitops/k8s/frontend/

# Wait for pods to be ready
kubectl wait --for=condition=Ready pods --all -n boutique --timeout=300s

# Check deployment
kubectl get pods -n boutique
kubectl get svc -n boutique
```

### Update Image Tags
```bash
# Update deployment image
kubectl set image deployment/gateway \
  gateway=423535493604.dkr.ecr.us-east-1.amazonaws.com/boutique/gateway:new-tag \
  -n boutique

# Or edit deployment directly
kubectl edit deployment gateway -n boutique

# Or update in Git (GitOps)
cd gitops/k8s/backend
sed -i 's|image: .*/boutique/gateway:.*|image: 423535493604.dkr.ecr.us-east-1.amazonaws.com/boutique/gateway:new-tag|' gateway.yml
git add gateway.yml
git commit -m "ci: update gateway image to new-tag"
git push origin main
```

---

## Monitoring Commands

### Install Prometheus Stack
```bash
# Add Helm repository
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack
helm install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=15d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi

# Check installation
kubectl get pods -n monitoring
kubectl wait --for=condition=Ready pods --all -n monitoring --timeout=600s
```

### Expose Prometheus
```bash
# Patch to LoadBalancer
kubectl patch svc kube-prometheus-stack-prometheus \
  -n monitoring \
  -p '{"spec":{"type":"LoadBalancer"}}'

# Get LoadBalancer URL
kubectl get svc kube-prometheus-stack-prometheus -n monitoring \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Or port-forward
kubectl port-forward svc/kube-prometheus-stack-prometheus \
  -n monitoring 9090:9090
```

### Access Grafana
```bash
# Get Grafana password
kubectl get secret kube-prometheus-stack-grafana \
  -n monitoring \
  -o jsonpath="{.data.admin-password}" | base64 -d && echo

# Port-forward Grafana
kubectl port-forward svc/kube-prometheus-stack-grafana \
  -n monitoring 3000:80

# Access: http://localhost:3000
# Username: admin
# Password: <from above command or "prom-operator">
```

### ServiceMonitor Operations
```bash
# Apply ServiceMonitor
kubectl apply -f gitops/k8s/backend/service-monitor.yml

# List ServiceMonitors
kubectl get servicemonitor -n boutique

# Describe ServiceMonitor
kubectl describe servicemonitor boutique-services -n boutique

# Delete ServiceMonitor
kubectl delete servicemonitor boutique-services -n boutique
```

### Query Prometheus
```bash
# Port-forward first
kubectl port-forward svc/kube-prometheus-stack-prometheus -n monitoring 9090:9090

# Query with curl
curl -s 'http://localhost:9090/api/v1/query?query=up{namespace="boutique"}' | jq .

# Check targets
curl -s 'http://localhost:9090/api/v1/targets' | jq .

# Query CPU usage
curl -s 'http://localhost:9090/api/v1/query?query=rate(container_cpu_usage_seconds_total{namespace="boutique"}[5m])' | jq .
```

---

## Logging Commands

### Create IAM Role for Fluent Bit (IRSA)
```bash
# Navigate to aiops-assistant directory
cd projects/aiops-assistant

# Run setup script
chmod +x setup-iam.sh
./setup-iam.sh

# Or manually:
export OIDC_PROVIDER=$(aws eks describe-cluster \
  --name eks-cluster \
  --region us-east-1 \
  --query "cluster.identity.oidc.issuer" \
  --output text | sed 's|https://||')

export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create IAM policy
cat > fluent-bit-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:us-east-1:${AWS_ACCOUNT_ID}:log-group:aws-eks-boutique-logs:*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluentBitCloudWatchPolicy \
  --policy-document file://fluent-bit-policy.json

# Create trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:amazon-cloudwatch:fluent-bit",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name FluentBitCloudWatchRole \
  --assume-role-policy-document file://trust-policy.json

# Attach policy to role
aws iam attach-role-policy \
  --role-name FluentBitCloudWatchRole \
  --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/FluentBitCloudWatchPolicy
```

### Install Fluent Bit
```bash
# Add AWS Helm repository
helm repo add aws https://aws.github.io/eks-charts
helm repo update

# Get IAM role ARN
export ROLE_ARN=$(aws iam get-role \
  --role-name FluentBitCloudWatchRole \
  --query 'Role.Arn' \
  --output text)

# Install Fluent Bit
helm upgrade --install aws-for-fluent-bit aws/aws-for-fluent-bit \
  --namespace amazon-cloudwatch \
  --create-namespace \
  --set cloudWatch.enabled=true \
  --set cloudWatch.region=us-east-1 \
  --set cloudWatch.logGroupName=aws-eks-boutique-logs \
  --set serviceAccount.create=true \
  --set serviceAccount.name=fluent-bit \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=$ROLE_ARN \
  --set firehose.enabled=false \
  --set kinesis.enabled=false

# Check DaemonSet
kubectl get daemonset -n amazon-cloudwatch

# Check logs
kubectl logs -n amazon-cloudwatch \
  -l app.kubernetes.io/name=aws-for-fluent-bit --tail=50
```

### CloudWatch Logs Operations
```bash
# List log groups
aws logs describe-log-groups --region us-east-1

# List log streams
aws logs describe-log-streams \
  --log-group-name aws-eks-boutique-logs \
  --region us-east-1 \
  --max-items 10

# Tail logs (live)
aws logs tail aws-eks-boutique-logs --follow --region us-east-1

# Filter logs for errors
aws logs filter-log-events \
  --log-group-name aws-eks-boutique-logs \
  --filter-pattern "ERROR" \
  --region us-east-1 \
  --max-items 20

# Query with CloudWatch Insights
aws logs start-query \
  --log-group-name aws-eks-boutique-logs \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /product-service/ | sort @timestamp desc | limit 20' \
  --region us-east-1

# Get query results (use query ID from previous command)
aws logs get-query-results --query-id <query-id> --region us-east-1
```

---

## GitOps Commands

### Install ArgoCD
```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo

# Port-forward ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access: https://localhost:8080
# Username: admin
# Password: <from above command>
```

### Deploy Application via ArgoCD
```bash
# Apply ArgoCD Application manifest
kubectl apply -f gitops/argo-cd.yml

# Check application status
kubectl get applications -n argocd

# Describe application
kubectl describe application boutique-app -n argocd
```

### ArgoCD CLI Commands
```bash
# Login
argocd login localhost:8080 --username admin --password <password>

# List applications
argocd app list

# Get application details
argocd app get boutique-app

# Sync application
argocd app sync boutique-app

# Force sync (ignore health checks)
argocd app sync boutique-app --force

# Delete application
argocd app delete boutique-app

# Add repository
argocd repo add https://github.com/YOUR-USERNAME/devops-ai \
  --username YOUR-USERNAME \
  --password YOUR-PAT
```

### Kustomize Commands
```bash
# Build Kustomize manifests
kubectl kustomize gitops/

# Apply with Kustomize
kubectl apply -k gitops/

# Diff (preview changes)
kubectl diff -k gitops/
```

---

## CI/CD Commands

### GitHub Actions
```bash
# Trigger workflow manually (if enabled)
gh workflow run ci.yml

# List workflow runs
gh run list

# View workflow run
gh run view <run-id>

# Watch workflow run
gh run watch <run-id>

# View logs
gh run view <run-id> --log
```

### Set GitHub Secrets
```bash
# Using GitHub CLI
gh secret set AWS_ACCESS_KEY_ID -b"<your-access-key>"
gh secret set AWS_SECRET_ACCESS_KEY -b"<your-secret-key>"

# Or via GitHub UI:
# Repo Settings → Secrets and variables → Actions → New repository secret
```

---

## AIOps Commands

### Create Lambda Functions
```bash
cd projects/aiops-assistant/lambda

# Create deployment packages
for func in fetch_logs fetch_metrics fetch_health; do
  cd $func
  zip -r ../lambda-$func.zip .
  cd ..
done

# Get Lambda role ARN
export LAMBDA_ROLE_ARN=$(aws iam get-role \
  --role-name aiops-lambda-role \
  --query 'Role.Arn' \
  --output text)

# Create Lambda: fetch_logs
aws lambda create-function \
  --function-name aiops-fetch-logs \
  --runtime python3.14 \
  --role $LAMBDA_ROLE_ARN \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda-fetch_logs.zip \
  --timeout 30 \
  --region us-east-1

# Create Lambda: fetch_metrics
aws lambda create-function \
  --function-name aiops-fetch-metrics \
  --runtime python3.14 \
  --role $LAMBDA_ROLE_ARN \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda-fetch_metrics.zip \
  --timeout 30 \
  --region us-east-1

# Create Lambda: fetch_health
aws lambda create-function \
  --function-name aiops-fetch-health \
  --runtime python3.14 \
  --role $LAMBDA_ROLE_ARN \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda-fetch_health.zip \
  --timeout 30 \
  --region us-east-1

# Add Bedrock invoke permissions
for func in aiops-fetch-logs aiops-fetch-metrics aiops-fetch-health; do
  aws lambda add-permission \
    --function-name $func \
    --statement-id AllowBedrockInvoke \
    --action lambda:InvokeFunction \
    --principal bedrock.amazonaws.com \
    --region us-east-1
done

# List Lambda functions
aws lambda list-functions --region us-east-1 --query 'Functions[?contains(FunctionName, `aiops`)].FunctionName'

# Invoke Lambda (test)
aws lambda invoke \
  --function-name aiops-fetch-logs \
  --payload '{"parameters":[{"name":"filter_pattern","value":"ERROR"}]}' \
  --region us-east-1 \
  response.json

cat response.json
```

### Deploy Bedrock Agent
```bash
cd projects/aiops-assistant

# Run automated deployment script
chmod +x deploy.sh
./deploy.sh

# Or create manually in AWS Console:
# 1. Navigate to: https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/agents
# 2. Click "Create Agent"
# 3. Follow steps in DEPLOYMENT-GUIDE.md
```

### Run Streamlit UI
```bash
cd projects/aiops-assistant

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
vim .env
# Set:
# AWS_REGION=us-east-1
# BEDROCK_AGENT_ID=<your-agent-id>
# BEDROCK_AGENT_ALIAS_ID=TSTALIASID

# Run Streamlit
streamlit run app.py

# Access: http://localhost:8501
```

---

## Database Commands

### Access PostgreSQL
```bash
# Execute psql in pod
kubectl exec -it -n boutique postgres-0 -- psql -U admin -d boutique

# Or without entering shell
kubectl exec -n boutique postgres-0 -- \
  psql -U admin -d boutique -c "SELECT * FROM products;"
```

### Database Operations
```sql
-- Inside psql:

-- List tables
\dt

-- Describe table
\d products

-- Select data
SELECT * FROM products;
SELECT * FROM users WHERE username = 'testuser';
SELECT * FROM orders WHERE user_id = 1;

-- Insert data
INSERT INTO categories (name, description) VALUES ('Test', 'Test category');
INSERT INTO products (name, description, price, category_id, stock_quantity)
VALUES ('Test Product', 'Test description', 99.99, 1, 10);

-- Update data
UPDATE products SET stock_quantity = 20 WHERE id = 1;

-- Delete data
DELETE FROM products WHERE id = 10;

-- Check connections
SELECT count(*) FROM pg_stat_activity WHERE datname='boutique';

-- Vacuum (optimize)
VACUUM ANALYZE;

-- Exit
\q
```

### Database Backup
```bash
# Backup database
kubectl exec -n boutique postgres-0 -- \
  pg_dump -U admin boutique > backup-$(date +%Y%m%d).sql

# Restore database
kubectl exec -i -n boutique postgres-0 -- \
  psql -U admin -d boutique < backup-20260902.sql
```

---

## Debugging Commands

### View Logs
```bash
# View pod logs
kubectl logs -n boutique <pod-name>

# View previous container logs (if restarted)
kubectl logs -n boutique <pod-name> --previous

# Follow logs (live)
kubectl logs -n boutique <pod-name> -f

# View logs from deployment
kubectl logs -n boutique deployment/gateway --tail=50

# View logs with timestamps
kubectl logs -n boutique <pod-name> --timestamps=true

# View logs from specific container (if pod has multiple)
kubectl logs -n boutique <pod-name> -c container-name
```

### Execute Commands in Pods
```bash
# Execute interactive shell
kubectl exec -it -n boutique <pod-name> -- /bin/bash

# Execute command
kubectl exec -n boutique <pod-name> -- env
kubectl exec -n boutique <pod-name> -- curl http://localhost:3001/health
kubectl exec -n boutique <pod-name> -- cat /etc/resolv.conf

# Test DNS
kubectl exec -n boutique <pod-name> -- nslookup postgres
kubectl exec -n boutique <pod-name> -- nslookup gateway.boutique.svc.cluster.local

# Test connectivity
kubectl exec -n boutique <pod-name> -- nc -zv postgres 5432
kubectl exec -n boutique <pod-name> -- wget -O- http://gateway:3001/health
```

### Port Forwarding
```bash
# Forward pod port to localhost
kubectl port-forward -n boutique <pod-name> 3001:3001

# Forward service port
kubectl port-forward -n boutique svc/gateway 3001:3001

# Forward deployment port
kubectl port-forward -n boutique deployment/gateway 3001:3001

# Access: http://localhost:3001
```

### Copy Files
```bash
# Copy from pod to local
kubectl cp -n boutique <pod-name>:/app/logs/error.log ./error.log

# Copy from local to pod
kubectl cp -n boutique ./config.json <pod-name>:/app/config.json
```

### Resource Usage
```bash
# View node resource usage
kubectl top nodes

# View pod resource usage
kubectl top pods -n boutique

# View pod resource usage (sorted by CPU)
kubectl top pods -n boutique --sort-by=cpu

# View pod resource usage (sorted by memory)
kubectl top pods -n boutique --sort-by=memory
```

### Debug with Temporary Pod
```bash
# Run busybox for debugging
kubectl run -it --rm debug --image=busybox --restart=Never -n boutique -- sh

# Inside busybox:
nslookup postgres
nc -zv postgres 5432
wget -O- http://gateway:3001/health

# Run curl for HTTP testing
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n boutique -- \
  curl http://gateway:3001/api/products

# Run with specific network namespace
kubectl debug -it <pod-name> -n boutique --image=busybox --target=<pod-name>
```

---

## Maintenance Commands

### Update Cluster
```bash
# Update EKS cluster version
aws eks update-cluster-version \
  --name eks-cluster \
  --kubernetes-version 1.28 \
  --region us-east-1

# Check update status
aws eks describe-update \
  --name eks-cluster \
  --update-id <update-id> \
  --region us-east-1

# Update node group
aws eks update-nodegroup-version \
  --cluster-name eks-cluster \
  --nodegroup-name eks-nodes \
  --region us-east-1
```

### Cleanup Resources
```bash
# Delete namespace (deletes all resources in it)
kubectl delete namespace boutique

# Delete specific resources
kubectl delete deployment gateway -n boutique
kubectl delete svc gateway -n boutique
kubectl delete pod <pod-name> -n boutique

# Delete all pods in namespace
kubectl delete pods --all -n boutique

# Force delete stuck pod
kubectl delete pod <pod-name> -n boutique --force --grace-period=0

# Delete completed jobs
kubectl delete jobs --field-selector status.successful=1 -n boutique
```

### Patch Resources
```bash
# Patch service type
kubectl patch svc gateway -n boutique \
  -p '{"spec":{"type":"LoadBalancer"}}'

# Patch deployment image
kubectl patch deployment gateway -n boutique \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"gateway","image":"new-image:tag"}]}}}}'

# Patch with file
kubectl patch deployment gateway -n boutique --patch-file patch.yaml
```

### Drain and Cordon Nodes
```bash
# Cordon node (prevent new pods)
kubectl cordon <node-name>

# Drain node (evict pods)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Uncordon node
kubectl uncordon <node-name>
```

### Restart All Pods in Namespace
```bash
# Restart all deployments
kubectl rollout restart deployment -n boutique
```

---

## Quick Reference Scripts

### Complete Deployment Script
```bash
#!/bin/bash
set -e

echo "=== DevOps + AIOps Platform Deployment ==="

# 1. Configure AWS
echo "[1/8] Configuring AWS..."
aws eks update-kubeconfig --name eks-cluster --region us-east-1

# 2. Create Namespaces
echo "[2/8] Creating namespaces..."
kubectl create namespace boutique || true
kubectl create namespace monitoring || true
kubectl create namespace argocd || true
kubectl create namespace amazon-cloudwatch || true

# 3. Deploy Application
echo "[3/8] Deploying application..."
kubectl apply -f gitops/secrets.yml
kubectl apply -f gitops/k8s/database/
kubectl apply -f gitops/k8s/backend/
kubectl apply -f gitops/k8s/frontend/
kubectl wait --for=condition=Ready pods --all -n boutique --timeout=300s

# 4. Install Monitoring
echo "[4/8] Installing monitoring..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# 5. Expose Prometheus
echo "[5/8] Exposing Prometheus..."
kubectl patch svc kube-prometheus-stack-prometheus -n monitoring \
  -p '{"spec":{"type":"LoadBalancer"}}'

# 6. Install Logging
echo "[6/8] Installing logging..."
cd projects/aiops-assistant
./setup-iam.sh
helm repo add aws https://aws.github.io/eks-charts
ROLE_ARN=$(aws iam get-role --role-name FluentBitCloudWatchRole --query 'Role.Arn' --output text)
helm upgrade --install aws-for-fluent-bit aws/aws-for-fluent-bit \
  --namespace amazon-cloudwatch --create-namespace \
  --set cloudWatch.logGroupName=aws-eks-boutique-logs \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=$ROLE_ARN

# 7. Install ArgoCD
echo "[7/8] Installing ArgoCD..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
kubectl apply -f gitops/argo-cd.yml

# 8. Deploy AIOps
echo "[8/8] Deploying AIOps..."
./deploy.sh

echo "=== Deployment Complete ==="
echo ""
echo "Access URLs:"
echo "  Frontend: kubectl port-forward svc/frontend -n boutique 3000:3000"
echo "  Gateway: kubectl port-forward svc/gateway -n boutique 3001:3001"
echo "  Prometheus: kubectl port-forward svc/kube-prometheus-stack-prometheus -n monitoring 9090:9090"
echo "  Grafana: kubectl port-forward svc/kube-prometheus-stack-grafana -n monitoring 3000:80"
echo "  ArgoCD: kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo "  AIOps UI: streamlit run app.py"
```

Save as `deploy-all.sh`, make executable with `chmod +x deploy-all.sh`, and run with `./deploy-all.sh`.

---

## Summary

This commands reference covers:

✅ **Prerequisites** - Tool installation
✅ **AWS & Infrastructure** - Terraform, EKS, ECR
✅ **Kubernetes** - kubectl operations
✅ **Application** - Build, deploy, update
✅ **Monitoring** - Prometheus, Grafana, ServiceMonitor
✅ **Logging** - Fluent Bit, CloudWatch Logs, IRSA
✅ **GitOps** - ArgoCD, Kustomize
✅ **CI/CD** - GitHub Actions, secrets
✅ **AIOps** - Lambda, Bedrock, Streamlit
✅ **Database** - PostgreSQL operations
✅ **Debugging** - Logs, exec, port-forward
✅ **Maintenance** - Updates, cleanup, patches

**For more details, see:**
- [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) - Step-by-step deployment
- [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md) - Common issues
- [CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md) - All configs explained
