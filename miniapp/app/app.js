/* Mini-app v2 runtime: 3 tabs (Home / Connect / Account), 8 themes, RU/EN.
   Data: /api/cabinet/* with `Authorization: tma <initData>`; falls back to mock.js
   outside Telegram. Theme: admin's template (a..h) from /api/cabinet/config, override
   with ?variant= for preview; light/dark follows Telegram colorScheme. */

(function () {
  "use strict";

  const wa = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  const inTg = !!(wa && wa.initData);
  const params = new URLSearchParams(location.search);
  const mock = params.get("mock") === "1" || !inTg;

  // ---------- i18n ----------
  const RU = {
    tabHome: "Главная", tabConnect: "Подключение", tabAccount: "Профиль",
    active: "Подписка активна", inactive: "Нет подписки", trial: "Пробный период",
    daysLeft: "дней осталось", till: "до", renew: "Продлить", buy: "Купить",
    choosePlan: "Тариф", payMethod: "Оплата", refTitle: "Пригласи друга",
    refText: (d) => `+${d} дней тебе и другу`, share: "Поделиться",
    step1: "Скачай приложение", step1sub: "iOS · Android · macOS · Windows",
    download: "Скачать", copy: "Скопировать",
    copied: "Скопировано", step3: "Нажми «Подключить» в приложении",
    step3sub: "Приложение импортирует конфиг и включит защиту",
    profile: "Профиль", subscription: "Подписка", devices: "Устройства",
    myDevices: "Мои устройства",
    deviceRemoved: "Устройство отвязано",
    history: "История платежей", promo: "Промокод", promoPh: "Введи код",
    apply: "Применить", promoOk: "Промокод применён", support: "Поддержка",
    send: "Отпр.", supportPh: "Опишите вопрос…", supportHint: "Напишите нам — ответим здесь.",
    supportTyping: "печатает…", supportEscalated: "Подключаем оператора",
    balance: "Баланс", upTo: "до", noSub: "Сначала оформи подписку",
    payBalance: "С баланса", payStars: "Stars", trialBtn: "Попробовать бесплатно",
    bought: "Готово! Подписка активна", error: "Ошибка, попробуй ещё раз",
    version: "v2 · VLESS", loading: "Загрузка…",
    period: "Срок", traffic: "Трафик", unlimited: "∞ безлимит",
    soon: "Тарифы скоро появятся", soonSub: "Мы уже готовим планы — загляните позже.",
    documents: "Документы", privacy: "Политика конфиденциальности", offer: "Публичная оферта",
  };
  const EN = {
    ...RU,
    tabHome: "Home", tabConnect: "Connect", tabAccount: "Account",
    active: "Subscription active", inactive: "No subscription", trial: "Trial",
    daysLeft: "days left", till: "till", renew: "Renew", buy: "Buy",
    choosePlan: "Plan", payMethod: "Payment", refTitle: "Invite a friend",
    refText: (d) => `+${d} days for you and a friend`, share: "Share",
    step1: "Download the app", step1sub: "iOS · Android · macOS · Windows",
    download: "Download", copy: "Copy", copied: "Copied",
    step3: "Tap “Connect” in the app",
    step3sub: "The app imports the config and turns protection on",
    profile: "Profile", subscription: "Subscription", devices: "Devices",
    myDevices: "My devices",
    deviceRemoved: "Device unlinked",
    history: "Payment history", promo: "Promo code", promoPh: "Enter code",
    apply: "Apply", promoOk: "Promo applied", support: "Support",
    send: "Send", supportPh: "Describe your question…", supportHint: "Message us — we'll reply here.",
    supportTyping: "typing…", supportEscalated: "Connecting an operator",
    balance: "Balance", upTo: "up to", noSub: "Get a subscription first",
    payBalance: "Balance", payStars: "Stars", trialBtn: "Try for free",
    bought: "Done! Subscription is active", error: "Error, try again",
    loading: "Loading…",
    period: "Period", traffic: "Traffic", unlimited: "∞ unlimited",
    soon: "Plans coming soon", soonSub: "We're setting up plans — check back later.",
    documents: "Documents", privacy: "Privacy policy", offer: "Public offer",
  };
  let T = RU;

  // ---------- api ----------
  function authHeaders() {
    return inTg ? { Authorization: `tma ${wa.initData}` } : {};
  }
  async function api(method, path, body) {
    if (mock) {
      const key = path.replace("/api/cabinet/", "").split("?")[0];
      await new Promise((r) => setTimeout(r, 150));
      if (method === "POST") return { ok: true };
      return window.__MOCK__[key] ?? {};
    }
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.text()).slice(0, 200));
    return res.json();
  }

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs)
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v;
        else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v);
      }
    (kids || []).forEach((c) => c != null && n.append(c.nodeType ? c : String(c)));
    return n;
  }
  function toast(msg) {
    let t = $(".toast");
    if (!t) {
      t = el("div", { class: "toast" });
      document.body.append(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 2000);
  }
  function money(minor) {
    const v = minor / 100;
    return (v % 1 ? v.toFixed(2) : v.toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
  }
  function daysLeft(iso) {
    if (!iso) return null;
    return Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 864e5));
  }
  function fmtDate(iso) {
    return iso ? new Date(iso).toLocaleDateString(T === RU ? "ru-RU" : "en-US", { day: "numeric", month: "long" }) : "—";
  }
  function haptic(kind) {
    try {
      if (!wa) return;
      if (kind === "ok") wa.HapticFeedback.notificationOccurred("success");
      else wa.HapticFeedback.impactOccurred("light");
    } catch {}
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = el("textarea", { style: "position:fixed;opacity:0" });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  }
  function detectPlatform() {
    const p = (wa && wa.platform) || "";
    if (p === "ios" || /iPhone|iPad/i.test(navigator.userAgent)) return "ios";
    if (p === "android" || /Android/i.test(navigator.userAgent)) return "android";
    if (/Mac/i.test(navigator.userAgent)) return "macos";
    return "windows";
  }

  // ---------- state ----------
  const state = { tab: "home", me: null, plans: null, constructor: null, referral: null, payments: null, connection: null, connectionLoading: false, connectionError: false, connectionPlatform: null, connectionApp: null, qrOpen: false, tvPair: null, tariffSel: 0, planSel: 0, cPerSel: 0, cPackSel: 0, paySel: "stars", devices: undefined };
  // admin overrides: {scale, sections:[order], hidden:[keys], buttons:{key:{text,color}},
  // blocks:[{screen,title,text,icon,url,button_label,color}], buttons_extra:[{screen,label,url,color,style}]}
  let UI = {};

  function btnText(key, fallback) {
    const b = UI.buttons && UI.buttons[key];
    return (b && b.text) || fallback;
  }
  function btnStyle(key) {
    const b = UI.buttons && UI.buttons[key];
    return b && b.color ? `background:${b.color}` : "";
  }

  // Only these schemes may be opened — admin/`?ui=` links are attacker-influenceable, so
  // drop javascript:/data:/blob: etc. (defence in depth alongside the server-side validator).
  function safeUrl(u) {
    if (typeof u !== "string" || !u) return null;
    const s = u.trim();
    if (/^(https?:|tg:|mailto:|\/\/|\/)/i.test(s)) return s;  // http(s)/tg/mailto/relative only
    return null;
  }

  // Open an admin-defined link — Telegram links via the native opener, the rest in a tab.
  function openUrl(u) {
    const url = safeUrl(u);
    if (!url) return;
    haptic();
    const tg = url.startsWith("tg://") || /(?:^|\/\/)(?:t\.me|telegram\.me)\//.test(url);
    if (tg && wa && wa.openTelegramLink) wa.openTelegramLink(url);
    else if (wa && wa.openLink) wa.openLink(url);
    else window.open(url, "_blank");
  }

  // Admin custom blocks + standalone link-buttons for a given screen (home/connect/account).
  function customItems(screen) {
    const out = [];
    (UI.blocks || []).forEach((b) => {
      if ((b.screen || "home") !== screen) return;
      const kids = [];
      if (b.title) kids.push(el("b", { text: (b.icon ? b.icon + " " : "") + b.title }));
      if (b.text)
        kids.push(el("div", { class: "sub", style: "font-size:13px;margin-top:4px;white-space:pre-line", text: b.text }));
      if (b.url && b.button_label)
        kids.push(el("button", { class: "btn primary sm", style: "margin-top:12px;" + (b.color ? `background:${b.color}` : ""), onclick: () => openUrl(b.url), text: b.button_label }));
      if (kids.length) out.push(el("div", { class: "card fade" }, kids));
    });
    (UI.buttons_extra || []).forEach((x) => {
      if ((x.screen || "home") !== screen) return;
      if (!x.label || !x.url) return;
      out.push(el("button", { class: `btn ${x.style === "ghost" ? "ghost" : "primary"}`, style: x.color ? `background:${x.color}` : "", onclick: () => openUrl(x.url), text: x.label }));
    });
    return out;
  }

  // ---------- screens ----------
  function payChips(starsCount) {
    const me = state.me;
    const option = (id, icon, label, value) => el("button", {
      class: `payment-option${state.paySel === id ? " on" : ""}`,
      onclick: () => { state.paySel = id; haptic(); render(); },
    }, [
      el("span", { class: "payment-icon", text: icon }),
      el("span", { class: "payment-copy" }, [el("b", { text: label }), el("small", { text: value })]),
      el("span", { class: "payment-radio" }),
    ]);
    return el("div", { class: "payment-options" }, [
      me && me.app.balance_enabled === false
        ? null
        : option("balance", "₽", T.payBalance, me ? money(me.user.balance_minor) : ""),
      option("stars", "★", T.payStars, `${starsCount}`),
      ...((me && me.app.payment_methods) || []).map((pm) =>
        option(pm.id, "▰", pm.label, T === RU ? "Онлайн-оплата" : "Online payment"),
      ),
    ]);
  }

  function orderSections(map) {
    const hidden = Array.isArray(UI.hidden) ? UI.hidden : [];
    const order = Array.isArray(UI.sections) && UI.sections.length
      ? UI.sections
      : ["status", "plans", "referral", "proxy", "custom"];
    const out = [];
    for (const key of order) if (map[key] && !hidden.includes(key)) out.push(...map[key]);
    for (const key of Object.keys(map)) if (!order.includes(key) && !hidden.includes(key)) out.push(...map[key]);
    return out;
  }

  function homeScreen() {
    const me = state.me;
    const sub = me && me.subscription;
    const usable = sub && ["active", "trial", "limited"].includes(sub.status);
    const left = usable ? daysLeft(sub.expire_at) : null;
    const total = 90;
    const sections = { status: [], plans: [], referral: [], proxy: [], custom: customItems("home") };
    const frag = sections.status;

    frag.push(
      el("div", { class: "home-intro fade" }, [
        el("span", { class: "home-eyebrow", text: "Личный кабинет" }),
        el("h1", { text: `${T === RU ? "Здравствуйте" : "Hello"}, ${me && me.user.first_name ? me.user.first_name : T === RU ? "друг" : "friend"}` }),
        el("p", { text: T === RU ? "Всё о подписке и подключении — в одном месте." : "Your subscription and connection in one place." }),
      ]),
    );

    // Owner greeting (from admin config) — shown once at the very top of Home.
    const greeting = me && me.app && me.app.greeting;
    if (greeting) frag.push(el("div", { class: "card fade", text: greeting }));

    // status card
    frag.push(
      el("div", { class: "card fade status-card" }, [
        el("div", { class: "row spread" }, [
          el("span", { class: "row", style: "gap:7px" }, [
            el("span", { class: `dot${usable ? "" : " off"}` }),
            el("b", { text: usable ? (sub.is_trial ? T.trial : T.active) : T.inactive }),
          ]),
          usable && sub.expire_at
            ? el("span", { class: "sub", style: "font-size:12.5px", text: `${T.till} ${fmtDate(sub.expire_at)}` })
            : null,
        ]),
        usable
          ? el("div", { style: "margin-top:14px" }, [
              el("div", { class: "row", style: "align-items:baseline;gap:8px" }, [
                el("span", { class: "big-num", text: left == null ? "∞" : left }),
                el("span", { class: "sub", text: T.daysLeft }),
              ]),
              el("div", { class: "prog", style: "margin-top:12px" }, [
                el("i", { style: `width:${left == null ? 100 : Math.min(100, (left / total) * 100)}%` }),
              ]),
            ])
          : el("div", { class: "sub", style: "margin-top:10px", text: T.noSub }),
        usable
          ? el("div", { class: "status-footer" }, [
              el("div", { class: "status-meta" }, [
                el("span", { text: sub.plan_name || (T === RU ? "Подписка" : "Subscription") }),
                el("strong", { text: `${T.balance} · ${money(me.user.balance_minor)}` }),
              ]),
              el("button", {
                class: "btn status-connect",
                onclick: openConnect,
                text: T === RU ? "Подключить устройство" : "Connect device",
              }),
            ])
          : null,
        me && me.user.is_trial_available
          ? el("button", { class: "btn ghost", style: "margin-top:14px;" + btnStyle("trial"), onclick: activateTrial, text: "🎁 " + btnText("trial", T.trialBtn) })
          : null,
      ]),
    );

    // plans + pay
    const salesMode = params.get("sales") || (me && me.app.sales_mode) || "plans";
    if (salesMode === "constructor") {
      const c = state.constructor;
      const periods = (c && c.periods) || [];
      const packs = (c && c.traffic_packs) || [];
      const per = periods[state.cPerSel] || periods[0];
      const pack = packs[state.cPackSel] || packs[0];
      if (per && pack) {
        const frag = sections.plans;
        const total = per.price_minor + pack.price_minor;
        const stars = Math.max(1, Math.ceil(total / Math.max(1, c.stars_rate || 1)));
        frag.push(
          el("div", { class: "card fade plans-card" }, [
            el("div", { class: "plan-section-title", text: T.period }),
            el(
              "div",
              { class: "plans-row" },
              periods.map((p, i) =>
                el(
                  "div",
                  {
                    class: `plan-opt${(periods[state.cPerSel] ? state.cPerSel : 0) === i ? " on" : ""}`,
                    onclick: () => { state.cPerSel = i; haptic(); render(); },
                  },
                  [
                    el("div", { class: "m", text: p.days < 30 ? `${p.days} дн` : `${p.months} мес` }),
                    el("div", { class: "p", text: money(p.price_minor) }),
                  ],
                ),
              ),
            ),
            el("div", { class: "plan-section-title", text: T.traffic }),
            el(
              "div",
              { class: "chips" },
              packs.map((t, i) =>
                el("button", {
                  class: `chip${(packs[state.cPackSel] ? state.cPackSel : 0) === i ? " on" : ""}`,
                  onclick: () => { state.cPackSel = i; haptic(); render(); },
                  text: (t.gb ? `${t.gb} ГБ` : T.unlimited) + (t.price_minor ? ` · +${money(t.price_minor)}` : ""),
                }),
              ),
            ),
            el("div", { class: "plan-section-title", text: T.payMethod }),
            payChips(stars),
            el("button", {
              class: "btn primary checkout-button",
              style: btnStyle("renew"),
              onclick: () => submitPurchase({ period_id: per.id, pack_id: pack.id }),
            }, [el("span", { text: btnText("renew", usable ? T.renew : T.buy) }), el("strong", { text: money(total) })]),
          ]),
        );
      } else {
        // Constructor mode with no periods/packs configured yet — show a clear empty state
        // instead of a blank Home tab.
        sections.plans.push(
          el("div", { class: "card fade", style: "text-align:center" }, [
            el("div", { class: "h-cap", text: T.soon }),
            el("div", { class: "muted", style: "margin-top:6px", text: T.soonSub }),
          ]),
        );
      }
    }
    const allPlans = salesMode === "constructor" ? [] : (state.plans && state.plans.items) || [];
    const plan = allPlans[state.tariffSel] || allPlans[0];
    if (plan) {
      const frag = sections.plans;
      const durs = plan.durations;
      const selIdx = durs[state.planSel] ? state.planSel : 0;
      const sel = durs[selIdx];
      const base = durs[0] ? durs[0].price_minor / durs[0].days : 0;
      frag.push(
        el("div", { class: "card fade plans-card" }, [
          allPlans.length > 1
            ? el("details", { class: "tariff-picker" }, [
                el("summary", {}, [
                  el("span", {}, [el("small", { text: T.choosePlan }), el("b", { text: plan.name })]),
                  el("i", { text: "⌄" }),
                ]),
                el("div", { class: "tariff-options" }, allPlans.map((p, i) =>
                  el("button", {
                    class: (state.tariffSel || 0) === i ? "on" : "",
                    onclick: () => { state.tariffSel = i; state.planSel = 0; haptic(); render(); },
                  }, [el("span", { text: p.name }), el("i", { text: (state.tariffSel || 0) === i ? "✓" : "" })]),
                )),
              ])
            : el("div", { class: "single-tariff" }, [el("small", { text: T.choosePlan }), el("b", { text: plan.name })]),
          el("div", { class: "plan-section-title", text: T.period }),
          el(
            "div",
            { class: "plans-row" },
            durs.map((d, i) => {
              const disc = base ? Math.round((1 - d.price_minor / d.days / base) * 100) : 0;
              return el(
                "div",
                {
                  class: `plan-opt${i === selIdx ? " on" : ""}`,
                  style: "position:relative",
                  onclick: () => {
                    state.planSel = i;
                    haptic();
                    render();
                  },
                },
                [
                  el("div", { class: "m", text: `${d.months} мес` }),
                  el("div", { class: "p", text: money(d.price_minor) }),
                  el("div", { class: "d", text: disc > 0 ? `${T === RU ? "Выгода" : "Save"} ${disc}%` : T === RU ? "Базовая цена" : "Base price" }),
                ],
              );
            }),
          ),
          el("div", { class: "plan-section-title", text: T.payMethod }),
          payChips(sel ? sel.price_stars : ""),
          el("button", { class: "btn primary checkout-button", style: btnStyle("renew"), onclick: () => purchase(plan, sel) }, [
            el("span", { text: btnText("renew", usable ? T.renew : T.buy) }),
            el("strong", { text: sel ? money(sel.price_minor) : "" }),
          ]),
        ]),
      );
    }

    // referral
    if (usable && state.referral) {
      const frag = sections.referral;
      const r = state.referral;
      frag.push(
        el("div", { class: "card fade referral-card" }, [
          el("div", { class: "referral-head" }, [
            el("div", { class: "referral-copy" }, [
              el("span", { class: "home-eyebrow", text: T === RU ? "Бонус за приглашение" : "Invite bonus" }),
              el("h3", { text: T.refTitle }),
              el("p", { text: T === RU ? "Отправьте персональную ссылку — бонус получат оба." : "Share your personal link — both of you get a bonus." }),
            ]),
            el("div", { class: "referral-reward" }, [
              el("strong", { text: `+${r.bonus_days}` }),
              el("small", { text: T === RU ? "дней" : "days" }),
            ]),
          ]),
          el("button", {
            class: "referral-share",
            onclick: () => {
              haptic();
              const url = `https://t.me/share/url?url=${encodeURIComponent(r.link)}`;
              wa && wa.openTelegramLink ? wa.openTelegramLink(url) : window.open(url);
            },
          }, [
            el("span", { text: btnText("share", T === RU ? "Пригласить друга" : "Invite a friend") }),
            el("span", { class: "referral-arrow", html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' }),
          ]),
        ]),
      );
    }
    if (me && me.app.mtproto_proxy) {
      sections.proxy.push(
        el("div", { class: "card fade row spread" }, [
          el("b", { text: "🔌 " + (T === RU ? "MTProto-прокси" : "MTProto proxy") }),
          el("button", {
            class: "btn primary sm",
            style: btnStyle("connect_proxy"),
            onclick: () => {
              haptic();
              const u = me.app.mtproto_proxy;
              wa && wa.openTelegramLink ? wa.openTelegramLink(u) : window.open(u);
            },
            text: btnText("connect_proxy", T === RU ? "Подключить" : "Connect"),
          }),
        ]),
      );
    }
    return orderSections(sections);
  }

  function copyIconButton(value) {
    return el("button", {
      class: "icon-button", title: T.copy, "aria-label": T.copy,
      html: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
      onclick: async () => { if (await copyText(value)) { toast(T.copied); haptic("ok"); } },
    });
  }

  function qrPanel(value) {
    const target = el("div", { class: "qr-target" });
    queueMicrotask(() => {
      if (!target.isConnected || !window.QRCode) return;
      new window.QRCode(target, { text: value, width: 216, height: 216, colorDark: "#07110e", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
    });
    return el("div", { class: "qr-panel" }, [
      target,
      el("p", { text: T === RU ? "Отсканируйте камерой или приложением на другом устройстве" : "Scan with a camera or app on another device" }),
    ]);
  }

  function openConnect() {
    state.tab = "connect";
    haptic();
    render();
    if (!state.connection) loadConnection();
  }

  function connectScreen() {
    const conn = state.connection;
    const platforms = (conn && conn.platforms) || [];
    const detected = detectPlatform();
    if (!state.connectionPlatform && platforms.length) state.connectionPlatform = (platforms.find((p) => p.id === detected) || platforms[0]).id;
    const platform = platforms.find((p) => p.id === state.connectionPlatform) || platforms[0];
    if (platform && !platform.apps.some((a) => a.id === state.connectionApp)) state.connectionApp = platform.apps[0] && platform.apps[0].id;
    const selected = platform && platform.apps.find((a) => a.id === state.connectionApp);
    const frag = [el("div", { class: "screen-intro fade" }, [
      el("span", { class: "home-eyebrow", text: T === RU ? "Подключение" : "Connection" }),
      el("h1", { text: T === RU ? "Добавьте устройство" : "Add a device" }),
      el("p", { text: T === RU ? "Выберите устройство и удобное приложение. Доступ уже готов." : "Choose a device and a convenient app. Your access is ready." }),
    ])];
    if (!conn) {
      if (!state.connectionLoading && !state.connectionError) queueMicrotask(loadConnection);
      frag.push(el("div", { class: "card fade connect-card connection-loading" }, [
        state.connectionError
          ? el("p", { text: T === RU ? "Не удалось загрузить данные подключения. Откройте раздел ещё раз." : "Could not load connection details. Open this section again." })
          : el("div", { class: "spinner" }),
      ]));
      return frag.concat(customItems("connect"));
    }
    const devicePicker = el("details", { class: "device-picker fade" }, [
      el("summary", {}, [el("span", { text: T === RU ? "Устройство" : "Device" }), el("b", { text: platform.label }), el("i", { text: "⌄" })]),
      el("div", { class: "device-options" }, platforms.map((p) => el("button", {
        class: p.id === platform.id ? "on" : "",
        onclick: () => { state.connectionPlatform = p.id; state.connectionApp = null; state.qrOpen = false; render(); },
        text: p.label,
      }))),
    ]);
    frag.push(devicePicker);
    frag.push(el("div", { class: "app-grid fade" }, (platform.apps || []).map((a) => el("button", {
      class: `app-choice${a.id === state.connectionApp ? " on" : ""}`,
      onclick: () => { state.connectionApp = a.id; state.qrOpen = false; render(); },
    }, [
      a.icon_url ? el("img", { src: a.icon_url, alt: "" }) : el("span", { class: "app-fallback", text: a.name.slice(0, 1) }),
      el("span", {}, [el("b", { text: a.name }), el("small", { text: pLabel(platform.id) })]),
    ]))));
    if (selected) frag.push(el("div", { class: "card fade connect-card featured app-guide" }, [
      el("div", { class: "guide-head" }, [
        selected.icon_url ? el("img", { class: "guide-icon", src: selected.icon_url, alt: "" }) : el("span", { class: "guide-icon app-fallback", text: selected.name.slice(0, 1) }),
        el("div", {}, [el("span", { class: "home-eyebrow", text: platform.label }), el("h2", { text: selected.name })]),
      ]),
      el("p", { class: "guide-copy", text: selected.instruction || (T === RU ? "Установите приложение и добавьте доступ." : "Install the app and add access.") }),
      selected.download_url ? el("button", { class: "btn ghost", onclick: () => (wa && wa.openLink ? wa.openLink(selected.download_url) : window.open(selected.download_url)), text: `↓ ${T.download} ${selected.name}` }) : null,
      platform.tv && selected.tv_web_import_url ? el("div", { class: "tv-actions" }, [
        el("button", { class: "btn primary", onclick: async () => { if (await copyText(selected.tv_transfer_value)) { toast(T === RU ? "Подписка скопирована" : "Subscription copied"); haptic("ok"); wa && wa.openLink ? wa.openLink(selected.tv_web_import_url) : window.open(selected.tv_web_import_url); } }, text: T === RU ? "Открыть Web Import" : "Open Web Import" }),
        el("button", { class: "btn ghost", onclick: () => (wa && wa.openLink ? wa.openLink(selected.tv_help_url) : window.open(selected.tv_help_url)), text: T === RU ? "Инструкция для телевизора" : "TV instructions" }),
      ]) : el("a", { class: "btn primary import-link", href: selected.import_url, onclick: () => haptic() }, [T === RU ? "Добавить подписку" : "Add subscription"]),
      el("div", { class: "subscription-link" }, [el("code", { text: conn.subscription_url }), copyIconButton(conn.subscription_url)]),
      el("button", { class: "btn qr-button", onclick: () => { state.qrOpen = !state.qrOpen; render(); }, text: state.qrOpen ? (T === RU ? "Скрыть QR-код" : "Hide QR code") : (T === RU ? `QR-код для ${selected.name}` : `QR code for ${selected.name}`) }),
      state.qrOpen ? qrPanel(selected.import_url) : null,
    ].filter(Boolean)));
    return frag.concat(customItems("connect"));
  }

  function pLabel(id) {
    return ({ ios: "iOS", android: "Android", windows: "Windows", macos: "macOS", android_tv: "Android TV", apple_tv: "Apple TV" })[id] || id;
  }

  function accountScreen() {
    const me = state.me;
    if (!me) return [];
    const sub = me.subscription;
    const frag = [];
    frag.push(
      el("div", { class: "screen-intro fade" }, [
        el("span", { class: "home-eyebrow", text: T.profile }),
        el("h1", { text: T === RU ? "Ваш профиль" : "Your profile" }),
        el("p", { text: T === RU ? "Подписка, устройства, платежи и помощь." : "Subscription, devices, payments and support." }),
      ]),
    );
    frag.push(
      el("div", { class: "card fade row profile-card" }, [
        el("div", {
          class: "profile-avatar",
          text: (me.user.first_name || "?").slice(0, 1).toUpperCase(),
        }),
        el("div", {}, [
          el("b", { text: me.user.first_name || "—" }),
          el("div", { class: "sub", style: "font-size:12.5px", text: me.user.username ? "@" + me.user.username : "" }),
        ]),
        el("div", { class: "profile-balance" }, [
          el("div", { class: "sub", style: "font-size:11px", text: T.balance }),
          el("b", { text: money(me.user.balance_minor) }),
        ]),
      ]),
    );
    frag.push(
      el("div", { class: "card fade account-summary" }, [
        el("div", { class: "li" }, [
          el("span", { class: "sub", text: T.subscription }),
          el("b", { text: sub && sub.expire_at ? `${T.till} ${fmtDate(sub.expire_at)}` : "—" }),
        ]),
        el("div", { class: "li" }, [
          el("span", { class: "sub", text: T.devices }),
          el("b", { text: sub && sub.device_limit ? `${T.upTo} ${sub.device_limit}` : "—" }),
        ]),
      ]),
    );
    // HWID devices: list + one-tap unbind (loaded lazily per tab visit)
    if (sub && sub.status && sub.status !== "none" && !mock) {
      if (state.devices === undefined) {
        state.devices = null;
        api("GET", "/api/cabinet/devices")
          .then((r) => { state.devices = r.items || []; render(); })
          .catch(() => { state.devices = []; });
      }
      if (state.devices && state.devices.length) {
        frag.push(
          el("div", { class: "card fade" }, [
            el("div", { class: "h-cap", text: T.myDevices }),
            ...state.devices.map((d) =>
              el("div", { class: "li" }, [
                el("span", { class: "sub", text: [d.platform, d.model].filter(Boolean).join(" · ") || d.hwid.slice(0, 12) }),
                el("button", {
                  class: "btn ghost sm",
                  text: "✕",
                  onclick: async () => {
                    try {
                      await api("DELETE", `/api/cabinet/devices/${encodeURIComponent(d.hwid)}`);
                      state.devices = null;
                      toast(T.deviceRemoved);
                      render();
                    } catch (e) {
                      toast(String(e.message || e));
                    }
                  },
                }),
              ]),
            ),
          ]),
        );
      }
    }
    // promo
    const inp = el("input", { class: "inp", placeholder: T.promoPh, maxlength: 32 });
    frag.push(
      el("div", { class: "card fade" }, [
        el("div", { class: "h-cap", text: T.promo }),
        el("div", { class: "row" }, [
          inp,
          el("button", {
            class: "btn primary sm",
            onclick: async () => {
              if (!inp.value.trim()) return;
              try {
                const r = await api("POST", "/api/cabinet/promocode", { code: inp.value.trim() });
                toast(r.ok ? T.promoOk : r.message || T.error);
                r.ok && haptic("ok");
                r.ok && load();
              } catch {
                toast(T.error);
              }
            },
            text: T.apply,
          }),
        ]),
      ]),
    );
    // history
    if (state.payments && state.payments.items.length) {
      frag.push(
        el("div", { class: "card fade" }, [
          el("div", { class: "h-cap", text: T.history }),
          ...state.payments.items.slice(0, 6).map((p) =>
            el("div", { class: "li" }, [
              el("span", { class: "sub", style: "font-size:12.5px", text: `${new Date(p.created_at).toLocaleDateString("ru-RU")} · ${p.method || p.type}` }),
              el("b", { text: money(p.amount_minor) }),
            ]),
          ),
        ]),
      );
    }
    if (me.app.mtproto_proxy) {
      frag.push(
        el("div", { class: "card fade row spread" }, [
          el("div", {}, [
            el("b", { text: "🔌 " + (T === RU ? "MTProto-прокси" : "MTProto proxy") }),
            el("div", { class: "sub", style: "font-size:12px;margin-top:2px",
                        text: T === RU ? "Telegram без блокировок" : "Telegram without blocks" }),
          ]),
          el("button", {
            class: "btn primary sm",
            onclick: () => {
              haptic();
              const u = me.app.mtproto_proxy;
              wa && wa.openTelegramLink ? wa.openTelegramLink(u) : window.open(u);
            },
            text: T === RU ? "Подключить" : "Connect",
          }),
        ]),
      );
    }
    const legalLinks = [
      [T.privacy, me.app.privacy_policy_url],
      [T.offer, me.app.public_offer_url],
    ].filter((item) => /^https:\/\//i.test(item[1] || ""));
    if (legalLinks.length) {
      frag.push(
        el("div", { class: "card fade legal-card" }, [
          el("div", { class: "h-cap", text: "📄 " + T.documents }),
          ...legalLinks.map((item) =>
            el("button", {
              class: "legal-link",
              onclick: () => {
                haptic();
                wa && wa.openLink
                  ? wa.openLink(item[1])
                  : window.open(item[1], "_blank", "noopener");
              },
            }, [el("span", { text: item[0] }), el("span", { text: "↗" })]),
          ),
        ]),
      );
    }
    // Support: inline chat (AI-backed via /api/cabinet/support; operator replies arrive here too).
    if (state.support === undefined) state.support = { messages: null, sending: false };
    if (!mock && state.support.messages === null) {
      state.support.messages = [];
      api("GET", "/api/cabinet/support")
        .then((r) => { state.support.messages = r.messages || []; render(); })
        .catch(() => {});
    }
    const supMsgs = state.support.messages || [];
    const supInp = el("input", { class: "inp", placeholder: T.supportPh, maxlength: 1000 });
    async function sendSupport() {
      const v = supInp.value.trim();
      if (!v || state.support.sending) return;
      supInp.value = "";
      state.support.messages = supMsgs.concat([{ from: "you", text: v }]);
      state.support.sending = true;
      haptic();
      render();
      try {
        const r = await api("POST", "/api/cabinet/support", { text: v });
        if (mock) {
          // Standalone preview: no backend — show a canned assistant reply.
          state.support.messages = state.support.messages.concat([
            { from: "support", text: "Спасибо за обращение! Это демо-режим — в боевом кабинете здесь ответит ИИ-поддержка." },
          ]);
        } else {
          // Live: refetch the full thread (user message + AI/operator replies) in order.
          try { state.support.messages = (await api("GET", "/api/cabinet/support")).messages || []; } catch {}
          if (r && r.ai_outcome === "escalate") toast(T.supportEscalated);
        }
      } catch (e) {
        toast((e.message || T.error).slice(0, 120));
      }
      state.support.sending = false;
      render();
    }
    frag.push(
      el("div", { class: "card fade" }, [
        el("div", { class: "h-cap", text: "🆘 " + T.support }),
        ...(supMsgs.length
          ? supMsgs.slice(-8).map((m) =>
              el("div", { style: `margin:4px 0;text-align:${m.from === "you" ? "right" : "left"}` }, [
                el("span", {
                  style:
                    "display:inline-block;max-width:85%;padding:7px 11px;border-radius:12px;" +
                    "font-size:13.5px;white-space:pre-line;text-align:left;" +
                    (m.from === "you"
                      ? "background:var(--acc);color:var(--accInk)"
                      : "background:var(--soft);color:var(--ink)"),
                  text: m.text,
                }),
              ]),
            )
          : [el("div", { class: "sub", style: "font-size:12.5px", text: T.supportHint })]),
        state.support.sending
          ? el("div", { class: "sub", style: "font-size:12px;margin-top:4px", text: T.supportTyping })
          : null,
        el("div", { class: "row", style: "margin-top:8px" }, [
          supInp,
          el("button", { class: "btn primary sm", text: T.send, onclick: sendSupport }),
        ]),
      ].filter(Boolean)),
    );
    frag.push(el("div", { class: "sub", style: "text-align:center;font-size:11px;opacity:.7", text: T.version }));
    return frag.slice(0, -1).concat(customItems("account"), frag.slice(-1));
  }

  // ---------- actions ----------
  async function purchase(plan, dur) {
    if (!dur) return;
    await submitPurchase({ plan_id: plan.id, days: dur.days });
  }

  async function submitPurchase(payload) {
    haptic();
    try {
      const method =
        state.paySel === "balance" && state.me && state.me.app.balance_enabled === false
          ? "stars"
          : state.paySel;
      const r = await api("POST", "/api/cabinet/purchase", { ...payload, method });
      if (r.redirect_url) {
        wa && wa.openLink ? wa.openLink(r.redirect_url) : window.open(r.redirect_url, "_blank");
        toast(T === RU ? "Оплати по открывшейся ссылке" : "Complete the payment in the opened page");
        setTimeout(load, 4000);
      } else if (r.invoice_link && wa && wa.openInvoice) {
        wa.openInvoice(r.invoice_link, (status) => {
          if (status === "paid") {
            toast(T.bought);
            haptic("ok");
            setTimeout(load, 1200);
          }
        });
      } else if (r.ok) {
        toast(T.bought);
        haptic("ok");
        load();
      }
    } catch (e) {
      toast((e.message || T.error).slice(0, 120));
    }
  }

  async function activateTrial() {
    haptic();
    try {
      await api("POST", "/api/cabinet/trial");
      toast(T.bought);
      haptic("ok");
      load();
    } catch (e) {
      toast((e.message || T.error).slice(0, 120));
    }
  }

  async function loadConnection() {
    if (state.connectionLoading || state.connection) return;
    haptic();
    state.connectionLoading = true;
    state.connectionError = false;
    try {
      state.connection = await api("GET", "/api/cabinet/connection");
    } catch {
      state.connectionError = true;
      toast(T.noSub);
    } finally {
      state.connectionLoading = false;
      render();
    }
  }

  // ---------- render ----------
  function render() {
    const screen = $("#screen");
    screen.innerHTML = "";
    const frag =
      state.tab === "home" ? homeScreen() : state.tab === "connect" ? connectScreen() : accountScreen();
    frag.filter(Boolean).forEach((n) => screen.append(n));
    document.querySelectorAll(".tabs button").forEach((b) => {
      b.classList.toggle("on", b.dataset.tab === state.tab);
    });
  }

  async function load() {
    try {
      const [me, plans, constructor, referral, payments] = await Promise.all([
        api("GET", "/api/cabinet/me"),
        api("GET", "/api/cabinet/plans"),
        api("GET", "/api/cabinet/constructor").catch(() => null), // pre-constructor backends
        api("GET", "/api/cabinet/referral"),
        api("GET", "/api/cabinet/payments"),
      ]);
      Object.assign(state, { me, plans, constructor, referral, payments });
      // Owner branding: title → document/tab title; greeting shown atop Home.
      // ?title=/?greeting= let the admin preview override the (mock) config.
      const title = params.get("title") || me.app.title;
      if (title) document.title = title;
      $("#appAvatar").textContent = (me.user.first_name || "Н").slice(0, 1).toUpperCase();
      if (params.get("greeting") != null) me.app.greeting = params.get("greeting");
      // theme from admin config (?variant= wins for preview)
      const NAMES = { minimal: "a", private: "b", buddy: "c", native: "d",
                      terminal: "e", magazine: "f", neon: "g", pop: "h" };
      let variant = params.get("variant") || me.app.template || "a";
      variant = NAMES[variant] || variant;
      document.body.dataset.variant = /^[a-h]$/.test(variant) ? variant : "a";
      const accent = params.get("accent") || (!params.get("variant") ? me.app.accent_color : null);
      if (accent && /^#[0-9a-fA-F]{3,8}$/.test(accent)) {
        document.body.style.setProperty("--acc", accent);
      }
      try {
        UI = params.get("ui")
          ? JSON.parse(decodeURIComponent(escape(atob(params.get("ui")))))
          : (me.app.ui || {});
      } catch { UI = me.app.ui || {}; }
      if (UI.scale) document.documentElement.style.fontSize = `${(UI.scale / 100) * 100}%`;
      T = (params.get("lang") || me.user.language) === "en" ? EN : RU;
      document.documentElement.lang = T === EN ? "en" : "ru";
      render();
    } catch (e) {
      $("#screen").innerHTML = `<div class="skel">${T.error}</div>`;
    }
  }

  // ---------- boot ----------
  if (wa) {
    try {
      wa.ready();
      wa.expand();
    } catch {}
  }
  document.body.dataset.mode = "dark";

  document.querySelectorAll(".tabs button").forEach((b) => {
    b.addEventListener("click", () => {
      state.tab = b.dataset.tab;
      haptic();
      render();
      window.scrollTo({ top: 0, behavior: "auto" });
      if (state.tab === "connect" && !state.connection) loadConnection();
    });
  });

  $("#screen").innerHTML = '<div class="skel"><div class="spinner"></div></div>';
  load();
})();
