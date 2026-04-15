import React, { useState } from 'react';
import { API_BASE } from '../config';

function IdeaList({ ideas, loading, onSelectIdea, onRefresh }) {
  const [filter, setFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const filters = ['All', 'Unvalidated', 'Validating', 'Complete', 'Archived'];

  const filteredIdeas = ideas.filter(idea => {
    if (filter === 'All') return true;
    return idea.status.toLowerCase() === filter.toLowerCase();
  });

  const toggleSelect = (e, id) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredIdeas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIdeas.map(i => i.id)));
    }
  };

  const [validatingBulk, setValidatingBulk] = useState(false);

  const validateBulk = (idsToValidate) => {
    setValidatingBulk(true);
    fetch(`${API_BASE}/validate/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea_ids: Array.from(idsToValidate) })
    }).then(() => {
      onRefresh();
    }).finally(() => {
      setValidatingBulk(false);
      setSelectedIds(new Set());
    });
  };

  const handleValidateAllUnvalidated = () => {
    const unval = ideas.filter(i => i.status === 'unvalidated' || i.status === 'error' || !i.status).map(i => i.id);
    if (unval.length > 0) validateBulk(unval);
  };

  const handleValidateSelected = () => {
    validateBulk(selectedIds);
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <div className="idea-list">
      <div className="page-title">Ideas</div>
      <div className="page-subtitle">Validate business ideas before building</div>

      <div className="toolbar">
        <div className="filter-group">
          {filters.map(f => (
            <button 
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="action-group">
          <button className="btn-secondary" onClick={handleValidateAllUnvalidated} disabled={validatingBulk}>
            {validatingBulk ? 'Validating pipeline...' : 'Validate all pending'}
          </button>
          <button className="btn-secondary" onClick={onRefresh} disabled={validatingBulk}>Sync Sheet</button>
        </div>
      </div>

      <div className="idea-list-container">
        {filteredIdeas.map(idea => (
          <div key={idea.id} className="idea-row" onClick={() => onSelectIdea(idea)}>
            <div className="idea-row-left">
              <input 
                type="checkbox" 
                checked={selectedIds.has(idea.id)} 
                onChange={(e) => toggleSelect(e, idea.id)} 
                onClick={e => e.stopPropagation()} 
              />
              <div className="idea-row-content">
                <div className="idea-name">{idea.name}</div>
                <div className="idea-desc">{idea.description || "No description provided"}</div>
              </div>
            </div>
            
            <div className="idea-row-right">
              <div 
                className="priority-badge" 
                style={idea.priority > 7.0 ? { backgroundColor: '#18181b', color: 'white', borderColor: '#18181b' } : {}}
              >
                {idea.priority ? Number(idea.priority).toFixed(2) : '0.00'}
              </div>
              <div className={`status-badge status-${idea.status.toLowerCase()}`}>{idea.status}</div>
            </div>
          </div>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div className="bulk-actions">
          <button className="btn-secondary" onClick={toggleSelectAll} disabled={validatingBulk}>
            {selectedIds.size === filteredIdeas.length ? "Deselect all" : "Select all"}
          </button>
          <button className="btn-primary" onClick={handleValidateSelected} disabled={validatingBulk}>
            {validatingBulk ? 'Validating sequence...' : `Validate selected (${selectedIds.size})`}
          </button>
        </div>
      )}
    </div>
  );
}

export default IdeaList;
