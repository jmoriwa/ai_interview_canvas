# DesignInterview

DesignInterview is a collaborative workspace built specifically for conducting system-design interviews.

It gives candidates a structured canvas for explaining architecture decisions while giving interviewers the tools they need to manage the session, document observations, and evaluate the final design—all in one place.

> This project is under active development. The current repository contains the application frontend, backend API, automated tests, and deployment configuration for the initial MVP.

## Why I Built This

System-design interviews are often conducted using generic whiteboards that were not designed for technical evaluation. Interviewers must switch between diagramming tools, timers, notes, candidate prompts, and evaluation forms, while candidates spend valuable time searching for appropriate shapes or working around an unfamiliar interface.

DesignInterview explores what a purpose-built alternative could look like.

The application is intended to make system-design interviews more focused by combining:

- Architecture-oriented diagramming components
- Interview prompts and session controls
- Candidate invitation links
- Timers and participant management
- Private interviewer notes
- Structured evaluation scorecards
- Persistent interview records

The goal is to reduce administrative friction without limiting the candidate’s ability to communicate ideas freely.

## Who It Is For

### Interviewers

Interviewers can create sessions, share invitation links, present design prompts, control the interview timer, manage permissions, take private notes, and complete an evaluation after the session.

### Candidates

Candidates can join through a shared link and use a system-design-focused canvas to create components, connect services, annotate decisions, and communicate architectural trade-offs.

### Hiring Teams

Hiring teams can use a more consistent interview format and retain a reviewable record of the candidate’s final design and interviewer feedback.

## Core Capabilities

The MVP is designed around the complete system-design interview workflow:

- Interviewer dashboard and session creation
- Shareable candidate invitation links
- Guest candidate join flow
- System-design component library
- Interactive architecture canvas
- Connectors, labels, text, and free-form drawing
- Interview prompt panel
- Synchronized session timer
- Participant and permission controls
- Private interviewer notes
- Structured evaluation scorecard
- Completed-session review
- Canvas persistence and export
- Reconnection and session recovery

## Technical Overview

DesignInterview is organized as a full-stack application with separate frontend and backend packages.

```text
ai_interview_canvas/
├── frontend/          # React and TanStack application
├── backend/           # FastAPI application and tests
├── docs/spec.md       # Product requirements and technical specification
├── openapi.yaml       # API contract
├── Dockerfile         # Production container build
└── Makefile           # Common development commands
