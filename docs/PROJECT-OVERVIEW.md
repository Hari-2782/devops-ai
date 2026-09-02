# Project Overview - DevOps + AIOps Platform

Complete overview of the Boutique Microservices E-Commerce Platform with AIOps integration.

---

## 📋 Executive Summary

### What Is This Project?

A **production-grade, cloud-native e-commerce platform** built with microservices architecture, deployed on AWS EKS, featuring:

- **7 microservices** (Frontend, Gateway, Auth, User, Product, Order services)
- **PostgreSQL database** with persistent storage
- **GitOps deployment** with ArgoCD
- **CI/CD pipeline** with GitHub Actions
- **Comprehensive monitoring** with Prometheus and Grafana
- **Centralized logging** with Fluent Bit and CloudWatch
- **AI-powered troubleshooting** with AWS Bedrock Agent (Kira)

**Purpose:** Demonstrate real-world DevOps practices with AI integration for operations automation.

---

## 🎯 Project Goals

### Learning Objectives

1. **Microservices Architecture**
   - Service decomposition
   - Inter-service communication
   - API gateway pattern
   - Database per service

2. **Container Orchestration**
   - Kubernetes deployments
   - Service discovery
   - Persistent storage
   - Health checks and self-healing

3. **Cloud Infrastructure**
   - AWS EKS cluster management
   - VPC networking
   - IAM roles and IRSA
   - Load balancing with ELB

4. **GitOps Workflow**
   - Infrastructure as Code
   - Declarative configuration
   - Git as source of truth
   - Automated synchronization

5. **Observability**
   - Metrics collection with Prometheus
   - Visualization with Grafana
   - Centralized logging
   - Distributed tracing (planned)

6. **CI/CD Automation**
   - Automated builds
   - Container registry integration
   - Continuous deployment
   - GitOps-driven releases

7. **AIOps Integration**
   - AI-powered root cause analysis
   - Automated log analysis
   - Metric correlation
   - Intelligent alerting

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Load Balancer (ELB)                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │
┌──────────────────┴──────────────────────────────────────────┐
│              Kubernetes Cluster (AWS EKS)                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │             Application Layer (boutique ns)            │ │
│  │                                                        │ │
│  │  Frontend → Gateway → [Auth, User, Product, Order]   │ │
│  │                           ↓                            │ │
│  │                      PostgreSQL                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Monitoring Layer (monitoring ns)             │ │
│  │                                                        │ │
│  │        Prometheus ← ServiceMonitor → Services         │ │
│  │              ↓                                          │ │
│  │           Grafana                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │      Logging Layer (amazon-cloudwatch ns)              │ │
│  │                                                        │ │
│  │  Fluent Bit DaemonSet → CloudWatch Logs               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            GitOps Layer (argocd ns)                    │ │
│  │                                                        │ │
│  │  ArgoCD → Git Repository → Auto-Sync                  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                   │
                   │ Logs & Metrics
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Services                              │
│                                                              │
│  • CloudWatch Logs (centralized logging)                    │
│  • ECR (container images)                                    │
│  • EBS (persistent volumes)                                  │
│  • Lambda (AIOps actions)                                    │
│  • Bedrock (AI assistant)                                    │
└──────────────────────────────────────────────────────────────┘
                   │
                   │ Query & Analyze
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              AIOps Assistant (Kira)                          │
│                                                              │
│  Streamlit UI → Bedrock Agent → Lambda Functions            │
│  • Analyze logs                                              │
│  • Query metrics                                             │
│  • Check service health                                      │
│  • Root cause analysis                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Components

### 1. Application Services

| Service | Port | Language | Purpose | Database |
|---------|------|----------|---------|----------|
| **frontend** | 3000 | React 18 | User interface | - |
| **gateway** | 3001 | Node.js | API aggregation | - |
| **auth** | 5001 | Node.js | Authentication, JWT | PostgreSQL |
| **user-service** | 5002 | Node.js | User profile management | PostgreSQL |
| **product-service** | 5003 | Node.js | Product catalog | PostgreSQL |
| **orders** (legacy) | 5004 | Node.js | Legacy order system | PostgreSQL |
| **order-service** | 5005 | Node.js | Modern order management | PostgreSQL |

### 2. Data Layer

- **PostgreSQL 15** (StatefulSet)
  - Single instance
  - 10Gi persistent volume (AWS EBS)
  - Tables: users, categories, products, orders, order_items
  - Sample data loaded on initialization

### 3. Monitoring Stack

- **Prometheus** (kube-prometheus-stack)
  - Metrics collection every 15s
  - 15-day retention
  - 50Gi storage
  - LoadBalancer for external access

- **Grafana**
  - Pre-configured dashboards
  - Prometheus data source
  - User: admin, Pass: prom-operator

