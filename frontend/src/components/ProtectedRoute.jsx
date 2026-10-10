import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const DASHBOARD_BY_ROLE = {
  patient: '/dashboard/patient',
  pharmacy: '/dashboard/pharmacy',
  doctor: '/dashboard/doctor',
  delivery: '/dashboard/delivery',
  admin: '/dashboard/admin',
};

/**
 * شاشة تحميل صغيرة تظهر لحظة فحص الصلاحيات.
 * تستخدم لتجنب وميض شاشة بيضاء صارخ عند الانتقالات السريعة.
 */
function MiniLoader() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '3px solid #1e7a6322',
          borderTopColor: '#1e7a63',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <MiniLoader />;
  if (!user) return <Navigate to="/login" replace />;
  // لو الدور مسموح به في `roles` → تابع
  if (roles && !roles.includes(user.role)) {
    // المستخدم مسجل لكن دوره غير مسموح به هنا → أرسله إلى لوحة تحكمه بدلاً من الجذر
    const safe = DASHBOARD_BY_ROLE[user.role] || '/dashboard/patient';
    return <Navigate to={safe} replace />;
  }

  return children;
}
