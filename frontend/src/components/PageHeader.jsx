import Icon from './Icon.jsx';

/** رأس الصفحة الموحّد: أيقونة + عنوان + وصف + مساحة لأزرار جانبية. */
export default function PageHeader({ icon, title, subtitle, children }) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        {icon && (
          <span className="page-header-icon">
            <Icon name={icon} size={24} />
          </span>
        )}
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children && <div className="page-header-side">{children}</div>}
    </div>
  );
}
