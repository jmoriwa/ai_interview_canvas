# DesignInterview Product Requirements and Technical Specification

Document status: Initial build specification
Product type: Collaborative web application
Primary use case: Conducting live system-design interviews
Working name: DesignInterview

1. Product Summary

DesignInterview is a browser-based collaborative platform for conducting system-design interviews.

An interviewer creates an interview session and receives a shareable link. Candidates and other interviewers can join the session through that link without installing software.

All participants collaborate on a shared infinite canvas in real time. Users can:

Drag system-design components onto the canvas.

Connect components using arrows.

Add labels and text.

Draw free-form diagrams.

See other participants’ cursors and edits live.

Discuss and modify the same architecture simultaneously.

The platform must be optimized specifically for system-design interviews rather than being a generic whiteboard.

2. Product Goals

The platform must:

Allow an interviewer to create a session in under 30 seconds.

Allow a candidate to join through a link with minimal friction.

Support multiple simultaneous participants.

Synchronize canvas changes in real time.

Provide reusable system-design components.

Support free-form drawing alongside structured components.

Save the interview automatically.

Allow interviewers to review, evaluate, and export completed interviews.

Remain usable during temporary network interruptions.

Make interviewer-only content invisible to candidates.

3. Initial Non-Goals

The first version does not need:

Video conferencing.

Audio calling.

Screen sharing.

Automatic AI evaluation.

Coding interview functionality.

Mobile editing.

Public community diagrams.

Complex organization billing.

A marketplace for diagram components.

The application should work on tablets where practical, but desktop browsers are the primary target.

4. User Roles

4.1 Interviewer

An interviewer can:

Create an interview session.

Define the interview question.

Configure session permissions.

Share the candidate link.

Join the collaborative canvas.

Edit the canvas.

View participants.

Start, pause, or reset the interview timer.

Lock or unlock the canvas.

Remove participants.

Write private interviewer notes.

Complete an evaluation scorecard.

End the interview.

Review previous interview sessions.

Export the final diagram.

4.2 Candidate

A candidate can:

Join through a session link.

Enter a display name.

Read the interview prompt.

Edit the shared canvas when permitted.

Add, move, resize, connect, and delete objects.

Draw free-form content.

See other participants’ cursors.

View the interview timer.

Rejoin after an accidental disconnection.

A candidate cannot:

View interviewer notes.

View the interviewer scorecard.

Change session permissions.

Remove participants.

access other interview sessions.

4.3 Observer

An observer can:

Join the session.

View the canvas and participant activity.

See the interview prompt.

Optionally edit the canvas when the interviewer grants permission.

Observers cannot access private interviewer notes unless explicitly added as interviewers.

4.4 Administrator

An administrator can:

Manage organization users.

View organization-level session metadata.

Configure retention settings.

Disable accounts or sessions.

View audit events.

Organization administration is a later-phase feature and should not block the MVP.

5. Core User Journeys

5.1 Create an Interview

The interviewer signs in.

The interviewer selects New Interview.

The interviewer enters:

Interview title.

System-design question or prompt.

Optional candidate name.

Optional interview duration.

Session expiration time.

The platform creates the session.

The platform generates:

An interviewer URL.

A candidate invitation URL.

The interviewer copies and sends the candidate URL.

The interviewer enters the session lobby or canvas.

5.2 Join as a Candidate

The candidate opens the invitation URL.

The platform validates the session token.

The candidate enters a display name.

The candidate accepts any displayed session notice.

The candidate enters the interview room.

The interviewer sees that the candidate has joined.

The candidate sees the interview prompt and shared canvas.

An account must not be required for candidates in the MVP.

5.3 Conduct the Interview

The interviewer starts the timer.

The candidate drags components onto the canvas.

The candidate connects components with arrows.

The candidate adds labels and free-form drawings.

All participants receive changes in real time.

The platform continuously saves the canvas.

The interviewer writes private notes during the interview.

The interviewer may temporarily lock the canvas or change permissions.

The interviewer ends the session.

5.4 Review the Interview

The interviewer opens the session from interview history.

The final canvas is displayed.

The interviewer can view:

Session participants.

Start and end times.

Final diagram.

Private notes.

Evaluation scorecard.

The interviewer can export the diagram.

