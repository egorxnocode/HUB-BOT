"use strict";
/* Standalone web cabinet — buy a VPN subscription from a browser, no Telegram.
   Talks to /api/cabinet/auth/* (email/OAuth/guest) and /api/cabinet/* (me/plans/purchase). */

const $ = (sel) => document.querySelector(sel);
const app = () => $("#app");
const A = "/api/cabinet/auth";
const C = "/api/cabinet";

const store = {
  get access() { return localStorage.getItem("wc_access") || ""; },
  get refresh() { return localStorage.getItem("wc_refresh") || ""; },
  set(access, refresh) {
    if (access) localStorage.setItem("wc_access", access);
    if (refresh) localStorage.setItem("wc_refresh", refresh);
  },
  clear() { localStorage.removeItem("wc_access"); localStorage.removeItem("wc_refresh"); },
};

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

function money(minor) {
  const v = (minor || 0) / 100;
  return (Number.isInteger(v) ? v : v.toFixed(2)).toLocaleString("ru-RU") + " ₽";
}

async function api(method, path, body, auth, _retried) {
  const headers = { "Content-Type": "application/json" };
  if (auth && store.access) headers.Authorization = "Bearer " + store.access;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && auth && store.refresh && !_retried) {
    // Refresh once. Without the _retried guard a still-401 response after a "successful"
    // refresh would loop forever (valid refresh token, but the request stays unauthorized).
    const ok = await tryRefresh();
    if (ok) return api(method, path, body, auth, true);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || `Ошибка ${res.status}`);
    err.status = res.status;  // callers distinguish auth failures from transient 5xx
    throw err;
  }
  return data;
}

