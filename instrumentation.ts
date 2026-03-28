import * as Sentry from "@sentry/nextjs";
import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";

export async function register() {
  // Register OpenTelemetry with Langfuse exporter for LLM observability
  registerOTel({
    serviceName: "chainlinked",
    traceExporter: new LangfuseExporter(),
  });

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
