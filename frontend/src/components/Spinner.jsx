export function Spinner({ label = 'جارِ التحميل…' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}

/** هيكل عظمي لبطاقات قيد التحميل. */
export function CardSkeletons({ count = 6 }) {
  return (
    <div className="card-grid" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="item-card skeleton-card" key={i}>
          <span className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
          <span className="skeleton" style={{ width: '70%', height: 16 }} />
          <span className="skeleton" style={{ width: '40%', height: 14 }} />
          <span className="skeleton" style={{ width: '90%', height: 12 }} />
        </div>
      ))}
    </div>
  );
}
