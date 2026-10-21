/* Stay-connected form: saves interested people (name, WhatsApp number, city) into your Google Sheet.
 *
 * SETUP: paste your Google Apps Script web-app address below (see LEADS-SETUP.md).
 * Until you do, the form stays completely hidden so nobody sees a broken form.
 */
(function () {
  "use strict";

  var LEADS_URL = window.GITA_LEADS_URL || "https://script.google.com/macros/s/AKfycbyePERTpcXBLiHShpVEDPB4pUlx5BgX4wRkXQMeNy6HF1oLPjHkHBGUxoP83jCqenuB/exec";
  if (!/^https?:\/\//.test(LEADS_URL)) return;           // not set up yet -> feature stays off

  var DONE_KEY = "krishna_lead_done";                     // person already signed up
  var PROMPTED_KEY = "krishna_lead_prompted";             // soft pop-up already shown once
  var ASK_AFTER_QUESTIONS = 3;                            // show the gentle pop-up after this many questions

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var TXT = {
    hi: {
      menu: "💌 जुड़ें / Stay connected",
      title: "श्री कृष्ण वाणी से जुड़ें",
      sub: "अपना नाम और WhatsApp नंबर दें। नई आरती, भजन और गीता संदेश आप तक पहुँचते रहेंगे।",
      name: "आपका नाम",
      phone: "WhatsApp नंबर (10 अंक)",
      city: "शहर (वैकल्पिक)",
      consent: "मैं श्री कृष्ण वाणी की ओर से संदेश पाने के लिए सहमत हूँ।",
      send: "जुड़ें",
      later: "अभी नहीं",
      errName: "कृपया अपना नाम लिखें।",
      errPhone: "कृपया सही 10 अंकों का मोबाइल नंबर लिखें।",
      errConsent: "आगे बढ़ने के लिए सहमति का बॉक्स चुनें।",
      errSend: "भेज नहीं पाए। कृपया थोड़ी देर बाद फिर कोशिश करें।",
      sending: "भेज रहे हैं…",
      thanks: "धन्यवाद 🙏 आप जुड़ गए हैं।"
    },
    en: {
      menu: "💌 Stay connected / जुड़ें",
      title: "Stay connected with Shri Krishna Vani",
      sub: "Share your name and WhatsApp number to receive new aarti, bhajan and Gita messages.",
      name: "Your name",
      phone: "WhatsApp number (10 digits)",
      city: "City (optional)",
      consent: "I agree to receive messages from Shri Krishna Vani.",
      send: "Connect",
      later: "Not now",
      errName: "Please enter your name.",
      errPhone: "Please enter a valid 10-digit mobile number.",
      errConsent: "Please tick the consent box to continue.",
      errSend: "Could not send. Please try again in a little while.",
      sending: "Sending…",
      thanks: "Thank you 🙏 You are connected."
    }
  };

  function lang() {
    return (typeof currentLang !== "undefined" && currentLang === "en") ? "en" : "hi";
  }
  function T(k) { return TXT[lang()][k]; }

  // ---------- styles (reuse the app's own modal look) ----------
  var css = document.createElement("style");
  css.textContent =
    "#leadModal .modal-card{padding-top:30px;max-width:330px}" +
    "#leadModal h3{font-size:18px}" +
    "#leadModal p.lead-sub{margin:0 0 14px;font-size:13px}" +
    "#leadModal .lead-field{display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:11px 12px;" +
    "border:1px solid rgba(184,146,60,.5);border-radius:9px;background:#fff;font-size:14px;font-family:inherit;" +
    "color:var(--ink,#2c3438);outline:none}" +
    "#leadModal .lead-field:focus{border-color:var(--gold-deep,#8a6a26);box-shadow:0 0 0 2px rgba(184,146,60,.25)}" +
    "#leadModal .lead-consent{display:flex;gap:8px;align-items:flex-start;text-align:left;margin:4px 0 8px;" +
    "font-size:12.5px;line-height:1.5;color:var(--ink-muted,#5b6770)}" +
    "#leadModal .lead-consent input{margin-top:3px;flex-shrink:0}" +
    "#leadModal .lead-msg{min-height:18px;margin:0 0 8px;font-size:12.5px;color:#b3261e}" +
    "#leadModal .lead-msg.ok{color:#1e8e4f;font-size:15px;margin:10px 0}" +
    "#leadModal .lead-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}" +
    "#leadModal .modal-btn[disabled]{opacity:.6;cursor:default}";
  document.head.appendChild(css);

  // ---------- modal ----------
  var overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "leadModal";
  overlay.innerHTML =
    '<div class="modal-card">' +
      '<h3 id="leadTitle"></h3>' +
      '<p class="lead-sub" id="leadSub"></p>' +
      '<form id="leadForm" novalidate autocomplete="on">' +
        '<input class="lead-field" id="leadName" name="name" type="text" maxlength="60" autocomplete="name">' +
        '<input class="lead-field" id="leadPhone" name="phone" type="tel" inputmode="numeric" maxlength="20" autocomplete="tel">' +
        '<input class="lead-field" id="leadCity" name="city" type="text" maxlength="50" autocomplete="address-level2">' +
        '<input class="lead-hp" id="leadWebsite" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<label class="lead-consent"><input type="checkbox" id="leadConsent"><span id="leadConsentText"></span></label>' +
        '<div class="lead-msg" id="leadMsg" role="status" aria-live="polite"></div>' +
        '<button class="modal-btn" id="leadSend" type="submit"></button>' +
      '</form>' +
      '<button class="modal-close" id="leadLater" type="button"></button>' +
    '</div>';
  document.body.appendChild(overlay);

  function $(id) { return document.getElementById(id); }

  function fillText() {
    $("leadTitle").textContent = T("title");
    $("leadSub").textContent = T("sub");
    $("leadName").placeholder = T("name");
    $("leadPhone").placeholder = T("phone");
    $("leadCity").placeholder = T("city");
    $("leadConsentText").textContent = T("consent");
    $("leadSend").textContent = T("send");
    $("leadLater").textContent = T("later");
    $("leadMsg").textContent = "";
    $("leadMsg").className = "lead-msg";
  }

  function openModal() {
    $("leadForm").style.display = "";
    $("leadSend").disabled = false;
    fillText();
    overlay.classList.add("show");
  }
  function closeModal() { overlay.classList.remove("show"); }

  $("leadLater").addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });

  // ---------- menu item ----------
  var dropdown = $("menuDropdown");
  if (dropdown) {
    var item = document.createElement("button");
    item.className = "account-item";
    item.id = "menuConnectBtn";
    item.textContent = T("menu");
    item.addEventListener("click", openModal);
    var clearBtn = $("menuClearBtn");
    if (clearBtn && clearBtn.parentNode === dropdown) dropdown.insertBefore(item, clearBtn);
    else dropdown.appendChild(item);

    // keep the menu label in the chosen language
    document.querySelectorAll(".lang-choice").forEach(function (b) {
      b.addEventListener("click", function () { setTimeout(function () { item.textContent = T("menu"); }, 0); });
    });
  }

  // ---------- validation + sending ----------
  function cleanPhone(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2);   // +91 xxxxxxxxxx
    if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);     // 0xxxxxxxxxx
    return d;
  }

  function showError(msg) {
    var m = $("leadMsg");
    m.className = "lead-msg";
    m.textContent = msg;
  }

  $("leadForm").addEventListener("submit", function (e) {
    e.preventDefault();

    var name = $("leadName").value.trim();
    var phone = cleanPhone($("leadPhone").value);
    var city = $("leadCity").value.trim();

    if (name.length < 2) return showError(T("errName"));
    if (!/^[6-9]\d{9}$/.test(phone)) return showError(T("errPhone"));
    if (!$("leadConsent").checked) return showError(T("errConsent"));

    var payload = {
      name: name,
      phone: phone,
      city: city,
      lang: lang(),
      consent: "Yes",
      website: $("leadWebsite").value,                       // honeypot: real people leave it empty
      deviceId: (typeof getDeviceId === "function") ? getDeviceId() : "",
      source: "app"
    };

    var send = $("leadSend");
    send.disabled = true;
    send.textContent = T("sending");
    showError("");

    var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

    // text/plain keeps this a "simple" request, so Google Apps Script accepts it from any website
    fetch(LEADS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        clearTimeout(timer);
        if (!res || res.ok !== true) throw new Error((res && res.error) || "failed");
        lsSet(DONE_KEY, "1");
        $("leadForm").style.display = "none";
        $("leadTitle").textContent = "🙏";
        $("leadSub").textContent = "";
        var m = $("leadMsg");
        m.className = "lead-msg ok";
        m.textContent = T("thanks");
        $("leadForm").parentNode.insertBefore(m, $("leadLater"));
        setTimeout(closeModal, 2600);
      })
      .catch(function () {
        clearTimeout(timer);
        send.disabled = false;
        send.textContent = T("send");
        showError(T("errSend"));
      });
  });

  // ---------- gentle one-time invitation after a few questions ----------
  var chat = $("chat");
  var checkTimer = null;
  function maybeInvite() {
    if (lsGet(DONE_KEY) || lsGet(PROMPTED_KEY)) return;
    if (overlay.classList.contains("show")) return;
    var langModal = $("langModal");
    if (langModal && langModal.classList.contains("show")) return;
    if (chat.querySelector(".waveform")) return;                          // reply still loading
    if (chat.querySelectorAll(".row.user").length < ASK_AFTER_QUESTIONS) return;
    var last = chat.lastElementChild;
    if (!last || !last.classList.contains("bot")) return;                 // wait until Krishna has answered
    lsSet(PROMPTED_KEY, "1");
    openModal();
  }
  if (chat && typeof MutationObserver !== "undefined") {
    new MutationObserver(function () {
      clearTimeout(checkTimer);
      checkTimer = setTimeout(maybeInvite, 1800);
    }).observe(chat, { childList: true, subtree: true });
  }
})();
