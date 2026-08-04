import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlarmSmoke,
  Archive,
  Bell,
  Bot,
  Box,
  Boxes,
  Braces,
  Brain,
  CircleDot,
  Cloud,
  Cog,
  Container,
  Cpu,
  Database,
  Filter,
  Fingerprint,
  FileStack,
  Files,
  Flame,
  Folder,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  Inbox,
  KeyRound,
  Layers,
  Locate,
  type LucideProps,
  Mail,
  Megaphone,
  MessageSquare,
  MonitorSmartphone,
  Network,
  Notebook,
  Radio,
  Repeat,
  Route,
  Router,
  Search,
  Server,
  ServerCog,
  Share2,
  ShieldCheck,
  Shuffle,
  Signpost,
  Smartphone,
  Sparkles,
  SquareStack,
  Table,
  Terminal,
  Timer,
  TrendingUp,
  Users,
  Waves,
  Workflow,
  Zap,
} from "lucide-react";

export type ComponentCategory =
  | "General"
  | "Networking & Delivery"
  | "Compute"
  | "Data Storage"
  | "Messaging & Streaming"
  | "Caching"
  | "AI & Machine Learning"
  | "Observability & Security";

export interface ComponentDefinition {
  type: string;
  label: string;
  category: ComponentCategory;
  icon: LucideIcon;
  keywords: string[];
  color: string;
}

const C = {
  general: "oklch(0.75 0.06 250)",
  net: "oklch(0.79 0.13 195)",
  compute: "oklch(0.72 0.15 155)",
  data: "oklch(0.8 0.14 78)",
  msg: "oklch(0.7 0.16 300)",
  cache: "oklch(0.74 0.14 40)",
  ai: "oklch(0.76 0.15 330)",
  ops: "oklch(0.68 0.18 25)",
};

const def = (
  type: string,
  label: string,
  category: ComponentCategory,
  icon: LucideIcon,
  color: string,
  keywords: string[] = [],
): ComponentDefinition => ({ type, label, category, icon, color, keywords });

