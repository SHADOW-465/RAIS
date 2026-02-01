# AI Integration (Gemini)

**Purpose:** Google Gemini AI integration for health summaries

## Structure

```
src/lib/ai/
├── geminiService.ts       # Gemini API wrapper (155 lines)
└── index.ts               # Exports
```

## Key Function

```typescript
const summary = await geminiService.generateHealthSummary({
  rejectionRate,
  topRisk,
  costImpact,
});

// Returns: { summary: string, confidence: number }
```

## Implementation

- **Model:** Gemini Pro (via `@google/generative-ai`)
- **API Key:** `GEMINI_API_KEY` env variable
- **Prompt:** Template-based with KPI injection
- **Fallback:** Returns default message on error

## Usage Pattern

```typescript
// Called from Dashboard after KPI calculation
const aiSummary = await geminiService.generateHealthSummary(kpis);

// Displayed in HealthCard component
<HealthCard 
  status={status}
  summary={aiSummary.summary}
  confidence={aiSummary.confidence}
/>
```

## Notes

- **Not using streaming** - single response
- **Rate limited** by Google (free tier: 60 req/min)
- **No caching** - generates fresh each load
- **Confidence score** always returned (0-100)

## Adding AI Features

1. Extend `geminiService.ts` with new methods
2. Create prompt templates as constants
3. Add error handling with fallbacks
4. Call from appropriate page/component
