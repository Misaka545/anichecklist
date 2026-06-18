import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { db, auth, googleProvider } from './lib/firebase';
import EntryForm from './components/EntryForm';
import TrackerItem from './components/TrackerItem';
import WindowFrame from './components/WindowFrame';
import { FocusRail } from './components/FocusRail';
import { motion } from 'framer-motion';
import './App.css';

const STORAGE_KEY = 'ayame-tracker-data';

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
  const [recommendations, setRecommendations] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [prefillData, setPrefillData] = useState(null);

  const focusRailItems = useMemo(() => recommendations.map(rec => ({
    id: rec.id,
    title: rec.title,
    imageSrc: rec.coverUrl || '',
    meta: rec.type,
  })), [recommendations]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleFocusRailAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleFocusRailItemClick = (item) => {
    // Switch to collection tab, reset filters, and set search to the item's title
    setActiveTab('collection');
    setFilter('all');
    setSearch(item.title);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeTab]);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > 50;
    const isRightSwipe = distanceX < -50;
    
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isRightSwipe && touchStart.x < 50) { 
        setIsSidebarOpen(true);
      } else if (isLeftSwipe && isSidebarOpen) { 
        setIsSidebarOpen(false);
      }
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (window.confirm("Are you sure you want to sign out?")) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };



  useEffect(() => {
    if (!user) {
      setItems([]);
      setRecommendations([]);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'items'), (snapshot) => {
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
      if (!user) return;
      await setDoc(doc(db, 'users', user.uid, 'items', newItem.id.toString()), newItem);
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
      if (!user) return;
      await setDoc(doc(db, 'users', user.uid, 'items', finalUpdated.id.toString()), finalUpdated);
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  };

  const handleDelete = async (id) => {
    try {
      if (!user) return;
      await deleteDoc(doc(db, 'users', user.uid, 'items', id.toString()));
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
              if (!user) return;
              await setDoc(doc(db, 'users', user.uid, 'items', id.toString()), { ...item, id });
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

  // Handle recommendation shuffle
  const shuffleRecommendation = () => {
    if (items.length > 0) {
      const shuffled = [...items].sort(() => 0.5 - Math.random());
      setRecommendations(shuffled.slice(0, 10));
    } else {
      setRecommendations([]);
    }
  };

  // Update recommendation when items change or on first load
  useEffect(() => {
    if (recommendations.length === 0 && items.length > 0) {
      shuffleRecommendation();
    } else if (recommendations.length > 0 && items.length > 0) {
      // Keep recommendations valid
      const valid = recommendations.filter(r => items.some(i => i.id === r.id));
      if (valid.length !== recommendations.length) {
        shuffleRecommendation();
      } else {
        setRecommendations(valid.map(r => items.find(i => i.id === r.id)));
      }
    }
  }, [items]);

  const displayItems = useMemo(() => {
    let result = [...items];

    if (filter !== 'all' && filter !== 'watching' && filter !== 'completed') {
      result = result.filter((i) => i.type === filter);
    } else if (filter === 'watching') {
      result = result.filter((i) => i.status === 'watching');
    } else if (filter === 'completed') {
      result = result.filter((i) => i.status === 'completed');
    }

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

      <div 
        className={`app fade-in`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >

      {/* Header */}
      <header className="app-header">
        <div className="header-content content-container">
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <h1 className="app-title app-title-bounce" style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }}>
            {'Ayame'.split('').map((char, i) => (
              <span key={i} className="bounce-char" style={{ animationDelay: `${i * 0.12}s` }}>{char}</span>
            ))}
          </h1>
        </div>
      </header>

      {activeTab === 'dashboard' ? (
        <div className="fade-in" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', margin: '0 -0.75rem', paddingBottom: 0 }}>
          {/* Discovery Section (Recommendation) */}
          {recommendations.length > 0 ? (
            <section className="discovery-section" style={{ flex: 1, margin: 0, overflow: 'hidden' }}>
              <FocusRail 
                items={focusRailItems} 
                onAddClick={handleFocusRailAdd}
                onItemClick={handleFocusRailItemClick}
                onShuffle={shuffleRecommendation}
                className="!h-full"
              />
            </section>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No recommendations available.
            </div>
          )}


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
              <div className="search-container" style={{ position: 'relative' }}>
                <input
                  id="search-input"
                  className="search-input"
                  type="text"
                  placeholder="Search series or aliases..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingRight: '2.5rem' }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '0.2rem'
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="filter-tabs">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'watching', label: 'Active' },
                  { key: 'completed', label: 'Finished' },
                  { key: 'anime', label: 'Anime' },
                  { key: 'manga', label: 'Manga' },
                  { key: 'movie', label: 'Movie' },
                  { key: 'magazine', label: 'Magazine' },
                  { key: 'book', label: 'Book' },
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
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, y: 30, scale: 0.98 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <TrackerItem
                      item={item}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  </motion.div>
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

      <EntryForm 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAdd} 
        prefillData={null} 
      />

    </>
  );
}