export const COMPONENT_LIBRARY: ComponentDefinition[] = [
  // General
  def("generic_service", "Generic service", "General", Box, C.general, ["service"]),
  def("microservice", "Microservice", "General", Boxes, C.general, ["service", "micro"]),
  def("client_app", "Client application", "General", MonitorSmartphone, C.general, ["client"]),
  def("mobile_app", "Mobile application", "General", Smartphone, C.general, ["mobile", "ios"]),
  def("web_app", "Web application", "General", Globe, C.general, ["web", "browser"]),
  def("external_system", "External system", "General", Share2, C.general, ["third party"]),
  def("third_party_api", "Third-party API", "General", Braces, C.general, ["api", "vendor"]),
  def("user", "User", "General", Users, C.general, ["actor", "person"]),
  def("boundary", "Group or boundary", "General", SquareStack, C.general, ["group", "vpc"]),
  def("text_note", "Text note", "General", Notebook, C.general, ["note", "text"]),
  // Networking & Delivery
  def("dns", "DNS", "Networking & Delivery", Signpost, C.net, ["domain", "resolve"]),
  def("cdn", "CDN", "Networking & Delivery", Cloud, C.net, ["edge", "cache", "delivery"]),
  def("load_balancer", "Load balancer", "Networking & Delivery", Shuffle, C.net, ["lb", "nginx"]),
  def("api_gateway", "API gateway", "Networking & Delivery", Router, C.net, ["gateway", "api"]),
  def("reverse_proxy", "Reverse proxy", "Networking & Delivery", Route, C.net, ["proxy", "nginx"]),
  def("firewall", "Firewall", "Networking & Delivery", Flame, C.net, ["waf", "security"]),
  def("service_mesh", "Service mesh", "Networking & Delivery", Network, C.net, ["envoy", "istio"]),
  // Compute
  def("app_server", "Application server", "Compute", Server, C.compute, ["backend"]),
  def("worker", "Worker", "Compute", Cog, C.compute, ["async", "consumer"]),
  def("background_job", "Background job", "Compute", Timer, C.compute, ["cron", "job"]),
  def("serverless_fn", "Serverless function", "Compute", Zap, C.compute, ["lambda", "faas"]),
  def("container", "Container", "Compute", Container, C.compute, ["docker"]),
  def("k8s_cluster", "Kubernetes cluster", "Compute", Layers, C.compute, ["k8s", "orchestration"]),
  def("vm", "Virtual machine", "Compute", Cpu, C.compute, ["ec2", "instance"]),
  def("batch_processor", "Batch processor", "Compute", ServerCog, C.compute, ["spark", "etl"]),
  // Data Storage
  def("relational_db", "Relational database", "Data Storage", Database, C.data, ["sql", "postgres"]),
  def("nosql_db", "NoSQL database", "Data Storage", Database, C.data, ["mongo", "dynamo"]),
  def("kv_store", "Key-value store", "Data Storage", Table, C.data, ["redis", "kv"]),
  def("document_db", "Document database", "Data Storage", Files, C.data, ["mongo", "json"]),
  def("graph_db", "Graph database", "Data Storage", GitBranch, C.data, ["neo4j", "graph"]),
  def("timeseries_db", "Time-series database", "Data Storage", TrendingUp, C.data, ["metrics", "tsdb"]),
  def("object_storage", "Object storage", "Data Storage", Archive, C.data, ["s3", "blob"]),
  def("file_storage", "File storage", "Data Storage", Folder, C.data, ["nfs", "files"]),
  def("data_warehouse", "Data warehouse", "Data Storage", FileStack, C.data, ["olap", "snowflake"]),
  def("data_lake", "Data lake", "Data Storage", Waves, C.data, ["lake", "raw"]),
  def("search_index", "Search index", "Data Storage", Search, C.data, ["elastic", "lucene"]),
  // Messaging & Streaming
  def("message_queue", "Message queue", "Messaging & Streaming", Inbox, C.msg, ["queue", "sqs", "rabbit"]),
  def("event_bus", "Event bus", "Messaging & Streaming", Radio, C.msg, ["queue", "events", "bus"]),
  def("stream", "Stream", "Messaging & Streaming", Waves, C.msg, ["queue", "kafka", "kinesis"]),
  def("topic", "Topic", "Messaging & Streaming", Megaphone, C.msg, ["queue", "pubsub"]),
  def("publisher", "Publisher", "Messaging & Streaming", Mail, C.msg, ["producer", "pubsub"]),
  def("consumer", "Consumer", "Messaging & Streaming", Repeat, C.msg, ["subscriber", "queue"]),
  def("dlq", "Dead-letter queue", "Messaging & Streaming", AlarmSmoke, C.msg, ["queue", "dlq", "retry"]),
  // Caching
  def("cache", "Cache", "Caching", Zap, C.cache, ["redis", "memcached"]),
  def("distributed_cache", "Distributed cache", "Caching", Boxes, C.cache, ["redis cluster"]),
  def("browser_cache", "Browser cache", "Caching", MonitorSmartphone, C.cache, ["client cache"]),
  // AI & ML
  def("llm", "Large language model", "AI & Machine Learning", Brain, C.ai, ["llm", "gpt"]),
  def("embedding_model", "Embedding model", "AI & Machine Learning", Sparkles, C.ai, ["embeddings"]),
  def("vector_db", "Vector database", "AI & Machine Learning", Locate, C.ai, ["vector", "pgvector"]),
  def("model_gateway", "Model gateway", "AI & Machine Learning", Router, C.ai, ["ai gateway"]),
  def("prompt_service", "Prompt service", "AI & Machine Learning", Terminal, C.ai, ["prompt"]),
  def("retrieval_service", "Retrieval service", "AI & Machine Learning", Filter, C.ai, ["rag", "retrieval"]),
  def("ai_agent", "AI agent", "AI & Machine Learning", Bot, C.ai, ["agent", "tools"]),
  def("training_pipeline", "Model training pipeline", "AI & Machine Learning", Workflow, C.ai, ["training"]),
  def("inference_service", "Model inference service", "AI & Machine Learning", CircleDot, C.ai, ["inference"]),
  // Observability & Security
  def("logging", "Logging service", "Observability & Security", FileStack, C.ops, ["logs"]),
  def("metrics", "Metrics service", "Observability & Security", Gauge, C.ops, ["metrics", "prometheus"]),
  def("tracing", "Tracing service", "Observability & Security", Activity, C.ops, ["traces", "otel"]),
  def("auth_service", "Authentication service", "Observability & Security", Fingerprint, C.ops, ["auth", "login"]),
  def("authz_service", "Authorization service", "Observability & Security", ShieldCheck, C.ops, ["rbac", "permissions"]),
  def("secrets_manager", "Secrets manager", "Observability & Security", KeyRound, C.ops, ["vault", "secrets"]),
  def("monitoring", "Monitoring or alerting", "Observability & Security", Bell, C.ops, ["alerts", "pager"]),
  def("disk", "Disk volume", "Data Storage", HardDrive, C.data, ["volume", "ebs"]),
];

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  "General",
  "Networking & Delivery",
  "Compute",
  "Data Storage",
  "Messaging & Streaming",
  "Caching",
  "AI & Machine Learning",
  "Observability & Security",
];

const byType = new Map(COMPONENT_LIBRARY.map((c) => [c.type, c]));

export function getComponent(type: string): ComponentDefinition | undefined {
  return byType.get(type);
}

export function ComponentIcon({
  type,
  ...props
}: { type: string } & LucideProps) {
  const Icon = byType.get(type)?.icon ?? Box;
  return <Icon {...props} />;
}

export function searchComponents(query: string, category: ComponentCategory | "all") {
  const q = query.trim().toLowerCase();
  return COMPONENT_LIBRARY.filter((c) => {
    if (category !== "all" && c.category !== category) return false;
    if (!q) return true;
    return (
      c.label.toLowerCase().includes(q) ||
      c.type.includes(q.replace(/\s+/g, "_")) ||
      c.keywords.some((k) => k.includes(q))
    );
  });
}

export const CONNECTOR_LABEL_PRESETS = [
  "HTTPS",
  "gRPC",
  "SQL",
  "Events",
  "Async",
  "Read",
  "Write",
  "Replication",
];