- **ServiceMonitor**
  - Auto-discovers services by label
  - Scrapes `/metrics` endpoints
  - Targets: all 6 backend services

### 4. Logging Stack

- **Fluent Bit DaemonSet**
  - Runs on every node
  - Tails container logs
  - Forwards to CloudWatch Logs
  - IRSA for authentication

- **CloudWatch Logs**
  - Log Group: `aws-eks-boutique-logs`
  - Centralized log storage
  - Queryable with CloudWatch Insights

### 5. GitOps

- **ArgoCD**
  - Monitors Git repository
  - Auto-syncs every 3 minutes
  - Self-heals manual changes
  - Prunes deleted resources
  - Git = Source of Truth

- **Kustomize**
  - Manifest templating
  - Dynamic image tag updates
  - Common labels and annotations

### 6. CI/CD Pipeline

- **GitHub Actions**
  - Triggered on push to main
  - Builds Docker images
  - Pushes to Amazon ECR
  - Updates GitOps manifests with new image tags
  - Commits and pushes to Git

### 7. AIOps Layer

- **AWS Bedrock Agent (Kira)**
  - Foundation Model: Claude 3.5 Sonnet v2
  - Persona: Senior SRE with 12 years experience
  - Methodology: Symptom → Hypothesis → Evidence → Diagnosis → Recommendation

- **Lambda Functions (3)**
  - `aiops-fetch-logs` - Query CloudWatch Logs
  - `aiops-fetch-metrics` - Query Prometheus metrics
  - `aiops-fetch-health` - Check EKS/pod health

- **Streamlit UI**
  - Chat interface (localhost:8501)
  - Natural language queries
  - Real-time troubleshooting

---

## 🚀 Quick Start

### Prerequisites

- AWS Account with billing enabled
- AWS CLI configured
- kubectl installed
- Helm installed
- Docker installed
- Git installed

### Installation Steps

**1. Clone Repository**
```bash
git clone https://github.com/Hari-2782/devops-ai.git
cd devops-ai
```

**2. Provision Infrastructure**
```bash
cd projects/Infrastructure
terraform init
terraform apply -auto-approve
```

**3. Configure kubectl**
```bash
aws eks update-kubeconfig --name eks-cluster --region us-east-1
```

**4. Deploy Application via GitOps**
```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Deploy application
kubectl apply -f gitops/argo-cd.yml

# Wait for sync
kubectl get applications -n argocd -w
```

**5. Install Monitoring**
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

**6. Install Logging**
```bash
cd projects/aiops-assistant
./setup-iam.sh

helm repo add aws https://aws.github.io/eks-charts
helm upgrade --install aws-for-fluent-bit aws/aws-for-fluent-bit \
  --namespace amazon-cloudwatch --create-namespace \
  --set cloudWatch.logGroupName=aws-eks-boutique-logs \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::YOUR-ACCOUNT-ID:role/FluentBitCloudWatchRole
```

**7. Deploy AIOps Assistant**
```bash
# Create Lambda functions and Bedrock Agent
cd projects/aiops-assistant
./deploy.sh

# Or create manually in AWS Console (if maintenance mode)

# Start Streamlit UI
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Agent ID
streamlit run app.py
```

**8. Access Services**
```bash
# Frontend
kubectl port-forward svc/frontend -n boutique 3000:3000
# http://localhost:3000

# Gateway API
kubectl port-forward svc/gateway -n boutique 3001:3001
# http://localhost:3001/api/products

# Prometheus
kubectl port-forward svc/kube-prometheus-stack-prometheus -n monitoring 9090:9090
# http://localhost:9090

# Grafana
kubectl port-forward svc/kube-prometheus-stack-grafana -n monitoring 3000:80
# http://localhost:3000 (admin / prom-operator)

# ArgoCD
kubectl port-forward svc/argocd-server -n argocd 8080:443
# https://localhost:8080

# AIOps Assistant
# http://localhost:8501
```

---

## 📊 Key Features

### ✅ Microservices Architecture

- **Service Decomposition:** Each service has a single responsibility
- **Independent Deployment:** Services can be updated independently
- **Technology Diversity:** Can use different languages/frameworks per service
- **Fault Isolation:** Failure in one service doesn't crash entire app

### ✅ Kubernetes Orchestration

- **Auto-Scaling:** HPA for pods, Cluster Autoscaler for nodes
- **Self-Healing:** Kubernetes restarts failed pods automatically
- **Rolling Updates:** Zero-downtime deployments
- **Service Discovery:** DNS-based service communication
- **Load Balancing:** Built-in load balancing for services
- **Persistent Storage:** StatefulSets with EBS volumes

### ✅ GitOps with ArgoCD

