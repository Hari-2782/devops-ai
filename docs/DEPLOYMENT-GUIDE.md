# Complete Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [EKS Cluster Deployment](#eks-cluster-deployment)
4. [Application Deployment](#application-deployment)
5. [Monitoring Setup](#monitoring-setup)
6. [Logging Setup](#logging-setup)
7. [GitOps Configuration](#gitops-configuration)
8. [AIOps Assistant Deployment](#aiops-assistant-deployment)
9. [Verification & Testing](#verification--testing)
10. [Common Issues](#common-issues)

---

## Prerequisites

### Required Tools

Install the following tools on your local machine:

```bash
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Terraform (if provisioning infrastructure)
wget https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_amd64.zip
unzip terraform_1.5.7_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# eksctl (optional, for easier EKS management)
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# ArgoCD CLI (optional)
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/
```

### AWS Account Setup

1. **AWS Account**
   - Active AWS account with billing enabled
   - IAM user with Administrator access (or specific permissions)

2. **Configure AWS CLI**
```bash
aws configure
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region name: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

3. **Required IAM Permissions**

Your IAM user/role needs:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "eks:*",
        "ec2:*",
        "iam:*",
        "ecr:*",
        "elasticloadbalancing:*",
        "logs:*",
        "cloudwatch:*",
        "lambda:*",
        "bedrock:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Infrastructure Setup

### Option 1: Terraform (Automated)

```bash
cd projects/Infrastructure

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply infrastructure
terraform apply -auto-approve

# Outputs
# - EKS Cluster Name: eks-cluster
# - VPC ID
# - Subnet IDs
# - OIDC Provider ARN
```

### Option 2: Manual EKS Setup

If you prefer manual setup or Terraform is not available:

```bash
# Create EKS cluster
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

# This creates:
# - EKS Control Plane
# - VPC with public/private subnets
# - NAT Gateway, Internet Gateway
# - Node Group with 2 t3.medium instances
# - OIDC provider for IRSA
# - IAM roles for cluster and nodes

# Update kubeconfig
aws eks update-kubeconfig --name eks-cluster --region us-east-1

# Verify connection
kubectl get nodes
```

Expected output:
```
NAME                             STATUS   ROLES    AGE   VERSION
ip-10-0-1-123.ec2.internal       Ready    <none>   5m    v1.27.x
ip-10-0-2-456.ec2.internal       Ready    <none>   5m    v1.27.x
```

---

## EKS Cluster Deployment

### Step 1: Create Namespace

```bash
kubectl create namespace boutique
kubectl create namespace monitoring
kubectl create namespace argocd
kubectl create namespace amazon-cloudwatch
```

### Step 2: Configure ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  423535493604.dkr.ecr.us-east-1.amazonaws.com

# Create repositories (if not exist)
for service in frontend gateway auth product-service order-service orders user-service; do
  aws ecr create-repository \
    --repository-name boutique/$service \
    --region us-east-1 \
    --image-scanning-configuration scanOnPush=true \
    || echo "Repository already exists"
done
```

### Step 3: Build and Push Images

**Option A: GitHub Actions (Automated)**

Simply push code to `main` branch:
```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
```

GitHub Actions will:
1. Build Docker images for all services
2. Tag with commit SHA
3. Push to ECR
4. Update GitOps manifests

**Option B: Manual Build (for local testing)**

```bash
cd projects/boutique-microservices

# Set variables
export AWS_ACCOUNT_ID=423535493604
export AWS_REGION=us-east-1
export COMMIT_SHA=$(git rev-parse --short HEAD)

# Build and push each service
for service in frontend gateway auth product-service order-service orders user-service; do
  echo "Building $service..."
  
  docker build -t boutique/$service:latest \
    -f $service/Dockerfile $service
  
  docker tag boutique/$service:latest \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/boutique/$service:$COMMIT_SHA
  
  docker push \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/boutique/$service:$COMMIT_SHA
done

# Update image tags in manifests
cd ../../gitops/k8s
find . -name "deployment.yml" -exec sed -i \
  "s|image: .*boutique/\([^:]*\):.*|image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/boutique/\1:$COMMIT_SHA|" {} \;
```

---

## Application Deployment

### Option 1: GitOps with ArgoCD (Recommended)

#### Install ArgoCD

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods to be ready
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo

# Port-forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access ArgoCD UI: https://localhost:8080
# Username: admin
# Password: <from above command>
```

#### Deploy Application via ArgoCD

```bash
# Apply ArgoCD Application manifest
kubectl apply -f gitops/argo-cd.yml

# ArgoCD will now:
# 1. Monitor the Git repository
# 2. Detect changes in gitops/ directory
# 3. Auto-sync to cluster
# 4. Self-heal on manual changes

# Check sync status
kubectl get applications -n argocd

# View in UI
# Navigate to https://localhost:8080
# Click on "boutique-app"
# See all resources, sync status, health
```

### Option 2: Manual kubectl Deployment

```bash
# Navigate to GitOps directory
cd gitops

# Deploy in order
kubectl apply -f namespace.yml
kubectl apply -f secrets.yml
kubectl apply -f k8s/database/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/

# Check deployment status
kubectl get pods -n boutique

# Wait for all pods to be Running
kubectl wait --for=condition=Ready pods --all -n boutique --timeout=300s
```

### Verify Deployment

```bash
# Check all pods
kubectl get pods -n boutique -o wide

# Check services
kubectl get svc -n boutique

# Check deployments
kubectl get deployments -n boutique

# View logs
kubectl logs -n boutique deployment/gateway --tail=50

# Describe pod (for troubleshooting)
kubectl describe pod -n boutique <pod-name>
```

Expected output:
```
NAME                                READY   STATUS    RESTARTS   AGE
auth-7d9f5b8c4-abc12               1/1     Running   0          2m
frontend-5f6d8a9b-def34            1/1     Running   0          2m
gateway-6c7e9f8d-ghi56             1/1     Running   0          2m
order-service-8d9g0h1e-jkl78       1/1     Running   0          2m
orders-9e0h1i2f-mno90              1/1     Running   0          2m
postgres-0                          1/1     Running   0          3m
product-service-0f1i2j3g-pqr12     1/1     Running   0          2m
user-service-1g2j3k4h-stu34        1/1     Running   0          2m
```

---

## Monitoring Setup

### Step 1: Install Prometheus Stack

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

# Wait for pods
kubectl wait --for=condition=Ready pods --all -n monitoring --timeout=600s
```

### Step 2: Expose Prometheus via LoadBalancer

```bash
# Patch Prometheus service to LoadBalancer
kubectl patch svc kube-prometheus-stack-prometheus \
  -n monitoring \
  -p '{"spec":{"type":"LoadBalancer"}}'

# Get LoadBalancer URL
export PROMETHEUS_URL=$(kubectl get svc kube-prometheus-stack-prometheus \
  -n monitoring \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Prometheus URL: http://$PROMETHEUS_URL:9090"

# Test access
curl -s http://$PROMETHEUS_URL:9090/api/v1/query?query=up | jq .
```

### Step 3: Configure ServiceMonitor

```bash
# Apply ServiceMonitor for boutique services
kubectl apply -f gitops/k8s/backend/service-monitor.yml

# Verify ServiceMonitor
kubectl get servicemonitor -n boutique

# Check Prometheus targets (should see all 6 services)
# Navigate to http://$PROMETHEUS_URL:9090/targets
# Look for:
# - auth:5001/metrics
# - gateway:3001/metrics
# - product-service:5003/metrics
# - order-service:5005/metrics
# - orders:5004/metrics
# - user-service:5002/metrics
```

### Step 4: Access Grafana

```bash
# Get Grafana password
kubectl get secret kube-prometheus-stack-grafana \
  -n monitoring \
  -o jsonpath="{.data.admin-password}" | base64 -d && echo

# Port-forward Grafana
kubectl port-forward svc/kube-prometheus-stack-grafana \
  -n monitoring 3000:80

# Access Grafana: http://localhost:3000
# Username: admin
# Password: prom-operator (default) or from above command
```

### Step 5: Import Dashboards

1. **Login to Grafana** (http://localhost:3000)

2. **Navigate to Dashboards → Import**

3. **Import pre-built dashboards:**
   - **Kubernetes Cluster Monitoring** - Dashboard ID: `7249`
   - **Kubernetes Deployment Statefulset DaemonSet Metrics** - ID: `8588`
   - **Node Exporter Full** - ID: `1860`

4. **Create Custom Dashboard** for boutique services:
```bash
# Apply custom dashboard
kubectl apply -f gitops/k8s/grafana-dashboard.yml
```

5. **Example Queries:**
   - **Pod CPU Usage:** `rate(container_cpu_usage_seconds_total{namespace="boutique"}[5m])`
   - **Pod Memory:** `container_memory_working_set_bytes{namespace="boutique"}`
   - **Request Rate:** `rate(http_requests_total{namespace="boutique"}[5m])`
   - **Pod Restarts:** `increase(kube_pod_container_status_restarts_total{namespace="boutique"}[1h])`

---

## Logging Setup

### Step 1: Create IAM Role for Fluent Bit (IRSA)

```bash
cd projects/aiops-assistant

# Run IAM setup script
chmod +x setup-iam.sh
./setup-iam.sh

# This creates:
# - IAM Policy: FluentBitCloudWatchPolicy
# - IAM Role: FluentBitCloudWatchRole
# - Trust policy with OIDC provider
```

**Manual steps if script fails:**

```bash
# Get OIDC provider ID
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

### Step 2: Install Fluent Bit

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

# Verify DaemonSet
kubectl get daemonset -n amazon-cloudwatch

# Check logs
kubectl logs -n amazon-cloudwatch -l app.kubernetes.io/name=aws-for-fluent-bit --tail=50
```

Expected log output:
```
[2026/09/02 02:15:30] [ info] [output:cloudwatch_logs:cloudwatch_logs.0] Log group 'aws-eks-boutique-logs' created
[2026/09/02 02:15:31] [ info] [output:cloudwatch_logs:cloudwatch_logs.0] Sending logs to CloudWatch
```

### Step 3: Verify Logs in CloudWatch

```bash
# List log streams
aws logs describe-log-streams \
  --log-group-name aws-eks-boutique-logs \
  --region us-east-1 \
  --max-items 10

# Tail logs
aws logs tail aws-eks-boutique-logs --follow --region us-east-1

# Query logs with CloudWatch Insights
aws logs start-query \
  --log-group-name aws-eks-boutique-logs \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20'
```

---

## GitOps Configuration

### ArgoCD Application Manifest

**File:** `gitops/argo-cd.yml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: boutique-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/Hari-2782/devops-ai
    targetRevision: main
    path: gitops
  destination:
    server: https://kubernetes.default.svc
    namespace: boutique
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
```

### GitOps Workflow

```bash
# 1. Make changes to code
vim projects/boutique-microservices/backend/services/gateway/index.js

# 2. Commit and push
git add .
git commit -m "feat: add health check endpoint"
git push origin main

# 3. GitHub Actions runs
# - Builds new image
# - Pushes to ECR with commit SHA
# - Updates gitops/k8s/backend/gateway.yml with new image tag
# - Commits and pushes

# 4. ArgoCD detects change
# - Compares cluster state vs Git state
# - Triggers sync
# - Applies new manifest
# - Performs rolling update

# 5. Verify deployment
kubectl rollout status deployment/gateway -n boutique

# 6. Check ArgoCD UI
# https://localhost:8080 → boutique-app → Sync Status: Synced
```

---

## AIOps Assistant Deployment

### Step 1: Create Lambda Execution Role

```bash
# Create IAM policy for Lambda
cat > lambda-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:FilterLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListNodegroups",
        "eks:DescribeNodegroup"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name AIOpsLambdaPolicy \
  --policy-document file://lambda-policy.json

# Create trust policy
cat > lambda-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name aiops-lambda-role \
  --assume-role-policy-document file://lambda-trust-policy.json

# Attach policy
export POLICY_ARN=$(aws iam list-policies \
  --query 'Policies[?PolicyName==`AIOpsLambdaPolicy`].Arn' \
  --output text)

aws iam attach-role-policy \
  --role-name aiops-lambda-role \
  --policy-arn $POLICY_ARN
```

### Step 2: Create Lambda Functions

```bash
cd projects/aiops-assistant/lambda

# Create deployment packages
for func in fetch_logs fetch_metrics fetch_health; do
  cd $func
  zip -r ../lambda-$func.zip .
  cd ..
done

# Create Lambda functions
export LAMBDA_ROLE_ARN=$(aws iam get-role \
  --role-name aiops-lambda-role \
  --query 'Role.Arn' \
  --output text)

# fetch_logs
aws lambda create-function \
  --function-name aiops-fetch-logs \
  --runtime python3.14 \
  --role $LAMBDA_ROLE_ARN \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda-fetch_logs.zip \
  --timeout 30 \
  --region us-east-1

# fetch_metrics
aws lambda create-function \
  --function-name aiops-fetch-metrics \
  --runtime python3.14 \
  --role $LAMBDA_ROLE_ARN \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda-fetch_metrics.zip \
  --timeout 30 \
  --region us-east-1

# fetch_health
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
```

### Step 3: Create Bedrock Agent Role

```bash
cat > bedrock-agent-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name aiops-bedrock-agent-role \
  --assume-role-policy-document file://bedrock-agent-trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name aiops-bedrock-agent-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam attach-role-policy \
  --role-name aiops-bedrock-agent-role \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess
```

### Step 4: Create Bedrock Agent

**Option A: Automated Script**

```bash
cd projects/aiops-assistant
./deploy.sh
```

**Option B: Manual Creation (AWS Console)**

1. **Navigate to Bedrock Agents Console:**
   https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/agents

2. **Click "Create Agent"**

3. **Agent Details:**
   - **Name:** `aiops-assistant`
   - **Description:** `AIOps root cause analysis assistant`

4. **Select Model:**
   - **Foundation Model:** `Claude 3.5 Sonnet v2` (anthropic.claude-3-5-sonnet-20241022-v2:0)

5. **IAM Role:**
   - **Existing Role:** `aiops-bedrock-agent-role`

6. **Agent Instructions:**
```
You are Kira, a senior Site Reliability Engineer with 12 years of experience managing large-scale production systems on AWS. You have deep expertise in distributed systems, database performance tuning, container orchestration, and incident response.

You think like a real SRE during an incident — calm, methodical, and data-driven. You never guess. You always look at the data first before drawing conclusions.

You have 3 tools: fetch_logs (CloudWatch Logs), fetch_metrics (Prometheus metrics), and fetch_service_health (EKS cluster, node group, and pod health).

When an engineer comes with a problem:
Step 1: Understand the symptom.
Step 2: Form a hypothesis.
Step 3: Gather evidence using your tools.
Step 4: Diagnose by correlating the data across logs, metrics, and service health.
Step 5: Respond with root cause, evidence summary, immediate fix, and prevention steps.

Always cite specific log entries or metric values when drawing conclusions. Be concise but thorough.
```

7. **Add Action Groups:**

**Action Group 1: fetch_logs**
- Name: `fetch_logs`
- Description: `Search CloudWatch Logs for errors, warnings, and application events`
- Lambda Function: `aiops-fetch-logs`
- OpenAPI Schema: Upload `schemas/fetch_logs.json`

**Action Group 2: fetch_metrics**
- Name: `fetch_metrics`
- Description: `Retrieve Prometheus performance metrics (CPU, memory, pod restarts)`
- Lambda Function: `aiops-fetch-metrics`
- OpenAPI Schema: Upload `schemas/fetch_metrics.json`

**Action Group 3: fetch_service_health**
- Name: `fetch_service_health`
- Description: `Check live health status of EKS cluster, node groups, and crashing pods`
- Lambda Function: `aiops-fetch-health`
- OpenAPI Schema: Upload `schemas/fetch_health.json`

8. **Prepare Agent**
   - Click **"Prepare"** to deploy the agent
   - Note the **Agent ID** (e.g., `ABC123XYZ`)

### Step 5: Deploy Streamlit UI

```bash
cd projects/aiops-assistant

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
vim .env

# Set values:
# AWS_REGION=us-east-1
# BEDROCK_AGENT_ID=<your-agent-id>
# BEDROCK_AGENT_ALIAS_ID=TSTALIASID

# Run Streamlit app
streamlit run app.py

# Access UI: http://localhost:8501
```

---

## Verification & Testing

### Test 1: Application Health

```bash
# Port-forward frontend
kubectl port-forward svc/frontend -n boutique 3000:3000

# Access: http://localhost:3000

# Expected:
# - Homepage loads
# - Product list visible
# - Can register user
# - Can login
# - Can add to cart
# - Can place order
```

### Test 2: API Gateway

```bash
# Port-forward gateway
kubectl port-forward svc/gateway -n boutique 3001:3001

# Test endpoints
curl http://localhost:3001/api/products | jq .
curl http://localhost:3001/api/products/categories | jq .

# Expected: JSON responses with product data
```

### Test 3: Metrics Collection

```bash
# Check Prometheus targets
kubectl port-forward svc/kube-prometheus-stack-prometheus -n monitoring 9090:9090

# Navigate to: http://localhost:9090/targets
# All boutique services should be UP

# Query metrics
curl -s 'http://localhost:9090/api/v1/query?query=up{namespace="boutique"}' | jq .
```

### Test 4: Logs

```bash
# Check Fluent Bit is running
kubectl get pods -n amazon-cloudwatch

# View CloudWatch logs
aws logs tail aws-eks-boutique-logs --follow

# Expected: Real-time logs from all pods
```

### Test 5: GitOps Sync

```bash
# Make a change
kubectl scale deployment gateway -n boutique --replicas=3

# Wait 3 minutes (ArgoCD sync interval)
# ArgoCD will detect drift and revert to 2 replicas (self-heal)

# Verify
kubectl get deployment gateway -n boutique
# Should show 2/2 replicas
```

### Test 6: AIOps Assistant

```bash
# Open Streamlit UI: http://localhost:8501

# Test Query 1:
"Show me pod CPU usage for the boutique namespace"

# Expected: Kira calls fetch_metrics, returns CPU data for all pods

# Test Query 2:
"Are there any errors in the logs from the last hour?"

# Expected: Kira calls fetch_logs with filter="ERROR", returns log entries

# Test Query 3:
"Check the health of the eks-cluster"

# Expected: Kira calls fetch_health, reports cluster status, node health, deployments

# Test Query 4 (Complex):
"The product service is slow. Help me troubleshoot."

# Expected:
# - Kira forms hypothesis (high CPU, slow queries, etc.)
# - Calls fetch_metrics(pod_cpu_utilization, namespace=boutique)
# - Calls fetch_logs(filter_pattern="product-service", hours_back=1)
# - Calls fetch_health(cluster_name=eks-cluster)
# - Correlates data
# - Provides root cause analysis, evidence, and recommendations
```

---

## Common Issues

### Issue 1: Pods in CrashLoopBackOff

**Symptom:**
```bash
kubectl get pods -n boutique
# product-service-xxx   0/1   CrashLoopBackOff
```

**Diagnosis:**
```bash
kubectl logs -n boutique product-service-xxx
kubectl describe pod -n boutique product-service-xxx
```

**Common Causes:**
- Database connection failure (check `postgres` pod status)
- Missing environment variables (check secrets)
- Image pull error (check ECR permissions)

**Fix:**
```bash
# Restart database
kubectl rollout restart statefulset/postgres -n boutique

# Verify secrets
kubectl get secrets -n boutique
kubectl describe secret boutique-secrets -n boutique

# Check image exists in ECR
aws ecr describe-images \
  --repository-name boutique/product-service \
  --region us-east-1
```

### Issue 2: Fluent Bit Not Sending Logs

**Symptom:**
```bash
kubectl logs -n amazon-cloudwatch -l app.kubernetes.io/name=aws-for-fluent-bit
# Error: NoCredentialProviders
```

**Fix:**
```bash
# Verify IAM role
aws iam get-role --role-name FluentBitCloudWatchRole

# Check service account annotation
kubectl get sa fluent-bit -n amazon-cloudwatch -o yaml | grep eks.amazonaws.com/role-arn

# Re-annotate if missing
kubectl annotate serviceaccount fluent-bit \
  -n amazon-cloudwatch \
  eks.amazonaws.com/role-arn=arn:aws:iam::423535493604:role/FluentBitCloudWatchRole
```

### Issue 3: Prometheus Not Scraping Services

**Symptom:**
Prometheus targets page shows services as DOWN

**Fix:**
```bash
# Verify ServiceMonitor
kubectl get servicemonitor -n boutique -o yaml

# Check service labels
kubectl get svc gateway -n boutique -o yaml | grep -A5 labels

# Service must have label: app: gateway
# Add if missing:
kubectl label svc gateway -n boutique app=gateway
```

### Issue 4: ArgoCD Out of Sync

**Symptom:**
ArgoCD UI shows "OutOfSync" status

**Fix:**
```bash
# Manual sync
kubectl patch application boutique-app -n argocd \
  -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}' \
  --type merge

# Or via CLI
argocd app sync boutique-app

# Force sync (if needed)
argocd app sync boutique-app --force
```

### Issue 5: Frontend 404 Errors

**Symptom:**
Frontend loads but API calls return 404

**Root Cause:**
React embeds `REACT_APP_API_URL` at build time, not runtime

**Fix:**
```bash
# Rebuild frontend with correct API URL
cd projects/boutique-microservices/frontend

# Port-forward gateway
kubectl port-forward svc/gateway -n boutique 3001:3001

# Frontend expects gateway at localhost:3001
# OR update .env and rebuild:
echo "REACT_APP_API_URL=http://localhost:3001/api" > .env
npm run build
docker build -t boutique/frontend:latest .
```

### Issue 6: Lambda Function Timeout

**Symptom:**
AIOps assistant responds with "Timeout error"

**Fix:**
```bash
# Increase timeout to 30 seconds
aws lambda update-function-configuration \
  --function-name aiops-fetch-logs \
  --timeout 30 \
  --region us-east-1

# Do for all 3 Lambda functions
```

### Issue 7: Bedrock Agent Not Invoking Lambda

**Symptom:**
Kira responds with "I don't have access to that tool"

**Fix:**
```bash
# Add Bedrock invoke permission
aws lambda add-permission \
  --function-name aiops-fetch-logs \
  --statement-id AllowBedrockInvoke \
  --action lambda:InvokeFunction \
  --principal bedrock.amazonaws.com \
  --region us-east-1

# Verify permission
aws lambda get-policy \
  --function-name aiops-fetch-logs \
  --region us-east-1
```

---

## Next Steps

1. **Scaling**
   - Configure Horizontal Pod Autoscaler (HPA)
   - Add Cluster Autoscaler for node scaling

2. **Security**
   - Implement Network Policies
   - Enable Pod Security Standards
   - Integrate AWS Secrets Manager

3. **Observability**
   - Add distributed tracing (OpenTelemetry)
   - Configure Grafana alerts
   - Set up PagerDuty integration

4. **Cost Optimization**
   - Use Spot Instances for node groups
   - Configure resource quotas
   - Enable EBS snapshot lifecycle policies

5. **Disaster Recovery**
   - Set up automated backups (Velero)
   - Configure multi-region replication
   - Test restore procedures

---

## Deployment Checklist

- [ ] AWS CLI configured
- [ ] kubectl installed and configured
- [ ] EKS cluster created
- [ ] Namespaces created
- [ ] ECR repositories created
- [ ] Images built and pushed
- [ ] Application deployed (via ArgoCD or kubectl)
- [ ] All pods Running
- [ ] Prometheus stack installed
- [ ] ServiceMonitor configured
- [ ] Grafana accessible
- [ ] Fluent Bit DaemonSet running
- [ ] CloudWatch Logs receiving data
- [ ] Lambda functions created
- [ ] Bedrock Agent created
- [ ] Streamlit UI running
- [ ] End-to-end testing completed

---

**Deployment Complete!** 🎉

You now have a fully functional microservices application with:
- Kubernetes orchestration
- GitOps continuous delivery
- Comprehensive monitoring
- Centralized logging
- AI-powered troubleshooting

For architecture details, see `COMPLETE-ARCHITECTURE.md`.
For configuration reference, see `CONFIGURATION-REFERENCE.md`.
