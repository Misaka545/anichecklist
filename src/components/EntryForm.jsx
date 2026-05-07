import { useState } from 'react';
import WindowFrame from './WindowFrame';
import { compressAndEncodeImage } from '../utils/imageCompressor';
import './EntryForm.css';
export default function EntryForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [type, setType] = useState('anime');
  const [total, setTotal] = useState('');
  const [status, setStatus] = useState('watching');
  const [alias, setAlias] = useState('');
  const [isOpen, setIsOpen] = useState(false);

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

    setTitle('');
    setCoverUrl('');
    setTotal('');
    setAlias('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button className="open-form-btn fade-in" onClick={() => setIsOpen(true)}>
        + Add to Collection
      </button>
    );
  }

  return (
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
            <div className="pill-group">
              <button
                type="button"
                className={`pill-btn ${type === 'anime' ? 'active' : ''}`}
                onClick={() => setType('anime')}
              >
                Anime
              </button>
              <button
                type="button"
                className={`pill-btn ${type === 'manga' ? 'active' : ''}`}
                onClick={() => setType('manga')}
              >
                Manga
              </button>
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
                type="number"
                min="0"
                placeholder="-"
                value={total}
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
              { value: 'watching', label: type === 'manga' ? 'Reading' : 'Watching' },
              { value: 'planned', label: type === 'manga' ? 'Plan to Read' : 'Plan to Watch' },
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
          <button type="button" className="elegant-cancel-btn" onClick={() => setIsOpen(false)}>
            Cancel
          </button>
          <button type="submit" className="elegant-submit-btn" disabled={!title.trim()}>
            Save Entry
          </button>
        </div>
      </form>
    </WindowFrame>
  );
}
