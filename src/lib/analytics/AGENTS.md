# Analytics & KPI Engine

**Purpose:** Calculate manufacturing quality KPIs and statistical forecasts

## Structure

```
src/lib/analytics/
├── kpiEngine.ts          # Main KPI calculations (146 lines)
├── statistics.ts         # Statistical utilities
└── index.ts              # Exports
```

## Key Metrics

### Rejection Rate
```typescript
const rate = await kpiEngine.calculateRejectionRate(from, to, producedVolume);
// Returns: { current, previous, delta, isGood }
```

### Cost Impact
```typescript
const cost = await kpiEngine.calculateCostImpact(from, to);
// Returns: { current, projection, delta, unitCost }
```

### Top Risk Identification
```typescript
const risk = await kpiEngine.identifyTopRisk(from, to);
// Returns: { name, contribution, line, count }
```

### Trend Forecasting
```typescript
const forecast = await kpiEngine.generateForecast(days);
// Returns: { nextMonth, confidenceInterval, confidence }
```

## Statistical Methods

- **Moving averages** for trend detection
- **Confidence intervals** using standard deviation
- **Pareto analysis** for defect prioritization
- **Simple linear regression** for basic forecasting

## Usage

```typescript
import { kpiEngine } from '@/lib/analytics';

// All methods are async and return typed results
const [rate, cost, risk] = await Promise.all([
  kpiEngine.calculateRejectionRate(from, to, volume),
  kpiEngine.calculateCostImpact(from, to),
  kpiEngine.identifyTopRisk(from, to),
]);
```

## Integration

- **AI Summary:** `geminiService` consumes these KPIs
- **Dashboard:** Main page displays all KPIs
- **Reports:** API endpoints use these calculations

## Notes

- All calculations use **30-day default window**
- **Production volume** is hardcoded (100,000) - should come from production data
- Forecasting is **simplified** - not using ML models
