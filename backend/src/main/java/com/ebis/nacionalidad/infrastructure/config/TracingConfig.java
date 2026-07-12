package com.ebis.nacionalidad.infrastructure.config;

import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.otel.bridge.OtelCurrentTraceContext;
import io.micrometer.tracing.otel.bridge.OtelPropagator;
import io.micrometer.tracing.otel.bridge.OtelTracer;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.baggage.propagation.W3CBaggagePropagator;
import io.opentelemetry.api.trace.TracerProvider;
import io.opentelemetry.api.trace.propagation.W3CTraceContextPropagator;
import io.opentelemetry.context.propagation.ContextPropagators;
import io.opentelemetry.context.propagation.TextMapPropagator;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class TracingConfig {

  @Bean(destroyMethod = "close")
  SdkTracerProvider sdkTracerProvider(
      @Value("${spring.application.name}") String serviceName,
      @Value("${management.otlp.tracing.endpoint}") String otlpEndpoint) {
    Resource resource = Resource.getDefault()
        .merge(Resource.create(Attributes.of(AttributeKey.stringKey("service.name"), serviceName)));
    OtlpHttpSpanExporter exporter = OtlpHttpSpanExporter.builder()
        .setEndpoint(otlpEndpoint)
        .build();
    return SdkTracerProvider.builder()
        .setResource(resource)
        .addSpanProcessor(BatchSpanProcessor.builder(exporter).build())
        .build();
  }

  @Bean
  OpenTelemetry openTelemetry(SdkTracerProvider tracerProvider) {
    return OpenTelemetrySdk.builder()
        .setTracerProvider(tracerProvider)
        .setPropagators(ContextPropagators.create(TextMapPropagator.composite(
            W3CTraceContextPropagator.getInstance(),
            W3CBaggagePropagator.getInstance())))
        .build();
  }

  @Bean
  OtelCurrentTraceContext otelCurrentTraceContext() {
    return new OtelCurrentTraceContext();
  }

  @Bean
  Tracer tracer(OpenTelemetry openTelemetry, OtelCurrentTraceContext currentTraceContext) {
    io.opentelemetry.api.trace.Tracer otelTracer = openTelemetry.getTracer("ebis-api");
    return new OtelTracer(otelTracer, currentTraceContext, event -> {
    });
  }

  @Bean
  OtelPropagator otelPropagator(OpenTelemetry openTelemetry) {
    TracerProvider tracerProvider = openTelemetry.getTracerProvider();
    return new OtelPropagator(openTelemetry.getPropagators(), tracerProvider.get("ebis-api"));
  }
}
