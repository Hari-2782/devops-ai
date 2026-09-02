# Testing Lambda Functions While Waiting for Bedrock Agents Access

Your Lambda functions are fully configured and ready to test!

## Lambda Function Test Events

### 1. Test aiops-fetch-logs

**Go to AWS Console:**
https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/aiops-fetch-logs

**Test Event (JSON):**
```json
{
  "parameters": [
    {"name": "filter_pattern", "value": "ERROR"},
    {"name": "log_group_name", "value": "aws-eks-boutique-logs"},
    {"name": "hours_back", "value": "1"}
  ]
}
```

**Expected Result:** List of ERROR logs from the last hour

---

### 2. Test aiops-fetch-metrics

**Go to AWS Console:**
https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/aiops-fetch-metrics

**Test Event (JSON):**
```json
{
  "parameters": [
    {"name": "metric_name", "value": "pod_cpu_utilization"},
    {"name": "namespace", "value": "boutique"},
    {"name": "hours_back", "value": "1"}
  ]
}
```

**Expected Result:** CPU metrics for all pods in boutique namespace

---

### 3. Test aiops-fetch-health

**Go to AWS Console:**
https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/aiops-fetch-health

**Test Event (JSON):**
```json
{
  "parameters": [
    {"name": "cluster_name", "value": "eks-cluster"},
    {"name": "namespace", "value": "boutique"}
  ]
}
```

**Expected Result:** Health status of EKS cluster, nodes, deployments, and pods

---

## Available Metrics to Query:

- `pod_cpu_utilization` - CPU usage per pod
- `pod_memory_utilization` - Memory usage per pod
- `pod_restarts` - Pod restart count (last hour)
- `deployment_replicas_unavailable` - Unhealthy replicas
- `deployment_replicas_available` - Healthy replicas

## Log Groups Available:

- `aws-eks-boutique-logs` - All pod logs from EKS cluster
- `/aws/eks/fluentbit-cloudwatch/logs` - Fluent Bit logs

