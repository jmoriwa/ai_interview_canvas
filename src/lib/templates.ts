import { emptyCanvasDocument, type CanvasDocument, type InterviewPrompt } from "./domain";

export interface InterviewTemplate {
  id: string;
  name: string;
  summary: string;
  defaultDurationSeconds: number;
  evaluationFocus: string[];
  prompt: InterviewPrompt;
  starterDocument: () => CanvasDocument;
}

let seq = 0;
const nid = () => `n_${(++seq).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function starter(
  specs: Array<[type: string, label: string, x: number, y: number]>,
  links: Array<[from: number, to: number, label: string]>,
): () => CanvasDocument {
  return () => {
    const doc = emptyCanvasDocument();
    const ids = specs.map(([type, label, x, y]) => {
      const id = nid();
      doc.nodes.push({
        id,
        kind: "component",
        componentType: type,
        label,
        x,
        y,
        width: 168,
        height: 92,
        color: "oklch(0.79 0.13 195)",
      });
      return id;
    });
    links.forEach(([from, to, label]) => {
      doc.connectors.push({
        id: nid(),
        fromNodeId: ids[from]!,
        toNodeId: ids[to]!,
        label,
        style: "solid",
        direction: "forward",
        color: "oklch(0.68 0.02 250)",
      });
    });
    return doc;
  };
}

const prompt = (
  title: string,
  question: string,
  requirements: string[],
  constraints: string[],
  followUps: string[],
): InterviewPrompt => ({
  title,
  question,
  requirements,
  constraints,
  followUps,
  revealedFollowUps: 0,
});

export const TEMPLATES: InterviewTemplate[] = [
  {
    id: "blank",
    name: "Blank canvas",
    summary: "Start from nothing and write your own prompt.",
    defaultDurationSeconds: 45 * 60,
    evaluationFocus: [],
    prompt: prompt("", "", [], [], []),
    starterDocument: () => emptyCanvasDocument(),
  },
  {
    id: "url_shortener",
    name: "URL shortener",
    summary: "Classic read-heavy service with hashing and caching trade-offs.",
    defaultDurationSeconds: 45 * 60,
    evaluationFocus: ["Data modeling", "Scalability", "Performance"],
    prompt: prompt(
      "Design a URL shortener",
      "Design a service that turns long URLs into short links and redirects users at scale.",
      ["Create short links", "Redirect with low latency", "Basic click analytics"],
      ["100M new links/day", "100:1 read/write ratio", "p99 redirect under 50ms"],
      [
        "How do you avoid collisions in the key space?",
        "How would you support custom aliases?",
        "How do you expire links and reclaim keys?",
      ],
    ),
    starterDocument: starter(
      [
        ["client_app", "Client", 120, 220],
        ["api_gateway", "API gateway", 380, 220],
        ["app_server", "Shortener service", 640, 220],
        ["cache", "Redirect cache", 640, 60],
        ["relational_db", "Link store", 900, 220],
      ],
      [
        [0, 1, "HTTPS"],
        [1, 2, "gRPC"],
        [2, 3, "Read"],
        [2, 4, "SQL"],
      ],
    ),
  },
  {
    id: "chat_app",
    name: "Chat application",
    summary: "Realtime fan-out, presence, and message ordering.",
    defaultDurationSeconds: 60 * 60,
    evaluationFocus: ["High-level architecture", "Reliability", "Performance"],
    prompt: prompt(
      "Design a chat application",
      "Design a 1:1 and group messaging system with realtime delivery and history.",
      ["Realtime delivery", "Message history", "Read receipts", "Group chats"],
      ["50M DAU", "Messages delivered under 200ms", "Offline delivery required"],
      [
        "How do you guarantee ordering within a conversation?",
        "How do you fan out to large groups?",
        "How do you handle a user across five devices?",
      ],
    ),
    starterDocument: starter(
      [
        ["mobile_app", "Mobile client", 120, 200],
        ["load_balancer", "WS load balancer", 360, 200],
        ["app_server", "Chat gateway", 600, 200],
        ["event_bus", "Fan-out bus", 600, 40],
        ["nosql_db", "Message store", 860, 200],
      ],
      [
        [0, 1, "WebSocket"],
        [1, 2, "WS"],
        [2, 3, "Events"],
        [2, 4, "Write"],
      ],
    ),
  },
  {
    id: "notification_system",
    name: "Notification system",
    summary: "Multi-channel delivery with retries and deduplication.",
    defaultDurationSeconds: 45 * 60,
    evaluationFocus: ["Reliability", "Trade-off analysis", "Scalability"],
    prompt: prompt(
      "Design a notification system",
      "Design a service that delivers push, email, and SMS notifications for a large product.",
      ["Multi-channel delivery", "User preferences", "Retries", "Deduplication"],
      ["10M notifications/hour", "At-least-once delivery", "Third-party providers rate limit"],
      [
        "How do you prevent duplicate notifications?",
        "How do you handle a provider outage?",
        "How would you add rate limiting per user?",
      ],
    ),
    starterDocument: starter(
      [
        ["generic_service", "Producer service", 120, 200],
        ["message_queue", "Notification queue", 380, 200],
        ["worker", "Delivery worker", 640, 200],
        ["dlq", "Dead-letter queue", 640, 40],
        ["third_party_api", "Push / SMS provider", 900, 200],
      ],
      [
        [0, 1, "Events"],
        [1, 2, "Async"],
        [2, 3, "Failures"],
        [2, 4, "HTTPS"],
      ],
    ),
  },
  {
    id: "file_storage",
    name: "File storage system",
    summary: "Chunked uploads, metadata, and sync.",
    defaultDurationSeconds: 60 * 60,
    evaluationFocus: ["Data modeling", "Reliability", "Security"],
    prompt: prompt(
      "Design a file storage and sync service",
      "Design a Dropbox-style service supporting upload, download, and multi-device sync.",
      ["Large file uploads", "Versioning", "Sharing", "Device sync"],
      ["Files up to 10GB", "Durability 11 nines", "Bandwidth-efficient sync"],
      [
        "How do you deduplicate identical chunks?",
        "How do you resolve conflicting edits?",
        "How do you make sharing links secure?",
      ],
    ),
    starterDocument: starter(
      [
        ["client_app", "Desktop client", 120, 200],
        ["api_gateway", "Upload API", 380, 200],
        ["object_storage", "Chunk storage", 660, 120],
        ["relational_db", "Metadata DB", 660, 300],
      ],
      [
        [0, 1, "HTTPS"],
        [1, 2, "Write"],
        [1, 3, "SQL"],
      ],
    ),
  },
  {
    id: "video_streaming",
    name: "Video streaming platform",
    summary: "Transcoding pipeline and CDN delivery.",
    defaultDurationSeconds: 60 * 60,
    evaluationFocus: ["High-level architecture", "Performance", "Scalability"],
    prompt: prompt(
      "Design a video streaming platform",
      "Design an on-demand video platform covering upload, transcoding, and playback.",
      ["Upload and transcode", "Adaptive bitrate playback", "Search and recommendations"],
      ["1M concurrent viewers", "Global audience", "Storage cost matters"],
      [
        "How do you pick transcoding ladders?",
        "How do you handle a viral video?",
        "How would you support live streaming?",
      ],
    ),
    starterDocument: starter(
      [
        ["web_app", "Viewer app", 120, 200],
        ["cdn", "CDN", 360, 200],
        ["object_storage", "Segment storage", 620, 200],
        ["batch_processor", "Transcoder", 620, 40],
      ],
      [
        [0, 1, "HTTPS"],
        [1, 2, "Read"],
        [3, 2, "Write"],
      ],
    ),
  },
  {
    id: "ecommerce",
    name: "E-commerce platform",
    summary: "Catalog, cart, checkout, and inventory consistency.",
    defaultDurationSeconds: 60 * 60,
    evaluationFocus: ["Data modeling", "Reliability", "Trade-off analysis"],
    prompt: prompt(
      "Design an e-commerce platform",
      "Design the core of an online store: catalog, cart, checkout, and order fulfilment.",
      ["Product search", "Cart", "Checkout and payment", "Inventory accuracy"],
      ["Flash sales cause spikes", "No overselling", "Payments must be idempotent"],
      [
        "How do you reserve inventory during checkout?",
        "How do you keep search in sync with the catalog?",
        "How do you make payment retries safe?",
      ],
    ),
    starterDocument: starter(
      [
        ["web_app", "Storefront", 110, 200],
        ["api_gateway", "API gateway", 350, 200],
        ["microservice", "Order service", 600, 200],
        ["search_index", "Catalog search", 600, 40],
        ["relational_db", "Orders DB", 860, 200],
      ],
      [
        [0, 1, "HTTPS"],
        [1, 2, "gRPC"],
        [1, 3, "Read"],
        [2, 4, "SQL"],
      ],
    ),
  },
  {
    id: "ride_sharing",
    name: "Ride-sharing platform",
    summary: "Geospatial matching and trip lifecycle.",
    defaultDurationSeconds: 60 * 60,
    evaluationFocus: ["High-level architecture", "Performance", "Scalability"],
    prompt: prompt(
      "Design a ride-sharing platform",
      "Design driver-rider matching, trip tracking, and pricing for a ride-hailing service.",
      ["Driver location updates", "Matching", "Trip lifecycle", "Pricing"],
      ["Location updates every 4s", "Match under 5s", "City-level sharding"],
      [
        "How do you index driver locations?",
        "How do you avoid matching one driver twice?",
        "How does surge pricing get computed?",
      ],
    ),
    starterDocument: starter(
      [
        ["mobile_app", "Rider app", 110, 300],
        ["mobile_app", "Driver app", 110, 120],
        ["api_gateway", "Gateway", 370, 210],
        ["microservice", "Matching service", 630, 210],
        ["kv_store", "Geo index", 890, 210],
      ],
      [
        [0, 2, "HTTPS"],
        [1, 2, "Location"],
        [2, 3, "gRPC"],
        [3, 4, "Read/Write"],
      ],
    ),
  },
  {
    id: "search_system",
    name: "Search system",
    summary: "Crawl, index, and rank at scale.",
    defaultDurationSeconds: 60 * 60,
    evaluationFocus: ["Data modeling", "Scalability", "Performance"],
    prompt: prompt(
      "Design a search system",
      "Design an indexing and query system for hundreds of millions of documents.",
      ["Ingestion pipeline", "Inverted index", "Ranking", "Typeahead"],
      ["p99 query under 200ms", "Near-real-time indexing", "Index sharded across nodes"],
      [
        "How do you shard and replicate the index?",
        "How do you keep freshness without full reindexing?",
        "How would you add personalization?",
      ],
    ),
    starterDocument: starter(
      [
        ["web_app", "Search UI", 110, 200],
        ["app_server", "Query service", 370, 200],
        ["search_index", "Inverted index", 630, 200],
        ["batch_processor", "Indexer", 630, 40],
        ["data_lake", "Document store", 890, 40],
      ],
      [
        [0, 1, "HTTPS"],
        [1, 2, "Read"],
        [3, 2, "Write"],
        [4, 3, "Batch"],
      ],
    ),
  },
  {
    id: "ai_rag",
    name: "AI retrieval-augmented generation",
    summary: "Embedding pipeline, vector search, and model gateway.",
    defaultDurationSeconds: 60 * 60,
    evaluationFocus: ["High-level architecture", "Trade-off analysis", "Performance"],
    prompt: prompt(
      "Design a RAG system",
      "Design a retrieval-augmented generation service answering questions over private documents.",
      ["Document ingestion", "Chunking and embeddings", "Retrieval", "Grounded answers"],
      ["Tenant isolation required", "Answer under 3s", "Model cost per query matters"],
      [
        "How do you chunk and re-embed changed documents?",
        "How do you keep tenants isolated in the vector store?",
        "How do you evaluate answer quality?",
      ],
    ),
    starterDocument: starter(
      [
        ["web_app", "Chat UI", 110, 220],
        ["retrieval_service", "Retrieval service", 370, 220],
        ["vector_db", "Vector DB", 630, 340],
        ["embedding_model", "Embedding model", 630, 60],
        ["llm", "LLM", 890, 220],
      ],
      [
        [0, 1, "HTTPS"],
        [1, 2, "Search"],
        [3, 2, "Write"],
        [1, 4, "Prompt"],
      ],
    ),
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);