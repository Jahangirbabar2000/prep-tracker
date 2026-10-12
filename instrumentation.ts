// Next.js runs register() once per server instance, before any request.
// Tracing is on only where an OTLP endpoint is configured (a deployed stage
// with its Grafana Cloud settings, or a local collector); otherwise nothing is
// loaded and nothing is sent — unit tests, e2e and `npm run dev` included.
export async function register() {
  // A deployed stage without Grafana settings carries the placeholder 'off'.
  if (process.env.NEXT_RUNTIME === 'nodejs' && /^https?:\/\//.test(process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? '')) {
    await import('./instrumentation.node');
  }
}
