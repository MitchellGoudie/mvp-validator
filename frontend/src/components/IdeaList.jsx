import React, { useState } from 'react';
import { API_BASE } from '../config';

function IdeaList({ ideas, loading, onSelectIdea, onRefresh }) {
  const [filter, setFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIdeaName, setNewIdeaName] = useState("");
  const [newIdeaDesc, setNewIdeaDesc] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const submitAddIdea = async () => {
    if (!newIdeaName.trim()) {
      setAddError("Name is required");
      return;
    }
    setIsAdding(true);
    setAddError("");
    try {
      const resp = await fetch(`${API_BASE}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newIdeaName, description: newIdeaDesc })
      });
      const data = await resp.json();
      if (data.error) {
        setAddError(data.message || "Failed to add idea");
      } else {
        setShowAddForm(false);
        setNewIdeaName("");
        setNewIdeaDesc("");
        onRefresh();
      }
    } catch (e) {
      setAddError(e.message || "Network error");
    } finally {
      setIsAdding(false);
    }
  };

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
          <button 
            onClick={() => setShowAddForm(true)}
            style={{ backgroundColor: '#18181b', color: 'white', fontSize: '13px', borderRadius: '6px', padding: '8px 16px', border: 'none', cursor: 'pointer' }}
          >
            + Add idea
          </button>
          <button className="btn-secondary" onClick={handleValidateAllUnvalidated} disabled={validatingBulk}>
            {validatingBulk ? 'Validating pipeline...' : 'Validate all pending'}
          </button>
          <button className="btn-secondary" onClick={onRefresh} disabled={validatingBulk}>Sync Sheet</button>
        </div>
      </div>
      
      {showAddForm && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e5e3', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <input 
            type="text" 
            placeholder="Idea name" 
            value={newIdeaName}
            onChange={(e) => setNewIdeaName(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #e5e5e3', borderRadius: '4px', fontSize: '14px' }}
          />
          <textarea 
            placeholder="Describe the idea (optional)" 
            rows="3"
            value={newIdeaDesc}
            onChange={(e) => setNewIdeaDesc(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #e5e5e3', borderRadius: '4px', fontSize: '14px', resize: 'vertical' }}
          />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button 
              onClick={() => { setShowAddForm(false); setAddError(""); setNewIdeaName(""); setNewIdeaDesc(""); }}
              style={{ backgroundColor: 'transparent', border: '1px solid #e5e5e3', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              onClick={submitAddIdea}
              disabled={isAdding}
              style={{ backgroundColor: '#18181b', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: isAdding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isAdding ? 'Adding...' : 'Add idea'}
            </button>
          </div>
          {addError && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>{addError}</div>}
        </div>
      )}

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
