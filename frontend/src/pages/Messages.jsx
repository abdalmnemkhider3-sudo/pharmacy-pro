import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Spinner } from '../components/Spinner.jsx';

const ROLE_LABELS = { patient: 'مريض', doctor: 'طبيب', pharmacy: 'صيدلية', delivery: 'مندوب توصيل', admin: 'أدمن' };

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setLoading(true);
    api
      .get('/messages/conversations')
      .then((res) => setConversations(res.data.conversations))
      .catch((e) => {
        if (e.silent || e.status === 401) return;
        setError(e.message || 'تعذّر تحميل المحادثات.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <PageHeader icon="message" title="الرسائل" subtitle="محادثاتك مع الأطباء والصيدليات ومندوبي التوصيل." />

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <Spinner />
      ) : conversations.length === 0 ? (
        <div className="panel">
          <EmptyState icon="message" title="لا توجد محادثات بعد" text="ابدأ محادثة من صفحة الأدوية أو لوحتك." />
        </div>
      ) : (
        <div className="thread-list">
          {conversations.map((c) => (
            <Link
              key={c.user_id}
              to={`/messages/${c.user_id}?name=${encodeURIComponent(c.full_name)}`}
              className="thread-row"
            >
              <span className="thread-row-avatar">{c.full_name?.[0] || '؟'}</span>
              <div className="thread-row-body">
                <strong>{c.full_name}</strong> <span className="muted">({ROLE_LABELS[c.role] || c.role})</span>
                <span className="preview">{c.last_message}</span>
              </div>
              {c.unread_count > 0 && <span className="cart-badge">{c.unread_count}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
