import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Spinner } from '../components/Spinner.jsx';

export default function MessageThread() {
  const { otherId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [otherName, setOtherName] = useState(searchParams.get('name') || '');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  async function load() {
    setError('');
    try {
      const res = await api.get(`/messages/thread?with=${otherId}`);
      setMessages(res.data.messages);
      if (res.data.with?.full_name) setOtherName(res.data.with.full_name);
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر تحميل المحادثة.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    load();
  }, [otherId]);

  useEffect(() => {
    // نتحقق أن الدالة موجودة فعليًا قبل استدعائها: بعض بيئات العرض
    // (متصفحات مضمّنة قديمة، أو أدوات اختبار) لا تنفّذها، وكانت هذه السطر
    // تُسقط الصفحة بالكامل (خطأ "scrollIntoView is not a function") وتُظهر
    // شاشة "حدث خطأ غير متوقع" بدل المحادثة.
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setError('');
    setSending(true);
    try {
      await api.post('/messages', { receiver_id: Number(otherId), message_text: text.trim() });
      setText('');
      await load();
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر إرسال الرسالة.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <PageHeader icon="message" title={otherName || 'محادثة'}>
        <Link to="/messages" className="back-link">
          <Icon name="arrow" size={15} style={{ transform: 'scaleX(-1)' }} />
          كل المحادثات
        </Link>
      </PageHeader>

      {error && <div className="form-error">{error}</div>}

      <div className="panel">
        {loading ? (
          <Spinner />
        ) : (
          <div className="chat-box">
            {messages.length === 0 && <p className="muted">ابدأ المحادثة برسالة.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.sender_id === user.id ? 'bubble-mine' : 'bubble-theirs'}`}>
                {m.message_text}
                <time>{new Date(m.created_at).toLocaleString('ar-SD')}</time>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        <form className="chat-composer" onSubmit={handleSend}>
          <textarea
            placeholder="اكتب رسالتك…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button className="btn btn-primary" type="submit" disabled={sending}>
            <Icon name="send" size={16} />
            إرسال
          </button>
        </form>
      </div>
    </div>
  );
}
