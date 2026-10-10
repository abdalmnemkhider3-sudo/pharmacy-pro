import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

export default function NotFound() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="page" style={{ maxWidth: 460 }}>
      <div className="panel" style={{ textAlign: 'center', padding: '52px 24px' }}>
        <span className="empty-icon" style={{ width: 64, height: 64 }}>
          <Icon name="alert" size={30} />
        </span>
        <h1 style={{ fontSize: '1.8rem', margin: '16px 0 6px' }}>الصفحة غير موجودة</h1>
        <p className="muted" style={{ marginBottom: 20 }}>الرابط الذي فتحته غير صحيح أو أُزيلت الصفحة.</p>
        <Link to="/" className="btn btn-primary">
          <Icon name="home" size={16} />
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
