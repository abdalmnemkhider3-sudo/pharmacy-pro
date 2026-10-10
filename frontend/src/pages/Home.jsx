import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

const DASHBOARD_BY_ROLE = {
  patient: '/dashboard/patient',
  pharmacy: '/dashboard/pharmacy',
  doctor: '/dashboard/doctor',
  delivery: '/dashboard/delivery',
  admin: '/dashboard/admin',
};

const ROLE_LABEL = {
  patient: 'مريض',
  pharmacy: 'صيدلية',
  doctor: 'طبيب',
  delivery: 'مندوب توصيل',
  admin: 'مسؤول',
};

/** نص البطل وزرّه الأساسي وبطاقات الروابط السريعة، لكل دور بما يخصّه فعلًا */
const ROLE_CONTENT = {
  patient: {
    tagline: 'دواؤك وروشتتك في مكان واحد',
    text: 'ابحث عن الأدوية المتوفرة في الصيدليات الموثّقة القريبة منك، ارفع روشتتك مباشرة، وتابع طلبك حتى يصل بابك.',
    primaryCta: { to: '/medicines', label: 'ابحث عن دواء', icon: 'search' },
    quickLinks: [
      { to: '/medicines', icon: 'search', title: 'الأدوية', text: 'تصفّح المتوفر في الصيدليات الموثّقة.' },
      { to: '/cart', icon: 'cart', title: 'سلة الشراء', text: 'راجع اختياراتك قبل إتمام الطلب.' },
      { to: '/dashboard/patient', icon: 'file', title: 'روشتاتي وطلباتي', text: 'تابع حالة كل روشتة وطلب رفعته.' },
      { to: '/messages', icon: 'message', title: 'الرسائل', text: 'تواصل مع الصيدلية أو الطبيب مباشرة.' },
    ],
    closing: { title: 'وصلتك روشتة اليوم؟', text: 'ارفعها الآن لصيدلية أو طبيب موثّق وتابع حالتها أولًا بأول.', to: '/dashboard/patient', label: 'رفع روشتة' },
  },
  pharmacy: {
    tagline: 'صيدليتك، مخزونك، طلباتك — من مكان واحد',
    text: 'أدر مخزون الأدوية، راجع طلبات الشراء وإيصالات الدفع، واستقبل الروشتات الواردة من المرضى.',
    primaryCta: { to: '/dashboard/pharmacy', label: 'إلى لوحة الصيدلية', icon: 'dashboard' },
    quickLinks: [
      { to: '/dashboard/pharmacy', icon: 'pill', title: 'المخزون', text: 'أضف أو عدّل أدويتك وأسعارها.' },
      { to: '/dashboard/pharmacy', icon: 'card', title: 'طلبات الشراء', text: 'راجع إيصالات الدفع وجهّز الطلبات.' },
      { to: '/dashboard/pharmacy', icon: 'file', title: 'الروشتات الواردة', text: 'ردّ على روشتات المرضى الموجّهة إليك.' },
      { to: '/messages', icon: 'message', title: 'الرسائل', text: 'تواصل مباشرة مع المرضى.' },
    ],
    closing: { title: 'مخزونك محدَّث؟', text: 'أضف الأدوية الجديدة الآن ليظهرها البحث فورًا للمرضى القريبين منك.', to: '/dashboard/pharmacy', label: 'إدارة المخزون' },
  },
  doctor: {
    tagline: 'استشاراتك ومرضاك في مكان واحد',
    text: 'استقبل الروشتات الموجّهة إليك، تابع حالتها، وتواصل مع المرضى مباشرة عبر الرسائل.',
    primaryCta: { to: '/dashboard/doctor', label: 'إلى لوحة الطبيب', icon: 'dashboard' },
    quickLinks: [
      { to: '/dashboard/doctor', icon: 'file', title: 'الروشتات الواردة', text: 'راجعها وحدّث حالتها أولًا بأول.' },
      { to: '/messages', icon: 'message', title: 'الرسائل', text: 'تواصل مع مرضاك مباشرة.' },
      { to: '/medicines', icon: 'search', title: 'الأدوية', text: 'اطّلع على المتوفر في الصيدليات الموثّقة.' },
    ],
    closing: { title: 'روشتات بانتظار المراجعة', text: 'راجع الروشتات الواردة وحدّث حالتها ليطمئن المريض.', to: '/dashboard/doctor', label: 'مراجعة الروشتات' },
  },
  delivery: {
    tagline: 'طلباتك ومسارك اليوم',
    text: 'تابع الطلبات المُسندة إليك من الصيدليات وأكّد تسليمها فور وصولها.',
    primaryCta: { to: '/dashboard/delivery', label: 'إلى لوحة التوصيل', icon: 'dashboard' },
    quickLinks: [
      { to: '/dashboard/delivery', icon: 'truck', title: 'طلبات اليوم', text: 'الطلبات المسندة إليك الآن.' },
      { to: '/dashboard/delivery', icon: 'clock', title: 'سجل التسليمات', text: 'كل ما سلّمته سابقًا.' },
      { to: '/messages', icon: 'message', title: 'الرسائل', text: 'تواصل مع الصيدلية عند الحاجة.' },
    ],
    closing: { title: 'طلب جاهز للتسليم؟', text: 'حدّث حالته فور وصولك ليطمئن المريض والصيدلية معًا.', to: '/dashboard/delivery', label: 'عرض طلباتي' },
  },
  admin: {
    tagline: 'إدارة المنصة من مكان واحد',
    text: 'راجع طلبات تسجيل الصيدليات، أدر حسابات المستخدمين، وحافظ على جودة المنصة.',
    primaryCta: { to: '/dashboard/admin', label: 'إلى لوحة الإدارة', icon: 'dashboard' },
    quickLinks: [
      { to: '/dashboard/admin', icon: 'store', title: 'الصيدليات', text: 'وثّق الصيدليات الجديدة أو أدرها.' },
      { to: '/dashboard/admin', icon: 'users', title: 'المستخدمون', text: 'راجع الحسابات وحالاتها.' },
      { to: '/messages', icon: 'message', title: 'الرسائل', text: 'تواصل مباشرة عند الحاجة.' },
    ],
    closing: { title: 'صيدليات بانتظار التوثيق', text: 'راجع طلبات التسجيل الجديدة ليتمكن أصحابها من العمل.', to: '/dashboard/admin', label: 'مراجعة الصيدليات' },
  },
};

