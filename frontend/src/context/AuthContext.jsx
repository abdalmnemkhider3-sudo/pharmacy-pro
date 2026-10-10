import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearLocalAuth = useCallback(() => {
    localStorage.removeItem('pp_token');
    localStorage.removeItem('pp_user');
    setUser(null);
  }, []);

  /**
   * التحقق الحقيقي من المصادقة عبر /auth/me (يعيد بيانات المستخدم من قاعدة البيانات).
   * نمسح التوكن فقط عندما يرفضه الخادم (401/403)؛ أما تعطّل الشبكة أو خطأ 500 المؤقت
   * فلا يجب أن يُسجّل المستخدم خروجه ويفقد جلسته.
   */
  const verifyAuthFromServer = useCallback(async () => {
    const token = localStorage.getItem('pp_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      const freshUser = res.data.user;
      localStorage.setItem('pp_user', JSON.stringify(freshUser));
      setUser(freshUser);
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        clearLocalAuth();
      } else {
        setUser(null); // الخادم غير متاح مؤقتًا: نُبقي التوكن ليعمل الدخول تلقائيًا عند عودته
      }
    } finally {
      setLoading(false);
    }
  }, [clearLocalAuth]);

  useEffect(() => {
    verifyAuthFromServer();
  }, [verifyAuthFromServer]);

  /**
   * مزامنة الدخول/الخروج بين تبويبات المتصفح.
   * حدث storage يصل للتبويبات الأخرى فقط، وتغيّر pp_token وحده كافٍ لإعلامها.
   * (النسخة السابقة كانت تكتب مفتاحًا إضافيًا داخل clearLocalAuth فيُطلق كل تبويب
   * التحقق فيمسح فيُطلق التبويب الآخر… حلقة لا تنتهي تستهلك المعالج عند فتح تبويبين بجلسة منتهية.)
   */
  useEffect(() => {
    function onStorageChange(e) {
      if (e.key !== null && e.key !== 'pp_token') return;
      if (!localStorage.getItem('pp_token')) {
        setUser(null);
      } else {
        verifyAuthFromServer();
      }
    }
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, [verifyAuthFromServer]);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email: email.trim(), password });
    localStorage.setItem('pp_token', res.data.token);
    localStorage.setItem('pp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    clearLocalAuth();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshAuth: verifyAuthFromServer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