async function tryRefresh() {
  try {
    const r = await fetch(`${A}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: store.refresh }),
    });
    if (!r.ok) return false;
    const d = await r.json();
    store.set(d.access_token, d.refresh_token);
    return true;
  } catch { return false; }
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

function brand() {
  return el("div", { class: "brand" }, [
    el("span", { class: "brand-mark", "aria-hidden": "true" }),
    el("span", { class: "brand-copy" }, [
      el("strong", {}, "На связи"),
      el("small", {}, "личный кабинет"),
    ]),
  ]);
}

function detectedPlatform() {
  if (/iPhone|iPad/i.test(navigator.userAgent)) return "ios";
  if (/Android/i.test(navigator.userAgent)) return "android";
  if (/Mac/i.test(navigator.userAgent)) return "macos";
  return "windows";
}

function copyIconButton(value) {
  return el("button", {
    class: "icon-button", title: "Скопировать", "aria-label": "Скопировать ссылку",
    html: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    onclick: async () => {
      try { await navigator.clipboard.writeText(value); toast("Ссылка скопирована"); }
      catch { toast("Не удалось скопировать ссылку"); }
    },
  });
}

function qrPanel(value) {
  const target = el("div", { class: "qr-target" });
  queueMicrotask(() => {
    if (!target.isConnected || !window.QRCode) return;
    new window.QRCode(target, { text: value, width: 216, height: 216, colorDark: "#07110e", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
  });
  return el("div", { class: "qr-panel" }, [target, el("p", {}, "Отсканируйте камерой или приложением на другом устройстве")]);
}

async function connectionCenter() {
  const conn = await api("GET", `${C}/connection`, null, true);
  const state = { platform: detectedPlatform(), app: null, pair: null, qrOpen: false };
  const root = el("div", { class: "card connect-center" });
  function draw() {
    root.innerHTML = "";
    const platforms = conn.platforms || [];
    const platform = platforms.find((p) => p.id === state.platform) || platforms[0];
    if (!platform) return;
    if (!platform.apps.some((a) => a.id === state.app)) state.app = platform.apps[0] && platform.apps[0].id;
    const selected = platform.apps.find((a) => a.id === state.app);
    root.append(el("div", { class: "cap" }, "Центр подключения"));
    root.append(el("h2", {}, "Добавить устройство"));
    root.append(el("div", { class: "hint" }, "Устройство определено автоматически. При необходимости выберите другое."));
    root.append(el("details", { class: "device-picker" }, [
      el("summary", {}, [el("span", {}, "Устройство"), el("b", {}, platform.label), el("i", {}, "⌄")]),
      el("div", { class: "device-options" }, platforms.map((p) => el("button", {
        class: p.id === platform.id ? "on" : "",
        onclick: () => { state.platform = p.id; state.app = null; state.pair = null; state.qrOpen = false; draw(); },
      }, p.label))),
    ]));
    const apps = el("div", { class: "connect-apps" });
    platform.apps.forEach((a) => apps.append(el("button", {
      class: `connect-app${a.id === state.app ? " on" : ""}`,
      onclick: () => { state.app = a.id; state.pair = null; state.qrOpen = false; draw(); },
    }, [
      a.icon_url ? el("img", { src: a.icon_url, alt: "" }) : el("span", { class: "connect-letter" }, a.name.slice(0, 1)),
      el("span", {}, [el("b", {}, a.name), el("small", {}, platform.label)]),
    ])));
    root.append(apps);
    if (!selected) return;
    const guide = el("div", { class: "connect-guide" }, [
      el("h3", {}, selected.name),
      el("p", {}, selected.instruction || "Установите приложение и добавьте подписку."),
    ]);
    if (selected.download_url) guide.append(el("button", { class: "btn ghost", onclick: () => window.open(selected.download_url, "_blank", "noopener") }, `Скачать ${selected.name}`));
    if (platform.tv && selected.tv_web_import_url) {
      guide.append(el("div", { class: "hint" }, "В Happ на телевизоре откройте «+» → Web Import. Код появится на экране ТВ."));
      guide.append(el("button", { class: "btn primary", onclick: async () => {
        try {
          await navigator.clipboard.writeText(selected.tv_transfer_value);
          toast("Подписка скопирована");
          window.open(selected.tv_web_import_url, "_blank", "noopener");
        } catch { toast("Не удалось скопировать ссылку"); }
      } }, "Скопировать и открыть Web Import"));
      guide.append(el("button", { class: "btn ghost", onclick: () => window.open(selected.tv_help_url, "_blank", "noopener") }, "Инструкция для телевизора"));
      guide.append(el("div", { class: "hint" }, "Или отсканируйте QR с экрана телевизора мобильным Happ — оба устройства должны быть в одной Wi-Fi сети."));
    } else {
      guide.append(el("a", { class: "btn primary import-link", href: selected.import_url }, "Добавить подписку"));
    }
    guide.append(el("div", { class: "subscription-link" }, [el("code", {}, conn.subscription_url), copyIconButton(conn.subscription_url)]));
    guide.append(el("button", { class: "btn qr-button", onclick: () => { state.qrOpen = !state.qrOpen; draw(); } }, state.qrOpen ? "Скрыть QR-код" : `QR-код для ${selected.name}`));
    if (state.qrOpen) guide.append(qrPanel(selected.import_url));
    root.append(guide);
  }
  draw();
  return root;
}

/* ---------- auth screens ---------- */

let authTab = "login";

async function oauthGo(provider) {
  try {
    const d = await api("GET", `${A}/oauth/${provider}/authorize`);
    if (d.authorize_url) {
      // Remember which provider we launched — the callback URL may not carry ?provider=,
      // and defaulting to "google" would exchange the code against the wrong endpoint.
      try { localStorage.setItem("wc_oauth_provider", provider); } catch (e) {}
      window.location.href = d.authorize_url;
    }
  } catch (e) { toast(e.message); }
}

function oauthButtons() {
  return el("div", {}, [
    el("div", { class: "divider" }, "или"),
    el("button", { class: "btn oauth", onclick: () => oauthGo("google") }, "Войти через Google"),
    el("button", { class: "btn oauth", onclick: () => oauthGo("yandex") }, "Войти через Yandex"),
  ]);
}

function authView() {
  const root = el("div", {}, [brand()]);

  const tabs = el("div", { class: "tabs" }, [
    el("div", { class: `tab${authTab === "login" ? " on" : ""}`, onclick: () => { authTab = "login"; render(); } }, "Вход"),
    el("div", { class: `tab${authTab === "register" ? " on" : ""}`, onclick: () => { authTab = "register"; render(); } }, "Регистрация"),
    el("div", { class: `tab${authTab === "guest" ? " on" : ""}`, onclick: () => { authTab = "guest"; render(); } }, "Купить сразу"),
  ]);
  root.append(tabs);

  if (authTab === "guest") { root.append(guestCard()); return root; }

  const email = el("input", { type: "email", placeholder: "you@example.com", autocomplete: "email" });
  const pass = el("input", { type: "password", placeholder: "Пароль", autocomplete: authTab === "login" ? "current-password" : "new-password" });
  const card = el("div", { class: "card" }, [
    el("label", {}, "E-mail"), email,
    el("label", {}, "Пароль"), pass,
  ]);

  if (authTab === "login") {
    card.append(el("button", {
      class: "btn primary",
      onclick: async () => {
        try {
          const d = await api("POST", `${A}/login`, { email: email.value.trim(), password: pass.value });
          store.set(d.access_token, d.refresh_token);
          route("cabinet");
        } catch (e) { toast(e.message); }
      },
    }, "Войти"));
  } else {
    card.append(el("button", {
      class: "btn primary",
      onclick: async () => {
        if (pass.value.length < 8) return toast("Пароль от 8 символов");
        try {
          const d = await api("POST", `${A}/register`, { email: email.value.trim(), password: pass.value });
          if (d.requires_verification) {
            toast("Проверьте почту — отправили ссылку подтверждения");
          } else if (d.access_token) {
            store.set(d.access_token, d.refresh_token);
            route("cabinet");
          }
        } catch (e) { toast(e.message); }
      },
    }, "Создать аккаунт"));
  }
  card.append(oauthButtons());
  root.append(card);
  return root;
}

function guestCard() {
  const email = el("input", { type: "email", placeholder: "you@example.com" });
  const card = el("div", { class: "card" }, [
    el("h2", {}, "Купить без регистрации"),
    el("div", { class: "hint" }, "Укажи e-mail — подписка придёт письмом, аккаунт создастся сам."),
    el("label", {}, "E-mail"), email,
  ]);
  const holder = el("div", {});
  card.append(holder);
  loadPlans(false).then((plans) => {
    if (!plans.length) { holder.append(el("div", { class: "hint" }, "Тарифы ещё не настроены.")); return; }
    holder.append(planPicker(plans, async (planId, days, method) => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) return toast("Введите корректный e-mail");
      try {
        const d = await api("POST", `${A}/guest/purchase`, {
          email: email.value.trim(), plan_id: planId, days, method,
        });
        if (d.auto_login_token) localStorage.setItem("wc_auto", d.auto_login_token);
        if (d.redirect_url) window.location.href = d.redirect_url;
      } catch (e) { toast(e.message); }
    }, true));
  });
  return card;
}

/* ---------- plan picker (shared by guest + cabinet) ---------- */

async function loadPlans(auth) {
  const path = auth ? `${C}/plans` : `${C}/public/plans`;
  try {
    const d = await api("GET", path, null, auth);
    if (!auth && d.payment_methods) window.__pm__ = d.payment_methods;  // guests need methods too
    return d.items || [];
  } catch { return []; }
}

function planPicker(plans, onPay, guest) {
  const state = { plan: 0, dur: 0, method: "" };
  const wrap = el("div", {});
  function draw() {
    wrap.innerHTML = "";
    const plan = plans[state.plan];
    wrap.append(el("div", { class: "cap" }, "Тариф"));
    plans.forEach((p, i) => {
      wrap.append(el("div", {
        class: `plan${i === state.plan ? " on" : ""}`,
        onclick: () => { state.plan = i; state.dur = 0; draw(); },
      }, [el("span", { class: "name" }, p.name), el("span", { class: "muted" }, ((p.durations || [])[0] ? money(p.durations[0].price_minor) : ""))]));
    });
    const durs = el("div", { class: "durs" });
    (plan.durations || []).forEach((d, i) => {
      durs.append(el("div", {
        class: `dur${i === state.dur ? " on" : ""}`,
        onclick: () => { state.dur = i; draw(); },
      }, [el("div", { class: "m" }, `${d.months} мес`), el("div", { class: "p" }, money(d.price_minor))]));
    });
    wrap.append(durs);
    // payment method (guest & web users use online gateways)
    const methods = (window.__pm__ || []);
    wrap.append(el("div", { class: "cap", style: "margin-top:8px" }, "Оплата"));
    const chips = el("div", { class: "durs" });
    methods.forEach((m) => {
      chips.append(el("div", {
        class: `dur${state.method === m.id ? " on" : ""}`,
        onclick: () => { state.method = m.id; draw(); },
      }, m.label));
    });
    wrap.append(methods.length ? chips : el("div", { class: "hint" }, "Онлайн-оплата не настроена."));
    const sel = (plan.durations || [])[state.dur];
    wrap.append(el("button", {
      class: "btn primary",
      disabled: !state.method || !sel ? "" : null,
      onclick: () => sel && state.method && onPay(plan.id, sel.days, state.method),
    }, sel ? `Оплатить · ${money(sel.price_minor)}` : "Выбери срок"));
  }
  draw();
  return wrap;
}

/* ---------- cabinet ---------- */

async function cabinetView() {
  const root = el("div", {}, [brand()]);
  let me;
  try { me = await api("GET", `${C}/me`, null, true); }
  catch (e) {
    // Only a real auth failure should destroy the session. A transient 5xx (e.g. backend
    // restart) must NOT wipe valid tokens and force a re-login — show a retry instead.
    if (e && (e.status === 401 || e.status === 403)) { store.clear(); route("auth"); return el("div", {}); }
    root.append(el("div", { class: "card" }, [
      el("div", { class: "hint" }, "Не удалось загрузить кабинет. Проверь соединение."),
      el("button", { class: "btn", onclick: () => route("cabinet") }, "Обновить"),
    ]));
    return root;
  }
  window.__pm__ = (me.app && me.app.payment_methods) || [];

  const sub = me.subscription;
  const usable = sub && ["active", "trial", "limited"].includes(sub.status);
  root.append(el("div", { class: "card" }, [
    el("div", { class: "li" }, [el("span", { class: "muted" }, me.user.username || me.user.first_name || "Аккаунт"),
      el("span", { class: `pill ${usable ? "ok" : "warn"}` }, usable ? "Подписка активна" : "Нет подписки")]),
    el("div", { class: "li" }, [el("span", { class: "muted" }, "Баланс"), el("b", {}, money(me.user.balance_minor))]),
    sub && sub.expire_at ? el("div", { class: "li" }, [el("span", { class: "muted" }, "Действует до"), el("b", {}, new Date(sub.expire_at).toLocaleDateString("ru-RU"))]) : null,
  ]));

  if (usable) {
    try { root.append(await connectionCenter()); }
    catch (e) { root.append(el("div", { class: "card" }, [el("h2", {}, "Подключение"), el("div", { class: "hint" }, "Не удалось загрузить центр подключения.")])); }
  }

  const plans = await loadPlans(true);
  if (plans.length) {
    root.append(el("div", { class: "card" }, [
      el("h2", {}, usable ? "Продлить / сменить тариф" : "Купить подписку"),
      planPicker(plans, async (planId, days, method) => {
        try {
          const d = await api("POST", `${C}/purchase`, { plan_id: planId, days, method }, true);
          if (d.redirect_url) window.location.href = d.redirect_url;
          else if (d.paid_with) { toast("Оплачено!"); route("cabinet"); }
        } catch (e) { toast(e.message); }
      }),
    ]));
  }

  root.append(el("div", { class: "center" }, [
    el("span", { class: "link", onclick: async () => { try { await api("POST", `${A}/logout`, { refresh_token: store.refresh }); } catch {} store.clear(); route("auth"); } }, "Выйти"),
  ]));
  return root;
}

/* ---------- router ---------- */

let view = "auth";
function route(v) { view = v; render(); }

async function render() {
  const a = app();
  a.innerHTML = "";
  a.append(el("div", { class: "muted center" }, "…"));
  let node;
  if (view === "cabinet") node = await cabinetView();
  else node = authView();
  a.innerHTML = "";
  a.append(node);
}

async function boot() {
  const params = new URLSearchParams(location.search);
  // OAuth callback: /web?code=...&state=...
  if (params.get("code") && params.get("state")) {
    const provider = params.get("provider") || localStorage.getItem("wc_oauth_provider") || "google";
    try {
      const d = await api("POST", `${A}/oauth/callback`, { provider, code: params.get("code"), state: params.get("state") });
      store.set(d.access_token, d.refresh_token);
    } catch (e) { toast(e.message); }
    history.replaceState({}, "", location.pathname);
  }
  // guest success returns with an auto-login token stashed before redirect
  const auto = localStorage.getItem("wc_auto");
  if (auto && !store.access) {
    try {
      const d = await api("POST", `${A}/login/auto`, { token: auto });
      store.set(d.access_token, d.refresh_token);
    } catch {}
    localStorage.removeItem("wc_auto");
  }
  view = store.access ? "cabinet" : "auth";
  render();
}

boot();