- **Git as Source of Truth:** All infrastructure defined in Git
- **Automated Sync:** Changes automatically deployed
- **Drift Detection:** Alerts on manual cluster changes
- **Rollback:** Easy rollback via Git revert
- **Audit Trail:** Full history of changes in Git

### ✅ Observability

**Metrics:**
- Pod CPU and memory usage
- Request rates and latencies
- Error rates
- Database query performance
- Deployment health

**Logs:**
- Centralized in CloudWatch
- Queryable with CloudWatch Insights
- Real-time log tailing
- Structured logging

**Dashboards:**
- Pre-built Kubernetes dashboards
- Custom boutique application dashboards
- Real-time metrics visualization

### ✅ CI/CD Automation

- **Automated Builds:** Triggered on Git push
- **Container Registry:** Images stored in Amazon ECR
- **Image Tagging:** Git commit SHA for traceability
- **Manifest Updates:** GitOps manifests updated automatically
- **Security Scanning:** ECR image scanning

### ✅ AIOps Intelligence

- **Natural Language Queries:** Chat with Kira in plain English
- **Root Cause Analysis:** Correlates logs, metrics, and health
- **Proactive Monitoring:** Detects anomalies
- **Automated Remediation:** Suggests fixes
- **Knowledge Base:** Learns from incidents

---

## 🔒 Security Features

### IAM & Authentication

- **IRSA (IAM Roles for Service Accounts):** Pod-level AWS permissions
- **JWT Authentication:** Token-based API authentication
- **Secrets Management:** Kubernetes Secrets (encrypted at rest)
- **Least Privilege:** Minimal IAM permissions per service

### Network Security

- **VPC Isolation:** Private subnets for nodes
- **Security Groups:** Firewall rules for ELB and nodes
- **Network Policies:** Pod-to-pod communication control (planned)
- **Service Mesh:** mTLS for service-to-service (planned)

### Container Security

- **Image Scanning:** ECR scans for vulnerabilities
- **Non-Root Containers:** Pods run as non-root users
- **Read-Only Filesystems:** Containers have read-only root FS (planned)
- **Resource Limits:** Prevents resource exhaustion attacks

---

## 💰 Cost Optimization

### Current Infrastructure Costs

**Monthly Estimate (us-east-1):**

| Resource | Quantity | Cost/Month |
|----------|----------|------------|
| EKS Control Plane | 1 | $73 |
| EC2 t3.medium nodes | 2 | $60 |
| EBS gp2 volumes | ~100GB | $10 |
| NAT Gateway | 1 | $33 |
| Load Balancers | 3 | $50 |
| CloudWatch Logs | ~10GB | $5 |
| **Total** | | **~$231/month** |

### Cost Reduction Strategies

1. **Use Spot Instances:** Save 70% on EC2 costs
2. **Right-Size Nodes:** Use t3.small instead of t3.medium
3. **EBS Snapshots:** Lifecycle policies for old snapshots
4. **CloudWatch Log Retention:** Set to 7 days instead of indefinite
5. **Reserved Instances:** Commit 1-3 years for 40-60% savings

---

## 📈 Scalability

### Current Capacity

- **2 nodes** × t3.medium = **4 vCPU, 8GB RAM**
- **~10-15 pods** running
- **~500 requests/minute** capacity

### Scaling Strategies

**Horizontal Pod Autoscaler (HPA):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Cluster Autoscaler:**
- Automatically adds nodes when pods are pending
- Removes underutilized nodes after 10 minutes

**Database Scaling:**
- Vertical: Increase CPU/RAM
- Read Replicas: For read-heavy workloads
- Connection Pooling: PgBouncer

---

## 🛣️ Roadmap

### Phase 1: Core Infrastructure ✅ (Complete)
- [x] EKS cluster setup
- [x] Microservices deployment
- [x] PostgreSQL database
- [x] Basic networking

### Phase 2: Observability ✅ (Complete)
- [x] Prometheus metrics
- [x] Grafana dashboards
- [x] Fluent Bit logging
- [x] CloudWatch Logs

### Phase 3: GitOps & CI/CD ✅ (Complete)
- [x] ArgoCD setup
- [x] GitHub Actions pipeline
- [x] Automated image builds
- [x] GitOps-driven deployments

### Phase 4: AIOps 🚧 (In Progress)
- [x] Bedrock Agent (Kira)
- [x] Lambda functions
- [x] Streamlit UI
- [ ] Anomaly detection
- [ ] Predictive scaling

### Phase 5: Advanced Features 📋 (Planned)
- [ ] Service Mesh (Istio)
- [ ] Distributed Tracing (OpenTelemetry)
- [ ] Chaos Engineering (Chaos Mesh)
- [ ] Multi-Region Deployment
- [ ] Blue/Green Deployments
- [ ] Canary Releases

