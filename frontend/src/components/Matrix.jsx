import React, { useState, useMemo } from 'react';
import { API_BASE } from '../config';

function Matrix({ ideas, onSelectIdea }) {
  const [isRanking, setIsRanking] = useState(false);
  const [rankingResult, setRankingResult] = useState(null);

  const completedIdeas = ideas.filter(i => i.status === 'complete');

  const sortedIdeas = useMemo(() => {
    return [...completedIdeas].sort((a, b) => {
      const pA = a.validation_result?.viability?.priority_score || 0;
      const pB = b.validation_result?.viability?.priority_score || 0;
      return pB - pA;
    });
  }, [completedIdeas]);
  
  // Calculate specific positions dynamically mapping to the 500x500 box 
  const plottedPoints = useMemo(() => {
    const points = [];
    sortedIdeas.forEach((idea, index) => {
      const effort = idea.validation_result?.viability?.effort_score || 0;
      const potential = idea.validation_result?.viability?.potential_score || 0;
      const priority = idea.validation_result?.viability?.priority_score || 0;
      
      // Calculate true percentages (x: effort 1-10 string, base left -> right)
      // (y: potential 1-10 string, base bottom -> top)
      const xPercent = (Number(effort) / 10) * 100;
      const yPercent = (Number(potential) / 10) * 100;

      // Handle simple collision offsetting for dot overlaps natively
      let offsetX = 0;
      let offsetY = 0;
      
      const isCollision = points.find(p => Math.abs(p.x - xPercent) < 3 && Math.abs(p.y - yPercent) < 3);
      if (isCollision) {
        offsetX = 15;
      }

      points.push({
        ...idea,
        rank: index + 1,
        effort: Number(effort),
        potential: Number(potential),
        priority: Number(priority),
        x: xPercent,
        y: yPercent,
        offsetX,
        offsetY
      });
    });
    return points;
  }, [sortedIdeas]);

  const handleGenerateRanking = async () => {
    setIsRanking(true);
    try {
      const resp = await fetch(`${API_BASE}/rank`, { method: 'POST' });
      const data = await resp.json();
      if (data.ranking) {
        setRankingResult(parseRankingText(data.ranking));
      } else {
        alert(data.message || "Ranking failed");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend ranker");
    } finally {
      setIsRanking(false);
    }
  };

  const parseRankingText = (rawText) => {
    const blocks = { cards: [], summary: "" };
    
    const insightSplit = rawText.split(/Portfolio Insight:/i);
    const mainCardsText = insightSplit[0];
    if (insightSplit.length > 1) {
      blocks.summary = insightSplit[1].trim();
    }
    
    // Split on "Idea Name:" 
    const segments = mainCardsText.split(/Idea Name:\s*/i).filter(s => s.trim().length > 0);
    
    segments.forEach(segment => {
       const lines = segment.split('\n').map(l => l.trim()).filter(l => l.length > 0);
       
       let name = lines[0]; // First piece is name
       let rank = "";
       let verdict = "";
       let strength = "";
       let weakness = "";
       let action = "";
       
       segment.split('\n').forEach(line => {
         const tl = line.trim();
         if (tl.toLowerCase().startsWith('rank:')) rank = tl.substring(5).trim();
         else if (tl.toLowerCase().startsWith('verdict:')) verdict = tl.substring(8).trim();
         else if (tl.toLowerCase().startsWith('strength:')) strength = tl.substring(9).trim();
         else if (tl.toLowerCase().startsWith('weakness:')) weakness = tl.substring(9).trim();
         else if (tl.toLowerCase().startsWith('this week:')) action = tl.substring(10).trim();
       });
       
       if (name && (rank || verdict)) {
         blocks.cards.push({ name, rank, verdict, strength, weakness, action });
       }
    });
    
    return blocks;
  };

  return (
    <div className="matrix-view">
      <div className="page-title">Matrix</div>
      <div className="page-subtitle" style={{ color: 'var(--text-muted)' }}>Effort vs potential across all validated ideas</div>

      {completedIdeas.length < 2 ? (
        <div className="card card-sm" style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Validate at least 2 ideas to see the matrix
        </div>
      ) : (
        <div className="matrix-container-wrapper">
          <div className="matrix-y-axis-label">↑ Market potential</div>
          
          <div className="matrix-graph-area">
            {/* Quadrant Lines overlay mapping at exactly 50% intersections */}
            <div className="matrix-line-vertical"></div>
            <div className="matrix-line-horizontal"></div>
            
            {/* Inner background labels cleanly padded onto exact corners strictly via Absolute wrapping */}
            <div className="matrix-label label-tl">Build now</div>
            <div className="matrix-label label-tr">Big bet</div>
            <div className="matrix-label label-bl">Fill time</div>
            <div className="matrix-label label-br">Avoid</div>

            {/* Render dataset natively mapping points absolutely across percentages */}
            {plottedPoints.map((point) => (
              <div 
                key={point.id} 
                className="matrix-dot"
                style={{ 
                  left: `calc(${point.x}% + ${point.offsetX}px)`, 
                  bottom: `calc(${point.y}% + ${point.offsetY}px)`
                }}
                onClick={() => onSelectIdea(point)}
              >
                <div className="matrix-dot-label">
                  {point.rank}
                </div>
                
                {/* Embedded dynamic tooltip unassigned visually dropping purely from hover blocks */}
                <div className="matrix-tooltip">
                  <div style={{ fontWeight: '500', color: '#18181b', fontSize: '13px', marginBottom: '4px' }}>{point.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Effort: {point.effort}/10</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Potential: {point.potential}/10</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Priority: {point.priority.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="matrix-x-axis-footer">
            <div className="matrix-x-axis-label">Effort to build →</div>
            <div className="matrix-x-axis-sub">Lower effort = faster to ship</div>
          </div>
          
          <div className="matrix-legend" style={{ marginTop: '40px' }}>
            <div className="section-label" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Ideas</div>
            <div className="legend-list">
              {plottedPoints.map(point => (
                <div 
                  key={point.id} 
                  className="idea-row" 
                  onClick={() => onSelectIdea(point)}
                  style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', margin: 0, paddingLeft: 0, paddingRight: 0, cursor: 'pointer' }}
                >
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#18181b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '500', marginRight: '16px', flexShrink: 0 }}>
                    {point.rank}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '400', color: 'var(--text-main)', flex: 1 }}>{point.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Priority score: <strong style={{color: '#18181b'}}>{point.priority.toFixed(2)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="portfolio-ranking-section" style={{ marginTop: '40px' }}>
            <div className="section-label" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              Portfolio ranking
            </div>

            {!rankingResult && (
              <button 
                onClick={handleGenerateRanking}
                disabled={isRanking}
                style={{ 
                  backgroundColor: '#18181b', 
                  color: 'white', 
                  fontSize: '13px', 
                  borderRadius: '6px', 
                  padding: '8px 16px',
                  border: 'none',
                  cursor: isRanking ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isRanking ? 'Analysing portfolio...' : 'Generate ranking'}
                {isRanking && <div className="spinner" style={{width: '12px', height: '12px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white'}}></div>}
              </button>
            )}

            {rankingResult && (
              <div className="ranking-results-container" style={{ marginTop: '16px' }}>
                {rankingResult.cards.map((card, idx) => {
                  const matchedIdea = plottedPoints.find(p => p.name.includes(card.name) || card.name.includes(p.name));
                  
                  return (
                    <div key={idx} style={{ display: 'flex', borderBottom: '1px solid #e5e5e3', padding: '16px 0', gap: '16px' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#18181b', width: '30px', flexShrink: 0 }}>
                        {card.rank}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div 
                          style={{ fontSize: '15px', fontWeight: '500', color: '#18181b', cursor: matchedIdea ? 'pointer' : 'default' }}
                          onClick={() => matchedIdea && onSelectIdea(matchedIdea)}
                        >
                          {card.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#71717a', fontStyle: 'italic', marginTop: '4px', marginBottom: '12px' }}>
                          {card.verdict}
                        </div>
                        <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ color: '#71717a' }}>Strength:</span> <span style={{ color: '#18181b' }}>{card.strength}</span>
                        </div>
                        <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ color: '#71717a' }}>Weakness:</span> <span style={{ color: '#18181b' }}>{card.weakness}</span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '500', marginTop: '8px', color: '#18181b' }}>
                          This week: {card.action}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {rankingResult.summary && (
                  <div style={{ 
                    backgroundColor: '#fffbeb', 
                    borderLeft: '3px solid #fef3c7', 
                    padding: '16px', 
                    borderRadius: '4px',
                    marginTop: '24px'
                  }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#92400e', marginBottom: '8px', fontWeight: '600' }}>
                      Portfolio insight
                    </div>
                    <div style={{ fontSize: '14px', color: '#18181b', lineHeight: '1.7' }}>
                      {rankingResult.summary}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Matrix;