The interviewer can finalize or revise the evaluation.

6. Application Pages

6.1 Sign-In Page

Support:

Email and password.

Magic-link authentication as an optional enhancement.

Enterprise single sign-on as a future feature.

6.2 Interviewer Dashboard

Display:

New Interview button.

Upcoming or active sessions.

Completed sessions.

Draft sessions.

Candidate name.

Interview title.

Created date.

Session status.

Evaluation status.

Filters:

Active.

Completed.

Draft.

Candidate name.

Date range.

6.3 Create Interview Page

Fields:

Interview title.

Interview prompt.

Optional expected duration.

Candidate name or reference.

Candidate editing permission.

Observer permission.

Session expiration.

Optional starter diagram or template.

6.4 Session Lobby

Display:

Interview title.

Candidate link.

Copy-link action.

Participants currently connected.

Start Interview action.

Permission controls.

Connection status.

6.5 Interview Workspace

The workspace should contain:

Main collaborative canvas.

Component library.

Drawing toolbar.

Interview prompt panel.

Participant list.

Timer.

Private interviewer notes panel.

Session controls.

Zoom and navigation controls.

The canvas must receive most of the screen space.

6.6 Interview Review Page

Display:

Final canvas.

Session metadata.

Participant list.

Interviewer notes.

Evaluation scorecard.

Export controls.

Optional session playback in a later phase.

7. Collaborative Canvas Requirements

7.1 Canvas Behavior

The canvas must support:

Infinite or practically unlimited workspace.

Panning.

Zooming.

Zoom-to-fit.

Reset view.

Optional grid.

Optional snap-to-grid.

Multi-object selection.

Drag selection.

Copy and paste.

Duplicate.

Delete.

Undo and redo.

Keyboard shortcuts.

Object alignment.

Object grouping.

Bring forward and send backward.

Automatic saving.

Canvas background customization.

The application should use one unified canvas state model for structured components, connectors, text, and free-form drawings.

Avoid using two independent canvas systems unless they share the same document state and collaboration model.

7.2 Structured Components

Each component must support:

Dragging.

Resizing.

Selection.

Deletion.

Duplication.

Editable label.

Optional description.

Optional color.

Connection points.

Incoming and outgoing connectors.

Locking.

Grouping.

Copy and paste.

Rotation is optional for the MVP and should be disabled for components where it reduces readability.

7.3 Initial Component Library

The first release must include the following component types:

General

Generic service.

Microservice.

Client application.

Mobile application.

Web application.

External system.

Third-party API.

User.

Group or boundary.

Text note.

Networking and Delivery

DNS.

CDN.

Load balancer.

API gateway.

Reverse proxy.

Firewall.

Service mesh.

Compute

Application server.

Worker.

Background job.

Serverless function.

Container.

Kubernetes cluster.

Virtual machine.

Batch processor.

Data Storage

Relational database.

NoSQL database.

Key-value store.

Document database.

Graph database.

Time-series database.

Object storage.

File storage.

Data warehouse.

Data lake.

Search index.

Messaging and Streaming

Message queue.

Event bus.

Stream.

Topic.

Publisher.

Consumer.

Dead-letter queue.

Caching

Cache.

Distributed cache.

Browser cache.

AI and Machine Learning

Large language model.

Embedding model.

Vector database.

Model gateway.

Prompt service.

Retrieval service.

AI agent.

Model training pipeline.

Model inference service.

Observability and Security

Logging service.

Metrics service.

Tracing service.

Authentication service.

Authorization service.

Secrets manager.

Monitoring or alerting system.

7.4 Component Search

The component library must provide:

Text search.

Category filtering.

Recently used components.

Favorite components as a future feature.

Typing “queue,” for example, should return message queue, dead-letter queue, event bus, and stream-related components.

7.5 Custom Components

Users must be able to create a generic custom component by specifying:

Name.

Optional icon.

Shape.

Color.

Description.

Saving custom components across sessions is a later-phase feature.

7.6 Connectors

Users must be able to connect components using:

Directed arrows.

Undirected lines.

Bidirectional arrows.

Dashed lines.

Dotted lines.

Each connector should support:

Editable label.

Line style.

Arrow direction.

Optional color.

Optional description.

