from pydantic import BaseModel
from typing import List

# Output schemas matching PRD requirements
class TAM_SAM_SOM(BaseModel):
    value: str
    confidence: str

class MarketSizing(BaseModel):
    tam: TAM_SAM_SOM
    sam: TAM_SAM_SOM
    som: TAM_SAM_SOM
    trend: str
    trend_rationale: str

class Competitor(BaseModel):
    name: str
    link: str
    description: str

class MarketResearchOutput(BaseModel):
    market: MarketSizing
    competitors: List[Competitor]
    competitive_gap: str

class ViabilityScores(BaseModel):
    effort_score: int
    potential_score: int
    priority_score: float

class EvaluationOutput(BaseModel):
    viability: ViabilityScores
    top_assumption: str
    validation_method: str

class MVPScopeOutput(BaseModel):
    features: List[str]
    build_time: str
    stack: str
