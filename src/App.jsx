import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { db, auth, googleProvider } from './lib/firebase';
import EntryForm from './components/EntryForm';
import TrackerItem from './components/TrackerItem';
import WindowFrame from './components/WindowFrame';
import './App.css';

const STORAGE_KEY = 'ayame-tracker-data';
const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;

function loadTheme() {
  return localStorage.getItem('theme') || 'dark';
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [theme, setTheme] = useState(loadTheme);
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };



  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'items'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.data().id || doc.id
      }));
      setItems(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      alert("Error connecting to database. Please make sure Firestore is initialized and rules allow read/write.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const metaTheme = document.getElementById('theme-color-meta');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#191a1c' : '#fcfbf9');
    }
  }, [theme]);

  const handleAdd = async (newItem) => {
    try {
      await setDoc(doc(db, 'items', newItem.id.toString()), newItem);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const handleUpdate = async (updated) => {
    try {
      let finalUpdated = { ...updated };
      if (updated.total && updated.current >= updated.total && updated.status === 'watching') {
        finalUpdated.status = 'completed';
      }
      await setDoc(doc(db, 'items', finalUpdated.id.toString()), finalUpdated);
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'items', id.toString()));
    } catch (e) {
      console.error("Error deleting document: ", e);
    }
  };

  const fileInputRef = useRef(null);

  const handleExport = () => {
    if (!window.confirm("Do you want to export your entire collection to a backup file?")) return;
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ayame-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          if(window.confirm(`Importing ${importedData.length} items to the cloud database. This will merge with existing online data. Proceed?`)) {
            for (const item of importedData) {
              const id = item.id || Date.now() + Math.random();
              await setDoc(doc(db, 'items', id.toString()), { ...item, id });
            }
            alert('Import complete!');
          }
        } else {
          alert('Invalid JSON structure. Needs to be an array of tracker items.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const stats = useMemo(() => {
    const anime = items.filter((i) => i.type === 'anime');
    const manga = items.filter((i) => i.type === 'manga');
    const completed = items.filter((i) => i.status === 'completed');
    const totalEps = items.reduce((acc, i) => acc + (i.current || 0), 0);
    return {
      anime: anime.length,
      manga: manga.length,
      completed: completed.length,
      totalProgress: totalEps,
    };
  }, [items]);

  // Handle recommendation shuffle
  const shuffleRecommendation = () => {
    if (items.length > 0) {
      const randomIndex = Math.floor(Math.random() * items.length);
      setRecommendation(items[randomIndex]);
    } else {
      setRecommendation(null);
    }
  };

  // Update recommendation when items change or on first load
  useEffect(() => {
    if (!recommendation && items.length > 0) {
      shuffleRecommendation();
    } else if (recommendation && items.length > 0) {
      // Keep recommendation valid if it still exists
      const stillExists = items.find(i => i.id === recommendation.id);
      if (!stillExists) {
        shuffleRecommendation();
      } else if (JSON.stringify(stillExists) !== JSON.stringify(recommendation)) {
        // Sync edits without completely reshuffling
        setRecommendation(stillExists);
      }
    }
  }, [items]);

  const displayItems = useMemo(() => {
    let result = [...items];

    if (filter === 'anime') result = result.filter((i) => i.type === 'anime');
    else if (filter === 'manga') result = result.filter((i) => i.type === 'manga');
    else if (filter === 'watching') result = result.filter((i) => i.status === 'watching');
    else if (filter === 'completed') result = result.filter((i) => i.status === 'completed');

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.title.toLowerCase().includes(q) || (i.alias && i.alias.toLowerCase().includes(q)));
    }

    if (sortBy === 'newest') result.sort((a, b) => b.id - a.id);
    else if (sortBy === 'oldest') result.sort((a, b) => a.id - b.id);
    else if (sortBy === 'title') result.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'progress') {
      result.sort((a, b) => {
        const pa = a.total ? a.current / a.total : 0;
        const pb = b.total ? b.current / b.total : 0;
        if (pb !== pa) return pb - pa;
        return (b.current || 0) - (a.current || 0);
      });
    }
    else if (sortBy === 'rating') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return result;
  }, [items, filter, search, sortBy]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="shimmer-loading" style={{ width: '120px', height: '20px', borderRadius: '8px' }}></div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1 className="auth-title heading-serif">Ayame</h1>
          <p className="auth-subtitle">Personal Collection Tracker</p>
          <button className="auth-google-btn" onClick={handleLogin}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Access denied for unauthorized users
  if (ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1 className="auth-title heading-serif">Access Denied</h1>
          <p className="auth-subtitle">This tracker is private.</p>
          <button className="auth-google-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar Overlay - outside .app to avoid transform containing block */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar - outside .app to avoid transform containing block */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="heading-serif">Menu</h2>
          <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="sidebar-links">
          <button 
            className={`sidebar-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { window.scrollTo(0, 0); setActiveTab('dashboard'); setIsSidebarOpen(false); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            Dashboard
          </button>
          <button 
            className={`sidebar-tab ${activeTab === 'collection' ? 'active' : ''}`}
            onClick={() => { window.scrollTo(0, 0); setActiveTab('collection'); setIsSidebarOpen(false); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            Collection
          </button>

          <div className="sidebar-divider"></div>

          <button className="sidebar-tab" onClick={() => { setIsSidebarOpen(false); handleExport(); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Export Backup
          </button>
          
          <button className="sidebar-tab" onClick={() => { setIsSidebarOpen(false); fileInputRef.current.click(); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Import Storage
          </button>

          <div className="sidebar-divider"></div>

          <button className="sidebar-tab" onClick={() => { setIsSidebarOpen(false); handleLogout(); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sign Out
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="theme-switch-wrapper sidebar-theme">
            <span className="theme-label">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            <label className="theme-switch" htmlFor="checkbox">
              <input 
                type="checkbox" 
                id="checkbox" 
                checked={theme === 'dark'} 
                onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
              />
              <div className="slider round"></div>
            </label>
          </div>
        </div>
      </aside>

      <div className={`app fade-in`}>

      {/* Header */}
      <header className="app-header">
        <div className="header-content content-container">
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <h1 className="app-title heading-serif">Ayame</h1>
          <div className="app-subtitle-box">Personal Collection</div>
        </div>
      </header>

      {activeTab === 'dashboard' ? (
        <div className="fade-in content-container">
          {/* Compact Stats Row */}
          <div className="stats-compact-row">
            <div className="stat-badge">
              <span className="badge-count text-serif">{stats.anime}</span>
              <span className="badge-label">Anime</span>
            </div>
            <div className="stat-badge">
              <span className="badge-count text-serif">{stats.manga}</span>
              <span className="badge-label">Manga</span>
            </div>
            <div className="stat-badge">
              <span className="badge-count text-serif">{stats.completed}</span>
              <span className="badge-label">Finished</span>
            </div>
            <div className="stat-badge">
              <span className="badge-count text-serif">{stats.totalProgress}</span>
              <span className="badge-label">Episodes</span>
            </div>
          </div>

          <div className={`dashboard-layout ${!recommendation ? 'single-column' : ''}`}>
          {/* Discovery Section (Recommendation) */}
          {recommendation && (
            <section className="discovery-section">
              <div className="discovery-card">
                <div className="discovery-layout">
                  <div className="discovery-cover-box">
                    {recommendation.coverUrl ? (
                      <img src={recommendation.coverUrl} className="discovery-cover-img" alt={recommendation.title} />
                    ) : (
                      <div className="discovery-cover-fallback text-serif">
                        {recommendation.title.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  <div className="discovery-info">
                    <span className="discovery-tag">Next Discovery</span>
                    <h3 className="discovery-title heading-serif">{recommendation.title}</h3>
                    <div className="discovery-actions">
                      <button 
                        className="discovery-start-btn" 
                        onClick={() => {
                          setActiveTab('collection');
                          setSearch(recommendation.title);
                          window.scrollTo(0, 0);
                        }}
                      >
                        Go to Collection
                      </button>
                      <button className="discovery-shuffle-btn" onClick={shuffleRecommendation} title="Shuffle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Entry Form */}
          <EntryForm onAdd={handleAdd} />

          </div>

          {/* Hidden File Input for Import */}
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleImport} 
            style={{ display: 'none' }} 
          />
        </div>
      ) : (
        <div className="fade-in">
          {/* Controls */}
          <div className="controls-area">
            <div className="content-container controls-inner">
              <div className="search-container">
                <input
                  id="search-input"
                  className="search-input"
                  type="text"
                  placeholder="Search series or aliases..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="filter-tabs">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'watching', label: 'Active' },
                  { key: 'completed', label: 'Finished' },
                  { key: 'anime', label: 'Anime' },
                  { key: 'manga', label: 'Manga' },
                ].map((f) => (
                  <button
                    key={f.key}
                    className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List Panel */}
          <div className="content-container">
            <WindowFrame>
            <div className="list-header">
              <h2 className="list-title heading-serif">Collection</h2>
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Recently Added</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Alphabetical</option>
                <option value="progress">Highest Progress</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>

            {/* Items */}
            <div className="items-list">
              {loading ? (
                <div className="empty-state shimmer-loading">
                    <p className="empty-text">Loading secure database...</p>
                </div>
              ) : displayItems.length > 0 ? (
                displayItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="stagger-in" 
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <TrackerItem
                      item={item}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <h3 className="empty-title heading-serif">No series found</h3>
                  <p className="empty-text">
                    {search
                      ? 'Try adjusting your search or filters.'
                      : 'Your collection is empty. Switch to Dashboard to add items.'
                    }
                  </p>
                </div>
              )}
            </div>
          </WindowFrame>
          </div>
        </div>
      )}

    </div>
    </>
  );
}
