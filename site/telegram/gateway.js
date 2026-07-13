(function () {
  "use strict";

  var $ = function (selector) { return document.querySelector(selector); };
  var variants = { minimal: "a", private: "b", buddy: "c", native: "d", terminal: "e", magazine: "f", neon: "g", pop: "h" };

  function safeBotUrl(username) {
    var clean = String(username || "").replace(/[^A-Za-z0-9_]/g, "");
    return clean ? "https://t.me/" + clean + "?start=website" : null;
  }

  function directProxyUrl(url) {
    return String(url || "").replace(/^https:\/\/(?:t\.me|telegram\.me)\/proxy/i, "tg://proxy");
  }

  function applyTheme(cfg) {
    var variant = variants[cfg.template] || cfg.template || "a";
    document.body.dataset.variant = /^[a-h]$/.test(variant) ? variant : "a";
    var mode = null;
    try { mode = localStorage.getItem("site_mode"); } catch (e) {}
    document.body.dataset.mode = mode === "dark" ? "dark" : "light";
    if (cfg.accent_color && /^#[0-9a-fA-F]{3,8}$/.test(cfg.accent_color)) {
      document.body.style.setProperty("--acc", cfg.accent_color);
    }
  }

  function show(cfg) {
    var proxy = cfg.mtproto_proxy_url;
    var bot = safeBotUrl(cfg.bot_username);
    if (!cfg.telegram_gateway_url || !/^https:\/\/(?:t\.me|telegram\.me)\/proxy\?/i.test(proxy || "") || !bot) {
      $("#gatewayError").hidden = false;
      return;
    }
    applyTheme(cfg);
    var name = cfg.title || "VPN";
    $("#brandName").textContent = name;
    document.title = name + " — личный кабинет в Telegram";
    $("#proxyButton").href = proxy;
    $("#proxyDirect").href = directProxyUrl(proxy);
    $("#botButton").href = bot;
    $("#skipButton").href = bot;
    $("#gatewaySteps").hidden = false;

    var proxyClicked = false;
    try { proxyClicked = localStorage.getItem("telegram_proxy_step_opened") === "1"; } catch (e) {}
    if (proxyClicked) {
      $("#proxyStep").classList.add("done");
      $("#botStep").classList.add("ready");
    }
    [$("#proxyButton"), $("#proxyDirect")].forEach(function (link) {
      link.addEventListener("click", function () {
        $("#proxyStep").classList.add("done");
        $("#botStep").classList.add("ready");
        try { localStorage.setItem("telegram_proxy_step_opened", "1"); } catch (e) {}
      });
    });
  }

  $("#themeToggle").addEventListener("click", function () {
    var next = document.body.dataset.mode === "dark" ? "light" : "dark";
    document.body.dataset.mode = next;
    try { localStorage.setItem("site_mode", next); } catch (e) {}
  });

  fetch("/api/cabinet/public/landing")
    .then(function (response) { return response.ok ? response.json() : Promise.reject(); })
    .then(show)
    .catch(function () { $("#gatewayError").hidden = false; });
})();
