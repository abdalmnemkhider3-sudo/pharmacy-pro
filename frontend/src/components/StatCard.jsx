import Icon from './Icon.jsx';

/** بطاقة إحصائية للوحات التحكم. tone: teal | amber | rose | sky */
export default function StatCard({ icon, label, value, tone = 'teal', hint }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <span className="stat-icon">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}