Reconnection to another component.

Automatic routing.

Manual bend points.

Example connector labels include:

HTTPS.

gRPC.

SQL.

Events.

Async.

Read.

Write.

Replication.

7.7 Text and Notes

Users must be able to add:

Free-standing text.

Sticky notes.

Component labels.

Connector labels.

Section headings.

Basic formatting should include:

Font size.

Bold.

Text alignment.

Background color for notes.

7.8 Free-Form Drawing

The canvas must support:

Pen tool.

Highlighter.

Eraser.

Multiple stroke widths.

Basic color selection.

Free-form paths.

Straight-line drawing.

Rectangle.

Ellipse.

Diamond.

Simple arrow drawing.

Free-form drawing must synchronize through the same real-time system as other canvas objects.

8. Real-Time Collaboration

8.1 Required Collaboration Features

All connected participants must see:

New objects.

Object movement.

Object resizing.

Text edits.

Connector changes.

Free-form strokes.

Object deletion.

Participant cursors.

Participant selections.

Join and leave events.

Permission changes.

8.2 Presence

Each participant should have:

Participant ID.

Display name.

Role.

Assigned presence color.

Cursor position.

Selected object IDs.

Connection status.

Last-seen timestamp.

Presence information is temporary and does not need permanent storage.

8.3 Conflict Handling

The collaboration system must prevent one user’s update from incorrectly overwriting another user’s independent update.

Use a conflict-resistant collaborative document model, preferably:

A conflict-free replicated data type, or

An operational transformation model with reliable server ordering.

The canvas document must have a single canonical state even when:

Two users move different objects simultaneously.

Two users edit different labels simultaneously.

A user temporarily loses network access.

A user reconnects with locally buffered changes.

For simultaneous editing of the exact same text field, the system may either merge text operations or temporarily assign editing ownership to the first editor.

8.4 Reconnection

When a participant reconnects:

The client reconnects to the session.

The client sends its last-known document version.

The server sends missing updates or a current snapshot.

Unsynchronized local changes are reconciled.

The user returns to the previous canvas location when possible.

8.5 Performance Targets

Initial targets:

Cursor updates visible within 100 milliseconds under normal conditions.

Canvas operations visible to other users within 200 milliseconds.

Automatic save confirmation within 2 seconds.

Support at least 20 simultaneous participants in one session.

Support at least 500 canvas objects without significant UI degradation.

Support free-form drawings containing thousands of path points.

Cursor updates may be throttled because they are ephemeral. Document mutations must not be silently dropped.

9. Interview-Specific Features

9.1 Interview Prompt

The interviewer can define a prompt containing:

Title.

Main question.

Requirements.

Constraints.

Optional follow-up questions.

Optional attachments or links in a later phase.

Candidates can read the prompt but cannot edit it.

The interviewer may reveal follow-up questions one at a time.

9.2 Timer

The timer must support:

Configurable duration.

Start.

Pause.

Resume.

Reset.

Add time.

Visible remaining time.

Count-up mode when no duration is configured.

Only interviewers can control the timer.

Timer state must be synchronized using server time rather than relying exclusively on each browser’s local clock.

9.3 Private Interviewer Notes

Interviewers must have a private notes area.

Requirements:

Never transmitted to candidate clients.

Automatically saved.

Rich text is optional.

Visible during and after the session.

Shared only with authorized interviewers where applicable.

Private notes must be stored separately from shared canvas data.

9.4 Scorecard

The initial scorecard should include ratings for:

Requirements clarification.

High-level architecture.

Data modeling.

API design.

Scalability.

Reliability.

Performance.

Security.

Trade-off analysis.

Communication.

Overall recommendation.

Each category should support:

Numeric rating.

Optional written comment.

Overall recommendations:

Strong hire.

Hire.

Mixed.

No hire.

Strong no hire.

Not evaluated.

Scorecard data must never be visible to candidates.

9.5 Canvas Permissions

The interviewer can set the canvas to:

Everyone can edit.

Candidate and interviewers can edit.

Interviewers only.

Read-only for everyone except the session owner.

The interviewer can also lock individual objects.

9.6 Session States

A session can have the following states:

Draft.

Waiting.

Active.

Paused.

Completed.

Expired.

