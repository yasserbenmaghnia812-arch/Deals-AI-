import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

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
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  const searchLinks = useMemo(() => {
    const q = encodeURIComponent(query.trim());
    return {
      ali: "https://www.aliexpress.com/w/wholesale-" + q + ".html",
      temu: "https://www.temu.com/search_result.html?search_key=" + q
    };
  }, [query]);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) {
      setCompareItems([]);
      return;
    }
    let active = true;
    supabase.from("saved_products").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setNotice("تعذر تحميل المنتجات المحفوظة: " + error.message);
        else setCompareItems(data || []);
      });
    return () => { active = false; };
  }, [session]);

  async function handleAuth(event) {
    event.preventDefault();
    if (!supabase) {
      setNotice("إعداد الاتصال بقاعدة البيانات غير مكتمل.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = authMode === "register"
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (authMode === "register" && !result.data.session) {
        setNotice("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد التسجيل ثم سجّل الدخول.");
      } else {
        setNotice("تم تسجيل الدخول بنجاح.");
      }
    } catch (error) {
      setNotice(error.message || "تعذر إكمال العملية.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    setNotice(error ? error.message : "تم تسجيل الخروج.");
  }

  async function addCompare() {
    if (!query.trim()) {
      setNotice("اكتب اسم المنتج أولاً.");
      return;
    }
    if (!session || !supabase) {
      setNotice("سجّل الدخول أولاً لحفظ المنتجات في حسابك.");
      setTab("assistant");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.from("saved_products").insert({
      user_id: session.user.id,
      product_name: query.trim(),
      budget_dzd: budget.trim() ? Number(budget) : null,
      store: "other"
    }).select().single();
    setBusy(false);
    if (error) setNotice("تعذر حفظ المنتج: " + error.message);
    else {
      setCompareItems(items => [data, ...items]);
      setNotice("تم حفظ المنتج في حسابك.");
    }
  }

  async function removeCompare(id) {
    if (!supabase || !session) return;
    const { error } = await supabase.from("saved_products").delete().eq("id", id);
    if (error) setNotice("تعذر حذف المنتج: " + error.message);
    else setCompareItems(items => items.filter(item => item.id !== id));
  }

  function openSearch(url, store) {
    if (!query.trim()) {
      setNotice("اكتب اسم المنتج أولاً.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    if (supabase && session) {
      supabase.from("search_history").insert({
        user_id: session.user.id,
        query: query.trim(),
        budget_dzd: budget.trim() ? Number(budget) : null
      });
    }
    setNotice("تم فتح نتائج البحث في " + store + ".");
  }

  async function sendChat(event) {
    event.preventDefault();
    if (!session || !supabase) {
      setNotice("سجّل الدخول أولاً لاستخدام المساعد.");
      return;
    }
    if (!chatInput.trim() || chatBusy) return;
    const nextMessages = [...chatMessages, { role: "user", content: chatInput.trim() }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatBusy(true);
    const { data, error } = await supabase.functions.invoke("ai-assistant", {
      body: { messages: nextMessages }
    });
    setChatBusy(false);
    if (error) {
      setChatMessages(messages => [...messages, { role: "assistant", content: "تعذر الاتصال بالمساعد. تحقق من إعداد مفتاح OpenRouter في Supabase." }]);
      setNotice(error.message || "تعذر الاتصال بالمساعد.");
      return;
    }
    if (data?.error) {
      setChatMessages(messages => [...messages, { role: "assistant", content: data.error }]);
      return;
    }
    setChatMessages(messages => [...messages, { role: "assistant", content: data.answer }]);
  }

  async function trackParcel() {
    if (!tracking.trim()) {
      setNotice("أدخل رقم التتبع أو الرابط أولاً.");
      return;
    }
    const value = tracking.trim();
    const url = value.startsWith("http") ? value : "https://www.17track.net/en?nums=" + encodeURIComponent(value);
    if (supabase && session && !value.startsWith("http")) {
      const { error } = await supabase.from("tracked_parcels").upsert({
        user_id: session.user.id,
        tracking_number: value,
        tracking_url: url
      }, { onConflict: "user_id,tracking_number" });
      if (error) setNotice("تعذر حفظ رقم التتبع: " + error.message);
      else setNotice("تم حفظ رقم التتبع في حسابك.");
    }
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
          <p>ابحث في المتاجر، قارن المنتجات، واحفظ طرودك في حسابك.</p>
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
            <button className="store-card ali" onClick={() => openSearch(searchLinks.ali, "AliExpress")}><span className="store-icon">A</span><span><b>AliExpress</b><small>افتح نتائج البحث</small></span><span className="arrow">↗</span></button>
            <button className="store-card temu" onClick={() => openSearch(searchLinks.temu, "Temu")}><span className="store-icon">T</span><span><b>Temu</b><small>افتح نتائج البحث</small></span><span className="arrow">↗</span></button>
          </div>
          <button className="secondary-button" onClick={addCompare} disabled={busy}>＋ احفظ في قائمة المقارنة</button>
          <p className="disclaimer">البحث يفتح المتاجر الرسمية. لا يتم جلب الأسعار أو الكوبونات تلقائياً قبل توفر API رسمي ومصرّح به.</p>
        </section>}

        {tab === "compare" && <section className="panel">
          <div className="section-heading"><div><span className="kicker">قائمة المقارنة</span><h2>منتجاتك المحفوظة</h2></div><span className="spark">⇄</span></div>
          {!session ? <div className="empty-state"><span>⇄</span><b>سجّل الدخول لمزامنة قائمتك</b><small>يمكنك فتح قسم المساعد لإنشاء حساب مجاني.</small></div> :
            compareItems.length === 0 ? <div className="empty-state"><span>⇄</span><b>لا توجد منتجات بعد</b><small>أضف منتجاً من قسم البحث لبدء المقارنة.</small></div> :
            <div className="compare-list">{compareItems.map(item => <div className="compare-row" key={item.id}><div><b>{item.product_name}</b><small>الميزانية: {item.budget_dzd ?? "غير محدد"} دج</small></div><button aria-label="حذف" onClick={() => removeCompare(item.id)}>×</button></div>)}</div>}
          <p className="disclaimer">المنتجات المحفوظة مرتبطة بحسابك وتُحمى بسياسات الوصول في قاعدة البيانات.</p>
        </section>}

        {tab === "track" && <section className="panel">
          <div className="section-heading"><div><span className="kicker">تتبع الشحنات</span><h2>أين وصل طردك؟</h2></div><span className="spark">▣</span></div>
          <label className="field-label" htmlFor="tracking">رقم التتبع أو رابط الشحنة</label>
          <input id="tracking" dir="ltr" value={tracking} onChange={e => setTracking(e.target.value)} placeholder="مثال: LP123456789CN" />
          <button className="primary-button" onClick={trackParcel}>حفظ وتتبع الشحنة <span>←</span></button>
          <p className="disclaimer">عند تسجيل الدخول يُحفظ رقم التتبع في حسابك، ثم تُفتح صفحة 17TRACK. لا يوجد استعلام API مباشر حتى الآن.</p>
        </section>}

        {tab === "assistant" && <section className="panel">
          <div className="section-heading"><div><span className="kicker">الحساب والمساعد</span><h2>{session ? "حسابك" : "الدخول أو إنشاء حساب"}</h2></div><span className="spark">✦</span></div>
          {!authReady ? <div className="empty-state"><b>جارٍ التحقق من الجلسة...</b></div> :
          !session ? <form className="auth-form" onSubmit={handleAuth}>
            <div className="auth-switch"><button type="button" className={authMode === "login" ? "selected" : ""} onClick={() => setAuthMode("login")}>تسجيل الدخول</button><button type="button" className={authMode === "register" ? "selected" : ""} onClick={() => setAuthMode("register")}>حساب جديد</button></div>
            <label className="field-label" htmlFor="email">البريد الإلكتروني</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@example.com" />
            <label className="field-label" htmlFor="password">كلمة المرور</label>
            <input id="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={6} value={password} onChange={e => setPassword(e.target.value)} required placeholder="6 أحرف على الأقل" />
            <button className="primary-button" disabled={busy}>{busy ? "جارٍ التنفيذ..." : authMode === "login" ? "دخول" : "إنشاء حساب"}</button>
          </form> :
          <>
            <div className="account-strip"><span>✓ {session.user.email}</span><button onClick={signOut}>خروج</button></div>
            <div className="chat-window">
              {chatMessages.length === 0 ? <div className="chat-empty">اسألني عن مواصفات منتج أو كيفية اختيار أفضل قيمة مقابل السعر.</div> :
                chatMessages.map((message, index) => <div key={index} className={message.role === "user" ? "chat-message user-message" : "chat-message assistant-message"}>{message.content}</div>)}
              {chatBusy && <div className="chat-message assistant-message">يفكر المساعد...</div>}
            </div>
            <form className="chat-form" onSubmit={sendChat}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="اكتب سؤالك هنا..." aria-label="رسالة المساعد" />
              <button disabled={chatBusy || !chatInput.trim()}>إرسال</button>
            </form>
            <p className="disclaimer">المساعد يستخدم نماذج مجانية عبر OpenRouter عند إضافة مفتاحك في أسرار Supabase. توفر النماذج والحدود يتغيران.</p>
          </>}
          <div className="feature-list"><div>✓ قاعدة بيانات Supabase مجانية</div><div>✓ حماية بيانات كل حساب عبر RLS</div><div>✓ حفظ المنتجات وسجل البحث وأرقام التتبع</div><div>✓ واجهة المساعد جاهزة للاتصال بنموذج مجاني</div></div>
          {!supabase && <p className="disclaimer">لم تُضبط إعدادات Supabase في بيئة البناء بعد.</p>}
        </section>}
      </main>

      <footer><span>صُنع للمتسوق الجزائري</span><span>الإصدار التجريبي 0.2.0</span></footer>
    </div>
  );
}

export default App;