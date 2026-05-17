# Bindel API Documentation

## Overview

Bindel provides a backend API for content extraction and processing. This document describes all available endpoints, request/response formats, and error handling.

---

## Base URL

```
Development: http://localhost:5173/api
Production: https://your-domain.com/api
```

---

## Authentication

Currently, Bindel does not require API authentication. The backend validates requests through:
- Content validation
- Rate limiting (planned)
- Environment variable validation (API keys managed server-side)

---

## Endpoints

### 1. Extract Content from URL

Extract and convert web content to markdown format.

**Endpoint**: `POST /api/extract`

**Description**: Fetches a URL, parses content using Mozilla Readability, and converts to markdown.

**Request**:
```json
{
  "url": "https://example.com/article",
  "mode": "article"
}
```

**Parameters**:
- `url` (string, required) - Full URL to extract from
- `mode` (string, optional) - View mode: `'article'`, `'topic'`, or `'book'` (default: `'article'`)

**Response** (Success 200):
```json
{
  "success": true,
  "data": {
    "markdown": "# Article Title\n\nContent in markdown format...",
    "title": "Article Title",
    "excerpt": "The first paragraph or summary...",
    "byline": "Author Name",
    "publishedDate": "2026-05-17T10:30:00Z",
    "domain": "example.com",
    "wordCount": 1250,
    "estimatedReadTime": 5
  }
}
```

**Response** (Error 400):
```json
{
  "success": false,
  "error": "Invalid URL format",
  "code": "INVALID_URL"
}
```

**Response** (Error 504):
```json
{
  "success": false,
  "error": "Failed to fetch URL - CORS issue",
  "code": "FETCH_FAILED",
  "fallback": "Consider using proxy.corsproxy.io"
}
```

**Example - cURL**:
```bash
curl -X POST http://localhost:5173/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "mode": "article"
  }'
```

**Example - JavaScript**:
```typescript
const response = await fetch('/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/article',
    mode: 'article'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Extracted markdown:', data.data.markdown);
} else {
  console.error('Extraction failed:', data.error);
}
```

**Rate Limiting**: 
- 30 requests per minute per IP
- Header: `X-RateLimit-Remaining: 29`

**Timeout**: 15 seconds

---

### 2. Polish Content with AI

Enhance markdown content using Gemini AI.

**Endpoint**: `POST /api/polish`

**Description**: Improves text quality, grammar, and clarity using Gemini AI.

**Request**:
```json
{
  "content": "Your markdown content here...",
  "level": "standard",
  "instructions": "Optional custom instructions"
}
```

**Parameters**:
- `content` (string, required) - Markdown content to polish (max 10,000 characters)
- `level` (string, required) - Polish level: `'quick'`, `'standard'`, or `'advanced'`
- `instructions` (string, optional) - Custom prompting instructions

**Response** (Success 200):
```json
{
  "success": true,
  "data": {
    "original": "Your original content...",
    "polished": "Improved content with better grammar...",
    "changes": [
      {
        "type": "grammar",
        "before": "its",
        "after": "it's",
        "reason": "Possessive vs. contraction"
      }
    ],
    "processingTime": 2500,
    "tokensUsed": 150
  }
}
```

**Response** (Error 400):
```json
{
  "success": false,
  "error": "Content exceeds maximum length of 10000 characters",
  "code": "CONTENT_TOO_LONG"
}
```

**Response** (Error 503):
```json
{
  "success": false,
  "error": "Gemini API temporarily unavailable",
  "code": "AI_SERVICE_UNAVAILABLE"
}
```

**Example - JavaScript**:
```typescript
const response = await fetch('/api/polish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: '# My Article\n\nSome text here...',
    level: 'standard'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Polished:', data.data.polished);
} else {
  console.error('Polish failed:', data.error);
}
```

**Polish Levels**:
| Level | Description | Speed | Quality |
|-------|---|---|---|
| `quick` | Grammar & typos only | Fast | Basic |
| `standard` | Grammar, clarity, tone | Medium | Good |
| `advanced` | Full rewrite with structure | Slow | Excellent |

**Rate Limiting**: 
- 10 requests per minute per IP
- Header: `X-RateLimit-Remaining: 9`

**Timeout**: 30 seconds

---

### 3. Summarize Content

Generate a summary of markdown content.

**Endpoint**: `POST /api/summarize`

**Description**: Creates a concise summary using Gemini AI.

**Request**:
```json
{
  "content": "Your markdown content here...",
  "format": "bullet-points",
  "length": "short"
}
```

