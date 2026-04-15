# PRD — MVP Validator

## Problem
Going Merry has 60+ business ideas in a spreadsheet 
with no systematic way to evaluate which to build first. 
Founders spend time debating ideas without data. 
Developers get pulled onto projects that haven't been 
validated.

## Solution
A dashboard that connects to a Google Sheet, runs each 
idea through an AI agent pipeline, and returns structured 
validation data — market size, competitors, viability 
scores, and MVP scope — so the team can prioritise and 
act fast.

## Users
- Founders (primary) — want to know what to build next
- Product team — want scope and PRD to start building

## Core features

### 1. Idea list view
- Fetches all rows from connected Google Sheet
- Shows idea name, status badge, priority score
- Sortable by priority score (default) 
- Filter by status
- "Check for new ideas" button to sync

### 2. Validate button (per idea + bulk)
- Triggers CrewAI pipeline for selected ideas
- Status changes to "validating" with progress indicator
- On completion, status → "complete"

### 3. Idea detail view
- Market section: TAM/SAM/SOM with confidence badges
- Market trend with rationale
- Competitor table (name, link, description)
- Competitive gap
- Viability: effort score, potential score, priority score
- Top assumption to validate
- Recommended validation method
- MVP scope: features, build time, stack

### 4. PRD generator
- Button on completed idea detail view
- Calls PRD agent with full schema as context
- Output is a formatted prompt ready to paste into 
  Claude Code
- Copy to clipboard button

### 5. Priority matrix (nice to have)
- 2x2 visual plotting all completed ideas
- X axis: effort, Y axis: potential
- Only build this if core flow is solid first

## Out of scope
- User auth (single team tool, no login needed for MVP)
- Editing ideas from the dashboard (edit in Sheets)
- Historical runs / versioning

## Google Sheet format expected
| id | name | description | status |
|---|---|---|---|
- id: unique row identifier
- name: idea name
- description: optional, AI will infer if empty
- status: leave blank for new ideas

## Success metrics (for writeup)
- Time to validate one idea < 60 seconds
- Priority score produces defensible ordering
- PRD output is pasteable directly into Claude Code