---
name: system-design
description: Generate a system design document as self-contained HTML with Excalidraw-style diagrams. Use when the user invokes /system-design or asks for system design documentation covering requirements, entities, APIs, data flow, architecture, deep dives, and security for a product idea or existing codebase.
disable-model-invocation: true
argument-hint: "[product description, specs path, or repository]"
model: opus
effort: xhigh
---

# System Design

Turn a product idea, existing application, or supplied spec into a reviewable system design. Produce one self-contained HTML document with readable prose, concrete contracts, and Excalidraw-style diagrams.

## Model guidance

The frontmatter requests Claude Opus at `xhigh` effort for the skill's turn; if the host cannot apply those settings, continue with the available configuration.

## Inputs and scope

- Accept a product description, a path to notes or specs, a repository or directory, or the current conversation. Use the current project when no target is supplied and the context makes it clear.
- Read existing requirements, design decisions, code, schemas, API routes, infrastructure, and CI configuration before proposing a design. Reference relevant source paths or supplied URLs in the document.
- For existing systems, label what is implemented versus proposed. Preserve accepted decisions and stable requirement IDs when revising existing documentation.
- If the product or its main workflow is unknown, ask one focused question. Otherwise proceed with explicit assumptions and open questions. Mark invented scale estimates and targets as proposed; do not present them as agreed requirements or measured facts.
- Match complexity to the workload. A modular monolith is a valid design; introduce separate services, queues, caches, or replicas only when a requirement or constraint justifies them.

## Required document sections

Start with the system name, a brief problem statement, users, scope, assumptions, and a linked table of contents. Include all eight sections below in order. Mark a topic as not applicable with a reason when appropriate rather than inventing infrastructure.

### 1. Functional requirements

Give each requirement an `FR-n` ID, actor, observable behavior, priority, and acceptance condition. Cover the main workflows and their meaningful failure cases. State what is out of scope.

### 2. Non-functional requirements

Give each requirement an `NFR-n` ID and a measurable target or observable condition. Address relevant latency percentiles, throughput, concurrency, availability, consistency, durability, recovery objectives, retention, and cost constraints. Show rough capacity calculations when they influence the design, with units and assumptions. Label unknown targets as open or proposed.

### 3. Core entities and secondary entities

Separate primary domain records from supporting records such as sessions, memberships, audit events, or delivery attempts. Explain why each entity belongs in its group. For each, show its purpose, key fields, identifiers, relationships and cardinalities, owning module or service, and storage choice. Include key uniqueness constraints, lifecycle, and indexes driven by access patterns. Draw an entity relationship diagram and explain sensitive fields and retention needs.

### 4. API design

Map operations to functional requirements. For HTTP, show method, path, caller, authorization, request and response examples, status codes, and failure responses. For RPC or event interfaces, use the equivalent operation or topic, schema, producer, and consumer contracts. Cover pagination, validation, idempotency, concurrency, and versioning where relevant. Make tenant boundaries and resource ownership checks explicit. Keep entity names and identifiers consistent throughout.

### 5. Data flow

Trace the main write and read workflows from actor to response, including persistence and asynchronous work. Draw numbered sequence or flow diagrams. Label synchronous calls, asynchronous events, payloads, and transaction boundaries. Explain relevant retries, timeouts, duplicate handling, partial failures, and consistency windows. Show what the user observes when a step fails.

### 6. High-level architecture

Draw the clients, ingress, application modules or services, external dependencies, and data stores. Show where the database lives relative to application services: deployment or network boundaries, ownership, read/write paths, and which components can access it. Label protocols and synchronous versus asynchronous connections. Include caches, queues, object storage, replicas, and regions only when justified; distinguish logical modules from separately deployed services.

Draw a separate CI/CD flow: source change, CI checks and tests, build artifact or image, artifact registry when applicable, deployment environments, database migrations, health checks, and rollback. Distinguish build-time access from runtime access. If an existing repository lacks CI, label this as a proposed pipeline. Explain deployment, observability, and recovery decisions in terms of the NFRs they serve.

### 7. Deep dive suggestions

Rank the areas that most deserve further investigation because of risk, uncertainty, scale, or trade-offs. For each, name the design question, relevant FR/NFR, why it matters, alternatives, and the experiment, benchmark, or evidence needed to decide. Keep these as suggestions; do not silently treat unresolved alternatives as final decisions.

### 8. Security considerations

Tie threats and controls to the actual actors, data, APIs, and trust boundaries in the design. Cover authentication, authorization and tenant isolation, input validation, abuse prevention, encryption, secrets, least-privilege access, sensitive-data minimization and retention, audit logging, and CI/CD supply-chain controls where applicable. Identify residual risks and decisions that need review. Do not claim compliance or security guarantees without evidence.

## HTML and drawing style

- Deliver a complete HTML document with inline CSS, inline SVG diagrams, and only the small amount of inline JavaScript needed for interactions. It must work offline without CDNs, external fonts, remote images, libraries, or an Excalidraw account. Source hyperlinks are fine; loading them must not be required to render the page.
- Use an Excalidraw-inspired whiteboard style: warm white or faint dotted background, dark slightly irregular strokes, rounded sketch-like boxes, simple database cylinders, loose arrowheads, and restrained pastel fills. Draw with SVG paths; small deterministic variations or double strokes can suggest a hand-drawn line without making labels blurry. Use available handwritten-style font fallbacks for diagram labels and a readable system font for prose and tables.
- Keep diagrams editable as HTML/SVG source. Do not substitute raster screenshots, ASCII art, raw Mermaid source, or an embedded remote canvas for the drawings. This is an HTML deliverable, not a native `.excalidraw` file.
- Use consistent colors and a legend for components and boundaries. Label arrows with actions or data and keep labels clear of connectors. Use several focused diagrams instead of one overcrowded canvas.
- Provide SVG `viewBox` sizing, responsive containers, and scrolling for wide diagrams or tables. Include a caption or equivalent text explanation for each diagram. Preserve readable print output and do not rely on color alone to convey meaning.
- Escape source-derived text in HTML, SVG, and JavaScript. Use semantic headings, accessible link text, visible keyboard focus for controls, and sufficient contrast. Keep prose readable without JavaScript.

## Output and verification

Use the user's output path if supplied. Otherwise save outside the repository at `/tmp/YYYY-MM-DD-system-design-<slug>.html`, using the current date. Update an existing design artifact only when requested; do not overwrite unrelated files. Do not modify application code, deploy services, or create external resources as part of documenting the design.

Before handing off:

1. Check that all eight sections are present and that requirements, entity relationships, APIs, flows, and architecture agree. Trace each main functional requirement to an operation and flow, and each NFR to a design choice or explicit unresolved gap.
2. Check that the entity, data-flow, architecture, and CI/CD diagrams match their prose, including database placement, ownership, and trust boundaries.
3. Confirm the saved file is complete, its internal anchors resolve, and it has no external runtime dependencies. Verify any included interactions and inspect the page in a browser when available for clipped labels, overlapping connectors, narrow-screen readability, and printing. Report checks that could not be performed.

Return a clickable absolute link to the HTML file, a brief coverage summary, and the most consequential assumptions or open questions.