**Parameters**:
- `content` (string, required) - Markdown content to summarize (max 10,000 characters)
- `format` (string, optional) - Output format: `'paragraph'`, `'bullet-points'`, or `'json'` (default: `'bullet-points'`)
- `length` (string, optional) - Summary length: `'short'`, `'medium'`, or `'long'` (default: `'short'`)

**Response** (Success 200):
```json
{
  "success": true,
  "data": {
    "summary": "• Key point 1\n• Key point 2\n• Key point 3",
    "format": "bullet-points",
    "originalLength": 5000,
    "summaryLength": 250,
    "compressionRatio": 0.05
  }
}
```

**Example - JavaScript**:
```typescript
const response = await fetch('/api/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: '# Long Article\n\nContent...',
    format: 'bullet-points',
    length: 'short'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Summary:', data.data.summary);
}
```

---

### 4. Health Check

Verify API is running and services are available.

**Endpoint**: `GET /api/health`

**Description**: Returns status of all services.

**Response** (Success 200):
```json
{
  "status": "healthy",
  "services": {
    "database": "ok",
    "gemini": "ok",
    "storage": "ok"
  },
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Example**:
```typescript
const response = await fetch('/api/health');
const data = await response.json();
console.log(data.status); // "healthy"
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|---|
| `INVALID_URL` | 400 | URL format is invalid |
| `FETCH_FAILED` | 504 | Unable to fetch URL (CORS issue) |
| `CONTENT_TOO_LONG` | 400 | Content exceeds maximum length |
| `INVALID_REQUEST` | 400 | Request body is malformed |
| `AI_SERVICE_UNAVAILABLE` | 503 | Gemini API is down |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Rate Limiting Headers

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
X-RateLimit-Reset: 1621234800
```

---

## Request/Response Headers

### Request Headers

```
Content-Type: application/json
User-Agent: Your-App/1.0
```

### Response Headers

```
Content-Type: application/json
Cache-Control: no-cache
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
```

---

## Webhooks (Planned)

Future versions will support webhooks for long-running operations:

```json
{
  "event": "polish.completed",
  "timestamp": "2026-05-17T10:30:00Z",
  "data": {
    "requestId": "req-123",
    "result": "polished content..."
  }
}
```

---

## Pagination (Planned)

Future endpoints will support pagination:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasMore": true
  }
}
```

---

## Integration Examples

### React Hook Integration

```typescript
// src/hooks/useExtractor.ts
export function useExtractor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = async (url: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode: 'article' })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { extract, loading, error };
}
```

### TypeScript Service

```typescript
// src/services/api.ts
export interface ExtractRequest {
  url: string;
  mode?: 'article' | 'topic' | 'book';
}

export interface ExtractResponse {
  markdown: string;
  title: string;
  excerpt: string;
  byline: string;
  domain: string;
}

export async function extractContent(req: ExtractRequest): Promise<ExtractResponse> {
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}
```

---

## Best Practices

### Error Handling
```typescript
// ✅ Always check response.success
if (!response.success) {
  console.error(response.error, response.code);
}

// ✅ Handle timeouts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 15000);
const response = await fetch(url, { signal: controller.signal });
```

### Performance
```typescript
// ✅ Debounce multiple requests
const debouncedExtract = debounce(extract, 1000);

// ✅ Cache results
const cache = new Map();
if (cache.has(url)) return cache.get(url);
```

### Security
```typescript
// ✅ Validate URLs
if (!url.startsWith('http')) throw new Error('Invalid URL');

// ✅ Sanitize content before display
const sanitized = DOMPurify.sanitize(content);
```

---

## Testing the API

### Using Postman

1. Create new request
2. Method: `POST`
3. URL: `http://localhost:5173/api/extract`
4. Body (JSON):
```json
{
  "url": "https://example.com",
  "mode": "article"
}
```
5. Click "Send"

### Using curl

```bash
# Extract content
curl -X POST http://localhost:5173/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Check health
curl http://localhost:5173/api/health
```

### Using JavaScript Fetch

```typescript
// Test extraction
const result = await fetch('/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/article'
  })
}).then(r => r.json());

console.log(result);
```

---

## Versioning

Current API Version: **v1**

Future versions will be available at:
- `POST /api/v2/extract`
- `POST /api/v2/polish`

---

## Migration Guide

### v1 → v2 (Planned)

Breaking changes:
- Response format simplified
- New authentication required

Migration example:
```typescript
// Old (v1)
const result = data.data.markdown;

// New (v2)
const result = data.content.markdown;
```

---

## Support

- **Issues**: [GitHub Issues](https://github.com/babakane/Bindel/issues)
- **Email**: support@example.com
- **Documentation**: [Development Guide](./DEVELOPMENT.md)

---

**Last Updated**: 2026-05-17  
**Status**: Stable  
**Maintainer**: babakane
