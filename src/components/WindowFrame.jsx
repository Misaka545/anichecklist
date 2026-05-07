import './WindowFrame.css';

export default function WindowFrame({ title, children }) {
  return (
    <div className="elegant-card fade-in">
      <div className="elegant-card-body">
        {title && <h2 className="elegant-card-title heading-serif">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
