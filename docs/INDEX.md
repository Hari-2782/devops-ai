# 📚 Complete Documentation Index

**DevOps + AIOps Platform - Boutique Microservices E-Commerce**

---

## 🚀 Getting Started

### New to the Project?

1. **Start here:** [Project Overview](PROJECT-OVERVIEW.md)
   - Executive summary
   - Key features
   - Quick start guide
   - Success metrics

2. **Understand the architecture:** [Complete Architecture](COMPLETE-ARCHITECTURE.md)
   - System design
   - Technology stack
   - Component details
   - Network architecture

3. **Deploy the system:** [Deployment Guide](DEPLOYMENT-GUIDE.md)
   - Prerequisites
   - Step-by-step installation
   - Infrastructure setup
   - Application deployment
   - Verification steps

4. **Configure services:** [Configuration Reference](CONFIGURATION-REFERENCE.md)
   - Kubernetes manifests
   - Helm values
   - Environment variables
   - All configs explained

5. **Troubleshoot issues:** [Troubleshooting Guide](TROUBLESHOOTING-GUIDE.md)
   - Common problems
   - Debugging techniques
   - Emergency recovery
   - Performance optimization

---

## 📖 Complete Documentation

### Core Documentation

| Document | Description | When to Use |
|----------|-------------|-------------|
| [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) | Executive summary, quick start, roadmap | First read for project understanding |
| [COMPLETE-ARCHITECTURE.md](COMPLETE-ARCHITECTURE.md) | System design, components, data flow | Learn system architecture |
| [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) | Step-by-step deployment instructions | When setting up the system |
| [CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md) | Configuration files explained | When modifying configs |
| [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md) | Common issues and solutions | When something breaks |

### Learning Resources

| Document | Description | Audience |
|----------|-------------|----------|
| [part1-beginner-concepts.md](part1-beginner-concepts.md) | Beginner DevOps concepts | Beginners |
| [part1-system-design.md](part1-system-design.md) | System design foundations | Intermediate |
| [part2-workflow.md](part2-workflow.md) | End-to-end workflow | All levels |
| [claude-setup.md](claude-setup.md) | AI assistant configuration | All levels |

---

## 🗂️ Documentation by Topic

### Infrastructure & Cloud

