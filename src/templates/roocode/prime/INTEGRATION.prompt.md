---
agent: codebase-analyzer
model: claude-sonnet-4-20250514
tools:
  - Read
  - Glob
  - Grep
  - Bash
description: Analyze external integrations and generate INTEGRATION.md context file
output: .roo/INTEGRATION.md
---

# Integration Analysis Task

You are analyzing the external integrations of this codebase to generate a comprehensive INTEGRATION.md file.

## Your Task

Explore the codebase and document:

1. **External Services**
   - What external APIs/services does this integrate with?
   - Authentication methods for each
   - Rate limiting or quota considerations
   - Base URLs and endpoints used

2. **Databases**
   - Database type(s) (PostgreSQL, MongoDB, Redis, etc.)
   - Connection patterns
   - Schema management approach
   - Migration tools used

3. **Message Queues / Event Buses**
   - Queue systems (RabbitMQ, Kafka, SQS, etc.)
   - Event patterns
   - Message formats

4. **Third-Party Libraries**
   - Key external dependencies
   - Why they're used
   - Version constraints

5. **Authentication & Authorization**
   - Auth providers (OAuth, SAML, JWT, etc.)
   - Session management
   - Token handling

6. **File Storage**
   - Cloud storage (S3, GCS, Azure Blob)
   - Local filesystem usage
   - CDN integration

7. **Observability**
   - Logging services
   - Monitoring/metrics (Datadog, New Relic, etc.)
   - Error tracking (Sentry, Rollbar, etc.)

## Exploration Strategy

1. Check environment variables for service URLs/keys
2. Use Grep to find:
   - API calls: `fetch|axios|http.get|requests.get`
   - Database: `createConnection|mongoose|prisma|sqlalchemy`
   - Auth: `jwt|oauth|passport|auth0`
   - AWS/GCP/Azure SDK imports
3. Read config files for integration settings
4. Check package.json/requirements.txt for integration libraries
5. Look for service client initialization

## Output Format

Generate a markdown file with this structure:

```markdown
# External Integrations

## Overview
[High-level summary of external dependencies]

## APIs and Services
[External APIs this system calls]

### Service Name
- **Purpose:** [Why it's used]
- **Authentication:** [How auth works]
- **Base URL:** [URL or config key]
- **Key Endpoints:** [Main endpoints used]
- **Error Handling:** [How failures are handled]

## Databases
[Database connections and management]

## Message Queues
[Async messaging systems]

## Authentication Providers
[Auth and identity services]

## Cloud Services
[Cloud provider integrations]

## Observability
[Logging, monitoring, error tracking]

## Configuration
[How integration settings are managed]

## Dependency Map
[Visual or textual map of external dependencies]
```

## Important Notes

- Focus on **active integrations** (ignore commented-out code)
- Note any deprecated or legacy integrations
- Highlight critical dependencies (system fails if unavailable)
- Document any retry/fallback strategies
- Include configuration examples (sanitized, no secrets)

## Tech Stack Context

{{#if techStack}}
**Runtime:** {{techStack.runtime}}
**Package Manager:** {{techStack.packageManager}}
**Frameworks:** {{techStack.frameworks}}
{{/if}}

Start your exploration and generate the INTEGRATION.md file.