export default function Home() {
  const { user } = useAuth();
  const role = user?.role || 'patient';
  const content = ROLE_CONTENT[role] || ROLE_CONTENT.patient;
  const firstName = user?.full_name?.split(' ')[0];

  return (
    <div>
      {/* ---------- البطل ---------- */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <span className="hero-eyebrow">
              <Icon name="shield" size={15} />
              {ROLE_LABEL[role]} موثّق على صيدلية برو
            </span>
            <h1>
              أهلًا {firstName || ''}، {content.tagline}
            </h1>
            <p>{content.text}</p>
            <div className="hero-actions">
              <Link to={content.primaryCta.to} className="btn btn-gold">
                <Icon name={content.primaryCta.icon} size={18} />
                {content.primaryCta.label}
              </Link>
              <Link to={DASHBOARD_BY_ROLE[role] || '/'} className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,.5)', color: '#fff' }}>
                لوحتي
              </Link>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-visual-row">
              <span className="hero-visual-icon">
                <Icon name="search" size={18} />
              </span>
              <div>
                <strong>ابحث عن الدواء</strong>
                <span>في الصيدليات الموثّقة القريبة منك</span>
              </div>
            </div>
            <div className="hero-visual-row">
              <span className="hero-visual-icon">
                <Icon name="file" size={18} />
              </span>
              <div>
                <strong>ارفع الروشتة</strong>
                <span>تصل للجهة التي تحدّدها فقط</span>
              </div>
            </div>
            <div className="hero-visual-row">
              <span className="hero-visual-icon">
                <Icon name="truck" size={18} />
              </span>
              <div>
                <strong>تتبّع التوصيل</strong>
                <span>من تأكيد الدفع حتى وصول بابك</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- روابط سريعة خاصة بدورك ---------- */}
      <section className="section" style={{ paddingBottom: 8 }}>
        <div className="section-head">
          <h2>وصولك السريع</h2>
          <p>أهم ما تحتاجه بصفتك {ROLE_LABEL[role]}، في مكان واحد.</p>
        </div>
        <div className="role-grid">
          {content.quickLinks.map((link) => (
            <Link to={link.to} className="role-card" key={link.title}>
              <span className="role-card-icon">
                <Icon name={link.icon} size={22} />
              </span>
              <h3>{link.title}</h3>
              <p>{link.text}</p>
              <span className="role-cta">
                فتح
                <Icon name="arrow" size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- رحلة الطلب: تسلسل فعلي، لذا الترقيم هنا مبرَّر ---------- */}
      <section className="section">
        <div className="section-head">
          <h2>كيف تسير رحلة الطلب على المنصة</h2>
          <p>من بحث المريض عن الدواء إلى وصوله فعليًا — أربع خطوات واضحة الحالة في كل مرحلة.</p>
        </div>
        <div className="steps">
          <div className="step">
            <span className="step-number">١</span>
            <h3>المريض يبحث ويطلب</h3>
            <p>يختار الدواء من صيدلية موثّقة، أو يرفع روشتته مباشرة، ثم يرفق إيصال التحويل.</p>
          </div>
          <div className="step">
            <span className="step-number">٢</span>
            <h3>الصيدلية تراجع الدفع</h3>
            <p>تتحقق من الإيصال وتؤكد الطلب أو ترفضه مع توضيح السبب، فيعود المخزون تلقائيًا عند الرفض.</p>
          </div>
          <div className="step">
            <span className="step-number">٣</span>
            <h3>الصيدلية تجهّز وتُسند التوصيل</h3>
            <p>تحضّر الطلب وتختار مندوب توصيل، أو تسلّمه مباشرة إن كانت قريبة من المريض.</p>
          </div>
          <div className="step">
            <span className="step-number">٤</span>
            <h3>التوصيل حتى الباب</h3>
            <p>يتابع المندوب الطلب حتى التسليم، ويرى المريض الحالة محدَّثة في لوحته طوال الوقت.</p>
          </div>
        </div>
      </section>

      {/* ---------- شريط الثقة ---------- */}
      <div className="trust-band">
        <div className="trust-band-inner">
          <div className="trust-item">
            <span className="trust-item-icon">
              <Icon name="shield" size={19} />
            </span>
            <div>
              <h3>صيدليات مُراجَعة يدويًا</h3>
              <p>كل صيدلية تمر بتوثيق من الإدارة قبل أن تظهر نتائجها للمرضى.</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-item-icon">
              <Icon name="file" size={19} />
            </span>
            <div>
              <h3>روشتاتك وإيصالاتك خاصة</h3>
              <p>لا يراها إلا صاحبها والجهة التي وجّهها إليها المريض تحديدًا.</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-item-icon">
              <Icon name="clock" size={19} />
            </span>
            <div>
              <h3>حالة الطلب لحظة بلحظة</h3>
              <p>من المراجعة إلى التجهيز فالتوصيل، بلا انتظار أو استفسار متكرر.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- دعوة ختامية خاصة بدورك ---------- */}
      <div className="cta-band">
        <div className="cta-band-inner">
          <div>
            <h2>{content.closing.title}</h2>
            <p>{content.closing.text}</p>
          </div>
          <div className="cta-band-actions">
            <Link to={content.closing.to} className="btn btn-gold">
              {content.closing.label}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