**Complete Architecture**
- [Infrastructure Layer](COMPLETE-ARCHITECTURE.md#infrastructure-layer)
  - EKS cluster configuration
  - VPC setup
  - IAM roles and policies
  - ECR repositories
  - Load balancers

**Deployment Guide**
- [Infrastructure Setup](DEPLOYMENT-GUIDE.md#infrastructure-setup)
  - Terraform provisioning
  - EKS cluster creation
  - Network configuration

**Configuration Reference**
- [Kubernetes Manifests](CONFIGURATION-REFERENCE.md#kubernetes-manifests)
  - Namespace configs
  - Secrets management
  - StatefulSet configs

---

### Application Architecture

**Complete Architecture**
- [Application Layer](COMPLETE-ARCHITECTURE.md#application-layer)
  - Microservices architecture
  - Service details (7 services)
  - Service communication
  - API gateway pattern

**Configuration Reference**
- [Backend Services](CONFIGURATION-REFERENCE.md#backend-service-gateway)
  - Gateway service config
  - Auth service config
  - Product/Order/User services
  - Frontend configuration

**Troubleshooting Guide**
- [Application Issues](TROUBLESHOOTING-GUIDE.md#application-issues)
  - Pods stuck pending
  - CrashLoopBackOff
  - Frontend 404 errors
  - Route ordering issues

---

### Database

**Complete Architecture**
- [Data Layer](COMPLETE-ARCHITECTURE.md#data-layer)
  - PostgreSQL configuration
  - Database schema
  - Backup & restore

**Configuration Reference**
- [Database Configuration](CONFIGURATION-REFERENCE.md#database-postgresql)
  - StatefulSet config
  - Init scripts
  - Connection pooling

**Troubleshooting Guide**
- [Database Issues](TROUBLESHOOTING-GUIDE.md#database-issues)
  - Initialization problems
  - Connection pool exhausted
  - Slow queries

---

### Monitoring & Observability

**Complete Architecture**
- [Monitoring & Observability](COMPLETE-ARCHITECTURE.md#monitoring--observability)
  - Prometheus stack
  - ServiceMonitor
  - Grafana dashboards
  - Fluent Bit logging

**Deployment Guide**
- [Monitoring Setup](DEPLOYMENT-GUIDE.md#monitoring-setup)
  - Install Prometheus
  - Expose via LoadBalancer
  - Configure ServiceMonitor
  - Access Grafana
  - Import dashboards

**Configuration Reference**
- [Monitoring Configuration](CONFIGURATION-REFERENCE.md#monitoring-configuration)
  - Prometheus scrape configs
  - ServiceMonitor specs
  - Grafana datasources

**Troubleshooting Guide**
- [Monitoring Issues](TROUBLESHOOTING-GUIDE.md#monitoring-issues)
  - Prometheus not scraping
  - Grafana shows "No Data"
  - Missing service labels

---

### Logging

**Complete Architecture**
- [Logging Architecture](COMPLETE-ARCHITECTURE.md#logging-architecture)
  - Fluent Bit DaemonSet
  - IRSA configuration
  - CloudWatch Logs

**Deployment Guide**
- [Logging Setup](DEPLOYMENT-GUIDE.md#logging-setup)
  - Create IAM role (IRSA)
  - Install Fluent Bit
  - Verify logs in CloudWatch

**Configuration Reference**
- [Logging Configuration](CONFIGURATION-REFERENCE.md#logging-configuration)
  - Fluent Bit config
  - CloudWatch log groups
  - IRSA setup

**Troubleshooting Guide**
- [Logging Issues](TROUBLESHOOTING-GUIDE.md#logging-issues)
  - Fluent Bit not sending logs
  - IRSA authentication errors
  - Wrong log group path

---

### GitOps & CI/CD

**Complete Architecture**
- [CI/CD Pipeline](COMPLETE-ARCHITECTURE.md#cicd-pipeline)
  - GitHub Actions workflow
  - GitOps workflow
  - ArgoCD configuration

**Deployment Guide**
- [GitOps Configuration](DEPLOYMENT-GUIDE.md#gitops-configuration)
  - Install ArgoCD
  - Deploy application
  - Configure auto-sync

**Configuration Reference**
- [GitOps Configuration](CONFIGURATION-REFERENCE.md#gitops-configuration)
  - ArgoCD Application manifest
  - Kustomization
  - Sync policies

**Troubleshooting Guide**
- [GitOps Issues](TROUBLESHOOTING-GUIDE.md#gitops-issues)
  - Application OutOfSync
  - ArgoCD not detecting changes
  - Self-heal behavior

---

### AIOps Assistant

**Complete Architecture**
- [AIOps Layer](COMPLETE-ARCHITECTURE.md#aiops-layer)
  - Bedrock Agent architecture
  - Lambda functions
  - Agent instructions

**Deployment Guide**
- [AIOps Assistant Deployment](DEPLOYMENT-GUIDE.md#aiops-assistant-deployment)
  - Create Lambda functions
  - Create Bedrock Agent
  - Deploy Streamlit UI

**Configuration Reference**
- [AIOps Configuration](CONFIGURATION-REFERENCE.md#aiops-configuration)
  - Lambda env variables
  - Bedrock Agent config
  - Streamlit settings

**Troubleshooting Guide**
- [AIOps Issues](TROUBLESHOOTING-GUIDE.md#aiops-issues)
  - Bedrock not responding
  - Lambda timeout
  - Kira can't access tools

---

### Networking

**Complete Architecture**
- [Network Architecture](COMPLETE-ARCHITECTURE.md#network-architecture)
  - Service types
  - DNS resolution
  - Port allocation

**Configuration Reference**
- [Networking Configuration](CONFIGURATION-REFERENCE.md#networking-configuration)
  - Service mesh (planned)
  - Network policies
  - LoadBalancer configs

**Troubleshooting Guide**
- [Networking Issues](TROUBLESHOOTING-GUIDE.md#networking-issues)
  - Cannot access from outside
  - Security group blocking
  - DNS resolution failures

---

### Security

**Complete Architecture**
- [Security Architecture](COMPLETE-ARCHITECTURE.md#security-architecture)
  - Authentication (JWT)
  - IAM roles (IRSA)
  - Secrets management
  - Network policies

**Project Overview**
- [Security Features](PROJECT-OVERVIEW.md#-security-features)
  - IAM & authentication
  - Network security
  - Container security

---

## 📋 Quick Reference

### Common Commands

```bash
# Application
kubectl get pods -n boutique
kubectl logs -n boutique deployment/gateway --tail=50
kubectl port-forward svc/frontend -n boutique 3000:3000

# Monitoring
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Logging
kubectl logs -n amazon-cloudwatch -l app.kubernetes.io/name=aws-for-fluent-bit
aws logs tail aws-eks-boutique-logs --follow

# GitOps
kubectl get applications -n argocd
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Database
kubectl exec -it -n boutique postgres-0 -- psql -U admin -d boutique

# AIOps
streamlit run projects/aiops-assistant/app.py
```

### Important URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | (after port-forward) |
| Gateway API | http://localhost:3001 | (after port-forward) |
| Prometheus | http://localhost:9090 | (after port-forward) |
| Grafana | http://localhost:3000 | admin / prom-operator |
| ArgoCD | https://localhost:8080 | admin / (get from secret) |
| AIOps UI | http://localhost:8501 | - |

### Environment Details

| Component | Value |
|-----------|-------|
| AWS Region | us-east-1 |
| EKS Cluster | eks-cluster |
| K8s Version | 1.27+ |
| Node Type | t3.medium |
| Node Count | 2 (min) - 4 (max) |
| Database | PostgreSQL 15 |
| Log Group | aws-eks-boutique-logs |
| ECR Registry | 423535493604.dkr.ecr.us-east-1.amazonaws.com |

---

## 🎯 Learning Paths

### Path 1: Beginner (2-3 weeks)

**Week 1: Fundamentals**
1. Read [part1-beginner-concepts.md](part1-beginner-concepts.md)
2. Read [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md)
3. Understand [COMPLETE-ARCHITECTURE.md](COMPLETE-ARCHITECTURE.md) (high-level)

**Week 2: Hands-On**
4. Follow [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
5. Deploy on AWS EKS
6. Verify all components working

**Week 3: Practice**
7. Break things intentionally
8. Use [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md) to fix
9. Practice kubectl commands

### Path 2: Intermediate (1-2 weeks)

**Week 1: Architecture & Deployment**
1. Deep dive into [COMPLETE-ARCHITECTURE.md](COMPLETE-ARCHITECTURE.md)
2. Study [part1-system-design.md](part1-system-design.md)
3. Deploy system using [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
4. Understand [CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md)

**Week 2: GitOps & AIOps**
5. Study [part2-workflow.md](part2-workflow.md)
6. Implement CI/CD changes
7. Deploy AIOps assistant
8. Practice troubleshooting

### Path 3: Advanced (1 week)

**Deep Dive**
1. Review entire architecture
2. Implement advanced features (service mesh, tracing)
3. Optimize performance and costs
4. Contribute improvements

---

## 🔍 Finding Information

### "I want to..."

**...understand what this project is**
→ [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md)

**...learn the system architecture**
→ [COMPLETE-ARCHITECTURE.md](COMPLETE-ARCHITECTURE.md)

**...deploy the system**
→ [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

**...change a configuration**
→ [CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md)

**...fix an error**
→ [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md)

**...understand how services communicate**
→ [COMPLETE-ARCHITECTURE.md#service-communication](COMPLETE-ARCHITECTURE.md#service-communication)

**...set up monitoring**
→ [DEPLOYMENT-GUIDE.md#monitoring-setup](DEPLOYMENT-GUIDE.md#monitoring-setup)

**...configure GitOps**
→ [DEPLOYMENT-GUIDE.md#gitops-configuration](DEPLOYMENT-GUIDE.md#gitops-configuration)

**...deploy AIOps assistant**
→ [DEPLOYMENT-GUIDE.md#aiops-assistant-deployment](DEPLOYMENT-GUIDE.md#aiops-assistant-deployment)

**...understand costs**
→ [PROJECT-OVERVIEW.md#-cost-optimization](PROJECT-OVERVIEW.md#-cost-optimization)

**...scale the system**
→ [PROJECT-OVERVIEW.md#-scalability](PROJECT-OVERVIEW.md#-scalability)

**...secure the platform**
→ [COMPLETE-ARCHITECTURE.md#security-architecture](COMPLETE-ARCHITECTURE.md#security-architecture)

---

## 📊 Documentation Coverage

### What's Documented

✅ System architecture and design
✅ Infrastructure provisioning
✅ Application deployment
✅ Kubernetes configurations
✅ Monitoring setup
✅ Logging configuration
✅ GitOps workflow
✅ CI/CD pipeline
✅ AIOps assistant
✅ Troubleshooting
✅ Security practices
✅ Cost optimization
✅ Scaling strategies

### Coming Soon

📋 API Reference (service endpoints, schemas)
📋 Testing Guide (unit, integration, load tests)
📋 Disaster Recovery procedures
📋 Multi-region deployment
📋 Advanced security hardening

---

## 🤝 Contributing to Docs

Found an error? Want to improve documentation?

1. Create an issue describing the problem
2. Or submit a PR with fixes
3. Follow documentation style:
   - Clear headings
   - Code examples
   - Step-by-step instructions
   - Troubleshooting tips

---

## 📞 Getting Help

### Documentation Issues

- **Can't find what you're looking for?** → Check this index
- **Documentation unclear?** → Open GitHub issue
- **Found an error?** → Submit PR or create issue
- **Need example?** → Check code in `projects/` directory

### Technical Issues

- **Application not working?** → [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md)
- **Deployment failed?** → [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) + check prerequisites
- **Configuration question?** → [CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md)
- **Architecture question?** → [COMPLETE-ARCHITECTURE.md](COMPLETE-ARCHITECTURE.md)

---

## 📝 Document Status

| Document | Status | Last Updated | Completeness |
|----------|--------|--------------|--------------|
| PROJECT-OVERVIEW.md | ✅ Complete | 2026-09-02 | 100% |
| COMPLETE-ARCHITECTURE.md | ✅ Complete | 2026-09-02 | 100% |
| DEPLOYMENT-GUIDE.md | ✅ Complete | 2026-09-02 | 100% |
| CONFIGURATION-REFERENCE.md | ✅ Complete | 2026-09-02 | 100% |
| TROUBLESHOOTING-GUIDE.md | ✅ Complete | 2026-09-02 | 100% |
| INDEX.md | ✅ Complete | 2026-09-02 | 100% |
| part1-system-design.md | ✅ Existing | - | 100% |
| part2-workflow.md | ✅ Existing | - | 100% |
| claude-setup.md | ✅ Existing | - | 100% |

---

**Ready to get started? Begin with [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md)**

---

*Complete documentation for the DevOps + AIOps Platform*
*Built with ❤️ for learning and production use*
