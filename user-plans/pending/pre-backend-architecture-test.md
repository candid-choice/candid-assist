# pre-backend-architecture — Test Specification

## Purpose

Verify the backend architecture document correctly describes NestJS services, controllers, and modules.

## Unit Tests

### Service Structure
- [ ] Verify AuthService has: signin, signout, getUserProfile, updateWorkspace, getWorkspace
- [ ] Verify SessionsService has: createSession, updateSession, listSessions, getSession, archiveSession, deleteSession, duplicateSession, getSessionTimeline
- [ ] Verify SurfacesService has: createSurface, updateSurface, listSurfaces, getSurface, archiveSurface, deleteSurface
- [ ] Verify NotificationsService has: notifyUser, listNotifications, markNotificationRead, clearNotifications
- [ ] Verify MCPService has: start, stop, callTool, getTools, getToolResult, notifyResult

### Controller Structure
- [ ] Verify AuthController has: POST /auth/signin/google, POST /auth/signin/email, POST /auth/signout, GET /auth/profile, PUT /auth/workspace, GET /auth/workspace
- [ ] Verify SessionsController has: POST /sessions, PUT /sessions/:id, GET /sessions, GET /sessions/:id, PATCH /sessions/:id/archive, DELETE /sessions/:id, POST /sessions/:id/duplicate, GET /sessions/:id/timeline
- [ ] Verify SurfacesController has: POST /surfaces, PUT /surfaces/:id, GET /surfaces, GET /surfaces/:id, PATCH /surfaces/:id/archive, DELETE /surfaces/:id
- [ ] Verify NotificationsController has: POST /notifications, GET /notifications, PATCH /notifications/:id/read, DELETE /notifications
- [ ] Verify MCPController has: POST /mcp/tools/call, GET /mcp/tools, POST /mcp/tools/:id/result, GET /mcp/tools/:id/status, POST /mcp/notifications/results

### DTO Structure
- [ ] Verify CreateSessionDTO has: title, description, userId
- [ ] Verify UpdateSessionDTO has: title, description, status
- [ ] Verify ListSessionsDTO has: filter (active/waiting/done/error), limit, offset
- [ ] Verify CreateSurfaceDTO has: sessionId, type, url, prompt, userId
- [ ] Verify UpdateSurfaceDTO has: type, url, prompt, status (open/responding/complete/dismissed)
- [ ] Verify ListSurfacesDTO has: sessionId, filter (open/responding/complete/dismissed), limit, offset
- [ ] Verify NotifyUserDTO has: userId, message, payload
- [ ] Verify CallToolDTO has: tool, arguments
- [ ] Verify ToolResponseDTO has: surfaceId, data

### Error Handling
- [ ] Verify global error filters are described
- [ ] Verify catch blocks are described
- [ ] Verify error handling for: invalid params, not found, unauthorized, forbidden, conflict

### Middleware
- [ ] Verify auth middleware is described
- [ ] Verify CORS middleware is described

### Guards
- [ ] Verify role-based access control is described

### Interceptors
- [ ] Verify request/response transformation is described

### Pipes
- [ ] Verify data validation, transformation is described

### Modules
- [ ] Verify App module is described
- [ ] Verify Auth module is described
- [ ] Verify Session module is described
- [ ] Verify Surface module is described
- [ ] Verify Notification module is described

### Providers
- [ ] Verify Injectable services are described

### Dependencies
- [ ] Verify Firebase, NestJS, NestJS CLI dependencies are listed

### Config
- [ ] Verify environment variables, config module are described

### Logging
- [ ] Verify console, file, cloud logging are described

### Metrics
- [ ] Verify Prometheus, Grafana, Datadog metrics are described

### Tracing
- [ ] Verify Jaeger, Zipkin, OpenTelemetry tracing is described

### Health Checks
- [ ] Verify liveness, readiness probes are described

### Rate Limiting
- [ ] Verify request throttling, DDoS protection are described

### Caching
- [ ] Verify Redis, in-memory caching are described

### WebSocket
- [ ] Verify real-time updates, event sourcing are described

### GraphQL
- [ ] Verify schema, resolvers, types are described

### REST
- [ ] Verify API design, OpenAPI spec are described

### RPC
- [ ] Verify gRPC, Protocol Buffers are described

### Messaging
- [ ] Verify RabbitMQ, Kafka, SQS are described

### Queues
- [ ] Verify Bull, Agenda, node-cron are described

### Scheduling
- [ ] Verify task scheduling, batch processing are described

### Streaming
- [ ] Verify file uploads, large payloads are described

### File Handling
- [ ] Verify uploads, downloads, storage are described

### Email
- [ ] Verify SendGrid, AWS SES, Postmark are described

### SMS
- [ ] Verify Twilio, AWS SNS, Vonage are described

### Push Notifications
- [ ] Verify Firebase Cloud Messaging, OneSignal are described

### Analytics
- [ ] Verify Google Analytics, Mixpanel, Amplitude are described

### APM
- [ ] Verify New Relic, AppDynamics, Dynatrace are described

### Monitoring
- [ ] Verify Prometheus, Grafana, Datadog are described

### Alerting
- [ ] Verify PagerDuty, Opsgenie, VictorOps are described

### Backup
- [ ] Verify automated backups, disaster recovery are described

### Recovery
- [ ] Verify backups, snapshots, restores are described

### Security
- [ ] Verify OWASP, encryption, authentication are described

### Compliance
- [ ] Verify GDPR, HIPAA, PCI DSS, SOC 2 are described

### GDPR
- [ ] Verify data privacy, consent management are described

### HIPAA
- [ ] Verify PHI, BAA, encryption are described

### PCI DSS
- [ ] Verify cardholder data, encryption are described

### SOC 2
- [ ] Verify trust center, audit reports are described

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All services are documented
2. [ ] All controllers are documented
3. [ ] All DTOs are documented
4. [ ] All error handling is described
5. [ ] All middleware, guards, interceptors, pipes are described
6. [ ] All modules, providers, dependencies are described
7. [ ] All config, logging, metrics, tracing are described
8. [ ] All health checks, rate limiting, caching are described
9. [ ] All WebSocket, GraphQL, REST, RPC, messaging, queues, scheduling are described
10. [ ] All streaming, file handling, email, SMS, push, analytics, APM, monitoring, alerting, backup, recovery, security, compliance are described
11. [ ] All compliance rules (GDPR, HIPAA, PCI DSS, SOC 2) are described
12. [ ] No contradictions with other plans
