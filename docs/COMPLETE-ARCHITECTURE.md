# Complete System Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Infrastructure Layer](#infrastructure-layer)
5. [Application Layer](#application-layer)
6. [Data Layer](#data-layer)
7. [Monitoring & Observability](#monitoring--observability)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [AIOps Layer](#aiops-layer)
10. [Network Architecture](#network-architecture)
11. [Security Architecture](#security-architecture)

---

## System Overview

### Project Name
**Boutique Microservices E-Commerce Platform with AIOps Integration**

### Purpose
A production-grade e-commerce application demonstrating:
- Modern microservices architecture
- Cloud-native deployment on AWS EKS
- GitOps-driven continuous delivery
- Comprehensive observability
- AI-powered operations and troubleshooting

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                        │
│                    (Source of Truth for GitOps)                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Git Push Triggers
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD                          │
│  • Build Docker images                                           │
│  • Push to Amazon ECR                                            │
│  • Update GitOps manifests with image tags                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ ArgoCD Sync
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS EKS Cluster                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Application Layer                       │  │
│  │  • Frontend (React)                                        │  │
│  │  • Gateway Service (Node.js)                               │  │
│  │  • Auth Service                                            │  │
│  │  • Product Service                                         │  │
│  │  • Order Service                                           │  │
│  │  • Orders Service                                          │  │
│  │  • User Service                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Data Layer                             │  │
│  │  • PostgreSQL StatefulSet                                  │  │
│  │  • Persistent Volumes (EBS)                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Monitoring Stack                           │  │
│  │  • Prometheus (metrics collection)                         │  │
│  │  • Grafana (visualization)                                 │  │
│  │  • ServiceMonitor (metrics scraping)                       │  │
│  │  • Fluent Bit DaemonSet → CloudWatch Logs                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    GitOps Layer                            │  │
│  │  • ArgoCD (auto-sync, self-heal)                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Logs & Metrics
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Services Layer                          │
│  • CloudWatch Logs (centralized logging)                        │
│  • ECR (container registry)                                      │
│  • EBS (persistent storage)                                      │
│  • ELB (load balancing)                                          │
│  • VPC (network isolation)                                       │
│  • IAM (authentication & authorization)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Query Logs/Metrics/Health
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AIOps Assistant (Kira)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         AWS Bedrock Agent (Claude 3.5 Sonnet v2)          │  │
│  │  Instruction: Senior SRE persona with methodical RCA      │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        │                                          │
│      ┌─────────────────┼─────────────────┐                       │
│      │                 │                 │                       │
│      ▼                 ▼                 ▼                       │
│  ┌────────┐      ┌──────────┐     ┌──────────────┐             │
│  │Lambda  │      │ Lambda   │     │   Lambda     │             │
│  │fetch   │      │ fetch    │     │   fetch      │             │
│  │logs    │      │ metrics  │     │   health     │             │
│  └────────┘      └──────────┘     └──────────────┘             │
│      │                 │                 │                       │
│      └─────────────────┴─────────────────┘                       │
│                        │                                          │
│                        ▼                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            Streamlit UI (localhost:8501)                  │  │
│  │  Chat interface for SRE troubleshooting                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

### Deployment Architecture

```
Internet
   │
   │ HTTPS
   ▼
┌──────────────────────────────────────────────────┐
│          AWS Application Load Balancer           │
│              (Managed by EKS)                    │
└────────────┬─────────────────────────────────────┘
             │
             │ Ingress/Service
             ▼
┌────────────────────────────────────────────────────────────────┐
│                    EKS Cluster (us-east-1)                     │
│  VPC: 10.0.0.0/16                                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Namespace: boutique                         │  │
│  │                                                          │  │
│  │  ┌────────────┐     ┌────────────────────────────┐     │  │
│  │  │  Frontend  │────▶│      Gateway Service       │     │  │
│  │  │   (React)  │     │     (API Aggregator)       │     │  │
│  │  │ Port: 3000 │     │       Port: 3001           │     │  │
│  │  └────────────┘     └──────────┬─────────────────┘     │  │
│  │                                 │                        │  │
│  │                    ┌────────────┼────────────┐          │  │
│  │                    │            │            │          │  │
│  │           ┌────────▼─────┐  ┌──▼──────┐  ┌─▼──────┐   │  │
│  │           │Auth Service  │  │Product  │  │Order   │   │  │
│  │           │ Port: 5001   │  │Service  │  │Service │   │  │
│  │           └──────────────┘  │Port:5003│  │Port:   │   │  │
│  │                              └─────────┘  │5005    │   │  │
│  │           ┌──────────────┐               └────────┘   │  │
│  │           │User Service  │  ┌──────────────┐          │  │
│  │           │ Port: 5002   │  │Orders Service│          │  │
│  │           └──────────────┘  │  Port: 5004  │          │  │
│  │                              └──────────────┘          │  │
│  │                    │                                    │  │
│  │                    │ Database Connections               │  │
│  │                    ▼                                    │  │
│  │           ┌─────────────────────┐                      │  │
│  │           │   PostgreSQL        │                      │  │
│  │           │  StatefulSet        │                      │  │
│  │           │  Port: 5432         │                      │  │
│  │           │  PVC: 10Gi (EBS)    │                      │  │
│  │           └─────────────────────┘                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Namespace: monitoring                       │  │
│  │                                                      │  │
│  │  ┌─────────────────┐      ┌─────────────────┐      │  │
│  │  │  Prometheus     │◀─────│ServiceMonitor   │      │  │
│  │  │  Port: 9090     │      │(scrapes /metrics│      │  │
│  │  │  (LoadBalancer) │      │  from services) │      │  │
│  │  └────────┬────────┘      └─────────────────┘      │  │
│  │           │                                          │  │
│  │           │ Data Source                              │  │
│  │           ▼                                          │  │
│  │  ┌─────────────────┐                                │  │
│  │  │    Grafana      │                                │  │
│  │  │  Port: 80       │                                │  │
│  │  │  User: admin    │                                │  │
│  │  │  Pass: prom-op  │                                │  │
│  │  └─────────────────┘                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │       Namespace: amazon-cloudwatch                   │  │
│  │                                                      │  │
│  │  ┌─────────────────────────────────────┐            │  │
│  │  │   Fluent Bit DaemonSet              │            │  │
│  │  │   (runs on every node)              │            │  │
│  │  │   ServiceAccount: fluent-bit        │            │  │
│  │  │   IAM Role: FluentBitCloudWatchRole │────┐       │  │
│  │  │   (IRSA with OIDC)                  │    │       │  │
│  │  └─────────────────────────────────────┘    │       │  │
│  └──────────────────────────────────────────────┼───────┘  │
└─────────────────────────────────────────────────┼──────────┘
                                                  │
                                                  │ Ship Logs
                                                  ▼
                                        ┌──────────────────┐
                                        │ CloudWatch Logs  │
                                        │ Log Group:       │
                                        │ aws-eks-boutique │
                                        │ -logs            │
                                        └──────────────────┘
```

---

## Technology Stack

### Infrastructure
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Container Orchestration | Kubernetes (AWS EKS) | 1.27+ | Manage containerized workloads |
| Infrastructure as Code | Terraform | 1.5+ | Provision AWS resources |
| Container Runtime | Docker | 20.10+ | Build and run containers |
| Container Registry | Amazon ECR | - | Store Docker images |
| GitOps | ArgoCD | 2.8+ | Continuous delivery |
| Configuration Management | Kustomize | 4.5+ | Kubernetes manifest templating |

### Application Stack
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Frontend Framework | React | 18.x | Web UI |
| Backend Runtime | Node.js | 18 LTS | Microservices runtime |
| API Framework | Express.js | 4.x | REST API server |
| Database | PostgreSQL | 15 | Relational data storage |
| Authentication | JWT | - | Token-based auth |

### Monitoring & Observability
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Metrics Collection | Prometheus | 2.45+ | Time-series metrics database |
| Metrics Visualization | Grafana | 10.0+ | Dashboards and alerting |
| Metrics Scraping | ServiceMonitor (Prometheus Operator) | - | Auto-discover service metrics |
| Log Forwarding | AWS Fluent Bit | 2.31+ | Ship logs to CloudWatch |
| Centralized Logging | AWS CloudWatch Logs | - | Log aggregation and querying |
| Tracing | (Future: OpenTelemetry) | - | Distributed tracing |

### CI/CD
| Component | Technology | Purpose |
|-----------|-----------|---------|
| CI Pipeline | GitHub Actions | Build, test, push images |
| CD Pipeline | ArgoCD | GitOps-driven deployment |
| Image Build | Docker Buildx | Multi-platform builds |

### AIOps
| Component | Technology | Purpose |
|-----------|-----------|---------|
| AI Agent | AWS Bedrock Agent | Orchestrate troubleshooting |
| Foundation Model | Claude 3.5 Sonnet v2 | Natural language understanding |
| Action Groups | AWS Lambda (Python 3.14) | Tool execution |
| UI | Streamlit | Chat interface |
| SDK | Boto3 | AWS API interactions |

---

## Infrastructure Layer

### AWS Resources

#### EKS Cluster
```yaml
Cluster Name: eks-cluster
Region: us-east-1
Kubernetes Version: 1.27+
Node Group:
  Instance Type: t3.medium (2 vCPU, 4 GiB)
  Desired Capacity: 2 nodes
  Min Size: 2
  Max Size: 4
  AMI: Amazon Linux 2
OIDC Provider: 9CE8DD99CCF6DB0D649DA92BC239FA85
```

#### VPC Configuration
```yaml
CIDR Block: 10.0.0.0/16
Availability Zones: us-east-1a, us-east-1b
Public Subnets:
  - 10.0.1.0/24 (us-east-1a)
  - 10.0.2.0/24 (us-east-1b)
Private Subnets:
  - 10.0.3.0/24 (us-east-1a)
  - 10.0.4.0/24 (us-east-1b)
NAT Gateway: Enabled
Internet Gateway: Enabled
```

#### IAM Roles

**1. FluentBitCloudWatchRole**
```yaml
Purpose: Allow Fluent Bit pods to write logs to CloudWatch
Type: IRSA (IAM Roles for Service Accounts)
Trust Policy: OIDC provider for eks-cluster
Service Account: system:serviceaccount:amazon-cloudwatch:fluent-bit
Policies:
  - logs:CreateLogGroup
  - logs:CreateLogStream
  - logs:PutLogEvents
  - logs:DescribeLogStreams
```

**2. aiops-lambda-role**
```yaml
Purpose: Lambda execution role for AIOps functions
Policies:
  - logs:CreateLogGroup, PutLogEvents (Lambda logging)
  - logs:FilterLogEvents (query CloudWatch Logs)
  - eks:DescribeCluster, DescribeNodegroup, ListNodegroups
  - cloudwatch:GetMetricStatistics
```

**3. aiops-bedrock-agent-role**
```yaml
Purpose: Allow Bedrock Agent to invoke Lambda functions
Policies:
  - bedrock:InvokeModel (invoke Claude)
  - lambda:InvokeFunction (call action groups)
```

#### Elastic Container Registry
```yaml
Repositories:
  - boutique/frontend
  - boutique/gateway
  - boutique/auth
  - boutique/product-service
  - boutique/order-service
  - boutique/orders
  - boutique/user-service
  
Image URI Format:
423535493604.dkr.ecr.us-east-1.amazonaws.com/<service>:<commit-sha>
```

#### Elastic Load Balancers
```yaml
Prometheus LoadBalancer:
  Type: Network Load Balancer
  DNS: ab8139cdcca364779abfbfce24787582-1121503088.us-east-1.elb.amazonaws.com
  Port: 9090
  Target: Prometheus pods in monitoring namespace
  
Frontend/Gateway LoadBalancers:
  Type: Classic Load Balancer
  Created by: Kubernetes Service type=LoadBalancer
  Ports: 3000 (frontend), 3001 (gateway)
```

---

## Application Layer

### Microservices Architecture

#### Service Details

**1. Frontend Service**
```yaml
Name: frontend
Type: React SPA (Single Page Application)
Port: 3000
Dependencies:
  - Gateway Service (API calls)
Environment Variables:
  - REACT_APP_API_URL: http://localhost:3001/api
Build Time: Variables are embedded at Docker build time
Image: 423535493604.dkr.ecr.us-east-1.amazonaws.com/boutique/frontend
Deployment:
  Replicas: 2
  CPU Request: 100m
  Memory Request: 128Mi
```

**2. Gateway Service**
```yaml
Name: gateway
Type: API Gateway / BFF (Backend for Frontend)
Port: 3001
Purpose: Aggregate requests from frontend to backend services
Routes:
  - /api/auth/* → auth:5001
  - /api/users/* → user-service:5002
  - /api/products/* → product-service:5003
  - /api/orders/* → order-service:5005
  - /api/orders-legacy/* → orders:5004
Technology: Express.js
Deployment:
  Replicas: 2
  CPU Request: 100m
  Memory Request: 256Mi
Metrics Endpoint: /metrics (Prometheus format)
```

**3. Auth Service**
```yaml
Name: auth
Port: 5001
Purpose: User authentication and JWT token generation
Endpoints:
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET /api/auth/verify
Database: PostgreSQL (users table)
Technology: Node.js + Express + bcrypt + jsonwebtoken
Metrics: /metrics
```

**4. User Service**
```yaml
Name: user-service
Port: 5002
Purpose: User profile management
Endpoints:
  - GET /api/users/:id
  - PUT /api/users/:id
  - GET /api/users/:id/orders
Database: PostgreSQL (users table)
Auth: JWT middleware
Metrics: /metrics
```

**5. Product Service**
```yaml
Name: product-service
Port: 5003
Purpose: Product catalog and inventory
Endpoints:
  - GET /api/products (list all products)
  - GET /api/products/:id (get product by ID)
  - GET /api/products/categories (list categories)
  - GET /api/products/category/:category (filter by category)
Database: PostgreSQL (products, categories tables)
Important: Route order matters - /categories before /:id
Metrics: /metrics
```

**6. Orders Service (Legacy)**
```yaml
Name: orders
Port: 5004
Purpose: Legacy order handling
Endpoints:
  - GET /api/orders
  - POST /api/orders
Database: PostgreSQL (orders table)
Status: Being replaced by order-service
Metrics: /metrics
```

**7. Order Service**
```yaml
Name: order-service
Port: 5005
Purpose: Modern order management
Endpoints:
  - GET /api/orders
  - POST /api/orders
  - GET /api/orders/:id
  - PUT /api/orders/:id/status
Database: PostgreSQL (orders, order_items tables)
Features:
  - Order creation with multiple items
  - Order status tracking
  - Inventory validation
Metrics: /metrics
```

### Service Communication

```
Frontend (Browser)
    │
    │ HTTP Requests
    ▼
Gateway Service :3001
    │
    ├──▶ Auth Service :5001 (/api/auth/*)
    │      └─▶ PostgreSQL :5432 (users)
    │
    ├──▶ User Service :5002 (/api/users/*)
    │      └─▶ PostgreSQL :5432 (users)
    │
    ├──▶ Product Service :5003 (/api/products/*)
    │      └─▶ PostgreSQL :5432 (products, categories)
    │
    ├──▶ Order Service :5005 (/api/orders/*)
    │      ├─▶ PostgreSQL :5432 (orders, order_items)
    │      └─▶ Product Service :5003 (inventory check)
    │
    └──▶ Orders (Legacy) :5004 (/api/orders-legacy/*)
           └─▶ PostgreSQL :5432 (orders)
```

---

## Data Layer

### PostgreSQL Database

#### Configuration
```yaml
Type: StatefulSet (single instance)
Image: postgres:15
Port: 5432
Storage:
  Type: PersistentVolumeClaim
  Size: 10Gi
  Storage Class: gp2 (AWS EBS)
  Access Mode: ReadWriteOnce
Environment:
  POSTGRES_DB: boutique
  POSTGRES_USER: admin
  POSTGRES_PASSWORD: admin123
  PGDATA: /var/lib/postgresql/data/pgdata
```

#### Database Schema

**Users Table**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Categories Table**
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Products Table**
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    stock_quantity INTEGER DEFAULT 0,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Orders Table**
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Order Items Table**
```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Backup & Restore

**Backup Job** (`gitops/k8s/database/restore-job.yml`)
- Manual Kubernetes Job
- Creates SQL dump using pg_dump
- Stores in ConfigMap or S3 (depending on configuration)

---

## Monitoring & Observability

### Prometheus Stack

#### Installation
```bash
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

#### Configuration
```yaml
Namespace: monitoring
Components:
  - Prometheus Server (metrics database)
  - Grafana (visualization)
  - Prometheus Operator (CRD management)
  - Node Exporter (node metrics)
  - Kube State Metrics (K8s resource metrics)

Prometheus:
  Service Type: LoadBalancer
  Port: 9090
  Scrape Interval: 15s
  Retention: 15 days
  Storage: 50Gi PVC

Grafana:
  Service: ClusterIP
  Port: 80
  Username: admin
  Password: prom-operator
  Data Sources:
    - Prometheus (default)
```

### ServiceMonitor

**Purpose:** Automatically configure Prometheus to scrape metrics from services

**Configuration:** (`gitops/k8s/backend/service-monitor.yml`)
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: boutique-services
  namespace: boutique
  labels:
    release: kube-prometheus-stack
spec:
  namespaceSelector:
    matchNames:
      - boutique
  selector:
    matchExpressions:
      - key: app
        operator: In
        values:
          - gateway
          - auth
          - product-service
          - orders
          - order-service
          - user-service
  endpoints:
    - path: /metrics
      interval: 15s
```

**How It Works:**
1. ServiceMonitor detects services with label `app: <service-name>`
2. Prometheus scrapes `http://<service>:<port>/metrics` every 15 seconds
3. Metrics are stored in Prometheus TSDB
4. Grafana queries Prometheus for visualization

**Metrics Available:**
- `process_cpu_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `http_request_duration_seconds` - Request latency
- `http_requests_total` - Request count
- `kube_pod_container_status_restarts_total` - Pod restart count
- `kube_deployment_status_replicas_available` - Deployment health

### Logging Architecture

#### Fluent Bit DaemonSet

**Installation:**
```bash
helm repo add aws https://aws.github.io/eks-charts
helm upgrade --install aws-for-fluent-bit aws/aws-for-fluent-bit \
  --namespace amazon-cloudwatch --create-namespace \
  --set cloudWatch.enabled=true \
  --set cloudWatch.region=us-east-1 \
  --set cloudWatch.logGroupName=aws-eks-boutique-logs \
  --set serviceAccount.name=fluent-bit \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::423535493604:role/FluentBitCloudWatchRole
```

**How It Works:**
```
Container Logs (/var/log/containers/*.log)
    │
    │ Tail
    ▼
Fluent Bit DaemonSet (on each node)
    │
    │ Parse, Filter, Transform
    ▼
CloudWatch Logs API
    │
    ▼
Log Group: aws-eks-boutique-logs
    │
    ├─ Log Stream: pod-1
    ├─ Log Stream: pod-2
    └─ Log Stream: pod-n
```

**IAM Integration (IRSA):**
1. EKS cluster has OIDC provider: `9CE8DD99CCF6DB0D649DA92BC239FA85`
2. IAM role `FluentBitCloudWatchRole` trusts this OIDC provider
3. Service account `fluent-bit` is annotated with role ARN
4. AWS SDK in Fluent Bit pod assumes the IAM role
5. Fluent Bit writes logs to CloudWatch without hardcoded credentials

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File:** `.github/workflows/ci.yml`

#### Trigger
```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'projects/boutique-microservices/**'
      - '.github/workflows/ci.yml'
```

#### Jobs

**1. Build and Push Images**
```yaml
Steps:
  1. Checkout code
  2. Configure AWS credentials
  3. Login to Amazon ECR
  4. Build Docker images for all services
  5. Tag images with commit SHA
  6. Push to ECR
```

**2. Update GitOps Manifests**
```yaml
Steps:
  1. Update image tags in gitops/k8s/*/deployment.yml
  2. Commit changes with message: "ci: update image tags to <commit-sha>"
  3. Push to main branch
```

**3. ArgoCD Auto-Sync**
- ArgoCD detects Git commit
- Compares cluster state vs. Git state
- Syncs differences (new image tags)
- Deploys updated pods with new images

### GitOps Workflow

```
Developer
   │
   │ git push
   ▼
GitHub Repo (main branch)
   │
   │ webhook trigger
   ▼
GitHub Actions
   │
   ├─ Build images
   ├─ Push to ECR
   └─ Update manifests (image tags)
   │
   │ git push (automated)
   ▼
GitHub Repo (gitops/k8s/)
   │
   │ ArgoCD polling (every 3 min)
   ▼
ArgoCD Application
   │
   ├─ Detect drift
   ├─ Auto-sync enabled
   └─ Self-heal enabled
   │
   │ kubectl apply
   ▼
EKS Cluster
   │
   └─ Rolling update deployments
```

### ArgoCD Configuration

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
      prune: true        # Delete resources removed from Git
      selfHeal: true     # Fix manual kubectl changes
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
```

**Access ArgoCD:**
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Username: admin
# Password: kubectl get secret argocd-initial-admin-secret \
#            -n argocd -o jsonpath="{.data.password}" | base64 -d
```

---

## AIOps Layer

### Bedrock Agent Architecture

```
User Query
   │
   ▼
Streamlit UI (localhost:8501)
   │
   │ invoke_agent(prompt)
   ▼
AWS Bedrock Agent (aiops-assistant)
   │
   │ Claude 3.5 Sonnet v2
   │ Instruction: "You are Kira, a senior SRE..."
   │
   ├─────────────────────┬─────────────────────┐
   │                     │                     │
   ▼                     ▼                     ▼
Lambda:              Lambda:              Lambda:
aiops-fetch-logs     aiops-fetch-metrics  aiops-fetch-health
   │                     │                     │
   ├─ Query             ├─ Query             ├─ Describe
   │  CloudWatch        │  Prometheus        │  EKS cluster
   │  Logs              │  (PromQL)          ├─ Check nodes
   │                     │                     ├─ Query replicas
   │                     │                     └─ Query restarts
   │                     │                     
   └─────────────────────┴─────────────────────┘
                         │
                         │ Return JSON
                         ▼
                  Claude analyzes data
                         │
                         ▼
                   Generate response
                         │
                         ▼
                  Streamlit UI displays
```

### Lambda Functions

#### 1. aiops-fetch-logs

**File:** `projects/aiops-assistant/lambda/fetch_logs/lambda_function.py`

**Purpose:** Query CloudWatch Logs for errors and warnings

**Parameters:**
```json
{
  "filter_pattern": "ERROR",
  "log_group_name": "aws-eks-boutique-logs",
  "hours_back": 1,
  "region": "us-east-1"
}
```

**Response:**
```json
{
  "status": "logs_found",
  "log_group": "aws-eks-boutique-logs",
  "filter": "ERROR",
  "time_range_hours": 1,
  "region": "us-east-1",
  "total_events": 15,
  "logs": [
    {
      "timestamp": "2026-09-02 02:15:30",
      "message": "Database connection timeout after 5000ms"
    }
  ]
}
```

#### 2. aiops-fetch-metrics

**File:** `projects/aiops-assistant/lambda/fetch_metrics/lambda_function.py`

**Purpose:** Query Prometheus for performance metrics

**Parameters:**
```json
{
  "metric_name": "pod_cpu_utilization",
  "namespace": "boutique",
  "hours_back": 1
}
```

**Supported Metrics:**
- `pod_cpu_utilization` - CPU usage per pod
- `pod_memory_utilization` - Memory usage per pod
- `pod_restarts` - Restart count per pod
- `deployment_replicas_unavailable` - Unhealthy replicas
- `deployment_replicas_available` - Healthy replicas

**Response:**
```json
{
  "status": "ok",
  "metric": "pod_cpu_utilization",
  "ns": "boutique",
  "data": [
    {
      "pod": "gateway-7b5d8f9c-abc12",
      "cur": 0.045,
      "avg": 0.038,
      "max": 0.089
    }
  ]
}
```

#### 3. aiops-fetch-health

**File:** `projects/aiops-assistant/lambda/fetch_health/lambda_function.py`

**Purpose:** Check EKS cluster, node group, and pod health

**Parameters:**
```json
{
  "cluster_name": "eks-cluster",
  "namespace": "boutique"
}
```

**Response:**
```json
{
  "status": "success",
  "overall_healthy": true,
  "details": {
    "eks": {
      "cluster": "eks-cluster",
      "ns": "boutique",
      "cluster_status": "ACTIVE",
      "nodes_healthy": true,
      "deployments": [
        {
          "name": "gateway",
          "desired": 2,
          "available": 2,
          "healthy": true
        }
      ],
      "unhealthy_deployments": [],
      "crashing_pods": []
    }
  }
}
```

### Agent Instructions

**Personality:** Kira - Senior SRE with 12 years of experience

**Methodology:**
1. Understand the symptom
2. Form a hypothesis
3. Gather evidence using tools
4. Diagnose by correlating logs, metrics, and health
5. Respond with root cause, evidence, fix, and prevention

**Example Interaction:**
```
User: "Products page is slow"

Kira:
1. Forms hypothesis: Database queries or high CPU
2. Calls fetch_metrics(pod_cpu_utilization, namespace=boutique)
3. Calls fetch_logs(filter_pattern="slow query", hours_back=1)
4. Calls fetch_health(cluster_name=eks-cluster, namespace=boutique)
5. Correlates data:
   - product-service CPU at 85% (high)
   - Logs show "Executing SELECT * FROM products" (N+1 query)
   - No unhealthy pods
6. Response:
   Root Cause: Inefficient SQL query in product-service
   Evidence: CPU 85%, "SELECT * FROM products" repeated 50 times
   Fix: Add pagination and indexes
   Prevention: Query performance monitoring
```

---

## Network Architecture

### Kubernetes Networking

#### Service Types

**ClusterIP (default)**
```yaml
Purpose: Internal service communication
Examples:
  - postgres:5432
  - auth:5001
  - product-service:5003
Access: Only within cluster
```

**LoadBalancer**
```yaml
Purpose: External access via AWS ELB
Examples:
  - frontend:3000 (internet-facing)
  - gateway:3001 (internet-facing)
  - prometheus:9090 (for AIOps Lambda)
Access: Public internet (configure security groups)
```

#### DNS Resolution

**In-Cluster DNS:**
```bash
# Short form (same namespace)
http://gateway:3001

# Fully qualified (cross-namespace)
http://gateway.boutique.svc.cluster.local:3001

# Kube-DNS entries
<service-name>.<namespace>.svc.cluster.local
```

### Port Allocation

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| frontend | 3000 | HTTP | React dev server |
| gateway | 3001 | HTTP | API gateway |
| auth | 5001 | HTTP | Auth API |
| user-service | 5002 | HTTP | User API |
| product-service | 5003 | HTTP | Product API |
| orders | 5004 | HTTP | Orders API (legacy) |
| order-service | 5005 | HTTP | Orders API (new) |
| postgres | 5432 | TCP | Database |
| prometheus | 9090 | HTTP | Metrics API |
| grafana | 80 | HTTP | Dashboard UI |
| argocd-server | 443 | HTTPS | ArgoCD UI |

---

## Security Architecture

### Authentication & Authorization

**1. User Authentication (JWT)**
```
User → POST /api/auth/login → Auth Service
                                    │
                                    ├─ Validate credentials
                                    ├─ Generate JWT token
                                    └─ Return token
User stores token → Include in headers: Authorization: Bearer <token>
                                    │
Gateway → Verify JWT middleware → Forward to backend services
```

**2. Service-to-Service Authentication**
- Currently: None (trust within cluster)
- Future: Service Mesh (Istio mTLS)

**3. IAM Roles (AWS)**
- IRSA: Pod-level AWS permissions without storing credentials
- Principle of Least Privilege: Each role has minimal permissions

### Secrets Management

**Kubernetes Secrets**
```yaml
File: gitops/secrets.yml
Type: Opaque
Data (base64 encoded):
  - POSTGRES_PASSWORD
  - JWT_SECRET
  - AWS_ACCESS_KEY_ID (optional, prefer IRSA)
  
Note: In production, use AWS Secrets Manager or HashiCorp Vault
```

### Network Policies

**Current:** None (all pods can communicate)

**Recommended:**
```yaml
# Deny all ingress by default
# Allow only specific service-to-service communication
# Example: Only gateway can call backend services
```

---

## Deployment Model

### Rolling Update Strategy

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 1

# Process:
# 1. Create 1 new pod (maxSurge)
# 2. Wait for new pod to be Ready
# 3. Terminate 1 old pod (maxUnavailable)
# 4. Repeat until all pods updated
# 5. Zero-downtime deployment
```

### Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 10
  
readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
  
# Liveness: Restart pod if fails
# Readiness: Remove from load balancer if fails
```

### Resource Limits

```yaml
resources:
  requests:
    cpu: 100m        # Guaranteed CPU
    memory: 256Mi    # Guaranteed memory
  limits:
    cpu: 500m        # Max CPU before throttle
    memory: 512Mi    # Max memory before OOMKill
```

---

## Summary

This architecture demonstrates a **production-ready, cloud-native microservices platform** with:

✅ **Scalability** - Kubernetes auto-scaling, EKS node groups
✅ **Reliability** - Rolling updates, health checks, self-healing
✅ **Observability** - Metrics (Prometheus), Logs (CloudWatch), Dashboards (Grafana)
✅ **Automation** - GitOps (ArgoCD), CI/CD (GitHub Actions)
✅ **Intelligence** - AIOps (Bedrock Agent) for troubleshooting
✅ **Security** - IRSA, JWT auth, secrets management
✅ **Cost Efficiency** - Right-sized instances, EBS volumes, monitoring

**Next Steps:** See `DEPLOYMENT-GUIDE.md` for step-by-step deployment instructions.
