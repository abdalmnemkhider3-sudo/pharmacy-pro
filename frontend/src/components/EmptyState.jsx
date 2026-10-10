import Icon from './Icon.jsx';

/** حالة فارغة ودّية بدل سطر رمادي جاف. */
export default function EmptyState({ icon = 'box', title, text, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
