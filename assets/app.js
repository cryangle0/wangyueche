(() => {
  const KEY = "apron_proto_v1";
  const DEMO_NOW = Date.parse("2026-08-31T10:40:00-07:00");
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);
  const pad = (n) => String(n).padStart(2, "0");

  let ui = {
    authed: sessionStorage.getItem("apron_in") === "1",
    role: sessionStorage.getItem("apron_role") || "passenger",
    lang: localStorage.getItem("apron_lang") || "zh",
    route: location.hash.replace("#", "") || "",
    portalRole: "passenger",
    toast: null,
    modal: null,
    filter: "all",
    orderId: null,
    tick: DEMO_NOW,
    form: {},
    msgText: "",
    adminRole: "super",
  };

  function t(k) {
    const pack = (window.I18N && window.I18N[ui.lang]) || window.I18N.zh;
    return pack[k] || window.I18N.en[k] || k;
  }

  function now() { return new Date(ui.tick); }
  function tzOf(city) {
    return { la: "America/Los_Angeles", ny: "America/New_York", mia: "America/New_York" }[city] || "America/Los_Angeles";
  }
  function fmtTime(ms, city) {
    if (!ms) return "—";
    return new Intl.DateTimeFormat(ui.lang === "zh" ? "zh-CN" : ui.lang === "es" ? "es-US" : "en-US", {
      timeZone: tzOf(city || db.settings.city),
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(ms));
  }
  function money(n) { return `$${Number(n || 0).toFixed(2)}`; }
  function toast(msg, kind) {
    ui.toast = { msg, kind: kind || "" };
    render();
    setTimeout(() => { ui.toast = null; render(); }, 2200);
  }

  const ADDR = {
    lax: { id: "lax", x: 24, y: 30, key: "lax" },
    dtla: { id: "dtla", x: 72, y: 48, key: "dtla" },
    santa: { id: "santa", x: 16, y: 72, key: "santa" },
    home: { id: "home", x: 78, y: 28, key: "home" },
    work: { id: "work", x: 62, y: 40, key: "work" },
  };
  const MILES = { "lax-dtla": 18.4, "lax-santa": 16.2, "lax-home": 21.0, "lax-work": 19.1, "dtla-santa": 15.8, "dtla-home": 8.2, "home-work": 6.4 };
  function milesOf(a, b) {
    const k = [a, b].sort().join("-");
    return MILES[`${a}-${b}`] || MILES[`${b}-${a}`] || MILES[k] || 14;
  }
  function addrName(id) { return t(id); }

  const VEHICLES = [
    { id: "econ", seats: 3, bags: 2, start: 4.5, per: 1.85 },
    { id: "comfort", seats: 4, bags: 3, start: 7, per: 2.35 },
    { id: "luxe", seats: 3, bags: 3, start: 14, per: 3.6 },
    { id: "van", seats: 6, bags: 6, start: 12, per: 2.9 },
  ];
  const STATUS = ["pendingDispatch", "assigned", "toPickup", "waiting", "overtime", "inTrip", "done", "canceled", "noshow"];
  const ST_MAP = {
    pending_dispatch: "pendingDispatch",
    assigned: "assigned",
    to_pickup: "toPickup",
    waiting: "waiting",
    overtime_confirm: "overtime",
    in_trip: "inTrip",
    completed: "done",
    cancelled: "canceled",
    noshow: "noshow",
  };
  function st(s) { return t(ST_MAP[s] || s); }
  function tagClass(s) {
    if (s === "completed" || s === "in_trip") return "tag-ok";
    if (s === "noshow" || s === "cancelled") return "tag-bad";
    if (s === "waiting" || s === "overtime_confirm") return "tag-wait";
    return "tag-navy";
  }

  function seed() {
    const fees = {
      booking: 8, bag: 6, freeWait: 105, waitPerMin: 0.85, nightFrom: 22, nightTo: 6, nightRate: 0.2,
      cancelAssigned: 12, noshow: 35, commission: 0.18,
    };
    const drivers = [
      { id: "D1", name: "Maya Chen", level: "gold", online: true, busy: false, rating: 4.96, accept: 0.94, attend: 0.98, complaints: 0, vehicle: "comfort", plate: "7XCV334", color: "White", phone: "+1 310 •••• 4821", x: 28, y: 34, returnTrip: true, docs: "ok", city: "la", earnings: 286.4 },
      { id: "D2", name: "Luis Ortega", level: "silver", online: true, busy: false, rating: 4.81, accept: 0.88, attend: 0.91, complaints: 1, vehicle: "econ", plate: "8LKM102", color: "Gray", phone: "+1 213 •••• 1904", x: 70, y: 50, returnTrip: false, docs: "ok", city: "la", earnings: 194.2 },
      { id: "D3", name: "Jordan Hale", level: "bronze", online: true, busy: true, rating: 4.62, accept: 0.77, attend: 0.84, complaints: 3, vehicle: "luxe", plate: "5QWE889", color: "Black", phone: "+1 424 •••• 6610", x: 40, y: 60, returnTrip: true, docs: "ok", city: "la", earnings: 412.0 },
      { id: "D4", name: "Priya Shah", level: "gold", online: false, busy: false, rating: 4.99, accept: 0.97, attend: 0.99, complaints: 0, vehicle: "van", plate: "9VAN441", color: "Navy", phone: "+1 562 •••• 2201", x: 50, y: 40, returnTrip: false, docs: "ok", city: "la", earnings: 0 },
      { id: "D5", name: "Chris Nguyen", level: "bronze", online: false, busy: false, rating: 0, accept: 0, attend: 0, complaints: 0, vehicle: "comfort", plate: "—", color: "Silver", phone: "+1 818 •••• 0044", x: 55, y: 55, returnTrip: false, docs: "pending", city: "la", earnings: 0 },
    ];
    const passenger = {
      id: "P1", name: "Elena Ruiz", nick: "Elena", email: "elena.ruiz@example.com", phone: "+1 310 555 0199",
      city: "la", pay: "stripe", lang: "zh",
      saved: ["home", "work"], hist: ["lax", "dtla"],
    };
    const flights = {
      UA123: { sched: DEMO_NOW - 42 * 60000, actual: DEMO_NOW - 22 * 60000, status: "landed", term: "TBIT" },
      AA88: { sched: DEMO_NOW + 40 * 60000, actual: DEMO_NOW + 75 * 60000, status: "delayed", term: "T4" },
      DL401: { sched: DEMO_NOW + 220 * 60000, actual: null, status: "on_time", term: "TBIT" },
      UA456: { sched: DEMO_NOW + 90 * 60000, actual: null, status: "on_time", term: "TBIT" },
    };
    const orders = [
      orderSeed("O-1001", "pending_dispatch", { from: "lax", to: "dtla", flight: "DL401", when: DEMO_NOW + 240 * 60000, vehicle: "comfort", pax: 2, bags: 2, driverId: null }),
      orderSeed("O-1002", "waiting", { from: "lax", to: "santa", flight: "UA123", when: DEMO_NOW - 10 * 60000, vehicle: "comfort", pax: 1, bags: 2, driverId: "D1", arrivedAt: DEMO_NOW - 8 * 60000 }),
      orderSeed("O-1003", "in_trip", { from: "lax", to: "dtla", flight: "AA88", when: DEMO_NOW - 50 * 60000, vehicle: "luxe", pax: 3, bags: 3, driverId: "D3" }),
      orderSeed("O-1004", "completed", { from: "home", to: "lax", flight: "", when: DEMO_NOW - 26 * 3600000, vehicle: "econ", pax: 1, bags: 1, driverId: "D2", rated: false }),
      orderSeed("O-1005", "noshow", { from: "lax", to: "dtla", flight: "UA123", when: DEMO_NOW - 5 * 3600000, vehicle: "comfort", pax: 1, bags: 1, driverId: "D2" }),
      orderSeed("O-1006", "overtime_confirm", { from: "lax", to: "work", flight: "UA123", when: DEMO_NOW - 5 * 60000, vehicle: "van", pax: 4, bags: 4, driverId: "D1" }),
    ];
    function orderSeed(id, status, o) {
      const fare = quote(o.from, o.to, o.vehicle, o.bags, o.when, fees);
      const land = o.flight && flights[o.flight] ? flights[o.flight].actual || flights[o.flight].sched : o.when;
      const freeUntil = land + fees.freeWait * 60000;
      return {
        id, passengerId: "P1", driverId: o.driverId, status, city: "la",
        from: o.from, to: o.to, flight: o.flight, when: o.when, vehicle: o.vehicle, pax: o.pax, bags: o.bags,
        notes: o.id === "O-1001" ? "Name sign: RUIZ" : "",
        pay: "stripe", fare, logs: [{ t: o.when - 3600000, e: "created" }],
        arrivedAt: o.arrivedAt || (status === "waiting" || status === "overtime_confirm" ? DEMO_NOW - 8 * 60000 : null),
        freeUntil: status === "waiting" || status === "overtime_confirm" || status === "noshow" ? freeUntil : null,
        overtimeMin: status === "overtime_confirm" ? 18 : 0,
        rated: o.rated === false ? false : status === "completed",
        rating: status === "completed" && o.rated !== false ? 5 : 0,
        tags: status === "completed" ? ["punctual"] : [],
        evidence: status === "noshow" ? evidenceOf(id, freeUntil) : null,
      };
    }
    const messages = [
      { id: "M1", kind: "order", title: "O-1001", body: "DL401 · pending dispatch", read: false, t: DEMO_NOW - 60000 },
      { id: "M2", kind: "sys", title: "CCPA", body: "Privacy controls are in Me → CCPA.", read: true, t: DEMO_NOW - 86400000 },
      { id: "M3", kind: "cs", title: "Ana · CS", body: "We can add a child seat if you note it before dispatch.", read: false, t: DEMO_NOW - 120000 },
    ];
    const chats = [
      { id: "C1", with: "cs", name: "Ana", lines: [{ who: "cs", t: DEMO_NOW - 300000, txt: "How can I help?" }] },
    ];
    return {
      passenger, drivers, orders, messages, chats, flights, fees,
      settings: { city: "la", tz: "America/Los_Angeles", platform: "Apron", stripe: "pk_test_***", paypal: "sb-***", maps: "demo-map" },
      users: [
        passenger,
        { id: "P2", name: "Tom Baker", email: "tom@example.com", phone: "+1 646 555 0110", city: "ny", frozen: false, spend: 420 },
      ],
      cs: [{ id: "CS1", name: "Ana Díaz", role: "senior", shift: 14 }],
      withdrawals: [{ id: "W1", driverId: "D1", amount: 180, account: "Wise · ELENA***", status: "pending" }],
      logs: [{ t: DEMO_NOW - 10000, who: "admin", e: "seed" }],
      notices: [{ id: "N1", to: "all", title: "LAX TBIT curb", body: "Use the inner island after 10pm." }],
    };

    function evidenceOf(id, freeUntil) {
      return {
        arrivedAt: DEMO_NOW - 5.2 * 3600000,
        waitLog: "Free wait 105 min from actual landing UA123 08:18 PDT",
        chat: "Overtime SMS sent · no reply",
        gps: "34.198 · -118.404 (TBIT inner curb)",
        freeUntil,
      };
    }
  }

  function quote(from, to, vehicleId, bags, whenMs, fees) {
    const fe = fees || (db && db.fees) || { bag: 6, booking: 8, nightRate: 0.2 };
    const v = VEHICLES.find((x) => x.id === vehicleId) || VEHICLES[1];
    const mi = milesOf(from, to);
    const mile = v.start + mi * v.per;
    const bag = Math.max(0, (bags || 0) - 1) * (fe.bag ?? 6);
    const d = new Date(whenMs || ui.tick);
    const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }).format(d));
    const nightOn = h >= 22 || h < 6;
    const night = nightOn ? mile * (fe.nightRate ?? 0.2) : 0;
    const booking = fe.booking ?? 8;
    const sub = mile + bag + night + booking;
    return { mi: +mi.toFixed(1), mile: +mile.toFixed(2), bag: +bag.toFixed(2), night: +night.toFixed(2), booking, wait: 0, total: +sub.toFixed(2), nightOn };
  }

  let db;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return seed();
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
  db = load();

  function resetDemo() {
    localStorage.removeItem(KEY);
    db = seed();
    save();
    toast(t("resetDemo"), "ok");
  }

  if (!ui.route) ui.route = defaultRoute(ui.role);
  function defaultRoute(role) {
    return { passenger: "p-home", driver: "d-home", dispatch: "c-queue", admin: "a-dash" }[role] || "p-home";
  }

  function isNightHour(ms) {
    const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: tzOf(db.settings.city), hour: "numeric", hour12: false }).format(new Date(ms)));
    return h >= (db.fees.nightFrom || 22) || h < (db.fees.nightTo || 6);
  }

  function waitInfo(o) {
    if (!o.freeUntil) return null;
    const left = o.freeUntil - ui.tick;
    const over = Math.max(0, Math.ceil((ui.tick - o.freeUntil) / 60000));
    return { left, over, text: clock(Math.abs(left)), overMin: over };
  }
  function clock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }

  function aiRank(order) {
    return db.drivers
      .filter((d) => d.docs === "ok")
      .map((d) => {
        const dist = Math.hypot((d.x || 50) - (ADDR[order.from]?.x || 50), (d.y || 50) - (ADDR[order.from]?.y || 50));
        const distKm = dist * 0.32;
        const vMatch = d.vehicle === order.vehicle ? 22 : 6;
        const lvl = d.level === "gold" ? 14 : d.level === "silver" ? 7 : 2;
        let score = Math.max(0, 22 - distKm) * 2.4 + vMatch + d.rating * 8 + d.accept * 16 + d.attend * 10 - d.complaints * 7 + lvl;
        if (d.returnTrip) score += 10;
        if (!d.online) score -= 80;
        if (d.busy) score -= 25;
        return { d, score: Math.round(score * 10) / 10, dist: +distKm.toFixed(1), vMatch };
      })
      .sort((a, b) => b.score - a.score);
  }

  function pushLog(order, e) { order.logs.unshift({ t: ui.tick, e }); }
  function notify(title, body, kind) {
    db.messages.unshift({ id: uid("M"), kind: kind || "order", title, body, read: false, t: ui.tick });
  }

  function findOrder(id) { return db.orders.find((o) => o.id === id); }
  function findDriver(id) { return db.drivers.find((d) => d.id === id); }

  function assignOrder(oid, did) {
    const o = findOrder(oid); const d = findDriver(did);
    if (!o || !d || d.docs !== "ok" || !d.online) return toast("—", "err");
    o.driverId = did; o.status = "assigned"; d.busy = true;
    pushLog(o, "assigned:" + d.name);
    notify(o.id, d.name, "order");
    save(); toast(t("toastAssigned"), "ok");
  }

  function estimateForm() {
    const f = ui.form;
    if (!f.from || !f.to) return null;
    return quote(f.from, f.to, f.vehicle || "comfort", Number(f.bags || 0), Date.parse(f.when) || ui.tick);
  }

  /* ---------- bits ---------- */
  function chips(list, key, val) {
    return `<div class="chips">${list.map((id) => `<button type="button" class="chip ${val === id ? "on" : ""}" data-action="set-form" data-k="${key}" data-v="${id}">${esc(t(id))}</button>`).join("")}</div>`;
  }
  function mapHtml(from, to, car) {
    const a = ADDR[from] || ADDR.lax; const b = ADDR[to] || ADDR.dtla;
    return `<div class="map-canvas">
      <div class="map-road" style="left:8%;top:38%;width:84%;height:10px"></div>
      <div class="map-road" style="left:30%;top:12%;width:10px;height:76%"></div>
      <div class="map-road" style="left:12%;top:62%;width:70%;height:8px;transform:rotate(-8deg)"></div>
      <div class="pin a" style="left:${a.x}%;top:${a.y}%"><span class="pin-label">${esc(addrName(from || "lax"))}</span></div>
      <div class="pin b" style="left:${b.x}%;top:${b.y}%"><span class="pin-label">${esc(addrName(to || "dtla"))}</span></div>
      ${car ? `<div class="pin car" style="left:${car.x}%;top:${car.y}%"></div>` : ""}
    </div>`;
  }
  function fidsRow(code) {
    const f = db.flights[code];
    if (!f) return "";
    const stt = f.status === "delayed" ? "fids-delay" : "fids-live";
    const land = f.actual || f.sched;
    return `<div class="fids-row"><span>${esc(code)}</span><span>${esc(f.term)}</span><span class="${stt}">${esc(f.status.replace("_", " ")).toUpperCase()}</span><span>${fmtTime(land, "la")}</span></div>`;
  }
  function orderCard(o, who) {
    return `<button type="button" class="card" data-action="open-order" data-id="${o.id}" style="width:100%;text-align:left">
      <div class="card-hd"><b>${esc(o.id)}</b><span class="tag ${tagClass(o.status)}">${esc(st(o.status))}</span></div>
      <div class="kv">
        <div><span>${t("from")}</span><b>${esc(addrName(o.from))}</b></div>
        <div><span>${t("to")}</span><b>${esc(addrName(o.to))}</b></div>
        ${o.flight ? `<div><span>${t("flight")}</span><b>${esc(o.flight)} · ${fmtTime((db.flights[o.flight] || {}).actual || (db.flights[o.flight] || {}).sched, o.city)}</b></div>` : ""}
        <div><span>${t("when")}</span><b>${fmtTime(o.when, o.city)}</b></div>
        <div><span>${t("total")}</span><b class="num">${money(o.fare.total)}</b></div>
      </div>
    </button>`;
  }

  /* ---------- passenger ---------- */
  function pagePHome() {
    const f = ui.form;
    if (!f.from) Object.assign(ui.form, { from: "lax", to: "dtla", vehicle: "comfort", pax: 2, bags: 2, flight: "UA456", when: toLocalInput(ui.tick + 2 * 3600000), pay: "stripe", city: "la" });
    const est = estimateForm();
    const blocked = ui.form.city === "ch";
    return `<div class="mini-scroll map-mode">${mapHtml(ui.form.from, ui.form.to)}
      <div class="sheet"><div class="sheet-handle"></div>
        <div class="seg">${["la", "ny", "mia", "ch"].map((c) => `<button class="${ui.form.city === c ? "on" : ""}" data-action="set-form" data-k="city" data-v="${c}">${esc(t("city" + ({ la: "LA", ny: "NY", mia: "MI", ch: "CH" }[c])))}</button>`).join("")}</div>
        ${blocked ? `<p class="hint" style="color:var(--coral)">${t("cityBlocked")}</p>` : ""}
        <div class="addr-row"><i class="dot from"></i><select class="field-select" data-form="from">${optAddr(ui.form.from)}</select></div>
        <div class="addr-row"><i class="dot to"></i><select class="field-select" data-form="to">${optAddr(ui.form.to)}</select></div>
        <div class="chips">
          <button class="chip" data-action="set-form" data-k="from" data-v="home">${t("home")}</button>
          <button class="chip" data-action="set-form" data-k="from" data-v="work">${t("work")}</button>
          <button class="chip" data-action="set-form" data-k="from" data-v="lax">${t("lax")}</button>
        </div>
        <div class="field"><label>${t("flight")}</label><input class="field-input" data-form="flight" value="${esc(ui.form.flight || "")}" placeholder="UA456" /></div>
        ${ui.form.flight && db.flights[ui.form.flight] ? `<div class="fids-board" style="margin:0 0 10px">${fidsRow(ui.form.flight)}</div><p class="hint">${t("flightSrc")}</p>` : ""}
        <div class="field"><label>${t("when")}</label><input class="field-input" type="datetime-local" data-form="when" value="${esc(ui.form.when || "")}" /></div>
        <p class="hint">${t("tzNote")}</p>
        <label class="muted">${t("vehicle")}</label>
        ${chips(["econ", "comfort", "luxe", "van"], "vehicle", ui.form.vehicle)}
        <div class="btn-row">
          <div class="field" style="flex:1"><label>${t("pax")}</label><input class="field-input" type="number" min="1" max="6" data-form="pax" value="${esc(ui.form.pax || 1)}" /></div>
          <div class="field" style="flex:1"><label>${t("bags")}</label><input class="field-input" type="number" min="0" max="8" data-form="bags" value="${esc(ui.form.bags || 0)}" /></div>
        </div>
        <div class="field"><label>${t("notes")}</label><input class="field-input" data-form="notes" placeholder="${esc(t("notesPh"))}" value="${esc(ui.form.notes || "")}" /></div>
        ${est ? `<div class="card"><div class="card-hd"><b>${t("estimate")}</b><span class="num">${money(est.total)}</span></div>
          <div class="kv">
            <div><span>${t("mile")} · ${est.mi} ${t("mi")}</span><b>${money(est.mile)}</b></div>
            <div><span>${t("bookingFee")}</span><b>${money(est.booking)}</b></div>
            <div><span>${t("bagFee")}</span><b>${money(est.bag)}</b></div>
            <div><span>${t("nightFee")}</span><b>${money(est.night)}</b></div>
          </div></div>` : ""}
        <label class="muted">${t("payWith")}</label>
        <div class="pay-grid">${["stripe", "paypal", "wise", "revolut"].map((p) => `<button class="pay-opt ${ui.form.pay === p ? "on" : ""}" data-action="set-form" data-k="pay" data-v="${p}">${esc(t(p))}</button>`).join("")}</div>
        <button type="button" class="btn btn-primary" style="margin-top:12px" data-action="submit-book">${t("submit")}</button>
      </div></div>`;
  }
  function optAddr(cur) {
    return Object.keys(ADDR).map((id) => `<option value="${id}" ${cur === id ? "selected" : ""}>${esc(addrName(id))}</option>`).join("");
  }
  function toLocalInput(ms) {
    const d = new Date(ms - 7 * 3600000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
  function pagePOrders() {
    const rows = db.orders.filter((o) => o.passengerId === "P1");
    const show = ui.filter === "all" ? rows : rows.filter((o) => ST_MAP[o.status] === ui.filter);
    return `<h2 class="page-title">${t("orders")}</h2>
      <div class="seg">${["all", "pendingDispatch", "toPickup", "waiting", "done"].map((k) => `<button class="${ui.filter === k ? "on" : ""}" data-action="filter" data-v="${k}">${t(k)}</button>`).join("")}</div>
      ${show.map((o) => orderCard(o, "p")).join("") || `<div class="empty">${t("none")}</div>`}`;
  }
  function pagePInbox() {
    return `<h2 class="page-title">${t("inbox")}</h2>
      ${db.messages.map((m) => `<div class="card"><div class="card-hd"><b>${esc(m.title)}</b><span class="muted">${m.read ? "" : t("unread")}</span></div><p class="muted">${esc(m.body)}</p></div>`).join("")}
      <div class="card"><div class="card-hd"><b>Ana</b><span class="tag tag-navy">${t("csMsg")}</span></div>
        ${(db.chats[0].lines || []).map((l) => `<p class="muted">${esc(l.txt)}</p>`).join("")}
        <div class="btn-row"><input class="field-input" id="chat-in" placeholder="${esc(t("typeMsg"))}" /><button class="btn btn-navy" data-action="send-cs">${t("send")}</button></div>
      </div>`;
  }
  function pagePMe() {
    const p = db.passenger;
    return `<h2 class="page-title">${t("me")}</h2>
      <div class="card kv">
        <div><span>${t("name")}</span><b>${esc(p.name)}</b></div>
        <div><span>${t("email")}</span><b>${esc(p.email)}</b></div>
        <div><span>${t("phone")}</span><b>${esc(p.phone)}</b></div>
      </div>
      <div class="card"><b>${t("pay")}</b>${chips(["stripe", "paypal", "wise", "revolut"], "pay", p.pay)}</div>
      <div class="card"><b>${t("savedAddr")}</b><div class="chips">${p.saved.map((a) => `<span class="chip on">${esc(addrName(a))}</span>`).join("")}</div></div>
      <div class="card"><b>${t("help")}</b>
        <p><b>${t("faq1q")}</b><br/><span class="muted">${t("faq1a")}</span></p>
        <p><b>${t("faq2q")}</b><br/><span class="muted">${t("faq2a")}</span></p>
        <p><b>${t("faq3q")}</b><br/><span class="muted">${t("faq3a")}</span></p>
      </div>
      <div class="card ccpa"><b>${t("ccpa")}</b><p>${t("ccpaBody")}</p>
        <button class="btn btn-ghost" data-action="delete-acct">${t("deleteAccount")}</button>
      </div>
      <div class="seg" style="margin-top:8px">${["zh", "en", "es"].map((l) => `<button class="${ui.lang === l ? "on" : ""}" data-action="lang" data-v="${l}">${l.toUpperCase()}</button>`).join("")}</div>`;
  }

  /* ---------- driver ---------- */
  function myDriver() { return db.drivers[0]; }
  function pageDHome() {
    const d = myDriver();
    const mine = db.orders.filter((o) => o.driverId === d.id && !["completed", "cancelled", "noshow"].includes(o.status));
    const todayN = db.orders.filter((o) => o.driverId === d.id).length;
    return `<div class="card-hd"><h2 class="page-title">${t("workbench")}</h2>
        <button class="chip ${d.online ? "on" : ""}" data-action="toggle-online">${d.online ? t("online") : t("offline")}</button></div>
      <div class="stat-grid">
        <div class="stat"><b>${todayN}</b><span>${t("todayOrders")}</span></div>
        <div class="stat"><b>${money(d.earnings)}</b><span>${t("earnings")}</span></div>
      </div>
      ${mine.map((o) => orderCard(o, "d")).join("") || `<div class="empty">${t("none")}</div>`}`;
  }
  function pageDOrders() {
    const d = myDriver();
    const rows = db.orders.filter((o) => o.driverId === d.id || (o.status === "assigned" && o.driverId === d.id));
    return `<h2 class="page-title">${t("orders")}</h2>${rows.map((o) => orderCard(o, "d")).join("") || `<div class="empty">${t("none")}</div>`}`;
  }
  function pageDInbox() {
    return `<h2 class="page-title">${t("inbox")}</h2>${db.notices.map((n) => `<div class="card"><b>${esc(n.title)}</b><p class="muted">${esc(n.body)}</p></div>`).join("")}`;
  }
  function pageDMe() {
    const d = myDriver();
    return `<h2 class="page-title">${t("me")}</h2>
      <div class="card kv">
        <div><span>${t("name")}</span><b>${esc(d.name)}</b></div>
        <div><span>${t("level")}</span><b>${esc(t(d.level))}</b></div>
        <div><span>${t("rating")}</span><b>${d.rating.toFixed(2)}</b></div>
        <div><span>${t("plate")}</span><b>${esc(d.plate)} · ${esc(d.color)}</b></div>
      </div>
      <div class="card"><b>${t("docs")}</b>
        <div class="kv">
          <div><span>${t("license")}</span><span class="tag tag-ok">${t("docsOk")}</span></div>
          <div><span>${t("insurance")}</span><span class="tag tag-ok">${t("docsOk")}</span></div>
          <div><span>${t("tlc")}</span><span class="tag tag-ok">${t("docsOk")}</span></div>
        </div>
      </div>
      <div class="card"><b>${t("withdraw")}</b><p class="hint">${t("zelleHint")}</p>
        <button class="btn btn-navy" data-action="withdraw">${t("withdraw")}</button>
      </div>`;
  }

  /* ---------- dispatch ---------- */
  function pageCQueue() {
    const open = db.orders.filter((o) => ["pending_dispatch", "assigned"].includes(o.status));
    return `<h2 class="page-title">${t("dispatch")}</h2>
      <p class="page-desc">${t("manualQ")}</p>
      <div class="btn-row" style="margin-bottom:10px">
        <button class="btn btn-navy" data-action="batch">${t("batch")}</button>
        <button class="btn btn-ghost" data-action="near">${t("near")}</button>
        <button class="btn btn-ghost" data-action="flight-re">${t("flightRe")}</button>
      </div>
      ${open.map((o) => {
        const ranks = aiRank(o).slice(0, 3);
        return `<div class="card">
          <div class="card-hd"><b>${esc(o.id)}</b><span class="tag ${tagClass(o.status)}">${esc(st(o.status))}</span></div>
          <p class="muted">${esc(addrName(o.from))} → ${esc(addrName(o.to))} · ${esc(o.flight || "—")} · ${fmtTime(o.when, o.city)}</p>
          <p class="muted">${t("ai")}</p>
          <div class="ai-list">${ranks.map((r) => `<div class="ai-item">
            <div><b>${esc(r.d.name)}</b> · ${t(r.d.level)} · ${r.score} ${t("score")}<div class="muted">${t("distance")} ${r.dist} · ${t(r.d.vehicle)} · ${!r.d.online ? t("off") : r.d.busy ? t("busy") : t("idle")}</div></div>
            <button class="btn btn-primary" style="height:34px;width:auto" data-action="assign" data-oid="${o.id}" data-did="${r.d.id}">${t("assign")}</button>
          </div>`).join("")}</div>
          ${o.driverId ? `<button class="btn btn-ghost" data-action="recall" data-id="${o.id}">${t("recall")}</button>` : ""}
        </div>`;
      }).join("") || `<div class="empty">${t("none")}</div>`}`;
  }
  function pageCDrivers() {
    return `<h2 class="page-title">${t("monitor")}</h2>
      ${mapHtml("lax", "dtla", db.drivers[0])}
      ${db.drivers.map((d) => `<div class="card kv">
        <div><span>${esc(d.name)}</span><span class="tag ${d.online ? (d.busy ? "tag-wait" : "tag-ok") : "tag-mist"}">${d.online ? (d.busy ? t("busy") : t("idle")) : t("off")}</span></div>
        <div><span>${t("level")}</span><b>${t(d.level)}</b></div>
        <div><span>${t("rating")}</span><b>${d.rating || "—"}</b></div>
      </div>`).join("")}`;
  }
  function pageCInbox() {
    return `<h2 class="page-title">${t("inbox")}</h2>${db.messages.map((m) => `<div class="card"><b>${esc(m.title)}</b><p class="muted">${esc(m.body)}</p></div>`).join("")}`;
  }
  function pageCShift() {
    const n = db.orders.filter((o) => o.driverId).length;
    return `<h2 class="page-title">${t("shift")}</h2>
      <div class="stat-grid">
        <div class="stat"><b>${n}</b><span>${t("assign")}</span></div>
        <div class="stat"><b>${db.orders.filter((o) => o.status === "pending_dispatch").length}</b><span>${t("pendingDispatch")}</span></div>
      </div>
      <p class="hint">${t("walk2")}</p>`;
  }

  /* ---------- admin ---------- */
  function adminMenus() {
    return [
      { g: t("dashboard"), items: [{ id: "a-dash", title: t("dashboard") }] },
      { g: t("orderCtrl"), items: [{ id: "a-orders", title: t("orderCtrl") }] },
      { g: t("users"), items: [{ id: "a-users", title: t("users") }, { id: "a-drivers", title: t("drivers") }, { id: "a-cs", title: t("csMgr") }] },
      { g: t("finance"), items: [{ id: "a-fin", title: t("finance") }, { id: "a-fees", title: t("fees") }] },
      { g: t("announce"), items: [{ id: "a-msg", title: t("announce") }, { id: "a-set", title: t("settings") }] },
    ];
  }
  function pageADash() {
    const o = db.orders;
    return `<h2 class="page-title">${t("dashboard")}</h2>
      <div class="dash-grid">
        <div class="dash-card"><b>${o.length}</b><span>${t("todayOrders")}</span></div>
        <div class="dash-card"><b>${o.filter((x) => x.status === "pending_dispatch").length}</b><span>${t("pendingDispatch")}</span></div>
        <div class="dash-card"><b>${db.drivers.filter((d) => d.online).length}</b><span>${t("onlineDrivers")}</span></div>
        <div class="dash-card"><b>${money(o.reduce((s, x) => s + x.fare.total, 0))}</b><span>${t("revenue")}</span></div>
      </div>
      <div class="fids-board">${["UA123", "AA88", "DL401"].map(fidsRow).join("")}</div>`;
  }
  function pageAOrders() {
    return `<div class="card-hd"><h2 class="page-title">${t("orderCtrl")}</h2>
      <button class="btn btn-ghost" data-action="export">${t("export")}</button></div>
      <div class="table-wrap"><table><thead><tr><th>ID</th><th>${t("status")}</th><th>${t("flight")}</th><th>${t("from")}</th><th>${t("driverInfo")}</th><th>${t("total")}</th><th></th></tr></thead><tbody>
      ${db.orders.map((o) => `<tr>
        <td>${esc(o.id)}</td><td><span class="tag ${tagClass(o.status)}">${esc(st(o.status))}</span></td>
        <td>${esc(o.flight || "—")}</td><td>${esc(addrName(o.from))} → ${esc(addrName(o.to))}</td>
        <td>${esc((findDriver(o.driverId) || {}).name || "—")}</td><td class="num">${money(o.fare.total)}</td>
        <td><button class="chip" data-action="open-order" data-id="${o.id}">${t("detail")}</button>
            ${o.status === "noshow" || o.evidence ? `<button class="chip" data-action="evidence" data-id="${o.id}">${t("evidence")}</button>` : ""}
            ${o.status === "pending_dispatch" ? `<button class="chip" data-action="force" data-id="${o.id}">${t("force")}</button>` : ""}</td>
      </tr>`).join("")}
      </tbody></table></div>`;
  }
  function pageAUsers() {
    return `<h2 class="page-title">${t("users")}</h2>
      <div class="table-wrap"><table><thead><tr><th>${t("name")}</th><th>${t("email")}</th><th>${t("phone")}</th><th></th></tr></thead><tbody>
      ${db.users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td>
        <td><button class="chip" data-action="freeze" data-id="${u.id}">${u.frozen ? t("unfreeze") : t("freeze")}</button></td></tr>`).join("")}
      </tbody></table></div>`;
  }
  function pageADrivers() {
    return `<h2 class="page-title">${t("drivers")}</h2>
      ${db.drivers.map((d) => `<div class="card">
        <div class="card-hd"><b>${esc(d.name)}</b><span class="tag ${d.docs === "ok" ? "tag-ok" : "tag-wait"}">${d.docs === "ok" ? t("docsOk") : t("docsPending")}</span></div>
        <div class="kv">
          <div><span>${t("level")}</span><b>${t(d.level)}</b></div>
          <div><span>${t("rating")} / ${t("acceptRate")} / ${t("complaints")}</span><b>${d.rating} · ${Math.round(d.accept * 100)}% · ${d.complaints}</b></div>
        </div>
        ${d.docs !== "ok" ? `<div class="btn-row"><button class="btn btn-navy" data-action="approve-d" data-id="${d.id}">${t("approve")}</button><button class="btn btn-ghost" data-action="reject-d" data-id="${d.id}">${t("rejectDoc")}</button></div>` : ""}
      </div>`).join("")}`;
  }
  function pageACS() {
    return `<h2 class="page-title">${t("csMgr")}</h2>${db.cs.map((c) => `<div class="card kv"><div><span>${esc(c.name)}</span><b>${esc(c.role)}</b></div><div><span>${t("shift")}</span><b>${c.shift}</b></div></div>`).join("")}`;
  }
  function pageAFin() {
    return `<h2 class="page-title">${t("finance")}</h2>
      <div class="dash-grid">
        <div class="dash-card"><b>${money(db.orders.reduce((s, o) => s + o.fare.total, 0))}</b><span>${t("revenue")}</span></div>
        <div class="dash-card"><b>${Math.round(db.fees.commission * 100)}%</b><span>${t("commission")}</span></div>
      </div>
      ${db.withdrawals.map((w) => `<div class="card kv">
        <div><span>${esc(w.id)}</span><b>${money(w.amount)}</b></div>
        <div><span>${esc(w.account)}</span><span class="tag tag-wait">${esc(w.status)}</span></div>
        <button class="btn btn-navy" data-action="pay-w" data-id="${w.id}">${t("audit")}</button>
      </div>`).join("")}`;
  }
  function pageAFees() {
    const f = db.fees;
    return `<h2 class="page-title">${t("fees")}</h2>
      <div class="card">
        ${VEHICLES.map((v) => `<div class="kv" style="margin-bottom:8px"><div><span>${t(v.id)}</span><b>${v.seats} ${t("paxUnit")} · ${money(v.start)}+${money(v.per)}/${t("mi")}</b></div></div>`).join("")}
        <div class="field"><label>${t("freeWait")}</label><input class="field-input" id="fee-wait" type="number" value="${f.freeWait}" /></div>
        <div class="field"><label>${t("bookingFee")} USD</label><input class="field-input" id="fee-book" type="number" value="${f.booking}" /></div>
        <div class="field"><label>${t("bagFee")}</label><input class="field-input" id="fee-bag" type="number" value="${f.bag}" /></div>
        <div class="field"><label>${t("noshowFee")}</label><input class="field-input" id="fee-ns" type="number" value="${f.noshow}" /></div>
        <button class="btn btn-primary" data-action="save-fees">${t("save")}</button>
      </div>`;
  }
  function pageAMsg() {
    return `<h2 class="page-title">${t("announce")}</h2>
      ${db.notices.map((n) => `<div class="card"><b>${esc(n.title)}</b><p class="muted">${esc(n.body)}</p></div>`).join("")}
      <div class="field"><label>${t("announce")}</label><input class="field-input" id="n-title" /></div>
      <textarea class="field-area" id="n-body"></textarea>
      <button class="btn btn-navy" data-action="push-n">${t("send")}</button>`;
  }
  function pageASet() {
    return `<h2 class="page-title">${t("settings")}</h2>
      <div class="card kv">
        <div><span>${t("timezone")}</span><b>${esc(db.settings.tz)}</b></div>
        <div><span>${t("mapsKey")}</span><b>${esc(db.settings.maps)}</b></div>
        <div><span>${t("payApi")}</span><b>Stripe ${esc(db.settings.stripe)} · PayPal ${esc(db.settings.paypal)}</b></div>
        <div><span>CCPA</span><b>on</b></div>
        <div><span>${t("rbac")}</span><b>${t("superAdmin")} / ${t("ops")} / ${t("fin")} / ${t("csRole")}</b></div>
      </div>
      <p class="hint">${t("flightSrc")}</p>
      <p class="hint">${t("manualQ")}</p>
      <button class="btn btn-ghost" data-action="backup">${t("backup")}</button>`;
  }

  /* ---------- order modal ---------- */
  function orderModal(id) {
    const o = findOrder(id); if (!o) return "";
    const d = findDriver(o.driverId);
    const w = waitInfo(o);
    const who = ui.role;
    const flight = o.flight && db.flights[o.flight];
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <div class="card-hd"><b>${esc(o.id)}</b><span class="tag ${tagClass(o.status)}">${esc(st(o.status))}</span></div>
      ${mapHtml(o.from, o.to, d)}
      <div class="kv">
        <div><span>${t("from")}</span><b>${esc(addrName(o.from))}</b></div>
        <div><span>${t("to")}</span><b>${esc(addrName(o.to))}</b></div>
        <div><span>${t("when")}</span><b>${fmtTime(o.when, o.city)}</b></div>
        ${o.flight ? `<div><span>${t("flight")}</span><b>${esc(o.flight)} · ${t("actualLand")} ${fmtTime(flight?.actual || flight?.sched, o.city)}</b></div>` : ""}
        <div><span>${t("vehicle")}</span><b>${esc(t(o.vehicle))} · ${o.pax} ${t("paxUnit")} · ${o.bags} ${t("bagUnit")}</b></div>
        <div><span>${t("total")}</span><b>${money(o.fare.total)}</b></div>
      </div>
      ${d && ["assigned", "to_pickup", "waiting", "overtime_confirm", "in_trip", "completed"].includes(o.status) ? `<div class="card"><b>${t("driverInfo")}</b>
        <div class="kv"><div><span>${esc(d.name)}</span><b>${esc(d.plate)} · ${esc(d.color)}</b></div></div>
        <div class="btn-row"><button class="btn btn-ghost" data-action="nav">${t("nav")}</button><button class="btn btn-ghost" data-action="call">${t("call")}</button></div>
      </div>` : ""}
      ${w && ["waiting", "overtime_confirm"].includes(o.status) ? `<div class="wait-clock">
        <div class="muted">${w.left >= 0 ? t("waitLeft") : t("waitOver")} · ${t("freeWait")}</div>
        <div class="big">${w.text}</div>
        <div class="muted">${t("waitStart")}: ${t("actualLand")} ${fmtTime(flight?.actual, o.city)}</div>
      </div>` : ""}
      <div class="btn-row" style="flex-wrap:wrap;margin-top:10px">
        ${who === "passenger" && o.status === "overtime_confirm" ? `<button class="btn btn-primary" data-action="pay-wait" data-id="${o.id}">${t("payWait")}</button><button class="btn btn-danger" data-action="refuse-wait" data-id="${o.id}">${t("refuseWait")}</button>` : ""}
        ${who === "passenger" && ["pending_dispatch", "assigned"].includes(o.status) ? `<button class="btn btn-ghost" data-action="cancel-o" data-id="${o.id}">${t("cancel")}</button>` : ""}
        ${who === "passenger" && o.status === "completed" ? `<button class="btn btn-navy" data-action="rate" data-id="${o.id}">${t("rate")}</button><button class="btn btn-ghost" data-action="receipt" data-id="${o.id}">${t("receipt")}</button>` : ""}
        ${who === "passenger" ? `<button class="btn btn-ghost" data-action="share">${t("share")}</button><button class="btn btn-ghost" data-action="cs-open">${t("cs")}</button>` : ""}
        ${who === "driver" && o.status === "assigned" ? `<button class="btn btn-primary" data-action="accept-o" data-id="${o.id}">${t("accept")}</button><button class="btn btn-ghost" data-action="reject-o" data-id="${o.id}">${t("reject")}</button>` : ""}
        ${who === "driver" && o.status === "to_pickup" ? `<button class="btn btn-primary" data-action="arrive" data-id="${o.id}">${t("arrive")}</button>` : ""}
        ${who === "driver" && o.status === "waiting" ? `<button class="btn btn-teal" data-action="start-o" data-id="${o.id}">${t("startTrip")}</button><button class="btn btn-ghost" data-action="ask-wait" data-id="${o.id}">${t("applyWait")}</button><button class="btn btn-danger" data-action="noshow" data-id="${o.id}">${t("closeNoshow")}</button>` : ""}
        ${who === "driver" && o.status === "overtime_confirm" ? `<button class="btn btn-teal" data-action="start-o" data-id="${o.id}">${t("startTrip")}</button><button class="btn btn-danger" data-action="noshow" data-id="${o.id}">${t("closeNoshow")}</button>` : ""}
        ${who === "driver" && o.status === "in_trip" ? `<button class="btn btn-primary" data-action="end-o" data-id="${o.id}">${t("endTrip")}</button>` : ""}
        ${who === "admin" || who === "dispatch" ? `<button class="btn btn-ghost" data-action="evidence" data-id="${o.id}">${t("genEvidence")}</button>` : ""}
      </div>
      <p class="hint">${t("cancelRule")}</p>
    </div></div>`;
  }

  function receiptModal(id) {
    const o = findOrder(id); if (!o) return "";
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <div class="receipt">
        <h3 style="font-family:var(--display);margin:0 0 8px">APRON · ${t("invoice")}</h3>
        <div class="kv">
          <div><span>${esc(o.id)}</span><b>${fmtTime(o.when, o.city)}</b></div>
          <div><span>${t("from")}</span><b>${esc(addrName(o.from))}</b></div>
          <div><span>${t("to")}</span><b>${esc(addrName(o.to))}</b></div>
          <div><span>${t("mile")}</span><b>${money(o.fare.mile)}</b></div>
          <div><span>${t("bookingFee")}</span><b>${money(o.fare.booking)}</b></div>
          <div><span>${t("bagFee")}</span><b>${money(o.fare.bag)}</b></div>
          <div><span>${t("nightFee")}</span><b>${money(o.fare.night)}</b></div>
          <div><span>${t("total")}</span><b>${money(o.fare.total)} ${t("usd")}</b></div>
          <div><span>${t("payWith")}</span><b>${t(o.pay)}</b></div>
        </div>
        <p class="hint">Apron Transfer LLC · Los Angeles, CA · Demo receipt</p>
      </div>
      <button class="btn btn-navy" style="margin-top:10px" data-action="close-modal">${t("print")}</button>
    </div></div>`;
  }
  function evidenceModal(id) {
    const o = findOrder(id); if (!o) return "";
    const ev = o.evidence || {
      arrivedAt: o.arrivedAt, waitLog: `Free wait ${db.fees.freeWait} min`,
      chat: (db.chats[0]?.lines || []).map((l) => l.txt).join(" / ") || "—",
      gps: "34.198 · -118.404",
    };
    o.evidence = ev; save();
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <h3>${t("evidencePack")} · ${esc(o.id)}</h3>
      <div class="evidence">
        <div>${t("arrivedAt")}: ${fmtTime(ev.arrivedAt, o.city)}</div>
        <div>${esc(ev.waitLog)}</div>
        <div>${t("chatLog")}: ${esc(ev.chat)}</div>
        <div>${t("gpsShot")}: ${esc(ev.gps)}</div>
      </div>
    </div></div>`;
  }
  function rateModal(id) {
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <h3>${t("rate")}</h3>
      <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button data-action="star" data-id="${id}" data-n="${n}">★</button>`).join("")}</div>
      <div class="chips">${["punctual", "clean", "safe"].map((tg) => `<button class="chip" data-action="tag-r" data-id="${id}" data-v="${tg}">${esc(tg)}</button>`).join("")}</div>
      <textarea class="field-area" id="rate-c" placeholder="${esc(t("comment"))}"></textarea>
      <button class="btn btn-primary" data-action="save-rate" data-id="${id}">${t("save")}</button>
    </div></div>`;
  }

  /* ---------- shells ---------- */
  function renderPortal() {
    const role = ui.portalRole;
    return `<div class="portal">
      <div class="portal-hero">
        <div>
          <div class="portal-kicker">LOS ANGELES · PDT</div>
          <h1>${t("heroTitle")}</h1>
          <p>${t("heroBody")}</p>
        </div>
        <div class="fids-board">
          <div class="fids-row"><span>${t("fidsH1")}</span><span>${t("fidsH2")}</span><span>${t("fidsH3")}</span><span>${t("fidsH4")}</span></div>
          ${fidsRow("UA123")}${fidsRow("AA88")}${fidsRow("DL401")}
        </div>
      </div>
      <div class="portal-panel">
        <div class="chrome-brand" style="color:var(--navy);margin-bottom:8px"><img src="assets/logo.svg" alt="" /><div>${t("brand")}<small>${t("brandSub")}</small></div></div>
        <div class="portal-langs">${["zh", "en", "es"].map((l) => `<button class="${ui.lang === l ? "on" : ""}" data-action="lang" data-v="${l}">${l.toUpperCase()}</button>`).join("")}</div>
        <div class="role-grid">
          ${[["passenger", "passengerDesc"], ["driver", "driverDesc"], ["dispatch", "dispatchDesc"], ["admin", "adminDesc"]].map(([r, d]) =>
            `<button class="role-card ${role === r ? "on" : ""}" data-action="portal-role" data-v="${r}"><b>${t(r)}</b><span>${t(d)}</span></button>`).join("")}
        </div>
        <div class="field"><label>${t("email")}</label><input class="field-input" id="login-email" value="${role === "passenger" ? "elena.ruiz@example.com" : role === "driver" ? "maya.chen@apron.demo" : role === "dispatch" ? "ana@apron.demo" : "admin@apron.demo"}" /></div>
        ${role === "passenger" ? `<div class="field"><label>${t("code")}</label>
          <div class="btn-row"><input class="field-input" id="login-code" placeholder="888888" /><button class="btn btn-ghost" data-action="send-code">${t("sendCode")}</button></div></div>`
          : `<div class="field"><label>${t("password")}</label><input class="field-input" id="login-pass" type="password" value="demo" /></div>`}
        <label class="hint"><input type="checkbox" id="remember" checked /> ${t("remember")}</label>
        <button class="btn btn-primary" style="margin-top:12px" data-action="login">${t("enter")}</button>
        <p class="hint">${t("demoHint")}</p>
        <p class="hint">${t("walk1")} → ${t("walk2")} → ${t("walk3")} → ${t("walk4")}</p>
      </div>
    </div>${toastHtml()}`;
  }

  function chrome(inner) {
    return `<div class="chrome">
      <div class="chrome-bar">
        <div class="chrome-brand"><img src="assets/logo.svg" alt="" /><div>${t("brand")}<small>${t("overlayHint")}</small></div></div>
        <div class="chrome-tabs">${["passenger", "driver", "dispatch", "admin"].map((r) =>
          `<button class="chrome-tab ${ui.role === r ? "on" : ""}" data-action="role" data-v="${r}">${t(r)}</button>`).join("")}</div>
        <div class="lang-switch">
          ${["zh", "en", "es"].map((l) => `<button class="lang-btn ${ui.lang === l ? "on" : ""}" data-action="lang" data-v="${l}">${l.toUpperCase()}</button>`).join("")}
          <button class="ghost-btn" data-action="reset">${t("resetDemo")}</button>
          <button class="ghost-btn" data-action="logout">${t("logout")}</button>
        </div>
      </div>
      <div class="chrome-stage">${inner}</div>
    </div>${ui.modal ? ui.modal.html : ""}${toastHtml()}`;
  }
  function toastHtml() {
    return `<div class="toast-wrap">${ui.toast ? `<div class="toast ${ui.toast.kind}">${esc(ui.toast.msg)}</div>` : ""}</div>`;
  }

  function phone(tabs, body) {
    const d = now();
    const hh = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    return `<div class="mini-stage"><div class="mini-phone">
      <div class="notch"><span>${hh} PDT</span><span class="notch-dot"></span><span>5G</span></div>
      <div class="mini-body">${body}
        <nav class="tabbar">${tabs.map((tb) => `<button class="tab ${ui.route === tb.id ? "on" : ""}" data-go="${tb.id}"><b>${tb.ico}</b>${esc(tb.label)}</button>`).join("")}</nav>
      </div>
    </div><p class="hint">${t("overlayHint")}</p></div>`;
  }

  function renderPhone() {
    if (ui.role === "passenger") {
      const tabs = [
        { id: "p-home", ico: "△", label: t("book") },
        { id: "p-orders", ico: "≡", label: t("orders") },
        { id: "p-inbox", ico: "◇", label: t("inbox") },
        { id: "p-me", ico: "○", label: t("me") },
      ];
      const page = { "p-home": pagePHome, "p-orders": () => `<div class="mini-scroll">${pagePOrders()}</div>`, "p-inbox": () => `<div class="mini-scroll">${pagePInbox()}</div>`, "p-me": () => `<div class="mini-scroll">${pagePMe()}</div>` }[ui.route] || pagePHome;
      return phone(tabs, page());
    }
    if (ui.role === "driver") {
      const tabs = [
        { id: "d-home", ico: "▣", label: t("workbench") },
        { id: "d-orders", ico: "≡", label: t("orders") },
        { id: "d-inbox", ico: "◇", label: t("inbox") },
        { id: "d-me", ico: "○", label: t("me") },
      ];
      const page = { "d-home": () => `<div class="mini-scroll">${pageDHome()}</div>`, "d-orders": () => `<div class="mini-scroll">${pageDOrders()}</div>`, "d-inbox": () => `<div class="mini-scroll">${pageDInbox()}</div>`, "d-me": () => `<div class="mini-scroll">${pageDMe()}</div>` }[ui.route] || pageDHome;
      return phone(tabs, page());
    }
    const tabs = [
      { id: "c-queue", ico: "▦", label: t("dispatch") },
      { id: "c-drv", ico: "▣", label: t("monitor") },
      { id: "c-inbox", ico: "◇", label: t("inbox") },
      { id: "c-shift", ico: "○", label: t("shift") },
    ];
    const page = { "c-queue": () => `<div class="mini-scroll">${pageCQueue()}</div>`, "c-drv": () => `<div class="mini-scroll">${pageCDrivers()}</div>`, "c-inbox": () => `<div class="mini-scroll">${pageCInbox()}</div>`, "c-shift": () => `<div class="mini-scroll">${pageCShift()}</div>` }[ui.route] || pageCQueue;
    return phone(tabs, page());
  }

  function renderAdmin() {
    const pages = { "a-dash": pageADash, "a-orders": pageAOrders, "a-users": pageAUsers, "a-drivers": pageADrivers, "a-cs": pageACS, "a-fin": pageAFin, "a-fees": pageAFees, "a-msg": pageAMsg, "a-set": pageASet };
    const page = pages[ui.route] || pageADash;
    return `<div class="admin">
      <div class="admin-top"><div class="chrome-brand"><img src="assets/logo.svg" alt="" />${t("admin")}</div><span class="muted">${t("demoNow")} 10:40 PDT</span></div>
      <div class="admin-body">
        <aside class="sidebar">${adminMenus().map((g) => `<div class="nav-g">${esc(g.g)}</div>${g.items.map((it) => `<button class="nav-item ${ui.route === it.id ? "on" : ""}" data-go="${it.id}">${esc(it.title)}</button>`).join("")}`).join("")}</aside>
        <main class="content">${page()}</main>
      </div>
    </div>`;
  }

  function render() {
    const root = document.getElementById("app");
    document.documentElement.lang = ui.lang === "zh" ? "zh-CN" : ui.lang === "es" ? "es" : "en";
    if (!ui.authed) { root.innerHTML = renderPortal(); bind(); return; }
    const inner = ui.role === "admin" ? renderAdmin() : renderPhone();
    root.innerHTML = chrome(inner);
    bind();
  }

  function go(id) {
    ui.route = id;
    location.hash = id;
    ui.modal = null;
    render();
  }

  function bind() {
    document.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", (e) => {
      e.preventDefault();
      onAction(el.dataset.action, el.dataset, el);
    }));
    document.querySelectorAll("[data-go]").forEach((el) => el.addEventListener("click", () => go(el.dataset.go)));
    document.querySelectorAll("[data-form]").forEach((el) => el.addEventListener("input", () => {
      ui.form[el.dataset.form] = el.value;
      if (["from", "to", "vehicle"].includes(el.dataset.form)) render();
    }));
    document.querySelectorAll("[data-form]").forEach((el) => el.addEventListener("change", () => {
      ui.form[el.dataset.form] = el.value;
      render();
    }));
  }

  function onAction(name, ds) {
    if (name === "lang") {
      ui.lang = ds.v; localStorage.setItem("apron_lang", ui.lang); render(); return;
    }
    if (name === "portal-role") { ui.portalRole = ds.v; render(); return; }
    if (name === "send-code") { toast(t("toastCode"), "ok"); return; }
    if (name === "login") {
      ui.authed = true; ui.role = ui.portalRole; ui.route = defaultRoute(ui.role);
      sessionStorage.setItem("apron_in", "1"); sessionStorage.setItem("apron_role", ui.role);
      location.hash = ui.route; render(); return;
    }
    if (name === "logout") { ui.authed = false; sessionStorage.removeItem("apron_in"); render(); return; }
    if (name === "role") { ui.role = ds.v; ui.route = defaultRoute(ds.v); sessionStorage.setItem("apron_role", ui.role); location.hash = ui.route; render(); return; }
    if (name === "reset") { resetDemo(); return; }
    if (name === "set-form") { ui.form[ds.k] = ds.v; render(); return; }
    if (name === "filter") { ui.filter = ds.v; render(); return; }
    if (name === "submit-book") return submitBook();
    if (name === "open-order") { ui.modal = { html: orderModal(ds.id) }; render(); return; }
    if (name === "close-modal") { ui.modal = null; render(); return; }
    if (name === "assign") { assignOrder(ds.oid, ds.did); ui.modal = null; render(); return; }
    if (name === "recall") {
      const o = findOrder(ds.id); if (!o) return;
      const d = findDriver(o.driverId); if (d) d.busy = false;
      o.driverId = null; o.status = "pending_dispatch"; pushLog(o, "recall"); save(); toast(t("toastRecall")); render(); return;
    }
    if (name === "batch") {
      db.orders.filter((o) => o.status === "pending_dispatch").forEach((o) => {
        const pick = aiRank(o).find((r) => r.d.online && !r.d.busy);
        if (pick) assignOrder(o.id, pick.d.id);
      });
      toast(t("toastBatch"), "ok"); render(); return;
    }
    if (name === "near") { toast(t("toastNear"), "ok"); return; }
    if (name === "flight-re") { toast(t("toastFlight"), "ok"); return; }
    if (name === "toggle-online") {
      const d = myDriver(); d.online = !d.online; save(); toast(d.online ? t("toastOnline") : t("toastOffline"), "ok"); render(); return;
    }
    if (name === "accept-o") {
      const o = findOrder(ds.id); o.status = "to_pickup"; pushLog(o, "accepted"); save(); toast(t("toastAccepted"), "ok"); ui.modal = { html: orderModal(o.id) }; render(); return;
    }
    if (name === "reject-o") {
      const o = findOrder(ds.id); const d = findDriver(o.driverId);
      o.status = "pending_dispatch"; o.driverId = null; if (d) d.busy = false; pushLog(o, "rejected"); save(); toast(t("toastRejected")); ui.modal = null; render(); return;
    }
    if (name === "arrive") {
      const o = findOrder(ds.id);
      o.status = "waiting"; o.arrivedAt = ui.tick;
      const fl = db.flights[o.flight];
      const zero = (fl && fl.actual) || o.arrivedAt;
      o.freeUntil = zero + db.fees.freeWait * 60000;
      pushLog(o, "arrived"); save(); toast(t("toastArrived"), "ok"); ui.modal = { html: orderModal(o.id) }; render(); return;
    }
    if (name === "ask-wait") {
      const o = findOrder(ds.id); o.status = "overtime_confirm"; pushLog(o, "overtime_asked"); notify(o.id, t("applyWait"), "order"); save(); toast(t("toastOvertime")); ui.modal = { html: orderModal(o.id) }; render(); return;
    }
    if (name === "pay-wait") {
      const o = findOrder(ds.id); o.status = "waiting"; o.fare.wait = 15.3; o.fare.total = +(o.fare.total + 15.3).toFixed(2); pushLog(o, "overtime_paid"); save(); toast(t("toastPaidWait"), "ok"); ui.modal = { html: orderModal(o.id) }; render(); return;
    }
    if (name === "refuse-wait") {
      const o = findOrder(ds.id); pushLog(o, "overtime_refused"); save(); toast(t("toastRefuseWait")); ui.modal = { html: orderModal(o.id) }; render(); return;
    }
    if (name === "noshow") {
      const o = findOrder(ds.id); const d = findDriver(o.driverId);
      o.status = "noshow"; o.fare.total = db.fees.noshow; o.evidence = { arrivedAt: o.arrivedAt, waitLog: `Free wait ${db.fees.freeWait} min from actual landing`, chat: "overtime refused / no passenger", gps: "34.198 · -118.404" };
      if (d) d.busy = false; pushLog(o, "noshow"); save(); toast(t("toastNoshow"), "ok"); ui.modal = { html: evidenceModal(o.id) }; render(); return;
    }
    if (name === "start-o") {
      const o = findOrder(ds.id); o.status = "in_trip"; pushLog(o, "started"); save(); toast(t("toastStarted"), "ok"); ui.modal = { html: orderModal(o.id) }; render(); return;
    }
    if (name === "end-o") {
      const o = findOrder(ds.id); const d = findDriver(o.driverId);
      o.status = "completed"; if (d) { d.busy = false; d.earnings += o.fare.total * (1 - db.fees.commission); }
      pushLog(o, "ended"); save(); toast(t("toastEnded"), "ok"); ui.modal = { html: rateModal(o.id) }; render(); return;
    }
    if (name === "cancel-o") {
      const o = findOrder(ds.id);
      if (!["pending_dispatch", "assigned"].includes(o.status)) return toast(t("cannotCancel"), "err");
      if (o.status === "assigned") o.fare.total = db.fees.cancelAssigned;
      o.status = "cancelled"; const d = findDriver(o.driverId); if (d) d.busy = false;
      pushLog(o, "cancelled"); save(); toast(t("toastCanceled")); ui.modal = null; render(); return;
    }
    if (name === "rate") { ui.modal = { html: rateModal(ds.id) }; render(); return; }
    if (name === "save-rate") {
      const o = findOrder(ds.id); o.rated = true; o.rating = ui._stars || 5; o.comment = $("#rate-c")?.value || ""; save(); toast(t("toastRated"), "ok"); ui.modal = null; render(); return;
    }
    if (name === "star") { ui._stars = Number(ds.n); document.querySelectorAll(".stars button").forEach((b, i) => b.classList.toggle("on", i < ui._stars)); return; }
    if (name === "receipt") { ui.modal = { html: receiptModal(ds.id) }; render(); return; }
    if (name === "evidence") { ui.modal = { html: evidenceModal(ds.id) }; render(); return; }
    if (name === "nav") { toast(t("navOpen")); return; }
    if (name === "call") { toast(t("contactMasked")); return; }
    if (name === "share") { toast(t("shared")); return; }
    if (name === "cs-open") { ui.role = "passenger"; go("p-inbox"); return; }
    if (name === "send-cs") {
      const v = $("#chat-in")?.value || ""; if (!v) return;
      db.chats[0].lines.push({ who: "p", t: ui.tick, txt: v }); save(); render(); return;
    }
    if (name === "delete-acct") { toast(t("deleteAccount"), "ok"); return; }
    if (name === "withdraw") {
      db.withdrawals.unshift({ id: uid("W"), driverId: "D1", amount: 80, account: "Wise · MAYA***", status: "pending" }); save(); toast(t("toastWithdraw"), "ok"); return;
    }
    if (name === "freeze") {
      const u = db.users.find((x) => x.id === ds.id); if (u) u.frozen = !u.frozen; save(); toast(t("toastSaved"), "ok"); render(); return;
    }
    if (name === "approve-d") { const d = findDriver(ds.id); d.docs = "ok"; save(); toast(t("toastSaved"), "ok"); render(); return; }
    if (name === "reject-d") { toast(t("rejectDoc")); return; }
    if (name === "pay-w") { const w = db.withdrawals.find((x) => x.id === ds.id); if (w) w.status = "paid"; save(); toast(t("toastSaved"), "ok"); render(); return; }
    if (name === "save-fees") {
      db.fees.freeWait = Number($("#fee-wait")?.value || 105);
      db.fees.booking = Number($("#fee-book")?.value || 8);
      db.fees.bag = Number($("#fee-bag")?.value || 6);
      db.fees.noshow = Number($("#fee-ns")?.value || 35);
      save(); toast(t("toastSaved"), "ok"); return;
    }
    if (name === "push-n") {
      db.notices.unshift({ id: uid("N"), title: $("#n-title")?.value || t("announce"), body: $("#n-body")?.value || "", to: "all" }); save(); toast(t("toastSaved"), "ok"); render(); return;
    }
    if (name === "export") {
      const rows = [["id", "status", "from", "to", "flight", "total"], ...db.orders.map((o) => [o.id, o.status, o.from, o.to, o.flight, o.fare.total])];
      const csv = rows.map((r) => r.join(",")).join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "apron-orders.csv"; a.click(); return;
    }
    if (name === "backup") { toast(t("toastSaved"), "ok"); return; }
    if (name === "force") { ui.modal = { html: orderModal(ds.id) }; render(); return; }
  }

  function parseWhen(str) {
    if (!str) return ui.tick + 3600000;
    const m = String(str).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return Date.parse(str) || ui.tick + 3600000;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 7, +m[5]);
  }

  function submitBook() {
    const f = ui.form;
    if (f.city === "ch") return toast(t("cityBlocked"), "err");
    const when = parseWhen(f.when);
    if (when < ui.tick) return toast(t("pastTime"), "err");
    const fare = quote(f.from, f.to, f.vehicle, Number(f.bags || 0), when || ui.tick);
    const o = {
      id: "O-" + (1100 + db.orders.length), passengerId: "P1", driverId: null, status: "pending_dispatch", city: f.city || "la",
      from: f.from, to: f.to, flight: (f.flight || "").toUpperCase(), when: when || ui.tick + 3600000,
      vehicle: f.vehicle, pax: Number(f.pax || 1), bags: Number(f.bags || 0), notes: f.notes || "", pay: f.pay || "stripe",
      fare, logs: [{ t: ui.tick, e: "created" }], arrivedAt: null, freeUntil: null, rated: false, rating: 0, tags: [], evidence: null,
    };
    db.orders.unshift(o); notify(o.id, t("submitted"), "order"); save(); toast(t("submitted"), "ok"); go("p-orders");
  }

  window.addEventListener("hashchange", () => {
    const h = location.hash.replace("#", "");
    if (h) { ui.route = h; render(); }
  });
  setInterval(() => {
    if (!ui.authed) return;
    const o = ui.modal && /wait-clock/.test(ui.modal.html || "");
    if (!o && ui.route !== "d-home" && ui.route !== "p-orders") return;
    ui.tick += 1000;
    if (o) { const id = (ui.modal.html.match(/O-\d+/) || [])[0]; if (id) ui.modal.html = orderModal(id); render(); }
  }, 1000);

  render();
})();
