import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api, checkImage, IMAGE_ACCEPT } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Cart() {
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const redirectTimer = useRef(null);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  function pickProof(file) {
    const problem = checkImage(file);
    if (problem) {
      setError(problem);
      setProofImage(null);
      return;
    }
    setError('');
    setProofImage(file || null);
  }

  async function handleCheckout(e) {
    e.preventDefault();
    setError('');
    setErrors([]);

    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'patient') {
      setError('الشراء متاح لحسابات المرضى فقط.');
      return;
    }
    if (!proofImage) {
      setError('يرجى إرفاق صورة إيصال التحويل لتأكيد الدفع.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('pharmacy_id', cart.pharmacyId);
      fd.append('delivery_address', address);
      fd.append('notes', notes);
      fd.append(
        'items',
        JSON.stringify(cart.items.map((i) => ({ medicine_id: i.id, quantity: i.quantity })))
      );
      fd.append('payment_proof_image', proofImage);

      await api.postForm('/orders', fd);
      cart.clearCart();
      setSuccess('تم إرسال طلبك بنجاح! ستُراجع الصيدلية إيصال التحويل وتؤكّد طلبك قريبًا.');
      redirectTimer.current = setTimeout(() => navigate('/dashboard/patient'), 2500);
    } catch (err) {
      setError(err.message);
      setErrors(err.errors || []);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="page" style={{ maxWidth: 520 }}>
        <div className="panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <span className="empty-icon" style={{ background: 'var(--teal-100)', color: 'var(--teal-700)' }}>
            <Icon name="check" size={26} />
          </span>
          <h2 style={{ margin: '14px 0 6px' }}>تم إرسال طلبك</h2>
          <p className="muted" style={{ maxWidth: '38ch', margin: '0 auto' }}>{success}</p>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="page" style={{ maxWidth: 520 }}>
        <PageHeader icon="cart" title="السلة فارغة" />
        <div className="panel">
          <EmptyState icon="cart" title="لا شيء هنا بعد" text="تصفّح الأدوية المتوفرة وأضِف ما تحتاجه لتبدأ طلبك.">
            <Link to="/medicines" className="btn btn-primary btn-sm">
              تصفّح الأدوية
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <PageHeader icon="cart" title="سلة الشراء" subtitle={`صيدلية ${cart.pharmacyName}`} />

      <div className="panel">
        {cart.items.map((item) => (
          <div className="cart-row" key={item.id}>
            <div>
              <strong>{item.medicine_name}</strong>
              <div className="muted">{Number(item.price).toLocaleString('ar-SD')} جنيه للوحدة</div>
            </div>
            <div className="qty-control">
              <button type="button" onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}>
                −
              </button>
              <span>{item.quantity}</span>
              <button type="button" onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}>
                +
              </button>
              <button className="btn btn-danger btn-sm" type="button" onClick={() => cart.removeItem(item.id)}>
                حذف
              </button>
            </div>
          </div>
        ))}
        <div className="cart-total">
          <span>الإجمالي</span>
          <span>{cart.total.toLocaleString('ar-SD')} جنيه</span>
        </div>
      </div>

      <form className="panel" onSubmit={handleCheckout}>
        <h2>إتمام الطلب</h2>
        {error && (
          <div className="form-error" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alert" size={16} />
              {error}
            </span>
            {errors.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingInlineStart: 20 }}>
                {errors.map((er) => (
                  <li key={er}>{er}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {!user && <p className="muted">يجب تسجيل الدخول كمريض لإتمام الشراء.</p>}

        <div className="field">
          <label>عنوان التوصيل</label>
          <input required value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="field">
          <label>ملاحظات (اختياري)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="field">
          <label>صورة إيصال التحويل البنكي</label>
          <input className="file-field" type="file" accept={IMAGE_ACCEPT} required onChange={(e) => pickProof(e.target.files[0])} />
          <span className="muted">حوّل مبلغ الطلب لحساب الصيدلية، ثم أرفق صورة الإيصال هنا للتأكيد.</span>
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting || !user}>
          {submitting ? 'جارِ الإرسال…' : `إرسال الطلب (${cart.total.toLocaleString('ar-SD')} جنيه)`}
        </button>
      </form>
    </div>
  );
}
