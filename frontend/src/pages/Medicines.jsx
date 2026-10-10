import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { CardSkeletons } from '../components/Spinner.jsx';

export default function Medicines() {
  const { user } = useAuth();
  const cart = useCart();
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedId, setAddedId] = useState(null);
  const [notice, setNotice] = useState('');

  async function load(q = '') {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/medicines${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setMedicines(res.data.medicines);
    } catch (e) {
      if (e.silent || e.status === 401) return;
      setError(e.message || 'تعذّر تحميل الأدوية.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    load(query);
  }

  function handleAddToCart(m) {
    const result = cart.addItem(m);
    if (result === 'max') {
      setNotice(`وصلت للحد الأقصى المتوفر من «${m.medicine_name}» (${m.quantity}).`);
      return;
    }
    if (result !== 'added') return; // ألغى المستخدم إفراغ السلة: لا نُظهر «أُضيف»
    setNotice('');
    setAddedId(m.id);
    setTimeout(() => setAddedId((id) => (id === m.id ? null : id)), 1500);
  }

  return (
    <div className="page">
      <PageHeader
        icon="pill"
        title="الأدوية المتوفرة"
        subtitle="ابحث باسم الدواء، وأضِف ما تحتاجه للسلة لشرائه مباشرة من الصيدلية."
      />

      <form className="panel search-form" onSubmit={handleSubmit}>
        <div className="search-field">
          <input placeholder="اسم الدواء…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Icon name="search" size={17} />
        </div>
        <button className="btn btn-primary" type="submit">
          بحث
        </button>
      </form>

      {error && (
        <div className="form-error">
          <Icon name="alert" size={16} />
          {error}
        </div>
      )}
      {notice && (
        <div className="form-error">
          <Icon name="alert" size={16} />
          {notice}
        </div>
      )}
      {cart.count > 0 && (
        <div className="form-success" style={{ justifyContent: 'space-between' }}>
          <span>
            سلتك من صيدلية {cart.pharmacyName}: {cart.count} عنصر — {cart.total.toLocaleString('ar-SD')} جنيه
          </span>
          <Link to="/cart" className="btn btn-primary btn-sm">
            إتمام الشراء
          </Link>
        </div>
      )}

      {loading ? (
        <CardSkeletons count={6} />
      ) : medicines.length === 0 ? (
        <EmptyState icon="search" title="لا توجد نتائج مطابقة" text="جرّب اسمًا آخر للدواء، أو تصفّح لاحقًا." />
      ) : (
        <div className="grid-2">
          {medicines.map((m) => (
            <div className="item-card" key={m.id}>
              <h3>{m.medicine_name}</h3>
              <span className="item-price">{Number(m.price).toLocaleString('ar-SD')} جنيه</span>
              <span className="muted">صيدلية {m.pharmacy_name}</span>
              {m.pharmacy_address && <span className="muted">{m.pharmacy_address}</span>}
              {(!user || user.role === 'patient') && (
                <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => handleAddToCart(m)}>
                  {addedId === m.id ? (
                    <>
                      <Icon name="check" size={15} />
                      أُضيف
                    </>
                  ) : (
                    <>
                      <Icon name="cart" size={15} />
                      أضف للسلة
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