Cancelled.

Only an interviewer can move a session into Active, Paused, Completed, or Cancelled.

10. Templates

The application should support starter templates.

Initial templates:

Blank canvas.

URL shortener.

Chat application.

Notification system.

File storage system.

Video streaming platform.

E-commerce platform.

Ride-sharing platform.

Search system.

AI retrieval-augmented generation system.

A template contains:

Prompt.

Optional starter components.

Suggested evaluation dimensions.

Default interview duration.

Templates are interviewer aids. Candidates should not see hidden expected solutions.

11. Persistence and Versioning

11.1 Automatic Saving

The shared document must be saved automatically:

After meaningful canvas updates.

At regular intervals.

When the session ends.

When the last participant disconnects.

11.2 Snapshots

Create a complete document snapshot:

When the session starts.

At regular intervals during active sessions.

When the session ends.

Before major document restoration operations.

11.3 Update Log

Store incremental document updates so that the platform can later support:

Recovery.

Audit investigation.

Session playback.

Version history.

Update logs may be compacted after a full snapshot is created.

11.4 Restore

An interviewer should eventually be able to restore an earlier version.

For the MVP, automatic recovery from the latest valid snapshot is sufficient.

12. Export Requirements

The final canvas should be exportable as:

PNG.

PDF.

SVG where technically practical.

JSON document format for re-import.

The export should support:

Entire canvas.

Current selection.

Current viewport.

PDF export should include optional session metadata such as:

Interview title.

Candidate name.

Date.

Interview duration.

Private notes and scorecard content must not appear in a candidate-facing canvas export unless the interviewer explicitly selects an internal report export.

13. Recommended System Architecture

13.1 High-Level Architecture

Browser Client
    |
    | HTTPS
    v
Web Application / API
    |
    +--------------------+
    |                    |
    v                    v
Authentication      Session API
                         |
                         v
                  Relational Database

Browser Client
    |
    | Secure WebSocket
    v
Real-Time Collaboration Gateway
    |
    +--------------------+
    |                    |
    v                    v
Collaboration Engine   Presence Service
    |
    v
Distributed Pub/Sub
    |
    v
Snapshot and Update Persistence

Exports and background work
    |
    v
Job Queue -> Worker -> Object Storage


13.2 Suggested Technology Categories

The implementation should use:

Frontend

React-based web framework.

TypeScript.

Canvas engine supporting custom shapes, connectors, text, and freehand drawing.

Client-side collaborative document library.

Accessible component system.

Responsive layout for desktop and tablet.

Backend

TypeScript or another strongly typed server environment.

REST or typed RPC for standard application operations.

WebSockets for real-time collaboration.

Relational database for users, sessions, permissions, and evaluations.

Distributed in-memory store for presence, pub/sub, and horizontal scaling.

Object storage for exports and future attachments.

Background job system for exports and maintenance tasks.

13.3 Important Canvas Implementation Decision

Use a single canvas framework whenever possible.

The chosen framework must support:

Custom system-design shapes.

Free-form drawing.

Connectors and arrow bindings.

Large canvases.

Serialization.

Undo and redo.

Multiplayer synchronization.

Custom selection behavior.

Export.

Do not build structured components in one canvas library and freehand drawing in an unrelated overlay unless both systems share coordinates, selection, zoom, persistence, and collaboration behavior.

14. Data Model

14.1 User

User
- id
- email
- display_name
- password_hash or authentication_provider_id
- status
- created_at
- updated_at
- last_login_at


14.2 Organization

Organization
- id
- name
- slug
- settings
- created_at
- updated_at


14.3 OrganizationMember

OrganizationMember
- organization_id
- user_id
- role
- created_at


14.4 InterviewSession

InterviewSession
- id
- organization_id
- owner_user_id
- title
- prompt
- candidate_reference
- status
- duration_seconds
- timer_started_at
- timer_paused_at
- timer_accumulated_seconds
- candidate_editing_enabled
- observer_editing_enabled
- started_at
- completed_at
- expires_at
- created_at
- updated_at


14.5 SessionInvitation

SessionInvitation
- id
- session_id
- token_hash
- invitation_role
- expires_at
- revoked_at
- maximum_uses
- use_count
- created_at


