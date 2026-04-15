import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

function IdeaDetail({ idea, onBack }) {
  const [validation, setValidation] = useState(idea.validation_result || null);
  const [prdModalOpen, setPrdModalOpen] = useState(false);
  const [prdContent, setPrdContent] = useState(null);
  const [prdLoading, setPrdLoading] = useState(false);
  const [trendExpanded, setTrendExpanded] = useState(false);
  
  // Track continuous state if verifying
  const [currentStatus, setCurrentStatus] = useState(idea.status);

  useEffect(() => {
    let interval;
    if (currentStatus === 'validating') {
      interval = setInterval(() => {
        fetch(`${API_BASE}/ideas`)
          .then(res => res.json())
          .then(data => {
            const updated = data.find(i => i.id === idea.id);
            if (updated && updated.status !== 'validating') {
              setCurrentStatus(updated.status);
              if (updated.validation_result) {
                setValidation(updated.validation_result);
              }
            }
          })
          .catch(err => console.error("Polling error", err));
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [currentStatus, idea.id]);

  useEffect(() => {
    setTrendExpanded(false);
  }, [idea.id]);

  const fetchValidation = () => {
    setCurrentStatus('validating');
    fetch(`${API_BASE}/validate/${idea.id}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setValidation(data);
        setCurrentStatus(data.error ? 'error' : 'complete');
      })
      .catch(err => {
        console.error("Failed to fetch validation", err);
        setCurrentStatus('error');
      });
  };

  const handleGeneratePRD = () => {
    setPrdModalOpen(true);
    setPrdLoading(true);
    fetch(`${API_BASE}/prd/${idea.id}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setPrdContent(data.prd);
        setPrdLoading(false);
      })
      .catch(err => {
        setPrdContent("Failed to generate PRD: " + err.message);
        setPrdLoading(false);
      });
  };

  const market = validation && !validation.error ? (validation.market.market ? validation.market.market : validation.market) : null;
  const compGap = validation && !validation.error ? validation.competitive_gap : "";
  const competitors = validation && !validation.error ? validation.competitors : [];

  const formatMarketFigure = (text) => {
    if (!text) return "N/A";
    const cleanText = text.replace(/,/g, '');
    const regex = /(?:usd|\$)?\s*(\d+(?:\.\d+)?)\s*(b|m|k|billion|million|trillion)?/gi;
    let matches = [...cleanText.matchAll(regex)];
    
    if (matches.length === 0) return "N/A";
    matches = matches.slice(0, 2);
    
    const formatted = matches.map(match => {
      let num = parseFloat(match[1]);
      const mult = (match[2] || "").toLowerCase();
      
      let letter = "";
      if (mult.startsWith('b')) letter = "B";
      else if (mult.startsWith('m')) letter = "M";
      else if (mult.startsWith('t')) letter = "T";
      else if (mult.startsWith('k')) letter = "K";
      
      if (letter === "B" && num < 1) {
        num = num * 1000;
        letter = "M";
      } else if (letter === "" && num >= 1e9) {
        num = num / 1e9;
        letter = "B";
      } else if (letter === "" && num >= 1e6) {
        num = num / 1e6;
        letter = "M";
      }
      
      return `$${num.toFixed(1).replace(/\.0$/, '')}${letter}`;
    });
    
    return formatted.join('–');
  };

  const getConfidenceColor = (conf) => {
    if (!conf) return 'status-unvalidated';
    const c = conf.toLowerCase();
    if (c.includes('high')) return 'status-complete';
    if (c.includes('med')) return 'status-validating';
    return 'status-unvalidated';
  }

  const getEffortColor = (score) => {
    if (score <= 4) return '#166534';
    if (score <= 7) return '#92400e';
    return '#991b1b';
  };

  const getPotentialColor = (score) => {
    if (score >= 8) return '#166534';
    if (score >= 5) return '#92400e';
    return '#991b1b';
  };

  const getTrendColor = (trend) => {
    if (!trend) return 'status-unvalidated';
    const t = trend.toLowerCase();
    if (t.includes('grow') || t.includes('increas')) return 'status-complete';
    if (t.includes('declin') || t.includes('shrink')) return 'status-error';
    return 'status-unvalidated';
  };

  return (
    <div className="idea-detail">
      <button className="back-link" onClick={onBack}>&larr; Ideas</button>
      
      <header className="detail-header">
        <div>
          <div className="detail-title">{idea.name}</div>
          <div className="detail-desc">{idea.description}</div>
          <div className="detail-badges">
            <div className={`status-badge status-${currentStatus.toLowerCase()}`}>{currentStatus}</div>
            {idea.priority > 0 && <div className="priority-badge">{idea.priority}</div>}
          </div>
        </div>
        <div>
          {currentStatus === 'complete' || validation ? (
             <button className="btn-primary" onClick={handleGeneratePRD}>Generate PRD</button>
          ) : (
            <button className="btn-secondary" onClick={fetchValidation} disabled={currentStatus === 'validating'}>
              Run Validation Pipeline
            </button>
          )}
        </div>
      </header>

      {currentStatus === 'validating' && (
        <div className="tracker-container">
          <div className="tracker-step done">Research <span className="tracker-arrow">→</span></div>
          <div className="tracker-step">Evaluation <span className="tracker-arrow">→</span></div>
          <div className="tracker-step">Scope</div>
        </div>
      )}

      {currentStatus === 'error' && validation?.error && (
        <div className="card highlight">
          <p style={{ color: '#ef4444', margin: 0 }}><strong>Validation Error:</strong> {validation.error}</p>
        </div>
      )}

      {(!validation || (currentStatus === 'error' && !validation?.error)) && currentStatus !== 'validating' && (
        <div className="card card-sm" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Click "Run Validation Pipeline" to start the agents.
        </div>
      )}

      {validation && !validation.error && currentStatus !== 'validating' && (
        <div className="detail-grid">
          <div className="col-left">
            <div className="card">
              <div className="section-label">Market</div>
              <div className="market-cards-row" style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-start' }}>
                {['tam', 'sam', 'som'].map((metric) => {
                  const data = market[metric];
                  if (!data) return null;
                  const valText = data.figure || data.value || "";
                  const rationaleText = data.rationale || valText;
                  
                  return (
                    <div key={metric} className="market-mini-card" style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '6px', padding: '16px', minWidth: 0 }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        {metric.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)', marginTop: '4px', marginBottom: '8px' }}>
                        {formatMarketFigure(valText)}
                      </div>
                      <div className={`status-badge min-badge ${getConfidenceColor(data.confidence)}`} style={{ display: 'inline-block', marginBottom: '8px' }}>
                        {data.confidence ? data.confidence.split(/[, \.]/)[0] : 'Low'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#71717a', lineHeight: '1.5' }}>
                        {rationaleText}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="metric-label" style={{ marginBottom: '8px' }}>Market Trend</div>
              <div className={`status-badge min-badge ${getTrendColor(market.trend)}`} style={{ display: 'inline-block', marginBottom: '8px' }}>
                {market.trend || 'Unknown'}
              </div>
              <div style={{ fontSize: '12px', color: '#71717a', lineHeight: '1.5' }}>
                {trendExpanded ? market.trend_rationale : (
                  market.trend_rationale?.length > 140 
                    ? market.trend_rationale.slice(0, 140) + '... ' 
                    : market.trend_rationale
                )}
                {market.trend_rationale?.length > 140 && (
                  <button 
                    onClick={() => setTrendExpanded(!trendExpanded)}
                    style={{ background: 'none', border: 'none', color: '#18181b', textDecoration: 'underline', padding: 0, fontSize: '12px', cursor: 'pointer', marginLeft: '4px', fontWeight: '500' }}
                  >
                    {trendExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            </div>

            <div className="card">
              <div className="section-label">Competitors</div>
              <table className="comp-table mb-16">
                <tbody>
                  {competitors.map((c, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {c.link ? <a href={c.link} target="_blank" rel="noreferrer">{c.name}</a> : c.name}
                      </td>
                      <td className="text-14 text-muted">{c.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-14 text-muted italic">
                {compGap}
              </div>
            </div>
          </div>

          <div className="col-right">
            <div className="card highlight card-sm mb-16">
              <div className="metric-label">Priority Score</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#18181b' }}>
                {validation.viability.priority_score ? Number(validation.viability.priority_score).toFixed(2) : '0.00'}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="card card-sm mb-0" style={{ marginBottom: 0 }}>
                <div className="metric-label">Effort Score</div>
                <div className="metric-value" style={{ color: getEffortColor(validation.viability.effort_score) }}>{validation.viability.effort_score}/10</div>
              </div>
              <div className="card card-sm mb-0" style={{ marginBottom: 0 }}>
                <div className="metric-label">Potential Score</div>
                <div className="metric-value" style={{ color: getPotentialColor(validation.viability.potential_score) }}>{validation.viability.potential_score}/10</div>
              </div>
            </div>

            <div className="card card-sm mb-24" style={{ marginBottom: '24px' }}>
              <div className="metric-label">Top Assumption</div>
              <div className="callout-amber text-14 mb-16">{validation.top_assumption}</div>
              <div className="metric-label">Validation Method</div>
              <div className="callout-green text-14">{validation.validation_method}</div>
            </div>

            <div className="card">
              <div className="section-label">MVP Scope</div>
              <div className="mb-16">
                <div className="metric-label" style={{ display: 'inline-block', marginRight: '8px', marginBottom: 0 }}>Build Time:</div>
                <div className="text-14" style={{ display: 'inline-block', fontWeight: '500' }}>{validation.mvp_scope.build_time}</div>
              </div>
              <div className="mb-16">
                <div className="metric-label">Recommended Stack</div>
                <div className="filter-group" style={{ flexWrap: 'wrap' }}>
                  {validation.mvp_scope.stack.split(',').map((s, idx) => (
                    <div key={idx} className="filter-pill">{s.trim()}</div>
                  ))}
                </div>
              </div>
              <div className="metric-label">Core Features</div>
              <ol className="numbered-list">
                {validation.mvp_scope.features.map((f, i) => <li key={i}>{f}</li>)}
              </ol>
            </div>
          </div>
        </div>
      )}

      {prdModalOpen && (
        <div className="modal-overlay">
          <div className="modal-header">
            <div className="modal-title">PRD — {idea.name}</div>
            <div className="modal-subtitle">Ready to paste into Claude Code</div>
          </div>
          <div className="modal-content">
            {prdLoading ? (
              <div className="loader">
                <div className="spinner"></div>
                <div className="text-muted text-14">Generating PRD...</div>
              </div>
            ) : (
              <pre className="prd-code-block">{prdContent}</pre>
            )}
            <div className="modal-footer">
              <button 
                className="btn-primary" 
                onClick={() => navigator.clipboard.writeText(prdContent)}
                disabled={prdLoading}
              >
                Copy to clipboard
              </button>
              <button className="btn-secondary" onClick={() => setPrdModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IdeaDetail;
