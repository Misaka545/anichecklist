import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import WindowFrame from './WindowFrame';
import { compressAndEncodeImage } from '../utils/imageCompressor';
import './EntryForm.css';
export default function EntryForm({ onAdd, prefillData, isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [type, setType] = useState('anime');
  const [total, setTotal] = useState('');
  const [status, setStatus] = useState('watching');
  const [alias, setAlias] = useState('');

  useEffect(() => {
    if (prefillData) {
      setTitle(prefillData.title || '');
      setCoverUrl(prefillData.imageSrc || '');
      setType(prefillData.meta || 'anime');
    }
  }, [prefillData]);

  const hasPushedState = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (!hasPushedState.current) {
        window.history.pushState({ modalOpen: 'entryForm' }, '');
        hasPushedState.current = true;
      }
      const handlePopState = () => {
        if (onClose) onClose();
        hasPushedState.current = false;
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    } else {
      hasPushedState.current = false;
    }
  }, [isOpen, onClose]);

  const closeModal = () => {
    if (onClose) onClose();
    if (hasPushedState.current && window.history.state?.modalOpen === 'entryForm') {
      window.history.back();
    }
    hasPushedState.current = false;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64Url = await compressAndEncodeImage(file);
      setCoverUrl(base64Url);
    } catch (err) {
      console.error(err);
      alert('Failed to process image');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      id: Date.now(),
      title: title.trim(),
      coverUrl: coverUrl.trim(),
      type,
      current: 0,
      total: total ? parseInt(total, 10) : null,
      status,
      alias: alias.trim(),
      rating: 0,
      notes: '',
      createdAt: new Date().toISOString(),
    });

    setAlias('');
    closeModal();
  };

  return (
    <>
      {isOpen && createPortal(
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content fade-in" onClick={(e) => e.stopPropagation()}>
            <WindowFrame title="New Entry">
              <form className="elegant-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="elegant-label">Title</label>
                  <input
                    id="entry-title"
                    className="elegant-input"
                    type="text"
                    placeholder="Name of the series..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoComplete="off"
                    enterKeyHint="done"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="elegant-label">Alias (Alternative Name)</label>
                  <input
                    className="elegant-input"
                    type="text"
                    placeholder="e.g. KonoSuba"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                </div>

                <div className="form-group">
                  <label className="elegant-label">Cover Image</label>
                  <div className="image-upload-container">
                    <label htmlFor="new-entry-cover" className={`image-upload-box ${coverUrl ? 'has-image' : ''}`}>
                      {coverUrl ? (
                        <img src={coverUrl} alt="Preview" className="upload-preview" />
                      ) : (
                        <div className="upload-placeholder">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                          <span>Tap to select cover</span>
                        </div>
                      )}
                    </label>
                    <input
                      id="new-entry-cover"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden-file-input"
                    />
                  </div>
                </div>

                <div className="form-row-split">
                  <div className="form-group">
                    <label className="elegant-label">Type</label>
                    <div className="status-pills">
                      {['anime', 'manga', 'movie', 'magazine', 'book'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={`status-pill-btn ${type === t ? 'active' : ''}`}
                          onClick={() => setType(t)}
                          style={{ textTransform: 'capitalize' }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="elegant-label">Total Unit</label>
                    <div className="number-stepper">
                      <button 
                        type="button" 
                        className="step-btn"
                        onClick={() => setTotal(t => t ? Math.max(0, parseInt(t) - 1).toString() : '0')}
                      >-</button>
                      <input
                        id="entry-total"
                        className="elegant-input text-center"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="0"
                        placeholder="-"
                        value={total}
                        enterKeyHint="done"
                        onChange={(e) => setTotal(e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="step-btn"
                        onClick={() => setTotal(t => t ? (parseInt(t) + 1).toString() : '1')}
                      >+</button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="elegant-label">Status</label>
                  <div className="status-pills">
                    {[
                      { value: 'watching', label: ['manga', 'magazine', 'book'].includes(type) ? 'Reading' : 'Watching' },
                      { value: 'planned', label: ['manga', 'magazine', 'book'].includes(type) ? 'Plan to Read' : 'Plan to Watch' },
                      { value: 'on-hold', label: 'On Hold' },
                      { value: 'completed', label: 'Completed' },
                    ].map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        className={`status-pill-btn ${status === s.value ? 'active' : ''}`}
                        onClick={() => setStatus(s.value)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="elegant-cancel-btn" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="elegant-submit-btn" disabled={!title.trim()}>
                    Save Entry
                  </button>
                </div>
              </form>
            </WindowFrame>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
