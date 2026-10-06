# Launch Checklist

## Pre-Launch Requirements

| Item | Status | Notes |
|------|--------|-------|
| MCP server runs on launch | ❌ | App must start the MCP server automatically on port 3613 (3614, 3615...) |
| MCP server stops on quit | ❌ | App must shut down the MCP server gracefully on quit |
| All 7 surfaces render correctly | ❌ | Browser, Canvas, Image, ScreenCapture, CodeDiff, ProcessManager, Terminal |
| Surface lifecycle states work | ❌ | Notification → Pending → Active → Responding → Complete |
| Error handling works | ❌ | Surface errors, session errors, backend errors, app errors |
| Firebase auth works | ❌ | User can sign in with Google and email |
| Firestore reads/writes work | ❌ | User, Session, Surface, Notification collections |
| WebSocket real-time updates work | ❌ | Surface pushes from backend to app |
| IPC communication works | ❌ | Main ↔ Renderer communication |
| Help Palette works | ❌ | ⌘+Shift+Space, 6 shortcuts |
| Keyboard shortcuts work | ❌ | ⌘+N, ⌘+Shift+Space, Escape, Enter |
| Toast notifications work | ❌ | Bottom-center, stacking |
| Banners work | ❌ | Top banner (connection state, errors) |
| macOS dark mode works | ❌ | All UI adapts to system theme |
| Retina / 4K displays work | ❌ | All UI is resolution-independent |
| Multiple monitors work | ❌ | Surfaces can span across monitors |
| Accessibility works | ❌ | All buttons have alt text, keyboard navigable |
| Offline mode works | ❌ | Actions queued in IndexedDB, replay on reconnect |
| App restart recovery works | ❌ | Surfaces in progress are preserved |
| Crash recovery works | ❌ | "We noticed the app crashed — here's what we recovered:" |

## Backend Requirements

| Item | Status | Notes |
|------|--------|-------|
| NestJS app runs | ❌ | Backend must be running and accessible |
| Firebase project configured | ❌ | Auth, Firestore, Realtime Database |
| NestJS services work | ❌ | Auth, Session, Surface, Notification services |
| NestJS controllers work | ❌ | HTTP endpoints for all CRUD operations |
| NestJS DTOs work | ❌ | Validation, serialization |
| NestJS error handling works | ❌ | Global filters, catch blocks |
| NestJS middleware works | ❌ | Auth middleware, CORS middleware |
| NestJS guards work | ❌ | Role-based access control |
| NestJS interceptors work | ❌ | Request/response transformation |
| NestJS pipes work | ❌ | Data validation, transformation |
| NestJS filters work | ❌ | Error handling, logging |
| NestJS modules work | ❌ | App module, auth module, session module, surface module |
| NestJS providers work | ❌ | Injectable services |
| NestJS dependencies work | ❌ | Firebase, NestJS, NestJS CLI |
| NestJS config works | ❌ | Environment variables, config module |
| NestJS logging works | ❌ | Console, file, cloud logging |
| NestJS metrics work | ❌ | Prometheus, Grafana, Datadog |
| NestJS tracing works | ❌ | Jaeger, Zipkin, OpenTelemetry |
| NestJS health checks work | ❌ | Liveness, readiness probes |
| NestJS rate limiting works | ❌ | Request throttling, DDoS protection |
| NestJS caching works | ❌ | Redis, in-memory caching |
| NestJS WebSocket works | ❌ | Real-time updates, event sourcing |
| NestJS GraphQL works | ❌ | Schema, resolvers, types |
| NestJS REST works | ❌ | API design, OpenAPI spec |
| NestJS RPC works | ❌ | gRPC, Protocol Buffers |
| NestJS messaging works | ❌ | RabbitMQ, Kafka, SQS |
| NestJS queues work | ❌ | Bull, Agenda, node-cron |
| NestJS scheduling works | ❌ | Task scheduling, batch processing |
| NestJS streaming works | ❌ | File uploads, large payloads |
| NestJS file handling works | ❌ | Uploads, downloads, storage |
| NestJS email works | ❌ | SendGrid, AWS SES, Postmark |
| NestJS SMS works | ❌ | Twilio, AWS SNS, Vonage |
| NestJS push notifications work | ❌ | Firebase Cloud Messaging, OneSignal |
| NestJS analytics work | ❌ | Google Analytics, Mixpanel, Amplitude |
| NestJS APM works | ❌ | New Relic, AppDynamics, Dynatrace |
| NestJS monitoring works | ❌ | Prometheus, Grafana, Datadog |
| NestJS alerting works | ❌ | PagerDuty, Opsgenie, VictorOps |
| NestJS backup works | ❌ | Automated backups, disaster recovery |
| NestJS recovery works | ❌ | Backups, snapshots, restores |
| NestJS security works | ❌ | OWASP, encryption, authentication |
| NestJS compliance works | ❌ | GDPR, HIPAA, PCI DSS, SOC 2 |

