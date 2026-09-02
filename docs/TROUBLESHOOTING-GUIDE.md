# Troubleshooting Guide

Complete troubleshooting reference for the DevOps + AIOps project.

## Table of Contents
1. [Application Issues](#application-issues)
2. [Database Issues](#database-issues)
3. [Monitoring Issues](#monitoring-issues)
4. [Logging Issues](#logging-issues)
5. [GitOps Issues](#gitops-issues)
6. [CI/CD Issues](#cicd-issues)
7. [AIOps Issues](#aiops-issues)
8. [Networking Issues](#networking-issues)
9. [Performance Issues](#performance-issues)
10. [Debugging Tools](#debugging-tools)

---

## Application Issues

### Issue 1: Pods Stuck in Pending State

**Symptoms:**
```bash
$ kubectl get pods -n boutique
NAME                                READY   STATUS    RESTARTS   AGE
gateway-7b5d8f9c-abc12             0/1     Pending   0          5m
```

**Common Causes:**

**A. Insufficient Resources**
```bash
# Check node resources
kubectl describe nodes

# Look for:
# Allocated resources:
#   CPU Requests: 1900m (95% of capacity)
#   Memory Requests: 3.5Gi (90% of capacity)
```

**Fix:**
- Scale down replicas temporarily
- Add more nodes to cluster
- Reduce resource requests

```bash
# Reduce replicas
kubectl scale deployment gateway -n boutique --replicas=1

# Or add nodes (if using eksctl)
eksctl scale nodegroup --cluster=eks-cluster --nodes=3 --name=eks-nodes
```

**B. Persistent Volume Not Available**
```bash
# Check PVCs
kubectl get pvc -n boutique

# If STATUS is "Pending":
kubectl describe pvc postgres-storage-postgres-0 -n boutique

# Check events for errors like:
# "waiting for a volume to be created"
```

**Fix:**
- Verify storage class exists: `kubectl get storageclass`
- Check AWS EBS CSI driver is installed
- Ensure IAM permissions for EBS volume creation

**C. Image Pull Errors**
```bash
kubectl describe pod <pod-name> -n boutique | grep -A5 Events

# Look for:
# Failed to pull image: unauthorized
# Failed to pull image: not found
```

**Fix:**
```bash
# Verify image exists in ECR
aws ecr describe-images --repository-name boutique/gateway --region us-east-1

# Update kubeconfig for ECR auth
aws eks update-kubeconfig --name eks-cluster --region us-east-1

# Check image pull secret (if using private registry)
kubectl get secrets -n boutique
```

---

### Issue 2: Pods in CrashLoopBackOff

**Symptoms:**
```bash
$ kubectl get pods -n boutique
NAME                                READY   STATUS             RESTARTS   AGE
product-service-xxx                 0/1     CrashLoopBackOff   5          10m
```

**Diagnosis:**
```bash
# View logs
kubectl logs -n boutique product-service-xxx

# View previous container logs (if restarted)
kubectl logs -n boutique product-service-xxx --previous

# Describe pod for events
kubectl describe pod -n boutique product-service-xxx
```

**Common Causes:**

**A. Database Connection Failure**

**Logs show:**
```
Error: connect ECONNREFUSED postgres:5432
```

**Fix:**
```bash
# Check postgres pod
kubectl get pods -n boutique | grep postgres

# If not running, check logs:
kubectl logs -n boutique postgres-0

# Verify service DNS
kubectl exec -n boutique deployment/gateway -- nslookup postgres

# Test connection
kubectl exec -n boutique deployment/gateway -- nc -zv postgres 5432
```

**B. Missing Environment Variables**

**Logs show:**
```
Error: JWT_SECRET is required
```

**Fix:**
```bash
# Check secrets exist
kubectl get secrets -n boutique

# Verify secret has required keys
kubectl describe secret boutique-secrets -n boutique

# Decode and check value
kubectl get secret boutique-secrets -n boutique -o jsonpath="{.data.JWT_SECRET}" | base64 -d

# If missing, add:
kubectl create secret generic boutique-secrets \
  --from-literal=JWT_SECRET=supersecretkey \
  --from-literal=POSTGRES_PASSWORD=admin123 \
  -n boutique \
  --dry-run=client -o yaml | kubectl apply -f -
```

**C. Application Error**

**Logs show:**
```
TypeError: Cannot read property 'findOne' of undefined
ReferenceError: db is not defined
```

**Fix:**
- Check application code
- Verify database initialization
- Check dependencies are installed

```bash
# Restart pod to reapply changes
kubectl rollout restart deployment/product-service -n boutique
```

---

### Issue 3: Frontend Shows 404 Errors

**Symptoms:**
- Frontend loads but API calls return 404
- Browser console: `GET http://localhost:3001/api/products 404`

**Root Cause:**
React apps embed environment variables at **build time**, not runtime.

**Diagnosis:**
```bash
# Check what URL frontend is using
kubectl logs -n boutique deployment/frontend | grep API_URL

# Or inspect built JS bundle
kubectl exec -n boutique deployment/frontend -- cat /usr/share/nginx/html/static/js/main.*.js | grep -o 'http[s]*://[^"]*'
```

**Fix:**

**Option A: Rebuild with correct URL**
```bash
cd projects/boutique-microservices/frontend

# Set API URL
echo "REACT_APP_API_URL=http://localhost:3001/api" > .env

# Rebuild
npm run build
docker build -t boutique/frontend:fixed .

# Push to ECR
docker tag boutique/frontend:fixed 423535493604.dkr.ecr.us-east-1.amazonaws.com/boutique/frontend:fixed
docker push 423535493604.dkr.ecr.us-east-1.amazonaws.com/boutique/frontend:fixed

# Update deployment
kubectl set image deployment/frontend frontend=423535493604.dkr.ecr.us-east-1.amazonaws.com/boutique/frontend:fixed -n boutique
```

**Option B: Port-forward Gateway**
```bash
# Since frontend expects localhost:3001, port-forward gateway
kubectl port-forward svc/gateway -n boutique 3001:3001

# Now frontend API calls will reach gateway
```

**Option C: Use Runtime Config**

Create `public/config.js`:
```javascript
window.APP_CONFIG = {
  API_URL: window.location.origin.includes('localhost') 
    ? 'http://localhost:3001/api'
    : '/api'
};
```

Load in `public/index.html`:
```html
<script src="%PUBLIC_URL%/config.js"></script>
```

Use in app:
```javascript
const API_URL = window.APP_CONFIG.API_URL;
```

---

### Issue 4: Product Service Route Not Working

**Symptoms:**
- `GET /api/products/categories` returns 404
- Categories are interpreted as product IDs

**Root Cause:**
Express.js route ordering - `/:id` matches before `/categories`

**Wrong Order:**
```javascript
// This is WRONG
router.get('/:id', getProductById);
router.get('/categories', getCategories);  // Never reached!
```

**Correct Order:**
```javascript
// This is CORRECT
router.get('/categories', getCategories);   // Specific route first
router.get('/:id', getProductById);         // Generic route last
```

**Fix:**
```bash
# Edit file
vim projects/boutique-microservices/backend/services/product-service/src/routes/products.ts

# Move /categories route before /:id route

# Rebuild and deploy
git add .
git commit -m "fix: correct route order in product-service"
git push origin main

# GitHub Actions will rebuild and deploy
```

---

## Database Issues

### Issue 5: Database Not Initializing

**Symptoms:**
```bash
# Tables not created
kubectl exec -n boutique postgres-0 -- psql -U admin -d boutique -c "\dt"
# Empty result
```

**Diagnosis:**
```bash
# Check postgres logs
kubectl logs -n boutique postgres-0 | grep -i error

# Check init script ConfigMap
kubectl get configmap postgres-init-script -n boutique -o yaml
```

**Fix:**

**A. Init Script Not Mounted**
```bash
# Verify volume mount
kubectl get statefulset postgres -n boutique -o yaml | grep -A10 volumeMounts

# Should see:
# - name: init-script
#   mountPath: /docker-entrypoint-initdb.d
```

**If missing, add to StatefulSet:**
```yaml
volumeMounts:
- name: init-script
  mountPath: /docker-entrypoint-initdb.d
volumes:
- name: init-script
  configMap:
    name: postgres-init-script
```

**B. Database Already Initialized**

Init scripts only run on **first start** (empty data directory).

**Solution:**
```bash
# Delete PVC to start fresh (WARNING: Deletes data!)
kubectl delete pvc postgres-storage-postgres-0 -n boutique
kubectl delete pod postgres-0 -n boutique

# PostgreSQL will recreate PVC and run init scripts
```

**C. Manual Initialization**
```bash
# Run SQL manually
kubectl exec -it -n boutique postgres-0 -- psql -U admin -d boutique

-- Then paste SQL from ConfigMap
CREATE TABLE users (...);
CREATE TABLE products (...);
```

---

### Issue 6: Database Connection Pool Exhausted

**Symptoms:**
```
Error: Connection pool timeout
remaining connection slots are reserved for non-replication superuser connections
```

**Diagnosis:**
```bash
# Check active connections
kubectl exec -n boutique postgres-0 -- psql -U admin -d boutique -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname='boutique';"

# Check max connections
kubectl exec -n boutique postgres-0 -- psql -U admin -d boutique -c \
  "SHOW max_connections;"
```

**Fix:**

**A. Increase max_connections**
```yaml
# Add to StatefulSet env:
- name: POSTGRES_MAX_CONNECTIONS
  value: "200"
```

**B. Fix Connection Leaks**
```javascript
// Ensure connections are released
const client = await pool.connect();
try {
  const result = await client.query('SELECT * FROM products');
  return result.rows;
} finally {
  client.release();  // Always release!
}
```

**C. Configure Connection Pooling**
```javascript
// Use connection pool properly
const pool = new Pool({
  max: 20,                // max pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Monitoring Issues

### Issue 7: Prometheus Not Scraping Services

**Symptoms:**
- Prometheus targets page shows services as DOWN
- No metrics in Grafana

**Diagnosis:**
```bash
# Check Prometheus targets
kubectl port-forward svc/kube-prometheus-stack-prometheus -n monitoring 9090:9090
# Navigate to: http://localhost:9090/targets

# Check ServiceMonitor
kubectl get servicemonitor -n boutique -o yaml

# Check service labels
kubectl get svc -n boutique --show-labels
```

**Common Causes:**

**A. Service Missing Required Label**

**ServiceMonitor expects:**
```yaml
selector:
  matchExpressions:
    - key: app
      operator: In
      values: [gateway, auth, product-service, ...]
```

**Service must have:**
```yaml
metadata:
  labels:
    app: gateway
```

**Fix:**
```bash
# Add label to service
kubectl label svc gateway -n boutique app=gateway

# Or edit service manifest
kubectl edit svc gateway -n boutique
```

**B. ServiceMonitor Not Discovered**

**Check label:**
```bash
kubectl get servicemonitor boutique-services -n boutique -o yaml | grep release
```

**Must have:**
```yaml
labels:
  release: kube-prometheus-stack
```

**Fix:**
```bash
kubectl label servicemonitor boutique-services -n boutique release=kube-prometheus-stack
```

**C. Metrics Endpoint Not Exposing Metrics**

**Test manually:**
```bash
kubectl exec -n boutique deployment/gateway -- curl http://localhost:3001/metrics
```

**Should return Prometheus format:**
```
# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 0.45
```

**If missing, add Prometheus client to app:**
```javascript
const promClient = require('prom-client');
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

### Issue 8: Grafana Shows "No Data"

**Symptoms:**
- Grafana dashboard loads but shows "No data"
- Prometheus has data

**Diagnosis:**
```bash
# Test Prometheus query directly
kubectl port-forward svc/kube-prometheus-stack-prometheus -n monitoring 9090:9090

curl -s 'http://localhost:9090/api/v1/query?query=up{namespace="boutique"}' | jq .
```

**Common Causes:**

**A. Data Source Not Configured**

**Fix in Grafana:**
1. Configuration → Data Sources
2. Add Prometheus
3. URL: `http://kube-prometheus-stack-prometheus:9090`
4. Access: `Server (default)`
5. Save & Test

**B. Wrong Query**

**Bad query:**
```
container_cpu_usage_seconds{namespace="boutique"}
```

**Good query:**
```
rate(container_cpu_usage_seconds_total{namespace="boutique"}[5m])
```

**C. Time Range Issue**

- Check time range in Grafana (top right)
- If set to "Last 5 minutes" but no recent data, adjust range

---

## Logging Issues

### Issue 9: Fluent Bit Not Sending Logs

**Symptoms:**
```bash
$ kubectl logs -n amazon-cloudwatch -l app.kubernetes.io/name=aws-for-fluent-bit
[error] [output:cloudwatch_logs:cloudwatch_logs.0] NoCredentialProviders: no valid providers in chain
```

**Root Cause:**
IRSA (IAM Roles for Service Accounts) not configured correctly

**Diagnosis:**
```bash
# Check service account annotation
kubectl get sa fluent-bit -n amazon-cloudwatch -o yaml | grep eks.amazonaws.com/role-arn

# Check IAM role trust policy
aws iam get-role --role-name FluentBitCloudWatchRole | jq .Role.AssumeRolePolicyDocument

# Check OIDC provider
aws eks describe-cluster --name eks-cluster --region us-east-1 --query "cluster.identity.oidc.issuer"
```

**Fix:**

**Step 1: Verify OIDC Provider**
```bash
OIDC_ID=$(aws eks describe-cluster --name eks-cluster --region us-east-1 \
  --query "cluster.identity.oidc.issuer" --output text | cut -d '/' -f 5)

aws iam list-open-id-connect-providers | grep $OIDC_ID

# If not found, create it:
eksctl utils associate-iam-oidc-provider --cluster eks-cluster --region us-east-1 --approve
```

**Step 2: Update IAM Role Trust Policy**
```bash
export OIDC_PROVIDER=$(aws eks describe-cluster --name eks-cluster --region us-east-1 \
  --query "cluster.identity.oidc.issuer" --output text | sed 's|https://||')
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

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

aws iam update-assume-role-policy \
  --role-name FluentBitCloudWatchRole \
  --policy-document file://trust-policy.json
```

**Step 3: Annotate Service Account**
```bash
export ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/FluentBitCloudWatchRole"

kubectl annotate serviceaccount fluent-bit \
  -n amazon-cloudwatch \
  eks.amazonaws.com/role-arn=$ROLE_ARN \
  --overwrite
```

**Step 4: Restart Fluent Bit**
```bash
kubectl rollout restart daemonset aws-for-fluent-bit -n amazon-cloudwatch
```

---

### Issue 10: Logs Going to Wrong Log Group

**Symptoms:**
- Logs appear in `/eks/boutique/pods` instead of `aws-eks-boutique-logs`
- Or log group name has weird prefix like `C./Program.Files/Git/eks/...` (Git Bash on Windows path conversion)

**Fix:**

**A. Update Fluent Bit Configuration**
```bash
helm upgrade aws-for-fluent-bit aws/aws-for-fluent-bit \
  --namespace amazon-cloudwatch \
  --reuse-values \
  --set cloudWatch.logGroupName=aws-eks-boutique-logs
```

**B. Avoid Path Conversion Issues (Windows)**

Use simple names without leading slashes:
```bash
# Good
--set cloudWatch.logGroupName=aws-eks-boutique-logs

# Bad (gets converted by Git Bash)
--set cloudWatch.logGroupName=/eks/boutique/pods
```

---

## GitOps Issues

### Issue 11: ArgoCD Application OutOfSync

**Symptoms:**
- ArgoCD UI shows "OutOfSync" status
- Manual kubectl changes don't persist

**Root Cause:**
Self-heal enabled - ArgoCD reverts manual changes

**Diagnosis:**
```bash
# Check sync status
kubectl get application boutique-app -n argocd -o yaml | grep syncStatus -A5

# Check ArgoCD logs
kubectl logs -n argocd deployment/argocd-application-controller
```

**Expected Behavior:**
This is **intentional** - GitOps enforces Git as source of truth

**Fix:**

**To make persistent changes:**
1. Update Git repository
2. Commit and push
3. ArgoCD will sync automatically

```bash
vim gitops/k8s/backend/gateway.yml
# Change replicas: 3
git add gitops/
git commit -m "scale: increase gateway replicas to 3"
git push origin main

# ArgoCD syncs within 3 minutes (or force sync)
argocd app sync boutique-app
```

**To disable self-heal temporarily:**
```bash
kubectl patch application boutique-app -n argocd \
  -p '{"spec":{"syncPolicy":{"automated":{"selfHeal":false}}}}' \
  --type merge
```

---

### Issue 12: ArgoCD Not Detecting Git Changes

**Symptoms:**
- Push to Git but ArgoCD doesn't sync
- "Last Sync" time is old

**Diagnosis:**
```bash
# Check application status
argocd app get boutique-app

# Check repository connection
argocd repo list

# Check ArgoCD application controller logs
kubectl logs -n argocd deployment/argocd-application-controller | grep boutique-app
```

**Common Causes:**

**A. Wrong Repository URL or Branch**
```bash
kubectl get application boutique-app -n argocd -o yaml | grep -A5 source

# Verify matches your repo
```

**Fix:**
```bash
kubectl patch application boutique-app -n argocd \
  -p '{"spec":{"source":{"repoURL":"https://github.com/YOUR-USERNAME/devops-ai","targetRevision":"main"}}}' \
  --type merge
```

**B. Webhook Not Configured**

ArgoCD polls every 3 minutes by default. For instant sync, configure webhook.

**GitHub Webhook Setup:**
1. Repo Settings → Webhooks → Add webhook
2. Payload URL: `https://<argocd-server>/api/webhook`
3. Content type: `application/json`
4. Secret: (get from ArgoCD)
5. Events: Just push events

**C. Private Repository Auth Issue**

**Fix:**
```bash
# Add repository credentials
argocd repo add https://github.com/YOUR-USERNAME/devops-ai \
  --username YOUR-USERNAME \
  --password YOUR-PAT
```

---

## CI/CD Issues

### Issue 13: GitHub Actions Failing to Push to ECR

**Symptoms:**
```
Error: Cannot perform an interactive login from a non TTY device
denied: User: arn:aws:iam::123456789:user/github-actions is not authorized to perform: ecr:GetAuthorizationToken
```

**Fix:**

**A. Check AWS Credentials in GitHub Secrets**
```bash
# Secrets must be set in repo:
# Settings → Secrets → Actions
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
```

**B. Verify IAM User Permissions**

IAM user needs:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

**C. ECR Repository Doesn't Exist**

**Create repositories:**
```bash
for service in frontend gateway auth product-service order-service orders user-service; do
  aws ecr create-repository \
    --repository-name boutique/$service \
    --region us-east-1 \
    || echo "Repository $service already exists"
done
```

---

### Issue 14: CI Pipeline Not Triggering

**Symptoms:**
- Push to main branch but GitHub Actions doesn't run

**Diagnosis:**
```bash
# Check workflow file syntax
cat .github/workflows/ci.yml | grep -A5 "on:"
```

**Common Causes:**

**A. Wrong Branch Name**
```yaml
on:
  push:
    branches: [main]  # But your default branch is "master"
```

**Fix:**
```bash
# Rename branch
git branch -m master main
git push -u origin main
```

**B. Path Filter Excludes Changes**
```yaml
on:
  push:
    paths:
      - 'projects/boutique-microservices/**'
```

If you changed `.github/workflows/ci.yml` only, it won't trigger.

**Fix:**
Add workflow file to paths:
```yaml
paths:
  - 'projects/boutique-microservices/**'
  - '.github/workflows/ci.yml'
```

---

## AIOps Issues

### Issue 15: Bedrock Agent Not Responding

**Symptoms:**
```
Error: User: arn:aws:iam::123456789:user/hari is not authorized to perform: bedrock:InvokeModel
```

**Fix:**

**A. Attach Bedrock Permissions to IAM User**
```bash
aws iam attach-user-policy \
  --user-name hari \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
```

**B. Bedrock Not Available in Region**

Bedrock is only available in certain regions (us-east-1, us-west-2, etc.)

**Check:**
```bash
aws bedrock list-foundation-models --region us-east-1
```

If error, try different region or request access.

---

### Issue 16: Lambda Function Timeout

**Symptoms:**
```
AIOps assistant responds: "Task timed out after 3.00 seconds"
```

**Fix:**
```bash
# Increase timeout to 30 seconds
aws lambda update-function-configuration \
  --function-name aiops-fetch-logs \
  --timeout 30 \
  --region us-east-1

# Apply to all 3 functions
for func in aiops-fetch-logs aiops-fetch-metrics aiops-fetch-health; do
  aws lambda update-function-configuration \
    --function-name $func \
    --timeout 30 \
    --region us-east-1
done
```

---

### Issue 17: Kira Can't Access Tools

**Symptoms:**
Kira responds: "I don't have access to the fetch_logs tool"

**Fix:**

**A. Add Bedrock Invoke Permission to Lambda**
```bash
aws lambda add-permission \
  --function-name aiops-fetch-logs \
  --statement-id AllowBedrockInvoke \
  --action lambda:InvokeFunction \
  --principal bedrock.amazonaws.com \
  --region us-east-1
```

**B. Verify Action Groups Are Added**
```bash
# List action groups
aws bedrock-agent list-agent-action-groups \
  --agent-id <your-agent-id> \
  --agent-version DRAFT \
  --region us-east-1
```

**Should show 3 action groups:**
- fetch_logs
- fetch_metrics
- fetch_service_health

**If missing, add via AWS Console or re-run `deploy.sh`**

---

## Networking Issues

### Issue 18: Cannot Access Service from Outside Cluster

**Symptoms:**
```bash
curl http://<loadbalancer-url>:3001/api/products
# Connection timeout
```

**Diagnosis:**
```bash
# Check service type
kubectl get svc gateway -n boutique

# Should be LoadBalancer, not ClusterIP
```

**Fix:**
```bash
# Patch service to LoadBalancer
kubectl patch svc gateway -n boutique -p '{"spec":{"type":"LoadBalancer"}}'

# Get LoadBalancer URL
kubectl get svc gateway -n boutique -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

**Security Group Issue:**

ELB security group may block traffic.

```bash
# Find security group
aws elb describe-load-balancers --region us-east-1 | grep -A20 gateway

# Add inbound rule
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0
```

---

## Performance Issues

### Issue 19: High Pod CPU Usage

**Diagnosis:**
```bash
# Check pod CPU
kubectl top pods -n boutique

# Check Prometheus metrics
kubectl port-forward svc/kube-prometheus-stack-prometheus -n monitoring 9090:9090

# Query: rate(container_cpu_usage_seconds_total{namespace="boutique"}[5m])
```

**Common Causes:**

**A. Inefficient Code**
- N+1 database queries
- Missing indexes
- Synchronous blocking operations

**Fix:**
```javascript
// Bad: N+1 query
for (const order of orders) {
  order.items = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
}

// Good: Join or batch query
const orders = await db.query(`
  SELECT o.*, json_agg(oi.*) as items
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  GROUP BY o.id
`);
```

**B. Resource Limits Too Low**
```bash
# Increase CPU limit
kubectl set resources deployment product-service -n boutique \
  --limits=cpu=1000m --requests=cpu=200m
```

---

### Issue 20: Database Slow Queries

**Diagnosis:**
```bash
# Check slow queries
kubectl exec -n boutique postgres-0 -- psql -U admin -d boutique -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Enable query logging
kubectl exec -n boutique postgres-0 -- psql -U admin -d boutique -c \
  "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# Reload config
kubectl exec -n boutique postgres-0 -- psql -U admin -d boutique -c "SELECT pg_reload_conf();"
```

**Fix:**

**Add Indexes:**
```sql
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

**Analyze Tables:**
```bash
kubectl exec -n boutique postgres-0 -- psql -U admin -d boutique -c "VACUUM ANALYZE;"
```

---

## Debugging Tools

### Essential kubectl Commands

```bash
# Get pods with more details
kubectl get pods -n boutique -o wide

# Watch pod status
kubectl get pods -n boutique -w

# Describe pod (events, volumes, conditions)
kubectl describe pod <pod-name> -n boutique

# View logs
kubectl logs -n boutique <pod-name>
kubectl logs -n boutique <pod-name> --previous  # Previous container
kubectl logs -n boutique <pod-name> -f          # Follow logs
kubectl logs -n boutique deployment/gateway --tail=50

# Execute commands in pod
kubectl exec -it -n boutique <pod-name> -- /bin/bash
kubectl exec -n boutique <pod-name> -- env
kubectl exec -n boutique <pod-name> -- curl http://localhost:3001/health

# Port forwarding
kubectl port-forward -n boutique svc/gateway 3001:3001

# Copy files
kubectl cp -n boutique <pod-name>:/app/logs/error.log ./error.log

# Top (resource usage)
kubectl top nodes
kubectl top pods -n boutique

# Events
kubectl get events -n boutique --sort-by='.lastTimestamp'
```

### Debugging Networking

```bash
# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -n boutique -- nslookup postgres

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -n boutique -- nc -zv postgres 5432

# Test HTTP endpoint
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n boutique -- curl http://gateway:3001/health

# Check service endpoints
kubectl get endpoints -n boutique
```

### Checking Logs in CloudWatch

```bash
# Tail logs
aws logs tail aws-eks-boutique-logs --follow --region us-east-1

# Search for errors
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
  --query-string 'fields @timestamp, @message | filter @message like /product-service/ | sort @timestamp desc | limit 20'
```

---

## Emergency Recovery

### Complete Application Reset

```bash
# Delete all resources
kubectl delete namespace boutique

# Recreate
kubectl apply -f gitops/

# Or let ArgoCD recreate
kubectl patch application boutique-app -n argocd -p '{"operation":{"sync":{"syncStrategy":{"hook":{}}}}}' --type merge
```

### Database Recovery

```bash
# Restore from backup
kubectl apply -f gitops/k8s/database/restore-job.yml

# Or manual restore
kubectl exec -it -n boutique postgres-0 -- psql -U admin -d boutique < backup.sql
```

---

## Summary

This troubleshooting guide covers the most common issues:

✅ **Application** - Pending pods, crashes, 404 errors
✅ **Database** - Connection issues, initialization, performance
✅ **Monitoring** - Prometheus scraping, Grafana dashboards
✅ **Logging** - Fluent Bit IRSA, log groups
✅ **GitOps** - ArgoCD sync, self-heal
✅ **CI/CD** - GitHub Actions, ECR push
✅ **AIOps** - Lambda timeouts, Bedrock permissions
✅ **Networking** - LoadBalancer, DNS, connectivity
✅ **Performance** - CPU usage, slow queries
✅ **Tools** - kubectl commands, debugging techniques

For architecture details, see `COMPLETE-ARCHITECTURE.md`.
For deployment steps, see `DEPLOYMENT-GUIDE.md`.
For configuration reference, see `CONFIGURATION-REFERENCE.md`.
