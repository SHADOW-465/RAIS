export function calculateMovingAverage(data: number[], windowSize: number): number[] {
  if (data.length === 0) return [];
  if (windowSize > data.length) windowSize = data.length;
  
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(avg);
  }
  
  return result;
}

export function calculateStdDev(data: number[]): number {
  if (data.length === 0) return 0;
  
  const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / data.length;
  return Math.sqrt(variance);
}

export function calculateConfidenceInterval(
  data: number[],
  confidence: number = 0.95
): [number, number] {
  if (data.length === 0) return [0, 0];
  
  const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
  const stdDev = calculateStdDev(data);
  
  // Z-score for 95% confidence is approximately 1.96
  const zScore = confidence === 0.95 ? 1.96 : 1.645;
  const margin = zScore * (stdDev / Math.sqrt(data.length));
  
  return [avg - margin, avg + margin];
}

export function detectAnomalies(
  data: { date: Date; value: number }[],
  threshold: number = 2
): { date: Date; value: number; zScore: number }[] {
  if (data.length === 0) return [];
  
  const values = data.map(d => d.value);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = calculateStdDev(values);
  
  if (stdDev === 0) return [];
  
  return data
    .map(item => ({
      date: item.date,
      value: item.value,
      zScore: (item.value - avg) / stdDev,
    }))
    .filter(item => Math.abs(item.zScore) > threshold);
}

export function calculatePareto(
  items: { name: string; value: number }[]
): { name: string; value: number; percentage: number; cumulativePercentage: number }[] {
  if (items.length === 0) return [];
  
  // Sort by value descending
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  
  let cumulative = 0;
  return sorted.map(item => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    cumulative += percentage;
    return {
      name: item.name,
      value: item.value,
      percentage: parseFloat(percentage.toFixed(2)),
      cumulativePercentage: parseFloat(cumulative.toFixed(2)),
    };
  });
}