## User Onboarding

| Item | Status | Notes |
|------|--------|-------|
| Onboarding flow works | ❌ | 3-step wizard: MCP server → Connect → Verify |
| Step 1: MCP server running | ❌ | User sees endpoint, can copy URL |
| Step 2: Connect Claude Code | ❌ | User edits `.mcp.json`, restarts Claude Code |
| Step 3: Verify connection | ❌ | User confirms Claude Code sees Human Assist |
| Troubleshooting works | ❌ | Common issues: port blocked, firewall, old Claude Code |
| Onboarding complete toast | ❌ | "All set! Claude Code can now reach you through Human Assist." |
| Dashboard after onboarding | ❌ | "Waiting for Claude" state, no active surfaces |

## Quality Assurance

| Item | Status | Notes |
|------|--------|-------|
| Test on macOS 12+ | ❌ | All UI, surfaces, shortcuts tested |
| Test on Retina display | ❌ | All UI is crisp, surfaces render correctly |
| Test on 4K display | ❌ | All UI scales, surfaces render correctly |
| Test on multiple monitors | ❌ | Surfaces span across monitors, screen capture works |
| Test on dark mode | ❌ | All UI adapts, surfaces use dark mode |
| Test on light mode | ❌ | All UI adapts, surfaces use light mode |
| Test on offline mode | ❌ | Actions queued, replay on reconnect |
| Test on app restart | ❌ | Surfaces in progress are preserved |
| Test on app crash | ❌ | "We noticed the app crashed — here's what we recovered:" |
| Test on sign out | ❌ | All surfaces send `{ completed: false }` to Claude |
| Test on sign in | ❌ | All surfaces are loaded from Firestore |
| Test on network loss | ❌ | Banner shows "Connection lost — reconnecting..." |
| Test on network restore | ❌ | Banner fades, actions replayed |
| Test on Firebase timeout | ❌ | Banner shows "Auth service unavailable" |
| Test on invalid credentials | ❌ | Inline: "Invalid email or password" |
| Test on account suspended | ❌ | Full-screen: "Your account has been suspended" |
| Test on token expired | ❌ | Silent re-auth via Firebase auto-refresh |
| Test on surface timeout | ❌ | Auto-disconnect, toast: "Surface timed out" |
| Test on max surfaces (10) | ❌ | Toast: "Maximum 10 surfaces open at once" |
| Test on max sessions (50) | ❌ | Toast: "Too many sessions open" |
| Test on surface ordering | ❌ | If Claude pushes 5 surfaces rapidly, last 4 queue as background surfaces |
| Test on concurrent Claude instances | ❌ | Only one Claude Code process can connect at a time |
| Test on large session history | ❌ | Virtualized list, loads 20 at a time, searchable |
| Test on accessibility | ❌ | All buttons have alt text, keyboard navigable |
| Test on VoiceOver | ❌ | All UI elements are accessible |
| Test on keyboard navigation | ❌ | All buttons are reachable with Tab, Enter, Escape |

## Go-Live

| Item | Status | Notes |
|------|--------|-------|
| Production Firebase project | ❌ | Auth, Firestore, Realtime Database configured |
| Production NestJS app | ❌ | Deployed and accessible |
| Production MCP server | ❌ | App starts the server on launch, stops on quit |
| Production app bundle | ❌ | Electron app signed, notarized, distributed |
| Production documentation | ❌ | README, CONTRIBUTING, CHANGELOG |
| Production monitoring | ❌ | Error tracking, metrics, logging |
| Production alerting | ❌ | PagerDuty, Opsgenie, VictorOps |
| Production backup | ❌ | Automated backups, disaster recovery |
| Production recovery | ❌ | Backups, snapshots, restores |
| Production security | ❌ | OWASP, encryption, authentication |
| Production compliance | ❌ | GDPR, HIPAA, PCI DSS, SOC 2 |
| Production GDPR | ❌ | Data privacy, consent management |
| Production HIPAA | ❌ | PHI, BAA, encryption |
| Production PCI DSS | ❌ | Cardholder data, encryption |
| Production SOC 2 | ❌ | Trust center, audit reports |
| Production CCPA | ❌ | California privacy, opt-out |
| Production PIPEDA | ❌ | Canadian privacy, consent |
| Production LGPD | ❌ | Brazilian privacy, consent |
| Production APPI | ❌ | Japanese privacy, consent |
| Production PDPA | ❌ | Singapore privacy, consent |
| Production Privacy Shield | ❌ | EU-US data transfer |
| Production Schrems II | ❌ | Data localization, adequacy |
