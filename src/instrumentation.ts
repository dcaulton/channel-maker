import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';

import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';

diag.setLogger(
  new DiagConsoleLogger(),
  process.env.OTEL_LOG_LEVEL === 'debug'
    ? DiagLogLevel.DEBUG
    : DiagLogLevel.INFO,
);

const tracesUrl =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
  'http://127.0.0.1:4318/v1/traces';
const logsUrl =
  process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ??
  'http://127.0.0.1:4318/v1/logs';

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'channel-maker',
  spanProcessors: [
    new BatchSpanProcessor(new OTLPTraceExporter({ url: tracesUrl })),
  ],
  logRecordProcessors: [
    new BatchLogRecordProcessor({
      exporter: new OTLPLogExporter({ url: logsUrl }),
    }),
  ],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-pino': { enabled: true },
    }),
  ],
});

sdk.start();
