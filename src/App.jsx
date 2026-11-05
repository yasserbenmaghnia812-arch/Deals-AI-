import { useMemo, useState } from "react";

const tabs = [
  { id: "search", label: "البحث", icon: "⌕" },
  { id: "compare", label: "المقارنة", icon: "⇄" },
  { id: "track", label: "تتبع الطرود", icon: "▣" },
  { id: "assistant", label: "المساعد", icon: "✦" }
];

function App() {
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("");
  const [compareItems, setCompareItems] = useState([]);
  const [tracking, setTracking] = useState("");
  const [notice, setNotice] = useState("");

  const searchLinks = useMemo(() => {
    const q = encodeURIComponent(query.trim());
    return {
      ali: "https://www.aliexpress.com/w/wholesale-" + q + ".html",
      temu: "https://www.temu.com/search_result.html?search_key=" + q
    };
  }, [query]);

  function addCompare() {
    if (!query.trim()) return;
    setCompareItems(items => [...items, { name: query.trim(), budget: budget.trim() || "غير محدد" }]);
    setNotice("تمت إضافة المنتج إلى قائمة المقارنة على هذا الجهاز.");
  }

  function openSearch(url) {
    if (!query.trim()) {
      setNotice("اكتب اسم المنتج أولاً.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function trackParcel() {
    if (!tracking.trim()) {
      setNotice("أدخل رقم التتبع أو الرابط أولاً.");
      return;
    }
    const value = tracking.trim();
    const url = value.startsWith("http") ? value : "https://www.17track.net/en?nums=" + encodeURIComponent(value);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">DZ</div>
        <div className="brand-copy"><strong>DZ Deals AI</strong><span>مساعد التسوق الذكي</span></div>
        <span className="status-dot" title="نسخة تجريبية"></span>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">منصة التسوق للجزائر</div>
          <h1>اعثر على العرض <em>الأفضل</em></h1>
          <p>ابحث في المتاجر، قارن الأسعار، وتابع طرودك من مكان واحد.</p>
          <div className="hero-glow"></div>
        </section>

        <nav className="tabs" aria-label="الأقسام">
          {tabs.map(item => <button key={item.id} className={tab === item.id ? "tab active" : "tab"} onClick={() => {setTab(item.id);setNotice("");}}>
            <span>{item.icon}</span>{item.label}
          </button>)}
        </nav>

        {notice && <div className="notice" role="status">{notice}</div>}

        {tab === "search" && <section className="panel">
          <div className="section-heading"><div><span className="kicker">بحث المنتجات</span><h2>ماذا تريد أن تشتري؟</h2></div><span className="spark">✦</span></div>
          <label className="field-label" htmlFor="product">اسم المنتج أو وصفه</label>
          <input id="product" value={query} onChange={e => setQuery(e.target.value)} placeholder="مثال: سماعات بلوتوث..." />
          <label className="field-label" htmlFor="budget">الميزانية بالدينار الجزائري (اختياري)</label>
          <div className="input-with-suffix"><input id="budget" inputMode="numeric" value={budget} onChange={e => setBudget(e.target.value)} placeholder="مثال: 5000" /><span>دج</span></div>
          <div className="store-grid">
            <button className="store-card ali" onClick={() => openSearch(searchLinks.ali)}><span className="store-icon">A</span><span><b>AliExpress</b><small>افتح نتائج البحث</small></span><span className="arrow">↗</span></button>
            <button className="store-card temu" onClick={() => openSearch(searchLinks.temu)}><span className="store-icon">T</span><span><b>Temu</b><small>افتح نتائج البحث</small></span><span className="arrow">↗</span></button>
          </div>
          <button className="secondary-button" onClick={addCompare}>＋ أضف إلى المقارنة</button>
          <p className="disclaimer">حالياً يفتح التطبيق البحث الرسمي في المتجرين؛ لا يدّعي جلب الأسعار أو الكوبونات تلقائياً قبل توفر واجهة API رسمية ومصرّح بها.</p>
        </section>}

        {tab === "compare" && <section className="panel">
          <div className="section-heading"><div><span className="kicker">قائمة المقارنة</span><h2>منتجاتك المحفوظة</h2></div><span className="spark">⇄</span></div>
          {compareItems.length === 0 ? <div className="empty-state"><span>⇄</span><b>لا توجد منتجات بعد</b><small>أضف منتجاً من قسم البحث لبدء المقارنة.</small></div> :
            <div className="compare-list">{compareItems.map((item, index) => <div className="compare-row" key={index}><div><b>{item.name}</b><small>الميزانية: {item.budget} دج</small></div><button aria-label="حذف" onClick={() => setCompareItems(items => items.filter((_,i) => i !== index))}>×</button></div>)}</div>}
          <p className="disclaimer">القائمة محفوظة مؤقتاً داخل جلسة التطبيق على هذا الجهاز.</p>
        </section>}

        {tab === "track" && <section className="panel">
          <div className="section-heading"><div><span className="kicker">تتبع الشحنات</span><h2>أين وصل طردك؟</h2></div><span className="spark">▣</span></div>
          <label className="field-label" htmlFor="tracking">رقم التتبع أو رابط الشحنة</label>
          <input id="tracking" dir="ltr" value={tracking} onChange={e => setTracking(e.target.value)} placeholder="مثال: LP123456789CN" />
          <button className="primary-button" onClick={trackParcel}>تتبع الشحنة <span>←</span></button>
          <p className="disclaimer">سيتم فتح صفحة 17TRACK خارج التطبيق. لم يتم ربط API تتبع مباشر بعد.</p>
        </section>}

        {tab === "assistant" && <section className="panel">
          <div className="section-heading"><div><span className="kicker">المساعد الذكي</span><h2>مساعد DZ Deals</h2></div><span className="spark">✦</span></div>
          <div className="assistant-card"><div className="assistant-avatar">✦</div><div><b>المساعد قيد التجهيز</b><p>واجهة المحادثة ستُفعّل بعد اختيار مزود نموذج مجاني والتحقق من حدود الاستخدام. لن نضع مفاتيح API سرية داخل ملف APK.</p></div></div>
          <div className="feature-list"><div>✓ واجهة عربية كاملة واتجاه RTL</div><div>✓ بحث مباشر في المتاجر</div><div>✓ قائمة مقارنة أولية</div><div>◷ ربط الذكاء الاصطناعي وبيانات الأسعار لاحقاً</div></div>
        </section>}
      </main>

      <footer><span>صُنع للمتسوق الجزائري</span><span>الإصدار التجريبي 0.1.0</span></footer>
    </div>
  );
}

export default App;