Store a hash of the invitation token rather than the raw token.

14.6 SessionParticipant

SessionParticipant
- id
- session_id
- user_id nullable
- guest_id nullable
- display_name
- role
- joined_at
- left_at
- last_seen_at


14.7 CanvasDocument

CanvasDocument
- id
- session_id
- current_version
- latest_snapshot_id
- created_at
- updated_at


14.8 CanvasSnapshot

CanvasSnapshot
- id
- document_id
- version
- serialized_state
- storage_location nullable
- created_at


14.9 CanvasUpdate

CanvasUpdate
- id
- document_id
- sequence_number
- participant_id
- update_payload
- created_at


14.10 InterviewerNote

InterviewerNote
- id
- session_id
- author_user_id
- content
- created_at
- updated_at


14.11 Evaluation

Evaluation
- id
- session_id
- evaluator_user_id
- ratings
- comments
- overall_recommendation
- submitted_at
- created_at
- updated_at


14.12 AuditEvent

AuditEvent
- id
- organization_id
- session_id nullable
- actor_id nullable
- event_type
- metadata
- created_at


15. API Requirements

The exact URL structure may change, but the backend must expose equivalent operations.

15.1 Authentication

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me


15.2 Sessions

POST   /api/sessions
GET    /api/sessions
GET    /api/sessions/{sessionId}
PATCH  /api/sessions/{sessionId}
DELETE /api/sessions/{sessionId}
POST   /api/sessions/{sessionId}/start
POST   /api/sessions/{sessionId}/pause
POST   /api/sessions/{sessionId}/complete
POST   /api/sessions/{sessionId}/cancel


15.3 Invitations

POST   /api/sessions/{sessionId}/invitations
GET    /api/sessions/{sessionId}/invitations
DELETE /api/sessions/{sessionId}/invitations/{invitationId}
POST   /api/invitations/{token}/join


15.4 Participants

GET    /api/sessions/{sessionId}/participants
PATCH  /api/sessions/{sessionId}/participants/{participantId}
DELETE /api/sessions/{sessionId}/participants/{participantId}


15.5 Canvas

GET  /api/sessions/{sessionId}/canvas
POST /api/sessions/{sessionId}/canvas/snapshot
GET  /api/sessions/{sessionId}/canvas/export


Normal live canvas mutations should travel through the collaboration protocol rather than individual REST requests.

15.6 Notes and Evaluations

GET   /api/sessions/{sessionId}/notes
POST  /api/sessions/{sessionId}/notes
PATCH /api/sessions/{sessionId}/notes/{noteId}

GET   /api/sessions/{sessionId}/evaluations
POST  /api/sessions/{sessionId}/evaluations
PATCH /api/sessions/{sessionId}/evaluations/{evaluationId}


16. Real-Time Protocol

16.1 Connection

The client connects to a secure WebSocket endpoint using:

Authenticated user token, or

Temporary session participant token.

The server validates:

Session existence.

Invitation status.

Session expiration.

Participant role.

Current permissions.

16.2 Client-to-Server Messages

session.join
session.leave
document.update
document.sync_request
presence.cursor
presence.selection
presence.status
timer.command
permission.update
participant.remove
session.complete


16.3 Server-to-Client Messages

session.joined
session.state
session.completed
document.snapshot
document.update
document.sync_response
presence.joined
presence.updated
presence.left
timer.updated
permission.updated
participant.removed
error


16.4 Message Envelope

Every real-time message should include:

{
  "type": "document.update",
  "sessionId": "session-id",
  "participantId": "participant-id",
  "messageId": "unique-message-id",
  "timestamp": "server-or-client-timestamp",
  "payload": {}
}


Document updates must be idempotent or deduplicated using the message ID or collaborative document update identifier.

17. Authorization Rules

The backend must enforce authorization. Hiding controls in the user interface is not sufficient.

Interviewer

Can:

Read and write the shared canvas.

Manage participants.

Control the timer.

Change permissions.

Read and write private notes.

Read and write evaluations.

End the session.

Export internal reports.

Candidate

Can:

Read the shared canvas.

Edit only when candidate editing is enabled.

Read the candidate-visible prompt.

Read timer state.

Update personal presence information.

Cannot:

Read private notes.

Read evaluations.

