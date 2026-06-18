import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import WindowFrame from './WindowFrame';
import { compressAndEncodeImage } from '../utils/imageCompressor';
import './TrackerItem.css';

export default function TrackerItem({ item, onUpdate, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editAlias, setEditAlias] = useState(item.alias || '');
  const [editType, setEditType] = useState(item.type);
  const [editTotal, setEditTotal] = useState(item.total || '');
  const [editCoverUrl, setEditCoverUrl] = useState(item.coverUrl || '');

  const progress = item.total ? Math.min((item.current / item.total) * 100, 100) : 0;
  const isCompleted = item.total && item.current >= item.total;
  const typeLabel = item.type === 'anime' ? 'Anime' : 'Manga';

  const [isPop, setIsPop] = useState(false);
  const [isEditingCurrent, setIsEditingCurrent] = useState(false);
  const [editCurrentValue, setEditCurrentValue] = useState(item.current || 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const titleRef = useRef(null);
  const modalTitleRef = useRef(null);
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isModalOverflowing, setIsModalOverflowing] = useState(false);

  useEffect(() => {
    if (titleRef.current) {
      setIsOverflowing(titleRef.current.scrollWidth > titleRef.current.clientWidth);
    }
  }, [item.title]);

  useEffect(() => {
    if (isExpanded && modalTitleRef.current) {
      setIsModalOverflowing(modalTitleRef.current.scrollWidth > modalTitleRef.current.clientWidth);
    }
  }, [item.title, isExpanded]);

  const handleCurrentSubmit = () => {
    let num = parseInt(editCurrentValue, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (item.total && num > item.total) num = item.total;
    
    if (num !== item.current) {
      onUpdate({ ...item, current: num });
    }
    setIsEditingCurrent(false);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    const newCurrent = item.total ? Math.min(item.current + 1, item.total) : item.current + 1;
    onUpdate({ ...item, current: newCurrent });
    
    setIsPop(false);
    setTimeout(() => setIsPop(true), 10);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (item.current > 0) {
      onUpdate({ ...item, current: item.current - 1 });
    }
  };

  const handleStatusChange = (status) => {
    onUpdate({ ...item, status });
  };

  const handleRating = (rating) => {
    onUpdate({ ...item, rating: item.rating === rating ? 0 : rating });
  };

  const handleSaveNotes = () => {
    onUpdate({ ...item, notes });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleSaveEdit = () => {
    onUpdate({
      ...item,
      title: editTitle.trim(),
      alias: editAlias.trim(),
      type: editType,
      total: editTotal ? parseInt(editTotal, 10) : null,
      coverUrl: editCoverUrl.trim()
    });
    setIsEditing(false);
    setIsExpanded(true);
  };

  const handleCancelEdit = () => {
    setEditTitle(item.title);
    setEditAlias(item.alias || '');
    setEditType(item.type);
    setEditTotal(item.total || '');
    setEditCoverUrl(item.coverUrl || '');
    setIsEditing(false);
    setIsExpanded(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64Url = await compressAndEncodeImage(file);
      setEditCoverUrl(base64Url);
    } catch (err) {
      console.error(err);
      alert('Failed to process image');
    }
  };

  const statusConfig = {
    watching: { label: item.type === 'manga' ? 'Reading' : 'Watching' },
    planned: { label: item.type === 'manga' ? 'Plan to Read' : 'Plan to Watch' },
    completed: { label: 'Completed' },
    'on-hold': { label: 'On Hold' },
    dropped: { label: 'Dropped' },
  };

  const currentStatus = statusConfig[item.status] || statusConfig.watching;
  
  const renderEditForm = () => (
      <div className="edit-mode-card fade-in" style={{ padding: '1.5rem' }}>
        <div className="form-group">
          <label className="elegant-label">Title</label>
          <input
            className="elegant-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="elegant-label">Alias</label>
          <input
            className="elegant-input"
            value={editAlias}
            onChange={(e) => setEditAlias(e.target.value)}
            placeholder="Alternative name..."
          />
        </div>
        
        <div className="form-group">
          <label className="elegant-label">Cover Image</label>
          <div className="image-upload-container">
            <label htmlFor={`edit-entry-cover-${item.id}`} className={`image-upload-box ${editCoverUrl ? 'has-image' : ''}`}>
              {editCoverUrl ? (
                <img src={editCoverUrl} alt="Preview" className="upload-preview" />
              ) : (
                <div className="upload-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>Tap to update cover</span>
                </div>
              )}
            </label>
            <input
              id={`edit-entry-cover-${item.id}`}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden-file-input"
            />
          </div>
        </div>

        <div className="form-row-split split-mini">
          <div className="form-group">
            <label className="elegant-label">Type</label>
            <div className="toggle-pill-group">
              <button
                className={`toggle-pill ${editType === 'anime' ? 'active' : ''}`}
                onClick={() => setEditType('anime')}
              >
                Anime
              </button>
              <button
                className={`toggle-pill ${editType === 'manga' ? 'active' : ''}`}
                onClick={() => setEditType('manga')}
              >
                Manga
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="elegant-label">Total</label>
            <div className="custom-number-wrapper">
              <input
                className="elegant-input number-input"
                type="number"
                min="1"
                placeholder="?"
                value={editTotal}
                onChange={(e) => setEditTotal(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="edit-actions" style={{ paddingTop: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
          <button className="btn-primary mini-btn" onClick={handleSaveEdit}>Save Changes</button>
          <button className="btn-secondary mini-btn" onClick={handleCancelEdit}>Cancel</button>
        </div>
      </div>
  );

  const itemGlowStyle = {};

  const renderHeader = (isModal = false) => {
    const ref = isModal ? modalTitleRef : titleRef;
    const overflowing = isModal ? isModalOverflowing : isOverflowing;

    return (
      <div className="item-main" onClick={() => { if(!isModal) setIsExpanded(true); }}>
        <div className="item-cover-wrapper">
          {item.coverUrl ? (
            <img src={item.coverUrl} alt={item.title} className="item-cover-img" />
          ) : (
            <div className="item-cover-fallback heading-serif">{item.title.charAt(0).toUpperCase()}</div>
          )}
        </div>

        <div className="item-content">
          <div className="item-meta-top">
            <span className="item-type">{typeLabel}</span>
            <div className="dot-divider"></div>
            <span className="item-status">{currentStatus.label}</span>
          </div>
          
          <h3 className="item-title heading-serif" title={item.title} ref={ref}>
            <span className={overflowing ? "item-title-scroll" : ""}>
              {item.title}
            </span>
          </h3>
          {item.alias && <div className="item-alias">{item.alias}</div>}
          
          {item.rating > 0 && (
            <div className="item-rating view-stars">
              {[...Array(item.rating)].map((_, i) => (
                <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon>
                </svg>
              ))}
            </div>
          )}
        </div>

        <div className="item-controls" onClick={(e) => e.stopPropagation()}>
          <div className="counter-display">
            {isEditingCurrent ? (
              <input
                type="number"
                className="counter-input"
                autoFocus
                value={editCurrentValue}
                onChange={(e) => setEditCurrentValue(e.target.value)}
                onBlur={handleCurrentSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCurrentSubmit();
                  if (e.key === 'Escape') {
                    setEditCurrentValue(item.current);
                    setIsEditingCurrent(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                className={`counter-current ${isPop ? 'count-pop' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditCurrentValue(item.current);
                  setIsEditingCurrent(true);
                }}
                title="Click to edit"
              >
                {item.current}
              </span>
            )}
            <span className="counter-divider">/</span>
            <span className="counter-total">{item.total ? item.total : '—'}</span>
          </div>
          <div className="counter-actions">
            <button className="counter-btn" onClick={handleDecrement} disabled={item.current === 0}>−</button>
            <button className="counter-btn" onClick={handleIncrement} disabled={isCompleted}>+</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div 
        ref={cardRef}
        className={`elegant-item scroll-animate ${isVisible ? 'is-visible' : ''} ${isCompleted ? 'completed' : ''}`}
      >
        {renderHeader(false)}

      {item.total > 0 && (
        <div className="progress-container">
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
      </div>

      {/* Expanded State Modal */}
      {(isExpanded || isEditing) && createPortal(
        <div className="modal-overlay" onClick={() => { if (!isEditing) setIsExpanded(false); }}>
          <div className={`modal-content fade-in ${isCompleted && !isEditing ? 'completed' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '100%', padding: 0, background: 'var(--bg-main)', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', border: '1px solid var(--border-focus)', cursor: 'default' }}>
            {isEditing ? renderEditForm() : (
              <>
                {renderHeader(true)}
                {item.total > 0 && (
                  <div className="progress-container">
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )}
                <div className="item-expanded" style={{ borderTop: '1px solid var(--border-light)', marginTop: 0, paddingTop: '1.5rem' }}>
              <div className="expanded-section" style={{ marginTop: 0 }}>
                <label className="expanded-label">Update Status</label>
                <div className="expanded-pills">
                  {Object.entries(statusConfig).map(([key, val]) => (
                    <button
                      key={key}
                      className={`sub-pill-btn ${item.status === key ? 'active' : ''}`}
                      onClick={() => handleStatusChange(key)}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="expanded-section">
                <label className="expanded-label">Rating</label>
                <div className="rating-dots">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`rating-star-btn ${star <= item.rating ? 'active' : ''}`}
                      onClick={() => handleRating(star)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div className="expanded-section">
                <label className="expanded-label">Notes</label>
                <textarea
                  className="elegant-textarea"
                  placeholder="Add your thoughts here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  rows={2}
                />
              </div>

              <div className="expanded-footer">
                <button className="edit-btn" onClick={() => { setIsEditing(true); setIsExpanded(false); }}>
                  Edit Info
                </button>
                <button className="delete-btn" onClick={handleDelete}>
                  Remove from List
                </button>
              </div>
              </div>
             </>
            )}
          </div>
        </div>,
        document.body
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)} style={{ zIndex: 100000 }}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px', width: '90%', background: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-focus)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <p style={{ color: 'var(--surface-cream)', marginBottom: '2rem', fontSize: '1rem', lineHeight: '1.5', textAlign: 'left' }}>
              Delete <strong>{item.title}</strong> from collection?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: '0.5rem 1.25rem', background: 'transparent', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-pill)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={() => { setShowDeleteConfirm(false); onDelete(item.id); }}
                style={{ padding: '0.5rem 1.25rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: '600', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-pill)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
