import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import IdeaList from './components/IdeaList'
import IdeaDetail from './components/IdeaDetail'
import Matrix from './components/Matrix'
import { API_BASE } from './config'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('ideas'); // 'ideas' or 'matrix'
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);

  const fetchIdeas = () => {
    setLoadingIdeas(true);
    fetch(`${API_BASE}/ideas`)
      .then(res => res.json())
      .then(data => {
        setIdeas(data);
        setLoadingIdeas(false);
      })
      .catch(err => {
        console.error("Error fetching ideas:", err);
        setLoadingIdeas(false);
      });
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  return (
    <div className="layout">
      <Sidebar ideas={ideas} currentView={currentView} onViewChange={setCurrentView} />
      <main className="main-content">
        {!selectedIdea ? (
          currentView === 'ideas' ? (
            <IdeaList 
              ideas={ideas} 
              loading={loadingIdeas} 
              onSelectIdea={setSelectedIdea} 
              onRefresh={fetchIdeas} 
            />
          ) : (
            <Matrix 
              ideas={ideas} 
              onSelectIdea={setSelectedIdea} 
            />
          )
        ) : (
          <IdeaDetail 
            idea={selectedIdea} 
            onBack={() => {
              setSelectedIdea(null);
              fetchIdeas();
            }}
          />
        )}
      </main>
    </div>
  )
}

export default App
