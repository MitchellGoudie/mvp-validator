# MVP Validator — Context

## What this is
A tool for Going Merry to validate business ideas from a 
Google Sheet. Ideas are run through a CrewAI multi-agent 
pipeline that researches the market, scores viability, 
defines MVP scope, and generates a PRD on demand.

## Stack
- Frontend: React (Vite)
- Backend: Python, FastAPI
- Agents: CrewAI
- AI: Gemini API
- Data source: Google Sheets API
- Frontend hosting: Vercel
- Backend hosting: Railway

## Agent pipeline
1. Research agent — market size (TAM/SAM/SOM), trends, 
   competitors. Has web search tool.
2. Evaluation agent — scores effort (1-10) and potential 
   (1-10), identifies top assumption and validation method.
3. Scope agent — defines MVP features, build time, 
   recommended stack.
4. PRD agent — triggered on demand, outputs a 
   Claude Code-ready prompt using full schema as context.

## Priority score formula
priority = (potential * 0.6) + ((10 - effort) * 0.4)
Higher = should be tested sooner.

## Schema
See PRD.md for full field definitions.

## Status pipeline
unvalidated → validating → complete → archived

## Key decisions
- PRD generated on demand only, not during validation run
- Auto-sync is a manual "check for new rows" button
- Confidence levels (high/medium/low) shown on all 
  market figures
- Demo uses a pre-populated Google Sheet — 
  credentials provided via .env

## What to avoid
- No hardcoded API keys anywhere
- No over-engineered UI before data is flowing
- Keep the backend stateless — Sheets is the database