from crewai import Task
from agents import research_agent, evaluation_agent, scope_agent, ranking_agent
from schemas import MarketResearchOutput, EvaluationOutput, MVPScopeOutput

def create_tasks(idea_name: str, idea_description: str):
    description_text = idea_description if idea_description else "No detailed description provided."

    research_task = Task(
        description=f"Research the market for this idea: {idea_name} — {description_text}",
        expected_output="Structured market research matching the MarketResearchOutput schema.",
        agent=research_agent,
        output_pydantic=MarketResearchOutput
    )

    evaluation_task = Task(
        description=f"Using the research findings, evaluate the viability of {idea_name}.",
        expected_output="Structured evaluation matching the EvaluationOutput schema.",
        agent=evaluation_agent,
        context=[research_task],
        output_pydantic=EvaluationOutput
    )

    scope_task = Task(
        description=f"Define the MVP scope for {idea_name} based on the research and evaluation.",
        expected_output="Structured MVP scope matching the MVPScopeOutput schema.",
        agent=scope_agent,
        context=[research_task, evaluation_task],
        output_pydantic=MVPScopeOutput
    )

    return [research_task, evaluation_task, scope_task]

def create_prd_task(validation_data, agent):
    return Task(
        description=f"""Using this completed validation 
        result, write a Claude Code-ready PRD prompt:
        
        {validation_data}
        
        The PRD must include these sections in order:
        
        1. WHAT YOU ARE BUILDING
        One paragraph. Product name, what it does, 
        who it is for.
        
        2. STACK
        Exact technologies. No alternatives, no 
        maybes. Just the stack.
        
        3. CORE FEATURES
        Numbered list. Each feature is one sentence. 
        Maximum 5 features. These are the only things 
        to build.
        
        4. OUT OF SCOPE
        Numbered list of things NOT to build in this 
        MVP. Be explicit.
        
        5. DATA MODEL
        Key entities and their fields. Keep it lean.
        
        6. SUCCESS CRITERIA
        How to know the MVP is done. Maximum 3 
        criteria. Each is measurable.
        
        7. AGENTS.md CONTENT
        Write the exact content for an AGENTS.md file 
        for this specific project — context, stack, 
        key decisions, what to avoid. Format it as a 
        markdown code block so it can be copied 
        directly.
        
        Output the entire PRD as plain text formatted 
        for direct pasting into Claude Code. No 
        intros, no sign-offs, start immediately with 
        section 1. WHAT YOU ARE BUILDING""",
        expected_output="""A complete Claude Code-ready 
        PRD prompt covering all 7 sections. Plain text, 
        no preamble, ready to paste.""",
        agent=agent
    )

def create_ranking_task(ideas_summary, agent):
    return Task(
        description=f"""You have the following 
        validated business ideas with their 
        research and viability data:

        {ideas_summary}

        Rank these ideas from strongest to weakest 
        build priority for a small AI-native team.

        For each idea provide:
        1. Rank position (1 = build first)
        2. One sentence verdict — why this rank
        3. Biggest strength vs the other ideas
        4. Biggest weakness vs the other ideas
        5. Recommended first action this week

        Then write a 2-3 sentence portfolio summary 
        at the end: what does this set of ideas tell 
        us about the opportunity landscape, and what 
        is the single most important thing to test 
        first across the whole portfolio.

        Be direct. Be specific. Do not hedge.
        Every idea must have a different rank — 
        no ties allowed.""",
        expected_output="""A continuous plain text list. 
        Each array item MUST strictly map formatting constraints to allow parsing: 
        Idea Name: [Name of Idea]
        Rank: [1 to N]
        Verdict: [sentence]
        Strength: [reason]
        Weakness: [reason]
        This week: [action]
        
        Followed optionally by:
        Portfolio Insight: [Paragraph]
        
        Do NOT use markdown hashes, asterisks or bulleted wrappers.""",
        agent=agent
    )
