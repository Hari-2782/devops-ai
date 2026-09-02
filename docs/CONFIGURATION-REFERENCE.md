# Configuration Reference

Complete configuration reference for all components in the DevOps + AIOps project.

## Table of Contents
1. [Kubernetes Manifests](#kubernetes-manifests)
2. [Helm Values](#helm-values)
3. [Environment Variables](#environment-variables)
4. [GitOps Configuration](#gitops-configuration)
5. [CI/CD Configuration](#cicd-configuration)
6. [Monitoring Configuration](#monitoring-configuration)
7. [Logging Configuration](#logging-configuration)
8. [AIOps Configuration](#aiops-configuration)
9. [Database Configuration](#database-configuration)
10. [Networking Configuration](#networking-configuration)

---

## Kubernetes Manifests

### Namespace Configuration

**File:** `gitops/namespace.yml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: boutique
  labels:
    name: boutique
    environment: production
```

**Purpose:** Isolate boutique application resources

---

### Secrets Configuration

**File:** `gitops/secrets.yml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: boutique-secrets
  namespace: boutique
type: Opaque
data:
  # Base64 encoded values
  POSTGRES_PASSWORD: YWRtaW4xMjM=        # admin123
  JWT_SECRET: c3VwZXJzZWNyZXRrZXk=      # supersecretkey
```

**Creating Secrets:**
```bash
# Encode values
echo -n "admin123" | base64
# Output: YWRtaW4xMjM=

# Or use kubectl
kubectl create secret generic boutique-secrets \
  --from-literal=POSTGRES_PASSWORD=admin123 \
  --from-literal=JWT_SECRET=supersecretkey \
  -n boutique \
  --dry-run=client -o yaml > gitops/secrets.yml
```

**Security Best Practices:**
- Never commit real secrets to Git
- Use Sealed Secrets or External Secrets Operator
- Or AWS Secrets Manager with ASCP (AWS Secrets and Configuration Provider)

---

### Backend Service: Gateway

**File:** `gitops/k8s/backend/gateway.yml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
  namespace: boutique
  labels:
    app: gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
    spec:
      containers:
      - name: gateway
        image: 423535493604.dkr.ecr.us-east-1.amazonaws.com/boutique/gateway:latest
        ports:
        - containerPort: 3001
        env:
        - name: PORT
          value: "3001"
        - name: AUTH_SERVICE_URL
          value: "http://auth:5001"
        - name: USER_SERVICE_URL
          value: "http://user-service:5002"
        - name: PRODUCT_SERVICE_URL
          value: "http://product-service:5003"
        - name: ORDER_SERVICE_URL
          value: "http://order-service:5005"
        - name: ORDERS_SERVICE_URL
          value: "http://orders:5004"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
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
---
apiVersion: v1
kind: Service
metadata:
  name: gateway
  namespace: boutique
  labels:
    app: gateway
spec:
  type: LoadBalancer
  selector:
    app: gateway
  ports:
  - port: 3001
    targetPort: 3001
    protocol: TCP
```

**Key Configuration:**

| Field | Value | Purpose |
|-------|-------|---------|
| `replicas` | 2 | High availability |
| `image` | ECR URI with tag | Container image source |
| `PORT` | 3001 | Gateway listens on 3001 |
| `*_SERVICE_URL` | Internal DNS | Service discovery |
| `resources.requests` | 256Mi RAM, 100m CPU | Guaranteed resources |
| `resources.limits` | 512Mi RAM, 500m CPU | Max resources |
| `livenessProbe` | /health endpoint | Restart unhealthy pods |
| `readinessProbe` | /ready endpoint | Traffic routing |
| `Service.type` | LoadBalancer | External access via ELB |

**Similar configuration for other services:**
- `auth.yml` - Port 5001
- `product-service.yml` - Port 5003
- `order-service.yml` - Port 5005
- `orders.yml` - Port 5004
- `user-service.yml` - Port 5002

---

### Frontend Service

**File:** `gitops/k8s/frontend/deployment.yml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: boutique
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: 423535493604.dkr.ecr.us-east-1.amazonaws.com/boutique/frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: REACT_APP_API_URL
          value: "http://localhost:3001/api"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: boutique
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
  - port: 3000
    targetPort: 3000
```

**Important Note:**
`REACT_APP_API_URL` is embedded at **build time**, not runtime. For production:

```dockerfile
# Dockerfile
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
RUN npm run build
```

Then build with:
```bash
docker build --build-arg REACT_APP_API_URL=https://api.example.com .
```

---

### Database: PostgreSQL

**File:** `gitops/k8s/database/statefulset.yml`

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: boutique
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: boutique
        - name: POSTGRES_USER
          value: admin
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: boutique-secrets
              key: POSTGRES_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: gp2
      resources:
        requests:
          storage: 10Gi
```

**Key Configuration:**

| Field | Value | Purpose |
|-------|-------|---------|
| `kind` | StatefulSet | Stable network identity, persistent storage |
| `serviceName` | postgres | Headless service for DNS |
| `replicas` | 1 | Single instance (not HA) |
| `PGDATA` | /var/lib/postgresql/data/pgdata | Data directory |
| `volumeClaimTemplates` | 10Gi | Persistent storage |
| `storageClassName` | gp2 | AWS EBS General Purpose SSD |

**Service Configuration:**

**File:** `gitops/k8s/database/service.yml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: boutique
spec:
  type: ClusterIP
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

**Database Initialization:**

**File:** `gitops/k8s/database/configmap.yml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init-script
  namespace: boutique
data:
  init.sql: |
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
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

    CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price_at_purchase DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert sample data
    INSERT INTO categories (name, description) VALUES
    ('Electronics', 'Electronic devices and accessories'),
    ('Clothing', 'Apparel and fashion items'),
    ('Books', 'Physical and digital books')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO products (name, description, price, category_id, stock_quantity) VALUES
    ('Laptop', 'High-performance laptop', 999.99, 1, 50),
    ('T-Shirt', 'Cotton t-shirt', 19.99, 2, 100),
    ('Novel', 'Bestselling novel', 14.99, 3, 200)
    ON CONFLICT DO NOTHING;
```

**Mount in StatefulSet:**
```yaml
volumeMounts:
- name: init-script
  mountPath: /docker-entrypoint-initdb.d
volumes:
- name: init-script
  configMap:
    name: postgres-init-script
```

---

### ServiceMonitor for Prometheus

**File:** `gitops/k8s/backend/service-monitor.yml`

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

**Key Configuration:**

| Field | Value | Purpose |
|-------|-------|---------|
| `labels.release` | kube-prometheus-stack | Prometheus Operator discovers this |
| `namespaceSelector` | boutique | Target namespace |
| `selector.matchExpressions` | app IN [services] | Match services by label |
| `endpoints.path` | /metrics | Metrics endpoint |
| `endpoints.interval` | 15s | Scrape frequency |

**Requirements:**
- Each service must have label `app: <service-name>`
- Each service must expose `/metrics` endpoint (Prometheus format)

---

## Helm Values

### Prometheus Stack

**Installation Command:**
```bash
helm install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values prometheus-values.yaml
```

**Custom Values File:** `prometheus-values.yaml`

```yaml
prometheus:
  prometheusSpec:
    retention: 15d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: gp2
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    resources:
      requests:
        memory: 2Gi
        cpu: 500m
      limits:
        memory: 4Gi
        cpu: 1000m
    serviceMonitorSelectorNilUsesHelmValues: false
    serviceMonitorSelector: {}
    serviceMonitorNamespaceSelector: {}

grafana:
  adminPassword: prom-operator
  persistence:
    enabled: true
    storageClassName: gp2
    size: 10Gi
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
      - name: Prometheus
        type: prometheus
        url: http://kube-prometheus-stack-prometheus:9090
        access: proxy
        isDefault: true

alertmanager:
  enabled: true
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: gp2
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
```

**Key Configuration:**

| Field | Value | Purpose |
|-------|-------|---------|
| `prometheus.retention` | 15d | Keep metrics for 15 days |
| `prometheus.storage` | 50Gi | Prometheus data volume |
| `serviceMonitorSelector` | {} | Discover all ServiceMonitors |
| `grafana.adminPassword` | prom-operator | Grafana admin password |
| `grafana.persistence` | 10Gi | Grafana dashboard storage |

---

### Fluent Bit

**Installation Command:**
```bash
helm upgrade --install aws-for-fluent-bit aws/aws-for-fluent-bit \
  --namespace amazon-cloudwatch \
  --create-namespace \
  --values fluent-bit-values.yaml
```

**Custom Values File:** `fluent-bit-values.yaml`

```yaml
cloudWatch:
  enabled: true
  region: us-east-1
  logGroupName: aws-eks-boutique-logs
  logStreamPrefix: pod-
  autoCreateGroup: true

serviceAccount:
  create: true
  name: fluent-bit
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::423535493604:role/FluentBitCloudWatchRole

resources:
  limits:
    memory: 200Mi
  requests:
    cpu: 100m
    memory: 100Mi

tolerations:
  - key: node-role.kubernetes.io/master
    operator: Exists
    effect: NoSchedule

firehose:
  enabled: false

kinesis:
  enabled: false

elasticsearch:
  enabled: false
```

**Key Configuration:**

| Field | Value | Purpose |
|-------|-------|---------|
| `cloudWatch.logGroupName` | aws-eks-boutique-logs | CloudWatch Log Group |
| `serviceAccount.annotations` | IAM role ARN | IRSA for authentication |
| `autoCreateGroup` | true | Create log group if missing |
| `tolerations` | master node | Run on control plane nodes |

---

## Environment Variables

### Gateway Service

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3001 | Gateway listen port |
| `AUTH_SERVICE_URL` | http://auth:5001 | Auth service endpoint |
| `USER_SERVICE_URL` | http://user-service:5002 | User service endpoint |
| `PRODUCT_SERVICE_URL` | http://product-service:5003 | Product service endpoint |
| `ORDER_SERVICE_URL` | http://order-service:5005 | Order service endpoint |
| `ORDERS_SERVICE_URL` | http://orders:5004 | Legacy orders endpoint |
| `NODE_ENV` | production | Node.js environment |

### Auth Service

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 5001 | Auth service listen port |
| `JWT_SECRET` | (from secret) | JWT signing key |
| `JWT_EXPIRATION` | 24h | Token expiration time |
| `POSTGRES_HOST` | postgres | Database host |
| `POSTGRES_PORT` | 5432 | Database port |
| `POSTGRES_DB` | boutique | Database name |
| `POSTGRES_USER` | admin | Database user |
| `POSTGRES_PASSWORD` | (from secret) | Database password |

### Product Service

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 5003 | Service listen port |
| `POSTGRES_HOST` | postgres | Database host |
| `POSTGRES_PORT` | 5432 | Database port |
| `POSTGRES_DB` | boutique | Database name |
| `POSTGRES_USER` | admin | Database user |
| `POSTGRES_PASSWORD` | (from secret) | Database password |
| `LOG_LEVEL` | info | Logging level |

### Order Service

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 5005 | Service listen port |
| `POSTGRES_HOST` | postgres | Database host |
| `PRODUCT_SERVICE_URL` | http://product-service:5003 | Product service for inventory check |
| `JWT_SECRET` | (from secret) | JWT verification key |

### Frontend

| Variable | Build Time | Purpose |
|----------|------------|---------|
| `REACT_APP_API_URL` | http://localhost:3001/api | Backend API endpoint |
| `REACT_APP_VERSION` | 1.0.0 | App version |

**Note:** React environment variables are embedded at **build time**, not runtime.

---

## GitOps Configuration

### ArgoCD Application

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
      - ApplyOutOfSyncOnly=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

**Key Configuration:**

| Field | Value | Purpose |
|-------|-------|---------|
| `source.repoURL` | Git repository | Source of truth |
| `source.targetRevision` | main | Git branch |
| `source.path` | gitops | Directory with manifests |
| `destination.namespace` | boutique | Target namespace |
| `syncPolicy.automated.prune` | true | Delete resources removed from Git |
| `syncPolicy.automated.selfHeal` | true | Revert manual changes |
| `syncOptions.CreateNamespace` | true | Auto-create namespace |
| `retry.limit` | 5 | Retry failed syncs |

### Kustomization

**File:** `gitops/kustomization.yml`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: boutique

resources:
  - namespace.yml
  - secrets.yml
  - k8s/database/configmap.yml
  - k8s/database/service.yml
  - k8s/database/statefulset.yml
  - k8s/backend/gateway.yml
  - k8s/backend/auth.yml
  - k8s/backend/product-service.yml
  - k8s/backend/order-service.yml
  - k8s/backend/orders.yml
  - k8s/backend/user-service.yml
  - k8s/backend/service-monitor.yml
  - k8s/frontend/deployment.yml

commonLabels:
  app.kubernetes.io/managed-by: kustomize
  app.kubernetes.io/part-of: boutique

images:
  - name: boutique/frontend
    newName: 423535493604.dkr.ecr.us-east-1.amazonaws.com/boutique/frontend
    newTag: latest
  - name: boutique/gateway
    newName: 423535493604.dkr.ecr.us-east-1.amazonaws.com/boutique/gateway
    newTag: latest
```

**Purpose:**
- Centralized manifest management
- Dynamic image tag updates
- Common labels for all resources
- Base for overlays (dev, staging, prod)

---

## CI/CD Configuration

### GitHub Actions

**File:** `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    paths:
      - 'projects/boutique-microservices/**'
      - '.github/workflows/ci.yml'

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: 423535493604.dkr.ecr.us-east-1.amazonaws.com

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker images
        run: |
          COMMIT_SHA=$(git rev-parse --short HEAD)
          
          services="frontend gateway auth product-service order-service orders user-service"
          
          for service in $services; do
            echo "Building $service..."
            docker build -t $ECR_REGISTRY/boutique/$service:$COMMIT_SHA \
              -f projects/boutique-microservices/$service/Dockerfile \
              projects/boutique-microservices/$service
            
            docker push $ECR_REGISTRY/boutique/$service:$COMMIT_SHA
          done
          
          echo "COMMIT_SHA=$COMMIT_SHA" >> $GITHUB_ENV

      - name: Update GitOps manifests
        run: |
          find gitops/k8s -name "*.yml" -exec sed -i \
            "s|image: $ECR_REGISTRY/boutique/\([^:]*\):.*|image: $ECR_REGISTRY/boutique/\1:$COMMIT_SHA|" {} \;
          
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add gitops/
          git commit -m "ci: update image tags to $COMMIT_SHA"
          git push
```

**Key Configuration:**

| Field | Value | Purpose |
|-------|-------|---------|
| `on.push.branches` | main, develop | Trigger branches |
| `on.push.paths` | projects/**, .github/** | Only run on relevant changes |
| `AWS_ACCESS_KEY_ID` | GitHub Secret | ECR authentication |
| `ECR_REGISTRY` | AWS account + region | Image registry |
| `COMMIT_SHA` | Git commit hash | Image tag |

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

---

## Monitoring Configuration

### Prometheus Scrape Configs

**ServiceMonitor translates to Prometheus config:**

```yaml
scrape_configs:
  - job_name: 'boutique/gateway'
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: [boutique]
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_app]
        regex: gateway
        action: keep
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        regex: metrics
        action: keep
    scrape_interval: 15s
    metrics_path: /metrics
```

### Grafana Dashboard

**File:** `gitops/k8s/grafana-dashboard.yml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: boutique-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  boutique-dashboard.json: |
    {
      "dashboard": {
        "title": "Boutique Microservices",
        "panels": [
          {
            "title": "Pod CPU Usage",
            "targets": [
              {
                "expr": "rate(container_cpu_usage_seconds_total{namespace=\"boutique\"}[5m])"
              }
            ]
          },
          {
            "title": "Pod Memory Usage",
            "targets": [
              {
                "expr": "container_memory_working_set_bytes{namespace=\"boutique\"}"
              }
            ]
          },
          {
            "title": "Pod Restarts",
            "targets": [
              {
                "expr": "increase(kube_pod_container_status_restarts_total{namespace=\"boutique\"}[1h])"
              }
            ]
          }
        ]
      }
    }
```

---

## Logging Configuration

### Fluent Bit Configuration

**Generated by Helm chart:**

```ini
[SERVICE]
    Flush         5
    Log_Level     info
    Daemon        off
    Parsers_File  parsers.conf

[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               kube.*
    Refresh_Interval  5
    Mem_Buf_Limit     50MB
    Skip_Long_Lines   On

[FILTER]
    Name                kubernetes
    Match               kube.*
    Kube_URL            https://kubernetes.default.svc:443
    Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
    Kube_Tag_Prefix     kube.var.log.containers.
    Merge_Log           On
    Keep_Log            Off

[OUTPUT]
    Name                cloudwatch_logs
    Match               *
    region              us-east-1
    log_group_name      aws-eks-boutique-logs
    log_stream_prefix   pod-
    auto_create_group   true
```

**Key Configuration:**

| Field | Value | Purpose |
|-------|-------|---------|
| `INPUT.Path` | /var/log/containers/*.log | Container logs |
| `INPUT.Parser` | docker | Parse JSON logs |
| `FILTER.kubernetes` | - | Enrich with K8s metadata |
| `OUTPUT.region` | us-east-1 | CloudWatch region |
| `OUTPUT.log_group_name` | aws-eks-boutique-logs | Log group |

---

## AIOps Configuration

### Lambda Function: fetch_logs

**Environment Variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOG_GROUP_NAME` | aws-eks-boutique-logs | CloudWatch log group |
| `AWS_REGION` | us-east-1 | AWS region |

**IAM Permissions:**
```json
{
  "Effect": "Allow",
  "Action": [
    "logs:FilterLogEvents",
    "logs:DescribeLogStreams"
  ],
  "Resource": "arn:aws:logs:us-east-1:*:log-group:aws-eks-boutique-logs:*"
}
```

### Lambda Function: fetch_metrics

**Configuration:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `PROMETHEUS_URL` | http://<elb-url>:9090 | Prometheus endpoint |
| `DEFAULT_NAMESPACE` | boutique | Kubernetes namespace |
| `Timeout` | 30 seconds | Lambda timeout |

**Supported Metrics:**
- `pod_cpu_utilization`
- `pod_memory_utilization`
- `pod_restarts`
- `deployment_replicas_unavailable`
- `deployment_replicas_available`

### Lambda Function: fetch_health

**Configuration:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `DEFAULT_CLUSTER` | eks-cluster | EKS cluster name |
| `DEFAULT_NAMESPACE` | boutique | Kubernetes namespace |
| `REGION` | us-east-1 | AWS region |
| `PROMETHEUS_URL` | http://<elb-url>:9090 | Prometheus for pod metrics |

**IAM Permissions:**
```json
{
  "Effect": "Allow",
  "Action": [
    "eks:DescribeCluster",
    "eks:ListNodegroups",
    "eks:DescribeNodegroup"
  ],
  "Resource": "*"
}
```

### Bedrock Agent

**Configuration:**

| Field | Value |
|-------|-------|
| Agent Name | aiops-assistant |
| Model | Claude 3.5 Sonnet v2 |
| Alias ID | TSTALIASID |
| IAM Role | aiops-bedrock-agent-role |
| Action Groups | fetch_logs, fetch_metrics, fetch_service_health |

### Streamlit UI

**File:** `projects/aiops-assistant/.env`

```bash
AWS_ACCESS_KEY_ID=          # Optional (use AWS CLI profile or IRSA)
AWS_SECRET_ACCESS_KEY=      # Optional
AWS_SESSION_TOKEN=          # Optional (for temporary credentials)
AWS_REGION=us-east-1
BEDROCK_AGENT_ID=ABC123XYZ  # Your Bedrock Agent ID
BEDROCK_AGENT_ALIAS_ID=TSTALIASID
```

---

## Database Configuration

### PostgreSQL

**Connection String:**
```
postgresql://admin:admin123@postgres:5432/boutique
```

**Configuration:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `max_connections` | 100 | Maximum concurrent connections |
| `shared_buffers` | 128MB | Memory for caching |
| `effective_cache_size` | 4GB | Planner's assumption of cache |
| `maintenance_work_mem` | 64MB | Memory for maintenance operations |
| `checkpoint_completion_target` | 0.9 | Checkpoint spread |
| `wal_buffers` | 16MB | WAL buffer size |
| `default_statistics_target` | 100 | Planner statistics |
| `random_page_cost` | 1.1 | Cost of random page fetch (SSD) |
| `effective_io_concurrency` | 200 | Concurrent I/O operations (SSD) |
| `work_mem` | 4MB | Memory for sorts and hashes |

**Backup Configuration:**

```yaml
schedule: "0 2 * * *"  # Daily at 2 AM
retention: 7 days
destination: s3://boutique-backups/postgres/
```

---

## Networking Configuration

### Service Mesh (Future)

**Istio Configuration (not yet implemented):**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    defaultConfig:
      tracing:
        zipkin:
          address: zipkin.istio-system:9411
```

### Network Policies (Recommended)

**Deny all ingress by default:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: boutique
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

**Allow gateway to backend services:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-gateway-to-backend
  namespace: boutique
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: gateway
```

---

## Summary

This configuration reference covers all major components:

✅ **Kubernetes Manifests** - Deployments, Services, StatefulSets
✅ **Helm Charts** - Prometheus, Grafana, Fluent Bit
✅ **Environment Variables** - Service configuration
✅ **GitOps** - ArgoCD, Kustomize
✅ **CI/CD** - GitHub Actions
✅ **Monitoring** - Prometheus, ServiceMonitor, Grafana
✅ **Logging** - Fluent Bit, CloudWatch Logs
✅ **AIOps** - Lambda functions, Bedrock Agent, Streamlit
✅ **Database** - PostgreSQL configuration
✅ **Networking** - Services, policies

For deployment instructions, see `DEPLOYMENT-GUIDE.md`.
For architecture details, see `COMPLETE-ARCHITECTURE.md`.
