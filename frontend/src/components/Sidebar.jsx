import React from 'react';

function Sidebar({ ideas = [], currentView = 'ideas', onViewChange }) {
  const completeCount = ideas.filter(i => i.status === 'complete').length;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="wordmark">Validator</div>
        <div className="wordmark-sub">Idea validation pipeline</div>
      </div>
      <nav className="sidebar-nav">
        <div 
          className={`nav-link ${currentView === 'ideas' ? 'active' : ''}`} 
          onClick={() => onViewChange('ideas')}
        >
          Ideas
        </div>
        <div 
          className={`nav-link ${currentView === 'matrix' ? 'active' : ''}`} 
          onClick={() => onViewChange('matrix')}
        >
          Matrix
        </div>
      </nav>
      <div className="sidebar-footer">
        {ideas.length} ideas &middot; {completeCount} validated
      </div>
    </aside>
  );
}

export default Sidebar;
