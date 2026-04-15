from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="MVP Validator API")

from sheets import get_ideas_from_sheet

# Configure CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Idea(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[float] = None
    validation_result: Optional[dict] = None

@app.get("/ideas", response_model=List[Idea])
def get_ideas():
    try:
        return get_ideas_from_sheet()
    except Exception as e:
        print(f"Failed to fetch from Google Sheets: {e}. Falling back to mock data.")
        # Return 3 mock ideas as requested
        return [
            {
                "id": "1",
                "name": "AI Sales Coach",
                "description": "An AI agent that listens to Gong calls and gives feedback.",
                "status": "complete",
                "priority": 8.5
            },
            {
                "id": "2",
                "name": "SaaS Pricing Optimizer",
                "description": "Tool to dynamically adjust SaaS pricing based on usage patterns.",
                "status": "validating",
                "priority": 7.2
            },
            {
                "id": "3",
                "name": "Developer Productivity Tracker",
                "description": "Integrates with GitHub and Jira to show a unified timeline of work.",
                "status": "unvalidated",
                "priority": 0
            }
        ]

import time
from fastapi import HTTPException
from crew import run_validation_crew, run_prd_crew
from sheets import get_idea_by_id, update_sheet_with_result, get_ideas_from_sheet

class BulkValidateRequest(BaseModel):
    idea_ids: List[str]

@app.post("/validate/bulk")
def validate_bulk(req: BulkValidateRequest):
    results = []
    for uid in req.idea_ids:
        res = validate_idea(uid)
        results.append(res)
        if len(req.idea_ids) > 1:
            time.sleep(15) # Wait 15 seconds between bulk hits to bypass Gemini free-tier velocity spikes
    return results

@app.post("/validate/{idea_id}")
def validate_idea(idea_id: str):
    idea = get_idea_by_id(idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found in sheet")
        
    retry_count = 0
    max_retries = 3
    
    while retry_count < max_retries:
        try:
            # Run CrewAI agents
            result = run_validation_crew(idea["id"], idea["name"], idea.get("description", ""))
            
            # Write back to sheet (Status complete + JSON column)
            update_sheet_with_result(idea_id, "complete", result)
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            if "503" in error_msg or "429" in error_msg or "Invalid response" in error_msg or "None or empty" in error_msg:
                retry_count += 1
                if retry_count < max_retries:
                    from agents import research_agent, evaluation_agent, scope_agent
                    import os
                    
                    if retry_count == 1:
                        from crewai import LLM
                        fallback = LLM(model="gemini/gemini-2.5-flash", api_key=os.getenv("GEMINI_API_KEY"))
                        research_agent.llm = fallback
                        evaluation_agent.llm = fallback
                        scope_agent.llm = fallback
                        print(f"Gemini API issue hit. Failing over to fallback tier: gemini-2.5-flash. Retrying in 20 seconds... (Attempt {retry_count}/{max_retries})")
                    elif retry_count == 2:
                        from agents import openai_fallback_llm
                        research_agent.llm = openai_fallback_llm
                        evaluation_agent.llm = openai_fallback_llm
                        scope_agent.llm = openai_fallback_llm
                        print(f"Gemini API issue hit again. Failing over to secondary fallback tier: gpt-4o-mini. Retrying in 20 seconds... (Attempt {retry_count}/{max_retries})")
                        
                    time.sleep(20)
                    continue
                    
            print(f"Validation failed for idea {idea_id}: {e}")
            try:
                update_sheet_with_result(idea_id, "queued", {"error": error_msg})
            except:
                pass # Failsafe if sheet update breaks too
            return {"error": True, "message": error_msg, "idea_id": idea_id}

@app.post("/recalculate/{idea_id}")
def recalculate_idea(idea_id: str):
    idea = get_idea_by_id(idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found in sheet")
        
    validation_data = idea.get("validation_result")
    if not validation_data or idea.get("status") != "complete":
        return {"error": True, "message": "Idea must be validated before recalculating scores"}
        
    try:
        effort = int(validation_data["viability"].get("effort_score", 0))
        potential = int(validation_data["viability"].get("potential_score", 0))
        priority = round((potential * 0.6) + ((10 - effort) * 0.4), 2)
        
        validation_data["viability"]["priority_score"] = priority
        
        # Write back to sheet without running agents
        update_sheet_with_result(idea_id, "complete", validation_data)
        
        return {"priority_score": priority}
    except Exception as e:
        print(f"Recalculation failed for idea {idea_id}: {e}")
        return {"error": True, "message": str(e)}

@app.post("/prd/{idea_id}")
def generate_prd(idea_id: str):
    idea = get_idea_by_id(idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found in sheet")
        
    validation_data = idea.get("validation_result")
    
    if idea.get("status") != "complete" or not validation_data:
        return {"error": True, "message": "Idea must be validated before generating a PRD"}
        
    try:
        prd_text = run_prd_crew(validation_data)
        return {"prd": prd_text}
    except Exception as e:
        print(f"PRD generation failed for idea {idea_id}: {e}")
        return {"error": True, "message": str(e)}

@app.post("/rank")
def split_rank():
    ideas = get_ideas_from_sheet()
    completed = [i for i in ideas if i["status"] == "complete"]
    
    if len(completed) < 2:
        return {"error": True, "message": "Need at least 2 completed ideas to rank"}
        
    summary_chunks = []
    from crew import run_ranking_crew
    for c in completed:
        val = c.get("validation_result", {})
        rank_obj = (
            f"Name: {c['name']}\n"
            f"effort_score: {val.get('viability', {}).get('effort_score')}\n"
            f"potential_score: {val.get('viability', {}).get('potential_score')}\n"
            f"priority_score: {val.get('viability', {}).get('priority_score')}\n"
            f"top_assumption: {val.get('top_assumption')}\n"
            f"competitive_gap: {val.get('competitive_gap')}\n"
            f"market_trend: {val.get('market', {}).get('trends')}\n"
            "---"
        )
        summary_chunks.append(rank_obj)
        
    summary_string = "\n".join(summary_chunks)
    
    retry_count = 0
    max_retries = 3
    
    while retry_count < max_retries:
        try:
            rank_text = run_ranking_crew(summary_string)
            return {"ranking": rank_text}
        except Exception as e:
            error_msg = str(e)
            if "503" in error_msg or "429" in error_msg or "Invalid response" in error_msg or "None or empty" in error_msg:
                retry_count += 1
                if retry_count < max_retries:
                    from agents import ranking_agent
                    from crewai import LLM
                    import os
                    
                    fallback = LLM(model="gemini/gemini-2.5-flash", api_key=os.getenv("GEMINI_API_KEY"))
                    ranking_agent.llm = fallback
                    
                    print(f"Gemini API issue hit during ranking. Failing over to fallback tier: gemini-2.5-flash. Retrying in 20 seconds... (Attempt {retry_count}/{max_retries})")
                    time.sleep(20)
                    continue
            
            print(f"Ranking generation failed: {e}")
            return {"error": True, "message": str(e)}

import os
port = int(os.environ.get("PORT", 8000))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=port)
