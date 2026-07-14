/* Public NaSvyazi landing: one brand system, dynamic plans/content, and a safe
   route to the web cabinet, Telegram bot, or the proxy-to-bot gateway. */

(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var DEFAULTS = {
    eyebrow: "VPN без сложных настроек",
    headline: "Интернет работает.\nГде бы вы ни были.",
    subheadline: "Открывайте привычные сайты и приложения на телефоне, компьютере и телевизоре. Подключение занимает две минуты.",
    trust: ["Телефон, компьютер и ТВ", "Понятное подключение", "Поддержка в Telegram"],
  };
  var DEFAULT_FEATURES = [
    { icon: "devices", title: "Все устройства", text: "Телефон, компьютер, планшет и телевизор — в одной подписке." },
    { icon: "route", title: "Подключение по шагам", text: "Покажем нужное приложение и короткую инструкцию для вашего устройства." },
    { icon: "support", title: "Поддержка рядом", text: "Если что-то не получается, ответим в Telegram и поможем подключиться." },
  ];
  var DEFAULT_FAQ = [
    { q: "Как начать?", a: "Выберите тариф, оплатите подписку и следуйте инструкции для своего устройства. Обычно это занимает пару минут." },
    { q: "На скольких устройствах работает?", a: "Количество устройств зависит от тарифа. Точный лимит всегда указан перед оплатой." },
    { q: "Какие способы оплаты доступны?", a: "Доступные способы оплаты появятся при оформлении заказа." },
  ];
  var DEMO = {
    enabled: true,
    title: "На связи",
    accent_color: null,
    headline: "",
    subheadline: "",
    greeting: "",
    features: [],
    faq: [],
    cta_target: "web",
    bot_username: "",
    cabinet_url: "/web/",
    telegram_gateway_url: null,
    plans: [
      { name: "На день", description: "Попробовать или взять в поездку", durations: [{ days: 1, months: 0, price_minor: 2900 }] },
      { name: "Стандартный", description: "Для телефона и компьютера", durations: [{ days: 30, months: 1, price_minor: 27900 }, { days: 90, months: 3, price_minor: 74900 }] },
      { name: "Семейный", description: "До пяти устройств одновременно", durations: [{ days: 30, months: 1, price_minor: 34900 }, { days: 90, months: 3, price_minor: 99900 }] },
    ],
  };

  var $ = function (selector) { return document.querySelector(selector); };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "class") node.className = attrs[key];
      else if (key === "text") node.textContent = attrs[key];
      else if (key.slice(0, 2) === "on") node.addEventListener(key.slice(2), attrs[key]);
      else if (attrs[key] != null) node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      if (child != null) node.append(child.nodeType ? child : String(child));
    });
    return node;
  }

  function money(minor) {
    var value = Number(minor || 0) / 100;
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value) + " ₽";
  }

  function plural(value, forms) {
    var n = Math.abs(value) % 100;
    var n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
  }

  function durationMonths(duration) {
    if (Number(duration.months || 0) > 0) return Number(duration.months);
    return Math.max(1, Math.round(Number(duration.days || 30) / 30));
  }

  function periodLabel(duration) {
    var days = Number(duration.days || 0);
    var months = durationMonths(duration);
    if (days > 0 && days < 28) return days + " " + plural(days, ["день", "дня", "дней"]);
    return months + " " + plural(months, ["месяц", "месяца", "месяцев"]);
  }

  function directBotUrl(username) {
    var clean = String(username || "").replace(/[^A-Za-z0-9_]/g, "");
    return clean ? "tg://resolve?domain=" + encodeURIComponent(clean) + "&start=website" : null;
  }

  function cabinetHref(cfg) {
    if (cfg.cta_target === "telegram" && cfg.telegram_gateway_url) return cfg.telegram_gateway_url;
    if (cfg.cta_target === "bot" && cfg.bot_username) return directBotUrl(cfg.bot_username) || "/telegram/";
    var url = cfg.cabinet_url || "/web/";
    return /^(https?:\/\/|\/)/i.test(url) ? url : "/web/";
  }

  function linkTarget(href) {
    return /^https?:\/\//i.test(href) ? "_blank" : "_self";
  }

  function iconNode(raw) {
    var aliases = { "⚡": "route", "🔒": "shield", "📱": "devices", "🌍": "globe", "🛡": "shield", "💬": "support" };
    var kind = aliases[raw] || raw || "route";
    var paths = {
      devices: ["M7 3h10a2 2 0 0 1 2 2v14H5V5a2 2 0 0 1 2-2Z", "M9 17h6"],
      route: ["M5 7h8a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h10", "m16 4 3 3-3 3"],
      support: ["M4 13a8 8 0 0 1 16 0", "M4 13v4a2 2 0 0 0 2 2h2v-7H4", "M20 13v4a2 2 0 0 1-2 2h-2"],
      shield: ["M12 3 5 6v5c0 4.5 2.8 7.8 7 10 4.2-2.2 7-5.5 7-10V6l-7-3Z", "m9 13 2 2 4-5"],
      globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3 12h18", "M12 3a14 14 0 0 1 0 18", "M12 3a14 14 0 0 0 0 18"],
    };
    if (!paths[kind]) return el("span", { text: String(raw || "•").slice(0, 2) });
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    paths[kind].forEach(function (d) {
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.append(path);
    });
    return svg;
  }

  function renderPlans(cfg) {
    var grid = $("#planGrid");
    var href = cabinetHref(cfg);
    grid.innerHTML = "";
    (cfg.plans || []).forEach(function (plan, index) {
      var durations = plan.durations || [];
      var suggested = durations.findIndex(function (item) { return Number(item.days || 0) >= 80 && Number(item.days || 0) <= 100; });
      var state = { selected: suggested >= 0 ? suggested : Math.min(1, Math.max(0, durations.length - 1)) };
      var total = el("strong", {});
      var period = el("span", {});
      var monthly = el("small", {});
      var durationList = el("div", { class: "duration-list" });

      function paint() {
        var selected = durations[state.selected] || durations[0] || { days: 30, months: 1, price_minor: 0 };
        var months = durationMonths(selected);
        total.textContent = money(selected.price_minor);
        period.textContent = "за " + periodLabel(selected);
        monthly.textContent = months > 1 ? money(Math.round(Number(selected.price_minor || 0) / months / 100) * 100) + " в месяц" : "";
        Array.prototype.forEach.call(durationList.children, function (button, buttonIndex) {
          button.classList.toggle("active", buttonIndex === state.selected);
          button.setAttribute("aria-pressed", buttonIndex === state.selected ? "true" : "false");
        });
      }

      durations.forEach(function (duration, durationIndex) {
        durationList.append(el("button", {
          class: "duration-button",
          type: "button",
          "aria-pressed": durationIndex === state.selected ? "true" : "false",
          onclick: function () { state.selected = durationIndex; paint(); },
        }, [el("span", { text: periodLabel(duration) }), el("strong", { text: money(duration.price_minor) })]));
      });

      var card = el("article", { class: "plan-card" + (index === 1 ? " recommended" : "") }, [
        index === 1 ? el("span", { class: "plan-badge", text: "Популярный" }) : null,
        el("h3", { text: plan.name || "Тариф" }),
        el("div", { class: "plan-description", text: plan.description || "" }),
        el("div", { class: "plan-price" }, [total, period, monthly]),
        durations.length > 1 ? durationList : null,
        el("a", { class: "button button-primary", href: href, target: linkTarget(href), text: "Подключиться" }),
      ]);
      paint();
      grid.append(card);
    });
  }

  function renderFeatures(cfg) {
    var grid = $("#featureGrid");
    var items = cfg.features && cfg.features.length ? cfg.features : DEFAULT_FEATURES;
    grid.innerHTML = "";
    items.forEach(function (feature) {
      grid.append(el("article", { class: "feature-item" }, [
        el("span", { class: "feature-icon" }, [iconNode(feature.icon)]),
        el("div", {}, [el("h3", { text: feature.title || "" }), el("p", { text: feature.text || "" })]),
      ]));
    });
  }

  function renderFaq(cfg) {
    var list = $("#faqList");
    var items = cfg.faq && cfg.faq.length ? cfg.faq : DEFAULT_FAQ;
    list.innerHTML = "";
    items.forEach(function (faq) {
      var answer = el("div", { class: "faq-answer", text: faq.a || "" });
      var item = el("article", { class: "faq-item" }, [
        el("button", { class: "faq-question", type: "button", "aria-expanded": "false", text: faq.q || "", onclick: function (event) {
          var open = item.classList.toggle("open");
          event.currentTarget.setAttribute("aria-expanded", open ? "true" : "false");
        } }),
        answer,
      ]);
      list.append(item);
    });
  }

  function applyTheme(cfg) {
    document.body.dataset.mode = "dark";
    var accent = params.get("accent") || cfg.accent_color;
    if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) document.documentElement.style.setProperty("--brand", accent);
  }

  function fill(cfg) {
    var name = cfg.title || "На связи";
    document.title = name + " — интернет без границ";
    ["#brandName", "#posterBrand", "#footBrand"].forEach(function (selector) { $(selector).textContent = name; });
    $("#heroEyebrow").textContent = cfg.greeting || DEFAULTS.eyebrow;
    $("#heroTitle").textContent = cfg.headline || DEFAULTS.headline;
    $("#heroSub").textContent = cfg.subheadline || DEFAULTS.subheadline;
    $("#footYear").textContent = "© " + new Date().getFullYear();

    var trust = $("#heroTrust");
    trust.innerHTML = "";
    DEFAULTS.trust.forEach(function (item) { trust.append(el("span", {}, [el("i", {}), item])); });

    var href = cabinetHref(cfg);
    ["#navCabinet", "#heroCabinet", "#ctaBandBtn", "#footCabinet"].forEach(function (selector) {
      var link = $(selector);
      link.href = href;
      link.target = linkTarget(href);
    });
  }

  function boot(cfg) {
    applyTheme(cfg);
    fill(cfg);
    renderPlans(cfg);
    renderFeatures(cfg);
    renderFaq(cfg);
  }

  fetch("/api/cabinet/public/landing")
    .then(function (response) { return response.ok ? response.json() : Promise.reject(); })
    .then(function (cfg) {
      if (cfg.enabled === false && !params.get("preview")) {
        location.replace(cabinetHref(cfg));
        return;
      }
      boot(cfg);
    })
    .catch(function () { boot(DEMO); });
})();