### Phase 6: Security Hardening 📋 (Planned)
- [ ] Network Policies
- [ ] Pod Security Standards
- [ ] AWS Secrets Manager integration
- [ ] Vulnerability scanning in CI
- [ ] OPA (Open Policy Agent)

---

## 📚 Documentation

### Available Guides

| Document | Description | Link |
|----------|-------------|------|
| **Complete Architecture** | System design, components, data flow | [COMPLETE-ARCHITECTURE.md](COMPLETE-ARCHITECTURE.md) |
| **Deployment Guide** | Step-by-step setup instructions | [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) |
| **Configuration Reference** | All configs explained | [CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md) |
| **Troubleshooting Guide** | Common issues and fixes | [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md) |
| **API Reference** | Service endpoints and schemas | [API-REFERENCE.md](API-REFERENCE.md) |

### Learning Resources

- [Part 1: System Design](part1-system-design.md)
- [Part 2: Workflow Overview](part2-workflow.md)
- [Claude Setup Guide](claude-setup.md)

---

## 🤝 Contributing

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Make changes and test**
4. **Commit:** `git commit -m "feat: add amazing feature"`
5. **Push:** `git push origin feature/amazing-feature`
6. **Open Pull Request**

### Contribution Guidelines

- Follow commit message conventions: `feat:`, `fix:`, `docs:`, `chore:`
- Test changes locally before submitting PR
- Update documentation if adding features
- Add unit tests for new code

---

## 🧪 Testing

### Manual Testing

```bash
# Test frontend
kubectl port-forward svc/frontend -n boutique 3000:3000
# Navigate to http://localhost:3000
# Register, login, browse products, place order

# Test API
kubectl port-forward svc/gateway -n boutique 3001:3001
curl http://localhost:3001/api/products
curl http://localhost:3001/api/products/categories
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"username":"test","email":"test@example.com","password":"test123"}'

# Test database
kubectl exec -it -n boutique postgres-0 -- psql -U admin -d boutique
SELECT * FROM products;
SELECT * FROM users;
```

### Load Testing

```bash
# Install k6
brew install k6  # macOS
# Or: curl https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz -L | tar xvz

# Run load test
k6 run tests/load-test.js

# Example load test
# 100 virtual users, 5 minute duration
# Expected: <200ms p95 latency, <1% error rate
```

---

## 🏆 Best Practices Demonstrated

### DevOps
✅ Infrastructure as Code (Terraform)
✅ Configuration as Code (Kubernetes manifests)
✅ GitOps workflow (ArgoCD)
✅ Automated CI/CD (GitHub Actions)
✅ Immutable infrastructure (containers)
✅ Declarative configuration

### Cloud Native
✅ Microservices architecture
✅ Container orchestration (Kubernetes)
✅ Service discovery
✅ Health checks
✅ Rolling updates
✅ Auto-scaling

### Observability
✅ Metrics collection (Prometheus)
✅ Log aggregation (Fluent Bit)
✅ Dashboards (Grafana)
✅ Alerting
✅ Tracing (planned)

### Security
✅ Least privilege IAM
✅ IRSA for pod-level permissions
✅ Secrets management
✅ Network isolation
✅ Image scanning

---

## 📞 Support

### Getting Help

- **Documentation:** Check `docs/` directory
- **Issues:** Open GitHub Issue
- **Troubleshooting:** See [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md)
- **Discussions:** GitHub Discussions

### Useful Commands

```bash
# Quick health check
kubectl get pods --all-namespaces

# View logs
kubectl logs -n boutique deployment/gateway --tail=50 -f

# Check ArgoCD sync status
kubectl get applications -n argocd

# Access Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Access AIOps UI
streamlit run projects/aiops-assistant/app.py
```

---

## 📄 License

This project is for educational purposes.

---

## 🙏 Acknowledgments

- **AWS:** For EKS, Bedrock, and cloud services
- **Anthropic:** For Claude AI model
- **Prometheus Community:** For monitoring stack
- **ArgoCD Team:** For GitOps platform
- **Open Source Community:** For countless tools and libraries

---

**Built with ❤️ by Hari**

*Demonstrating real-world DevOps practices with AI-powered operations*

---

## 🎯 Success Metrics

After completing this project, you will understand:

✅ How to design and deploy microservices
✅ How to orchestrate containers with Kubernetes
✅ How to implement GitOps workflows
✅ How to set up comprehensive monitoring
✅ How to configure centralized logging
✅ How to build CI/CD pipelines
✅ How to integrate AI into operations
✅ How to troubleshoot distributed systems
✅ How to secure cloud-native applications
✅ How to optimize costs and performance

**Ready to deploy? Start with [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)**
