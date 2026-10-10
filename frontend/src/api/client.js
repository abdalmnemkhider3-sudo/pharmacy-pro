// API_URL:
//   - فارغ  → نستخدم Proxy Vite الداخلي: /api/*  عبر نفس منفذ Vite (5173)
//   - موجود → نستخدمه مباشرة كعنوان الخادم (مطلوب في الإنتاج عند نشر dist بدون Proxy)
const RAW_API_URL = (import.meta.env.VITE_API_URL ?? '').trim();
const API_URL = RAW_API_URL.length > 0 ? RAW_API_URL.replace(/\/+$/, '') : '';

const NETWORK_ERROR_MESSAGE = 'تعذّر الاتصال بالخادم. تأكد من تشغيل الخلفية ومن اتصال الإنترنت ثم حاول مجددًا.';
const BAD_RESPONSE_MESSAGE = 'وصل من الخادم ردّ غير صالح. تأكد أن خادم الخلفية (PHP) يعمل بلا أخطاء ثم أعد المحاولة.';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // نفس حد الخادم
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** قيمة accept لحقول رفع الصور: نفس الأنواع التي يقبلها الخادم فقط (كان image/* يسمح باختيار GIF ثم يرفضه الخادم). */
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(',');

/** يتحقق من الصورة قبل الرفع. يرجع رسالة خطأ عربية أو null إن كانت سليمة. */
export function checkImage(file) {
  if (!file) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'نوع الصورة غير مدعوم. المسموح: JPG أو PNG أو WEBP.';
  if (file.size > MAX_IMAGE_BYTES) return 'حجم الصورة يتجاوز 5MB.';
  return null;
}

function authHeaders() {
  const token = localStorage.getItem('pp_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearAuthAndRedirect() {
  localStorage.removeItem('pp_token');
  localStorage.removeItem('pp_user');
  const currentPath = window.location.pathname;
  if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/register-pharmacy') {
    window.location.replace('/login');
    return true;
  }
  return false;
}

async function handle(response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  let body = null;
  let parseFailed = false;
  try {
    body = isJson ? await response.json() : null;
  } catch {
    body = null;
    parseFailed = true;
  }

  // 5xx بلا أي جسم JSON على الإطلاق: هذا ليس خطأ من كودنا (Response::error يُرسل دائمًا
  // JSON صالحًا) بل رسالة بوابة وسيطة — غالبًا بروكسي Vite في بيئة التطوير عندما يكون خادم
  // PHP غير مُشغَّل أصلًا (ECONNREFUSED)، أو Nginx/Apache عند تعطّل PHP-FPM في الإنتاج.
  // رسالة "خطأ في الخادم، حاول لاحقًا" مضلِّلة هنا؛ الأدق هو توجيه المستخدم لتشغيل الخلفية.
  if (!response.ok && !isJson && [500, 502, 503, 504].includes(response.status)) {
    const err = new Error(NETWORK_ERROR_MESSAGE);
    err.status = response.status;
    err.network = true;
    throw err;
  }

  // ردّ ناجح (2xx) لكن بلا JSON صالح: لا يحدث هذا مع الخادم السليم (كل استجابة ناجحة
  // تُرسل كائن JSON)، لكن قد يحدث لو تعطّل الخادم جزئيًا أو طُبعت رسالة PHP وسط الرد.
  // بدل إرجاع null وترك الصفحة تنهار عند قراءة res.data، نحوّلها لخطأ واضح يُعرض للمستخدم.
  if (response.ok && (body === null || typeof body !== 'object')) {
    const err = new Error(BAD_RESPONSE_MESSAGE);
    err.status = response.status;
    err.badResponse = true;
    throw err;
  }

  if (response.status === 401) {
    const redirected = clearAuthAndRedirect();
    const err = new Error(redirected ? '__redirecting__' : (body?.message || 'انتهت صلاحية الجلسة.'));
    err.status = 401;
    err.silent = redirected;
    throw err;
  }

  if (!response.ok) {
    let message = 'حدث خطأ غير متوقع.';
    if (body?.message && typeof body.message === 'string') {
      message = body.message;
    } else if (parseFailed) {
      message = BAD_RESPONSE_MESSAGE;
    } else if (response.status === 403) {
      message = 'غير مصرح لك بتنفيذ هذا الإجراء.';
    } else if (response.status === 404) {
      message = 'العنصر المطلوب غير موجود.';
    } else if (response.status >= 500) {
      message = 'حدث خطأ في الخادم، يرجى المحاولة لاحقًا.';
    }
    const error = new Error(message);
    error.status = response.status;
    error.errors = body?.errors;
    throw error;
  }
  return body;
}

/** غلاف fetch: فشل الشبكة يصبح رسالة عربية مفهومة بدل "Failed to fetch" الإنجليزية. */
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(buildUrl(path), options);
  } catch {
    const err = new Error(NETWORK_ERROR_MESSAGE);
    err.network = true;
    throw err;
  }
  return handle(response);
}

/**
 * تُنشئ عنوان URL النهائي:
 *  - مع Proxy (API_URL فارغ): /api/auth/login  أو  /uploads/x.jpg
 *  - بدون Proxy: {API_URL}/auth/login  أو  {API_URL}/uploads/x.jpg
 */
function buildUrl(path, { stripApiPrefix = false } = {}) {
  const base = API_URL === '' ? (stripApiPrefix ? '' : '/api') : API_URL;
  return `${base}${path}`;
}

export const api = {
  get(path) {
    return request(path, { headers: { ...authHeaders() } });
  },
  post(path, data) {
    return request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data ?? {}),
    });
  },
  put(path, data) {
    return request(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data ?? {}),
    });
  },
  patch(path, data) {
    return request(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data ?? {}),
    });
  },
  delete(path) {
    return request(path, { method: 'DELETE', headers: { ...authHeaders() } });
  },
  /** لإرسال multipart/form-data (رفع صور) */
  postForm(path, formData) {
    return request(path, {
      method: 'POST',
      headers: { ...authHeaders() }, // لا نضبط Content-Type يدويًا ليضيف المتصفح الحد الفاصل الصحيح
      body: formData,
    });
  },
  /**
   * يجلب صورة محمية كـ Blob مع رأس Authorization.
   * (كان التوكن يوضع في رابط الصورة ?token=... فيتسرّب في سجلات الخادم وسجل المتصفح.)
   */
  async blob(filename) {
    let response;
    try {
      response = await fetch(buildUrl(`/uploads/${encodeURIComponent(filename)}`, { stripApiPrefix: true }), {
        headers: { ...authHeaders() },
      });
    } catch {
      const err = new Error(NETWORK_ERROR_MESSAGE);
      err.network = true;
      throw err;
    }
    if (response.status === 401) {
      clearAuthAndRedirect();
    }
    if (!response.ok) {
      const err = new Error('تعذّر تحميل الصورة.');
      err.status = response.status;
      throw err;
    }
    return response.blob();
  },
};
