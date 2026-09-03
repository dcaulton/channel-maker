// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

// Configure your telemetry exporter (e.g., Jaeger, Zipkin, SigNoz)
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4317',
});

export const otelSDK = new NodeSDK({
  traceExporter,
  serviceName: 'channel-maker',
  instrumentations: [
    // Option A: Load all default Node instrumentations (includes NestJS by default)
    getNodeAutoInstrumentations(),

    // Option B: If loading manually, explicitly declare it:
    // new NestInstrumentation()
  ],
});

// Gracefully shut down the SDK when the process ends
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log('SDK shut down successfully'))
    .catch((error) => console.log('Error shutting down SDK', error))
    .finally(() => process.exit(0));
});