Manage participants.

Control the timer.

Change permissions.

Observer

Can:

Read shared session content.

Edit only when explicitly permitted.

Update personal presence information.

18. Security and Privacy

Required controls:

HTTPS and secure WebSockets.

Password hashing using an appropriate modern password algorithm.

Short-lived access tokens.

Rotating or revocable refresh tokens.

Cryptographically secure invitation tokens.

Hashed invitation tokens in the database.

Invitation expiration.

Session access checks on every API and WebSocket operation.

Rate limiting.

Input validation.

Output encoding.

Protection against cross-site scripting.

Protection against cross-site request forgery where applicable.

Content Security Policy.

Audit logging for sensitive actions.

Encryption at rest for sensitive data where supported.

No private interviewer data sent to candidate clients.

Safe handling of exported files.

Session token revocation.

Do not include a session’s database identifier as the only security mechanism. Possession of a predictable session ID must not grant access.

18.1 Data Retention

The system should support configurable retention.

Initial default:

Completed interview metadata: retained until deleted.

Canvas documents: retained until deleted.

Incremental collaboration logs: compacted after snapshotting.

Presence data: not retained beyond operational needs.

Expired guest tokens: automatically deleted or invalidated.

19. Reliability

The system must:

Save document updates durably.

Recover from real-time server restarts.

Allow clients to reconnect.

Avoid losing acknowledged edits.

Periodically create document snapshots.

Validate snapshot integrity.

Retry temporary background-job failures.

Prevent duplicate invitation usage where limits apply.

Use server-authoritative timer state.

Gracefully degrade when presence information is unavailable.

Presence and cursor updates may be temporarily lost without damaging the canvas. Canvas document updates may not.

20. Observability

Collect:

API request count and latency.

WebSocket connection count.

Active sessions.

Participants per session.

Document update rate.

Collaboration latency.

Failed update count.

Reconnection count.

Snapshot duration.

Export duration.

Database errors.

Background job failures.

Client-side exceptions.

Logs should include correlation identifiers but must not expose raw invitation tokens, passwords, or confidential interview content unnecessarily.

21. Accessibility

The application should target WCAG 2.1 AA where practical.

Requirements include:

Keyboard-accessible controls.

Visible focus states.

Screen-reader labels.

Sufficient contrast.

Non-color indicators for participant and object states.

Keyboard deletion and movement of selected objects.

Accessible dialogs and menus.

Reduced-motion support.

The visual canvas itself may have accessibility limitations, but surrounding controls and object property panels must be accessible.

22. Browser Support

Support the latest stable versions of:

Chrome.

Microsoft Edge.

Firefox.

Safari.

The application should display a clear warning when critical browser capabilities such as WebSockets or required canvas functionality are unavailable.

23. Testing Requirements

23.1 Unit Tests

Cover:

Permission logic.

Session state transitions.

Invitation validation.

Timer calculations.

Canvas serialization.

Evaluation validation.

Export options.

23.2 Integration Tests

Cover:

Session creation.

Candidate joining.

Expired invitation rejection.

Multiple participants connecting.

Canvas update persistence.

Reconnection and synchronization.

Participant removal.

Private note isolation.

Session completion.

23.3 End-to-End Tests

Automate scenarios where:

An interviewer creates a session.

A candidate joins in a second browser context.

The candidate adds and connects components.

The interviewer sees updates.

The interviewer edits the same canvas.

Both clients reconnect.

The final canvas remains consistent.

The interviewer completes the session.

The candidate cannot access private review information.

23.4 Load Tests

Test:

At least 20 participants in one session.

Hundreds of concurrent active sessions.

Bursts of canvas updates.

Large documents.

Frequent cursor updates.

Real-time server restart and reconnect behavior.

24. MVP Scope

The first deployable version must contain:

Interviewer authentication.

Interviewer dashboard.

Interview session creation.

Shareable candidate link.

Guest candidate joining.

Collaborative canvas.

System-design component library.

Connectors and labels.

Free-form drawing.

Participant cursors and presence.

Automatic saving.

Session timer.

Interview prompt panel.

Private interviewer notes.

Session completion.

Final diagram review.

PNG or PDF export.

Basic evaluation scorecard.

Reconnection and state recovery.

