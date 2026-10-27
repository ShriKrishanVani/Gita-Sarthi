/* श्री कृष्ण वाणी - shared menu (☰) for every page.
 * Add <script src="menu.js" defer></script> to a page and the menu appears in its top bar.
 * Pages without a top bar get a floating ☰ button in the top-right corner.
 */
(function(){
  if(window.__krishnaMenu) return; window.__krishnaMenu = true;
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var en = lsGet("krishna_lang") === "en";
  var T = function(hi,e){ return en ? e : hi; };

  var items = [
    {id:"home",  href:"index.html",         label:T("🏠 होम / चैट","🏠 Home / Chat")},
    {id:"gita",  href:"gita.html",          label:T("📖 गीता","📖 Gita")},
    {id:"aarti", href:"aarti.html",         label:T("🪔 आरती","🪔 Aarti")},
    {id:"japa",  href:"index.html#japa",    label:T("📿 जप काउंटर","📿 Japa Counter")},
    {id:"panchang",href:"panchang.html",     label:T("🗓 पंचांग","🗓 Panchang")},
    {id:"cal",   href:"index.html#cal",     label:T("📅 पर्व-तिथि कैलेंडर","📅 Festival Calendar")},
    {id:"fav",   href:"index.html#fav",     label:T("❤️ मेरे पसंदीदा","❤️ Favourites")},
    {id:"profile",href:"profile.html",      label:T("👤 प्रोफ़ाइल","👤 Profile")},
    {id:"support",href:"support.html",      label:T("🙏 सहायता","🙏 Support")},
    {id:"lang",  href:"index.html#lang",    label:T("🌐 भाषा / Language","🌐 Language / भाषा")}
  ];
  var here = {"index.html":"home","gita.html":"gita","aarti.html":"aarti","profile.html":"profile","support.html":"support","panchang.html":"panchang"}[page];
  var hasTheme = document.documentElement.hasAttribute("data-theme");

  var css = document.createElement("style");
  css.textContent =
    ".kmenu-btn{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;"+
      "border:1px solid var(--km-line);background:var(--km-chip);color:var(--km-gold);font-family:inherit;margin-left:auto;}"+
    ".kmenu-btn svg{width:20px;height:20px}"+
    ".kmenu-btn.km-float{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:12px;z-index:9998;margin:0;background:var(--km-bg)}"+
    ".topbar .kmenu-btn.km-inbar{margin-left:0}"+
    ".kmenu-pop{position:fixed;z-index:9999;min-width:210px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 90px);overflow-y:auto;display:none;"+
      "background:var(--km-bg);border:1px solid var(--km-line);border-radius:14px;box-shadow:0 16px 36px rgba(0,0,0,.38);}"+
    ".kmenu-pop.show{display:block}"+
    ".kmenu-pop a,.kmenu-pop button{display:block;width:100%;text-align:left;padding:12px 16px;font:500 14px/1.3 Poppins,'Tiro Devanagari Hindi',-apple-system,Segoe UI,sans-serif;"+
      "color:var(--km-text);background:none;border:0;text-decoration:none;cursor:pointer;border-bottom:1px solid var(--km-line2)}"+
    ".kmenu-pop a:last-child,.kmenu-pop button:last-child{border-bottom:0}"+
    ".kmenu-pop a:active,.kmenu-pop button:active{background:var(--km-chip)}"+
    ".kmenu-pop a.cur{color:var(--km-gold);font-weight:600;background:var(--km-chip)}"+
    ".kmenu-btn:focus-visible,.kmenu-pop a:focus-visible,.kmenu-pop button:focus-visible{outline:2px solid var(--km-gold);outline-offset:-2px}";
  document.head.appendChild(css);

  function palette(){
    var dark = (document.documentElement.getAttribute("data-theme")
                ? document.documentElement.getAttribute("data-theme") === "dark"
                : (page === "profile.html" || lsGet("aarti_theme") !== "light" && page !== "support.html" && page !== "subscribe.html"));
    var r = document.documentElement.style;
    if(dark){
      r.setProperty("--km-bg","#1B2560"); r.setProperty("--km-text","#FFF6DF"); r.setProperty("--km-gold","#F0CC72");
      r.setProperty("--km-line","rgba(240,204,114,.55)"); r.setProperty("--km-line2","rgba(240,204,114,.18)"); r.setProperty("--km-chip","rgba(255,255,255,.10)");
    } else {
      r.setProperty("--km-bg","#FFFDF6"); r.setProperty("--km-text","#1B2650"); r.setProperty("--km-gold","#7A5A18");
      r.setProperty("--km-line","rgba(138,106,38,.45)"); r.setProperty("--km-line2","rgba(138,106,38,.18)"); r.setProperty("--km-chip","rgba(27,38,80,.07)");
    }
    return dark;
  }

  function build(){
    var dark = palette();
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "kmenu-btn";
    btn.setAttribute("aria-label", T("मेनू","Menu")); btn.setAttribute("aria-haspopup","true"); btn.setAttribute("aria-expanded","false");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    var bar = document.querySelector(".topbar");
    if(bar){ btn.classList.add("km-inbar"); if(!bar.querySelector(".spacer,.crumb")) btn.style.marginLeft = "auto"; bar.appendChild(btn); }
    else { btn.classList.add("km-float"); document.body.appendChild(btn); document.body.style.paddingTop = "58px"; }

    var pop = document.createElement("div"); pop.className = "kmenu-pop"; pop.setAttribute("role","menu");
    items.forEach(function(it){
      if(page === "index.html" && /#/.test(it.href) === false && it.id === "home") return;
      var a = document.createElement("a"); a.href = it.href; a.textContent = it.label; a.setAttribute("role","menuitem");
      if(it.id === here) a.className = "cur";
      if(page === "index.html" && /^index\.html#/.test(it.href)){
        a.addEventListener("click", function(e){ e.preventDefault(); close(); location.hash = it.href.split("#")[1]; location.reload(); });
      }
      pop.appendChild(a);
    });
    if(hasTheme){
      var tb = document.createElement("button"); tb.type = "button"; tb.setAttribute("role","menuitem");
      tb.textContent = dark ? T("☀️ दिन मोड","☀️ Day mode") : T("🌙 रात्रि मोड","🌙 Night mode");
      tb.addEventListener("click", function(){ lsSet("aarti_theme", dark ? "light" : "dark"); location.reload(); });
      pop.appendChild(tb);
    }
    document.body.appendChild(pop);

    function place(){
      var r = btn.getBoundingClientRect();
      pop.style.top = (r.bottom + 6) + "px";
      pop.style.right = Math.max(12, window.innerWidth - r.right) + "px"; pop.style.left = "auto";
    }
    function close(){ pop.classList.remove("show"); btn.setAttribute("aria-expanded","false"); }
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      if(pop.classList.contains("show")) return close();
      place(); pop.classList.add("show"); btn.setAttribute("aria-expanded","true");
    });
    document.addEventListener("click", function(e){ if(!pop.contains(e.target)) close(); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape") close(); });
    window.addEventListener("resize", close);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
