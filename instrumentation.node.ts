import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { setTelemetryFlush } from './lib/telemetry';

// OTLP/HTTP JSON to OTEL_EXPORTER_OTLP_ENDPOINT, with OTEL_EXPORTER_OTLP_HEADERS
// (Grafana Cloud's Basic auth) — the exporter reads both from the environment.
const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'prep-tracker',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION ?? 'dev',
    'deployment.environment.name': process.env.DEPLOY_STAGE ?? 'local',
    'cloud.provider': process.env.AWS_LAMBDA_FUNCTION_NAME ? 'aws' : 'none',
    'faas.name': process.env.AWS_LAMBDA_FUNCTION_NAME ?? '',
  }),
  // Batched in memory; lib/currentUser.ts flushes after each API response,
  // because Lambda freezes the process once a response is sent.
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
});
provider.register();
setTelemetryFlush(() => provider.forceFlush());
