import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebase';

/**
 * Reports Web Vitals metrics to console in development and Firebase Analytics in production
 */
const reportWebVitals = (metric: Metric) => {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric);
  }
  
  // Send to Firebase Analytics in production
  if (analytics) {
    logEvent(analytics, 'web_vitals', {
      metric_name: metric.name,
      metric_value: Math.round(metric.value),
      metric_rating: metric.rating,
      metric_delta: Math.round(metric.delta),
    });
  }
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
