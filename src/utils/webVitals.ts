import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

/**
 * Reports Web Vitals metrics to console in development
 * In production, you might want to send these to an analytics service
 */
const reportWebVitals = (metric: Metric) => {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric);
  }
  
  // In production, you could send to analytics:
  // Example: sendToAnalytics(metric);
  // Or use Firebase Analytics:
  // logEvent(analytics, 'web_vitals', {
  //   metric_name: metric.name,
  //   metric_value: metric.value,
  //   metric_rating: metric.rating,
  // });
};

/**
 * Initialize Web Vitals tracking
 * Call this once in your app's entry point
 * Note: FID has been replaced by INP (Interaction to Next Paint) in web-vitals v3+
 */
export const initWebVitals = () => {
  onCLS(reportWebVitals);
  onINP(reportWebVitals); // INP replaces FID
  onFCP(reportWebVitals);
  onLCP(reportWebVitals);
  onTTFB(reportWebVitals);
};
