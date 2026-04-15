import json
from crewai import Crew, Process
from agents import research_agent, evaluation_agent, scope_agent, prd_agent, ranking_agent
from tasks import create_tasks, create_prd_task, create_ranking_task

def run_validation_crew(idea_id: str, idea_name: str, idea_description: str) -> dict:
    tasks = create_tasks(idea_name, idea_description)
    
    crew = Crew(
        agents=[research_agent, evaluation_agent, scope_agent],
        tasks=tasks,
        process=Process.sequential,
        verbose=True
    )

    # Kick off the crew. The final output is from the scope_agent, 
    # but CrewAI handles combining/returning the final structure if specified.
    # However, to meet the exact schema from PRD which combines all three:
    crew.kickoff()
    
    # We retrieve the individual pydantic outputs from each task
    research_result = tasks[0].output.pydantic
    evaluation_result = tasks[1].output.pydantic
    scope_result = tasks[2].output.pydantic

    # In CrewAI 0.203+, pydantic outputs might simply be dicts depending on behavior
    def serialize(obj):
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        elif hasattr(obj, "dict"):
            return obj.dict()
        return obj

    market_data = serialize(research_result)
    eval_data = serialize(evaluation_result)
    scope_data = serialize(scope_result)

    final_output = {
        "idea_id": idea_id,
        "market": market_data.get("market", {}),
        "competitors": market_data.get("competitors", []),
        "competitive_gap": market_data.get("competitive_gap", ""),
        "viability": eval_data.get("viability", {}),
        "top_assumption": eval_data.get("top_assumption", ""),
        "validation_method": eval_data.get("validation_method", ""),
        "mvp_scope": scope_data
    }

    # Recalculate priority_score explicitly to ensure mathematical accuracy override
    if "viability" in final_output:
        effort = int(final_output["viability"].get("effort_score", 0))
        potential = int(final_output["viability"].get("potential_score", 0))
        priority = round((potential * 0.6) + ((10 - effort) * 0.4), 2)
        print(f"effort={effort}, potential={potential}, priority={priority}")
        final_output["viability"]["priority_score"] = priority

    return final_output

def run_prd_crew(validation_data):
    task = create_prd_task(
        validation_data=json.dumps(validation_data, indent=2), 
        agent=prd_agent
    )
    crew = Crew(
        agents=[prd_agent],
        tasks=[task],
        process=Process.sequential,
        verbose=True
    )
    result = crew.kickoff()
    return str(result)

def run_ranking_crew(ideas_summary):
    task = create_ranking_task(
        ideas_summary=ideas_summary,
        agent=ranking_agent
    )
    crew = Crew(
        agents=[ranking_agent],
        tasks=[task],
        process=Process.sequential,
        verbose=True
    )
    result = crew.kickoff()
    return str(result)
