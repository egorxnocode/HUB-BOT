(function () {
  "use strict";

  var $ = function (selector) { return document.querySelector(selector); };

  function directBotUrl(username) {
    var clean = String(username || "").replace(/[^A-Za-z0-9_]/g, "");
    return clean ? "tg://resolve?domain=" + encodeURIComponent(clean) + "&start=website" : null;
  }

  function directProxyUrl(url) {
    return String(url || "").replace(/^https:\/\/(?:t\.me|telegram\.me)\/proxy/i, "tg://proxy");
  }

  function applyTheme(cfg) {
    document.body.dataset.mode = "dark";
    if (cfg.accent_color && /^#[0-9a-fA-F]{6}$/.test(cfg.accent_color)) {
      document.documentElement.style.setProperty("--brand", cfg.accent_color);
    }
  }

  function show(cfg) {
    var proxy = cfg.mtproto_proxy_url;
    var bot = directBotUrl(cfg.bot_username);
    if (!cfg.telegram_gateway_url || !/^https:\/\/(?:t\.me|telegram\.me)\/proxy\?/i.test(proxy || "") || !bot) {
      $("#gatewayError").hidden = false;
      return;
    }
    applyTheme(cfg);
    var name = cfg.title || "На связи";
    $("#brandName").textContent = name;
    $("#panelBrandName").textContent = name;
    document.title = name + " — открыть Telegram";
    $("#proxyButton").href = directProxyUrl(proxy);
    $("#botButton").href = bot;
    $("#skipButton").href = bot;
    $("#gatewaySteps").hidden = false;

    var proxyClicked = false;
    try { proxyClicked = localStorage.getItem("telegram_proxy_step_opened") === "1"; } catch (e) {}
    if (proxyClicked) {
      $("#proxyStep").classList.add("done");
      $("#botStep").classList.add("ready");
    }
    [$("#proxyButton")].forEach(function (link) {
      link.addEventListener("click", function () {
        $("#proxyStep").classList.add("done");
        $("#botStep").classList.add("ready");
        $("#botStepHint").textContent = "Готово. Теперь откройте личный кабинет в Telegram.";
        try { localStorage.setItem("telegram_proxy_step_opened", "1"); } catch (e) {}
      });
    });
  }

  fetch("/api/cabinet/public/landing")
    .then(function (response) { return response.ok ? response.json() : Promise.reject(); })
    .then(show)
    .catch(function () { $("#gatewayError").hidden = false; });
})();
