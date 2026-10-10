import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

// إنشاء مفتاح تخزين خاص لكل مستخدم حتى لا تتداخل السلات بين حسابات مختلفة على نفس الجهاز
function getCartStorageKey(userId) {
  return userId ? `pp_cart_u${userId}` : 'pp_cart_guest';
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [pharmacyId, setPharmacyId] = useState(null);
  const [pharmacyName, setPharmacyName] = useState('');
  const [items, setItems] = useState([]); // [{id, medicine_name, price, quantity, maxQuantity}]

  // تحميل سلة المستخدم فور تغيير المستخدم (دخول/خروج)
  useEffect(() => {
    const key = getCartStorageKey(user?.id);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPharmacyId(parsed.pharmacyId ?? null);
        setPharmacyName(parsed.pharmacyName ?? '');
        setItems(parsed.items ?? []);
      } catch {
        // تجاهل بيانات سلة تالفة
        setPharmacyId(null);
        setPharmacyName('');
        setItems([]);
      }
    } else {
      // لا توجد سلة محفوظة لهذا المستخدم
      setPharmacyId(null);
      setPharmacyName('');
      setItems([]);
    }
  }, [user?.id]);

  function persist(nextPharmacyId, nextPharmacyName, nextItems) {
    const key = getCartStorageKey(user?.id);
    setPharmacyId(nextPharmacyId);
    setPharmacyName(nextPharmacyName);
    setItems(nextItems);
    if (nextItems.length > 0 || nextPharmacyId) {
      localStorage.setItem(
        key,
        JSON.stringify({ pharmacyId: nextPharmacyId, pharmacyName: nextPharmacyName, items: nextItems })
      );
    } else {
      localStorage.removeItem(key);
    }
  }

  /**
   * يضيف دواءً للسلة ويرجع: 'added' | 'max' (وصلت للحد المتاح) | 'cancelled' (رفض المستخدم إفراغ السلة).
   * إن كانت السلة تحتوي أدوية من صيدلية أخرى يُطلب تأكيد إفراغها أولًا.
   */
  function addItem(medicine) {
    const line = (quantity) => ({
      id: medicine.id,
      medicine_name: medicine.medicine_name,
      price: Number(medicine.price),
      quantity,
      maxQuantity: medicine.quantity,
    });

    if (pharmacyId && Number(pharmacyId) !== Number(medicine.pharmacy_id)) {
      const confirmed = confirm('سلتك تحتوي أدوية من صيدلية أخرى. هل تريد إفراغها وبدء طلب جديد من هذه الصيدلية؟');
      if (!confirmed) return 'cancelled';
      persist(medicine.pharmacy_id, medicine.pharmacy_name, [line(1)]);
      return 'added';
    }

    const existing = items.find((i) => i.id === medicine.id);
    if (existing && existing.quantity >= medicine.quantity) {
      return 'max';
    }
    // نحدّث السعر والحد الأقصى من آخر بيانات وصلت من الخادم (المحفوظ محليًا قد يكون قديمًا)
    const nextItems = existing
      ? items.map((i) => (i.id === medicine.id ? line(i.quantity + 1) : i))
      : [...items, line(1)];
    persist(medicine.pharmacy_id, medicine.pharmacy_name, nextItems);
    return 'added';
  }

  function updateQuantity(medicineId, quantity) {
    const nextItems = items.map((i) =>
      i.id === medicineId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity)) } : i
    );
    persist(pharmacyId, pharmacyName, nextItems);
  }

  function removeItem(medicineId) {
    const nextItems = items.filter((i) => i.id !== medicineId);
    persist(nextItems.length ? pharmacyId : null, nextItems.length ? pharmacyName : '', nextItems);
  }

  function clearCart() {
    persist(null, '', []);
  }

  const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ pharmacyId, pharmacyName, items, total, count, addItem, updateQuantity, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
