import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Icon, { BrandMark } from './components/Icon.jsx';
import useUiEnhancements from './hooks/useUiEnhancements.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Medicines from './pages/Medicines.jsx';
import Cart from './pages/Cart.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import RegisterPharmacy from './pages/RegisterPharmacy.jsx';
import PatientDashboard from './pages/PatientDashboard.jsx';
import PharmacyDashboard from './pages/PharmacyDashboard.jsx';
import DoctorDashboard from './pages/DoctorDashboard.jsx';
import DeliveryDashboard from './pages/DeliveryDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Messages from './pages/Messages.jsx';
import MessageThread from './pages/MessageThread.jsx';
import NotFound from './pages/NotFound.jsx';
import { useAuth } from './context/AuthContext.jsx';

const ALL_ROLES = ['patient', 'doctor', 'pharmacy', 'delivery', 'admin'];

const DASHBOARD_BY_ROLE = {
  patient: '/dashboard/patient',
  pharmacy: '/dashboard/pharmacy',
  doctor: '/dashboard/doctor',
  delivery: '/dashboard/delivery',
  admin: '/dashboard/admin',
};

/** تخطيط صفحات المصادقة (تسجيل الدخول / إنشاء حساب / تسجيل صيدلية): لوحة جانبية للهوية + بطاقة النموذج */
function AuthLayout({ children, aside }) {
  return (
    <div className="app-shell">
      <div className="auth-shell">
        <aside className="auth-aside">
          <div className="auth-aside-top">
            <span className="brand">
              <BrandMark size={38} />
              صيدلية برو
            </span>
            <h2>{aside?.title ?? 'دواؤك وصيدليتك في مكان واحد'}</h2>
            <p>{aside?.text ?? 'منصة تجمع المرضى بالصيدليات الموثّقة والأطباء ومندوبي التوصيل.'}</p>
          </div>
          <div className="auth-aside-points">
            {(
              aside?.points ?? [
                { icon: 'shield', title: 'صيدليات مُراجَعة', text: 'كل صيدلية تمر بتوثيق من الإدارة قبل ظهورها.' },
                { icon: 'file', title: 'روشتتك بأمان', text: 'صورة الروشتة تصل لطرف واحد فقط تحدّده أنت.' },
                { icon: 'truck', title: 'تتبّع حتى الباب', text: 'من تأكيد الدفع إلى وصول المندوب، خطوة بخطوة.' },
              ]
            ).map((point) => (
              <div className="auth-aside-point" key={point.title}>
                <span className="auth-aside-point-icon">
                  <Icon name={point.icon} size={17} />
                </span>
                <div>
                  <strong>{point.title}</strong>
                  <span>{point.text}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="auth-aside-foot">صيدلية برو © {new Date().getFullYear()}</p>
        </aside>
        <div className="auth-main">
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div className="auth-card-mobile-brand">
              <span className="brand" style={{ color: 'var(--teal-900)' }}>
                <BrandMark size={34} />
                صيدلية برو
              </span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** تخطيط التطبيق الرئيسي بعد تسجيل الدخول — يحتوي على Navbar + Footer */
function MainLayout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

/** صفحة شاشة التحميل الأنيقة — تظهر أثناء فحص المصادقة */
function LoadingScreen() {
  return (
    <div className="app-shell boot-screen">
      <div className="boot-screen-inner">
        <BrandMark size={56} />
        <h2>صيدلية برو</h2>
        <span className="spinner" role="status" />
        <span className="muted">جارِ التحميل…</span>
      </div>
    </div>
  );
}

/**
 * المُعالِج الذكي لإعادة التوجيه:
 *  - لو المستخدم مسجل بالفعل وحاول فتح /login → /register → يحوله إلى لوحة تحكمه.
 *  - لو المستخدم غير مسجل وحاول فتح أي شيء → يحوله إلى /login.
 *  يعمل فقط من داخل <Routes> حتى لا نكسر قواعد React Router.
 */
function AuthRedirect({ children, requireLoggedIn = false }) {
  const { user } = useAuth();
  const location = useLocation();

  if (requireLoggedIn && !user) {
    // حفظ المسار ليعود إليه بعد تسجيل الدخول
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!requireLoggedIn && user) {
    // مسجل بالفعل → لوحة تحكمه أو المسار الذي حفظناه
    const redirectTo = location.state?.from || DASHBOARD_BY_ROLE[user.role] || '/';
    return <Navigate to={redirectTo} replace />;
  }
  return children;
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* =============================================== */}
      {/* صفحات المصادقة — مستقلة تمامًا بدون Navbar / Footer */}
      {/* =============================================== */}
      <Route
        path="/login"
        element={
          <AuthRedirect requireLoggedIn={false}>
            <AuthLayout>
              <Login />
            </AuthLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRedirect requireLoggedIn={false}>
            <AuthLayout
              aside={{
                title: 'انضم إلى صيدلية برو',
                text: 'حساب واحد يناسب المريض والطبيب ومندوب التوصيل، كلٌّ بلوحته الخاصة.',
                points: [
                  { icon: 'user', title: 'مريض', text: 'ابحث عن الدواء وارفع روشتتك.' },
                  { icon: 'doctor', title: 'طبيب', text: 'استقبل الروشتات وتواصل مع مرضاك.' },
                  { icon: 'truck', title: 'مندوب توصيل', text: 'استلم الطلبات المسندة إليك وسلّمها.' },
                ],
              }}
            >
              <Register />
            </AuthLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/register-pharmacy"
        element={
          <AuthRedirect requireLoggedIn={false}>
            <AuthLayout
              aside={{
                title: 'سجّل صيدليتك',
                text: 'انضم كصيدلية موثّقة وابدأ استقبال الطلبات والروشتات من مرضى قريبين منك.',
                points: [
                  { icon: 'shield', title: 'مراجعة وتوثيق', text: 'فريقنا يراجع الطلب قبل ظهورك للمرضى.' },
                  { icon: 'pill', title: 'إدارة مخزون كاملة', text: 'أضف أدويتك وأسعارك وكمياتك بسهولة.' },
                  { icon: 'card', title: 'مراجعة الدفع أولًا بأول', text: 'تحقّق من كل إيصال قبل تجهيز الطلب.' },
                ],
              }}
            >
              <RegisterPharmacy />
            </AuthLayout>
          </AuthRedirect>
        }
      />

      {/* =============================================== */}
      {/* الصفحات المحمية — مع Navbar + Footer */}
      {/* =============================================== */}
      <Route
        path="/"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <ProtectedRoute roles={ALL_ROLES}>
                <Home />
              </ProtectedRoute>
            </MainLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/medicines"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <ProtectedRoute roles={ALL_ROLES}>
                <Medicines />
              </ProtectedRoute>
            </MainLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/cart"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <ProtectedRoute roles={['patient']}>
                <Cart />
              </ProtectedRoute>
            </MainLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/messages"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <ProtectedRoute roles={ALL_ROLES}>
                <Messages />
              </ProtectedRoute>
            </MainLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/messages/:otherId"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <ProtectedRoute roles={ALL_ROLES}>
                <MessageThread />
              </ProtectedRoute>
            </MainLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/dashboard/patient"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <ProtectedRoute roles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            </MainLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/dashboard/pharmacy"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <ProtectedRoute roles={['pharmacy']}>
                <PharmacyDashboard />
              </ProtectedRoute>
            </MainLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/dashboard/doctor"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <ProtectedRoute roles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            </MainLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/dashboard/delivery"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <ProtectedRoute roles={['delivery']}>
                <DeliveryDashboard />
              </ProtectedRoute>
            </MainLayout>
          </AuthRedirect>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            </MainLayout>
          </AuthRedirect>
        }
      />

      {/* =============================================== */}
      {/* الصفحة غير الموجودة — محمية كذلك */}
      {/* =============================================== */}
      <Route
        path="*"
        element={
          <AuthRedirect requireLoggedIn>
            <MainLayout>
              <NotFound />
            </MainLayout>
          </AuthRedirect>
        }
      />
    </Routes>
  );
}

export default function App() {
  // يحوّل الجداول إلى بطاقات مقروءة على الجوال، ويربط كل تسمية بحقلها تلقائيًا
  useUiEnhancements();
  return <AppContent />;
}
