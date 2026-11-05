const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "لم تتم إضافة مفتاح OpenRouter بعد. أضف OPENROUTER_API_KEY في Supabase Edge Function Secrets."
    }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json();
    const incoming = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const messages = incoming
      .filter((m: any) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return new Response(JSON.stringify({ error: "أرسل رسالة نصية أولاً." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/yasserbenmaghnia812-arch/Deals-AI-",
        "X-Title": "DZ Deals AI",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "system",
            content: "أنت مساعد DZ Deals AI للتسوق باللغة العربية. ساعد المستخدم في فهم مواصفات المنتجات ومقارنة الخيارات وتحديد معايير الشراء. لا تدّع أنك تحققت من أسعار أو مخزون أو كوبونات مباشرة، ولا تخترع روابط أو تقييمات. عند طلب سعر حالي أو توفر، وضّح أنك لا تملك وصولاً مباشراً لبيانات المتاجر واقترح فتح البحث الرسمي في AliExpress أو Temu. استخدم الدينار الجزائري عند ذكر الميزانيات، وكن واضحاً ومختصراً."
          },
          ...messages
        ],
        temperature: 0.4,
        max_tokens: 700
      })
    });

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return new Response(JSON.stringify({
        error: payload?.error?.message || "تعذر الاتصال بمزود النموذج المجاني.",
        provider_status: upstream.status
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const answer = payload?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return new Response(JSON.stringify({ error: "لم يرجع النموذج إجابة نصية." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع."
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});