Basic security and rate limiting.

25. Later Phases

Phase 2

Session playback.

Version history.

Reusable interview templates.

Multiple interviewer scorecards.

Organization workspaces.

Custom component libraries.

SVG and JSON import/export.

Interview scheduling integration.

Candidate waiting room.

Follow-up-question reveal controls.

Phase 3

AI-generated interview prompts.

AI-generated system-design follow-up questions.

Automated transcript integration.

Diagram analysis.

AI-assisted scoring recommendations.

Hiring-platform integrations.

Single sign-on.

Advanced audit and compliance controls.

Regional data hosting.

Any AI-generated evaluation must remain advisory and must not automatically make hiring decisions.

26. MVP Acceptance Criteria

The MVP is accepted when all the following are true:

An authenticated interviewer can create a session.

The interviewer receives a unique candidate URL.

A guest candidate can join with a display name.

At least three participants can join the same session simultaneously.

Every participant sees the same canvas state.

Users can drag predefined components onto the canvas.

Users can move, resize, label, duplicate, and delete components.

Users can connect components using labeled arrows.

Users can draw free-form lines and shapes.

Remote edits normally appear within 200 milliseconds.

Participants can see each other’s cursors.

A disconnected participant can reconnect without losing the shared document.

The interviewer can start, pause, and reset the timer.

The interviewer can disable candidate editing.

The interviewer can write notes that are never visible to the candidate.

Canvas changes are automatically persisted.

The interviewer can complete the session.

The interviewer can reopen the completed session.

The interviewer can export the final diagram.

The interviewer can complete an evaluation scorecard.

An expired or revoked invitation cannot be used.

A candidate cannot access another session by changing URL identifiers.

A candidate cannot access interviewer notes or evaluations through either the interface or API.

27. Suggested Implementation Order

Milestone 1: Application Foundation

Authentication.

Database.

Interviewer dashboard.

Session creation.

Invitation links.

Candidate join flow.

Milestone 2: Local Canvas

Canvas navigation.

Component library.

Components.

Connectors.

Text.

Free-form drawing.

Undo and redo.

Serialization.

Milestone 3: Collaboration

WebSocket connection.

Shared document model.

Real-time object changes.

Presence.

Cursor synchronization.

Reconnection.

Distributed pub/sub.

Snapshot persistence.

Milestone 4: Interview Controls

Prompt panel.

Timer.

Permissions.

Participant management.

Private notes.

Session state transitions.

Milestone 5: Review

Completed-session page.

Evaluation scorecard.

Canvas export.

Interview history.

Milestone 6: Hardening

Security review.

Accessibility review.

Browser testing.

Load testing.

Monitoring.

Failure recovery.

Deployment documentation.

28. Instructions for the Implementation Agent

The implementation agent should follow these rules:

Treat this specification as the source of truth.

Build the MVP before implementing later-phase features.

Keep shared canvas data separate from private interviewer data.

Enforce permissions on the server.

Use a collaboration-safe document model.

Do not represent every cursor movement as a permanent database record.

Do not acknowledge a document update until it has entered a reliable persistence path.

Use one coherent coordinate and serialization system for components, arrows, text, and drawing.

Keep domain logic independent from the selected canvas library where possible.

Create database migrations rather than manually creating tables.

Validate all API input.

Add automated tests for permissions and collaboration.

Provide local development using containerized dependencies.

Provide environment-variable documentation.

Provide seed data for a demonstration interviewer account and sample interview.

Include a README describing setup, architecture, testing, and deployment.

Record unresolved decisions in an architecture-decision log.

Do not implement AI scoring in the MVP.

Prefer maintainable, typed code over rapid unstructured prototypes.

Deliver each milestone in a working, testable state.

29. Definition of Done

The project is complete for its first release when:

All MVP acceptance criteria pass.

Automated tests pass.

Database migrations run successfully from an empty database.

Two or more browser sessions can collaborate reliably.

Refreshing or reconnecting does not destroy the document.

Candidate authorization has been penetration-tested at a basic level.

Private interviewer information is isolated.

The application is deployed to a production-like environment.

Monitoring and error reporting are enabled.

Setup and deployment instructions are documented.

A demonstration interview can be completed from creation through evaluation and export.
