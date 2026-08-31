(() => {
  const KEY = "apron_proto_v2";
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
    adminQ: "",
    dashRange: "7",
    inboxTab: "all",
    offerSeen: {},
    rateTags: [],
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

  function places() { return (window.ApronMap && ApronMap.PLACES) || {}; }
  function cityIds(city) { return (window.ApronMap && ApronMap.BY_CITY[city || "la"]) || ["lax", "dtla", "santa", "home", "work"]; }
  function milesOf(a, b) { return window.ApronMap ? ApronMap.roadMiles(a, b) : 14; }
  function addrName(id) {
    if (id === "drop" && places().drop) return `${t("dropPin")} (${places().drop.lat.toFixed(3)}, ${places().drop.lng.toFixed(3)})`;
    return t(id);
  }
  function driverXY(d) {
    const home = window.ApronMap && ApronMap.DRIVER_HOME[d.id];
    if (d.lat == null && home) { d.lat = home.lat; d.lng = home.lng; }
    return d;
  }

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
    const home = (window.ApronMap && ApronMap.DRIVER_HOME) || {};
    const drivers = [
      { id: "D1", name: "Maya Chen", level: "gold", online: true, busy: true, rating: 4.96, accept: 0.94, attend: 0.98, complaints: 0, vehicle: "comfort", plate: "7XCV334", color: "White", phone: "+1 310 •••• 4821", lat: home.D1?.lat, lng: home.D1?.lng, returnTrip: true, docs: "ok", city: "la", earnings: 286.4, disabled: false },
      { id: "D2", name: "Luis Ortega", level: "silver", online: true, busy: false, rating: 4.81, accept: 0.88, attend: 0.91, complaints: 1, vehicle: "econ", plate: "8LKM102", color: "Gray", phone: "+1 213 •••• 1904", lat: home.D2?.lat, lng: home.D2?.lng, returnTrip: false, docs: "ok", city: "la", earnings: 194.2, disabled: false },
      { id: "D3", name: "Jordan Hale", level: "bronze", online: true, busy: true, rating: 4.62, accept: 0.77, attend: 0.84, complaints: 3, vehicle: "luxe", plate: "5QWE889", color: "Black", phone: "+1 424 •••• 6610", lat: home.D3?.lat, lng: home.D3?.lng, returnTrip: true, docs: "ok", city: "la", earnings: 412.0, disabled: false },
      { id: "D4", name: "Priya Shah", level: "gold", online: false, busy: false, rating: 4.99, accept: 0.97, attend: 0.99, complaints: 0, vehicle: "van", plate: "9VAN441", color: "Navy", phone: "+1 562 •••• 2201", lat: home.D4?.lat, lng: home.D4?.lng, returnTrip: false, docs: "ok", city: "la", earnings: 0, disabled: false },
      { id: "D5", name: "Chris Nguyen", level: "bronze", online: false, busy: false, rating: 0, accept: 0, attend: 0, complaints: 0, vehicle: "comfort", plate: "—", color: "Silver", phone: "+1 818 •••• 0044", lat: home.D5?.lat, lng: home.D5?.lng, returnTrip: false, docs: "pending", city: "la", earnings: 0, disabled: false },
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
      { id: "C2", with: "D1", name: "Maya Chen", lines: [{ who: "d", t: DEMO_NOW - 180000, txt: "I am on the TBIT inner island, white Comfort." }] },
    ];
    const complaints = [
      { id: "K1", orderId: "O-1005", from: "P1", text: "Waited at TBIT arrivals, driver GPS showed curb but I could not find the car.", status: "open", reply: "" },
    ];
    const payments = [
      { id: "PAY1", orderId: "O-1004", channel: "stripe", kind: "charge", amount: 41.2, status: "captured" },
      { id: "PAY2", orderId: "O-1005", channel: "stripe", kind: "noshow", amount: 35, status: "captured" },
      { id: "PAY3", orderId: "O-1003", channel: "paypal", kind: "preauth", amount: 89.8, status: "authorized" },
      { id: "PAY4", orderId: "O-1002", channel: "wise", kind: "preauth", amount: 42.62, status: "authorized" },
    ];
    return {
      passenger, drivers, orders, messages, chats, flights, fees, complaints, payments,
      settings: {
        city: "la", tz: "America/Los_Angeles", platform: "Apron",
        stripe: "pk_test_***", paypal: "sb-***", wise: "wise_***", revolut: "rev_***",
        maps: "demo-map", flightSrc: "demo", ccpaOn: true,
        privacy: "Apron Transfer LLC collects trip, flight, and payment data to fulfill booked airport transfers.",
        agreement: "Bookings are dispatched by Apron CS. Drivers do not bid at the curb. Free wait starts at actual landing.",
      },
      users: [
        { ...passenger, frozen: false, spend: 186.4, balance: 0 },
        { id: "P2", name: "Tom Baker", email: "tom@example.com", phone: "+1 646 555 0110", city: "ny", frozen: false, spend: 420, balance: 12 },
        { id: "P3", name: "Sofia Alvarez", email: "sofia@example.com", phone: "+1 305 555 0144", city: "mia", frozen: true, spend: 88, balance: 0 },
      ],
      cs: [
        { id: "CS1", name: "Ana Díaz", role: "senior", shift: 14, email: "ana@apron.demo", active: true },
        { id: "CS2", name: "Ben Cole", role: "junior", shift: 6, email: "ben@apron.demo", active: true },
      ],
      withdrawals: [
        { id: "W1", driverId: "D1", amount: 180, account: "Wise · MAYA***", status: "pending" },
        { id: "W0", driverId: "D3", amount: 240, account: "Revolut · JORD***", status: "paid" },
      ],
      vehicles: VEHICLES.map((v) => ({ ...v })),
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

  function vehicles() {
    return (db && db.vehicles && db.vehicles.length) ? db.vehicles : VEHICLES;
  }
  function quote(from, to, vehicleId, bags, whenMs, fees) {
    const fe = fees || (db && db.fees) || { bag: 6, booking: 8, nightRate: 0.2, airport: 0 };
    const v = vehicles().find((x) => x.id === vehicleId) || VEHICLES[1];
    const mi = milesOf(from, to);
    const mile = v.start + mi * v.per;
    const bag = Math.max(0, (bags || 0) - 1) * (fe.bag ?? 6);
    const d = new Date(whenMs || ui.tick);
    const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }).format(d));
    const nightOn = h >= 22 || h < 6;
    const night = nightOn ? mile * (fe.nightRate ?? 0.2) : 0;
    const booking = fe.booking ?? 8;
    const airport = (["lax", "jfk", "lga", "mia"].includes(from) || ["lax", "jfk", "lga", "mia"].includes(to)) ? (fe.airport || 0) : 0;
    const sub = mile + bag + night + booking + airport;
    return { mi: +mi.toFixed(1), mile: +mile.toFixed(2), bag: +bag.toFixed(2), night: +night.toFixed(2), booking, airport: +airport.toFixed(2), wait: 0, total: +sub.toFixed(2), nightOn };
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
  function ensureSchema() {
    if (!db.vehicles || !db.vehicles.length) db.vehicles = VEHICLES.map((v) => ({ ...v }));
    if (!db.payments) db.payments = [];
    if (!db.complaints) db.complaints = [];
    if (!db.withdrawals) db.withdrawals = [];
    if (!db.notices) db.notices = [];
    if (db.fees.airport == null) db.fees.airport = 0;
    if (db.fees.perMin == null) db.fees.perMin = 0.4;
    db.users.forEach((u) => {
      if (u.balance == null) u.balance = 0;
      if (u.spend == null) u.spend = 0;
      if (u.frozen == null) u.frozen = false;
    });
    db.cs.forEach((c) => {
      if (c.active == null) c.active = true;
      if (!c.email) c.email = `${c.id.toLowerCase()}@apron.demo`;
    });
    db.settings = Object.assign({
      city: "la", tz: "America/Los_Angeles", platform: "Apron",
      stripe: "pk_test_***", paypal: "sb-***", wise: "wise_***", revolut: "rev_***",
      maps: "demo-map", flightSrc: "demo", ccpaOn: true,
      privacy: "", agreement: "",
    }, db.settings || {});
  }
  db = load();
  ensureSchema();

  function resetDemo() {
    localStorage.removeItem(KEY);
    db = seed();
    ensureSchema();
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
      .filter((d) => d.docs === "ok" && !d.disabled)
      .map((d) => {
        driverXY(d);
        const pickup = window.ApronMap ? ApronMap.place(order.from) : { lat: 33.94, lng: -118.41 };
        const distMi = window.ApronMap ? ApronMap.haversineMi({ lat: d.lat, lng: d.lng }, pickup) : 8;
        const vMatch = d.vehicle === order.vehicle ? 22 : 6;
        const lvl = d.level === "gold" ? 14 : d.level === "silver" ? 7 : 2;
        let score = Math.max(0, 22 - distMi) * 2.4 + vMatch + d.rating * 8 + d.accept * 16 + d.attend * 10 - d.complaints * 7 + lvl;
        if (d.returnTrip) score += 10;
        if (!d.online) score -= 80;
        if (d.busy) score -= 25;
        return { d, score: Math.round(score * 10) / 10, dist: +distMi.toFixed(1), vMatch };
      })
      .sort((a, b) => b.score - a.score);
  }

  function pushLog(order, e) { order.logs.unshift({ t: ui.tick, e }); }
  function notify(title, body, kind) {
    db.messages.unshift({ id: uid("M"), kind: kind || "order", title, body, read: false, t: ui.tick });
  }

  function findOrder(id) { return db.orders.find((o) => o.id === id); }
  function findDriver(id) { return db.drivers.find((d) => d.id === id); }

  function assignOrder(oid, did, force) {
    const o = findOrder(oid); const d = findDriver(did);
    if (!o || !d || d.docs !== "ok" || d.disabled) return toast("—", "err");
    if (!d.online && !force) return toast(t("off"), "err");
    const prev = findDriver(o.driverId);
    if (prev && prev.id !== did) prev.busy = false;
    o.driverId = did; o.status = "assigned"; d.busy = true;
    pushLog(o, (force ? "force_assigned:" : "assigned:") + d.name);
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
  function initials(name) {
    return String(name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }
  function avatar(name, cls) {
    return `<span class="avatar ${cls || ""}">${esc(initials(name))}</span>`;
  }
  function ico(name) {
    const stroke = 'stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    const pack = {
      book: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg>`,
      orders: `<svg viewBox="0 0 24 24" ${stroke}><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 12h8M8 15h5"/></svg>`,
      inbox: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 7h16v10H4z"/><path d="M4 7l8 6 8-6"/></svg>`,
      me: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="8" r="3"/><path d="M5 19c1.4-3 3.6-4.5 7-4.5S17.6 16 19 19"/></svg>`,
      work: `<svg viewBox="0 0 24 24" ${stroke}><rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/></svg>`,
      dispatch: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/></svg>`,
      monitor: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 6h16v10H4z"/><path d="M8 20h8M12 16v4"/><circle cx="12" cy="11" r="2"/></svg>`,
      shift: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 18V8l4 4 4-6 4 8 4-4v8z"/></svg>`,
      car: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 14l2-5h12l2 5"/><path d="M4 14h16v3H4z"/><circle cx="7.5" cy="17.5" r="1.4"/><circle cx="16.5" cy="17.5" r="1.4"/></svg>`,
      van: `<svg viewBox="0 0 24 24" ${stroke}><path d="M3 14V9h10l5 5H3z"/><path d="M3 14h18v3H3z"/><circle cx="7" cy="17.5" r="1.3"/><circle cx="16.5" cy="17.5" r="1.3"/></svg>`,
      send: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 12l16-8-6 16-2.5-6.5L4 12z"/></svg>`,
    };
    return pack[name] || pack.car;
  }
  function greet() {
    const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }).format(now()));
    return h < 12 ? t("gMorning") : h < 18 ? t("gAfternoon") : t("gEvening");
  }
  function pageHead(title, sub) {
    return `<header class="app-head"><p class="eyebrow">${esc(sub || greet())}</p><h2 class="page-title">${esc(title)}</h2></header>`;
  }
  function emptyBox() {
    return `<div class="empty">${ico("orders")}<p>${esc(t("none"))}</p></div>`;
  }
  function vehiclePicker(val) {
    return `<div class="veh-row">${VEHICLES.map((v) => `<button type="button" class="veh ${val === v.id ? "on" : ""}" data-action="set-form" data-k="vehicle" data-v="${v.id}">
      <span class="veh-mark">${ico(v.id === "van" ? "van" : "car")}</span>
      <b>${esc(t(v.id))}</b>
      <small>${v.seats} ${t("paxUnit")} · ${v.bags} ${t("bagUnit")}</small>
    </button>`).join("")}</div>`;
  }
  function mapHtml(from, to, extra) {
    const x = extra || {};
    const h = x.h || 220;
    const mode = x.mode || "route";
    const did = x.did || (x.car && x.car.id) || "";
    const pick = x.pickable ? "1" : "0";
    const progress = x.progress != null ? x.progress : "";
    return `<div class="leaflet-map" data-map="${mode}" data-from="${esc(from || "lax")}" data-to="${esc(to || "dtla")}" data-oid="${esc(x.oid || "")}" data-did="${esc(did)}" data-pickable="${pick}" data-progress="${progress}" style="height:${h}px"></div>
      <p class="map-attrib">${t("mapNote")}</p>`;
  }
  function fidsRow(code) {
    const f = db.flights[code];
    if (!f) return "";
    const stt = f.status === "delayed" ? "fids-delay" : "fids-live";
    const land = f.actual || f.sched;
    return `<div class="fids-row"><span>${esc(code)}</span><span>${esc(f.term)}</span><span class="${stt}">${esc(f.status.replace("_", " ")).toUpperCase()}</span><span>${fmtTime(land, "la")}</span></div>`;
  }
  function orderCard(o) {
    const fl = o.flight && db.flights[o.flight];
    return `<button type="button" class="card trip-card" data-action="open-order" data-id="${o.id}">
      <div class="spine"><i class="dot from"></i><i class="line"></i><i class="dot to"></i></div>
      <div class="trip-mid">
        <b>${esc(addrName(o.from))}</b>
        <span class="muted">${esc(addrName(o.to))}</span>
        <span class="trip-meta">${o.flight ? `${esc(o.flight)} · ` : ""}${fmtTime(o.when, o.city)}${fl ? ` · ${fl.status.replace("_", " ")}` : ""}</span>
      </div>
      <div class="trip-side">
        <span class="tag ${tagClass(o.status)}">${esc(st(o.status))}</span>
        <b class="num">${money(o.fare.total)}</b>
      </div>
    </button>`;
  }

  /* ---------- passenger ---------- */
  function pagePHome() {
    const f = ui.form;
    const city = f.city || "la";
    if (!f.from) Object.assign(ui.form, { from: city === "ny" ? "jfk" : city === "mia" ? "mia" : "lax", to: city === "ny" ? "midtown" : city === "mia" ? "southb" : "dtla", vehicle: "comfort", pax: 2, bags: 2, flight: "UA456", when: toLocalInput(ui.tick + 2 * 3600000), pay: "stripe", city: "la", q: "" });
    const est = estimateForm();
    const blocked = ui.form.city === "ch";
    const hits = (window.ApronMap ? ApronMap.search(ui.form.q, ui.form.city) : cityIds(ui.form.city));
    return `<div class="mini-scroll map-mode">
      <div class="map-stage">${mapHtml(ui.form.from, ui.form.to, { h: 292, pickable: true, mode: "route" })}
        <div class="map-float"><div class="seg">${["la", "ny", "mia", "ch"].map((c) => `<button class="${ui.form.city === c ? "on" : ""}" data-action="set-city" data-v="${c}">${esc(t("city" + ({ la: "LA", ny: "NY", mia: "MI", ch: "CH" }[c])))}</button>`).join("")}</div></div>
      </div>
      <div class="sheet"><div class="sheet-handle"></div>
        ${blocked ? `<p class="hint" style="color:var(--coral)">${t("cityBlocked")}</p>` : ""}
        <div class="search-pill"><input class="field-input" data-form="q" value="${esc(ui.form.q || "")}" placeholder="${esc(t("searchPlace"))}" /></div>
        <div class="chips slim">${hits.map((id) => `<button class="chip ${ui.form.from === id || ui.form.to === id ? "on" : ""}" data-action="use-place" data-v="${id}">${esc(addrName(id))}</button>`).join("")}</div>
        <div class="route-pick">
          <div class="spine tall"><i class="dot from"></i><i class="line"></i><i class="dot to"></i></div>
          <div>
            <select class="field-select" data-form="from">${optAddr(ui.form.from, ui.form.city)}</select>
            <select class="field-select" data-form="to">${optAddr(ui.form.to, ui.form.city)}</select>
          </div>
        </div>
        <div class="chips">
          <button class="chip" data-action="set-form" data-k="from" data-v="home">${t("home")}</button>
          <button class="chip" data-action="set-form" data-k="from" data-v="work">${t("work")}</button>
          <button class="chip" data-action="set-form" data-k="from" data-v="lax">${t("lax")}</button>
        </div>
        <div class="field"><label>${t("flight")}</label><input class="field-input" data-form="flight" value="${esc(ui.form.flight || "")}" placeholder="UA456" /></div>
        ${ui.form.flight && db.flights[ui.form.flight] ? `<div class="fids-board mini">${fidsRow(ui.form.flight)}</div>` : ""}
        <div class="field"><label>${t("when")}</label><input class="field-input" type="datetime-local" data-form="when" value="${esc(ui.form.when || "")}" /></div>
        <p class="hint">${t("tzNote")}</p>
        <label class="muted">${t("vehicle")}</label>
        ${vehiclePicker(ui.form.vehicle)}
        <div class="btn-row">
          <div class="field" style="flex:1"><label>${t("pax")}</label><input class="field-input" type="number" min="1" max="6" data-form="pax" value="${esc(ui.form.pax || 1)}" /></div>
          <div class="field" style="flex:1"><label>${t("bags")}</label><input class="field-input" type="number" min="0" max="8" data-form="bags" value="${esc(ui.form.bags || 0)}" /></div>
        </div>
        <div class="field"><label>${t("notes")}</label><input class="field-input" data-form="notes" placeholder="${esc(t("notesPh"))}" value="${esc(ui.form.notes || "")}" /></div>
        ${est ? `<div class="fare-card">
          <div class="card-hd"><span>${t("estimate")}</span><b class="num">${money(est.total)}</b></div>
          <div class="kv">
            <div><span>${t("mile")} · ${est.mi} ${t("mi")}</span><b>${money(est.mile)}</b></div>
            <div><span>${t("bookingFee")}</span><b>${money(est.booking)}</b></div>
            <div><span>${t("bagFee")}</span><b>${money(est.bag)}</b></div>
            <div><span>${t("nightFee")}</span><b>${money(est.night)}</b></div>
          </div></div>` : ""}
        <label class="muted">${t("payWith")}</label>
        <div class="pay-grid">${["stripe", "paypal", "wise", "revolut"].map((p) => `<button class="pay-opt ${ui.form.pay === p ? "on" : ""}" data-action="set-form" data-k="pay" data-v="${p}"><i class="pay-mark ${p}"></i>${esc(t(p))}</button>`).join("")}</div>
        <button type="button" class="btn btn-primary cta" data-action="submit-book">${t("submit")}</button>
      </div></div>`;
  }
  function optAddr(cur, city) {
    const ids = cityIds(city || ui.form.city || "la");
    const extra = cur && !ids.includes(cur) ? [cur] : [];
    return [...ids, ...extra].map((id) => `<option value="${id}" ${cur === id ? "selected" : ""}>${esc(addrName(id))}</option>`).join("");
  }
  function toLocalInput(ms) {
    const d = new Date(ms - 7 * 3600000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
  function pagePOrders() {
    const rows = db.orders.filter((o) => o.passengerId === "P1");
    const show = ui.filter === "all" ? rows : rows.filter((o) => ST_MAP[o.status] === ui.filter);
    const pendingRate = rows.filter((o) => o.status === "completed" && !o.rated);
    return `${pageHead(t("orders"), t("brandSub"))}
      ${pendingRate.length ? `<div class="card offer"><div class="card-hd"><b>${t("reviewNow")}</b><span class="muted">${pendingRate[0].id}</span></div>
        <div class="btn-row"><button class="btn btn-navy" data-action="rate" data-id="${pendingRate[0].id}">${t("rate")}</button>
        <button class="btn btn-ghost" data-action="later-rate">${t("reviewLater")}</button></div></div>` : ""}
      <div class="seg wrap">${["all", "pendingDispatch", "toPickup", "waiting", "overtime", "inTrip", "done", "canceled", "noshow"].map((k) => `<button class="${ui.filter === k ? "on" : ""}" data-action="filter" data-v="${k}">${t(k)}</button>`).join("")}</div>
      ${show.map((o) => orderCard(o)).join("") || emptyBox()}`;
  }
  function pagePInbox() {
    const tab = ui.inboxTab || "all";
    const msgs = db.messages.filter((m) => tab === "all" || m.kind === tab);
    const cs = db.chats.find((c) => c.with === "cs") || db.chats[0];
    const drv = db.chats.find((c) => c.with === "D1");
    return `${pageHead(t("inbox"), t("csMsg"))}
      <div class="seg">${["all", "sys", "order", "cs"].map((k) => `<button class="${tab === k ? "on" : ""}" data-action="inbox-tab" data-v="${k}">${t({ all: "all", sys: "sysMsg", order: "orderMsg", cs: "csMsg" }[k])}</button>`).join("")}</div>
      ${msgs.map((m) => `<div class="msg-row"><span class="avatar sm">${m.kind === "cs" ? "CS" : m.kind === "order" ? "O" : "i"}</span><div><b>${esc(m.title)}</b><p class="muted">${esc(m.body)}</p></div><span class="muted">${m.read ? "" : t("unread")}</span></div>`).join("")}
      <div class="chat-card">
        <div class="chat-hd">${avatar("Ana Díaz")} <div><b>Ana Díaz</b><span class="muted">${t("csMsg")}</span></div></div>
        <div class="chat-log">${(cs.lines || []).map((l) => `<p class="bubble ${l.who === "p" ? "me" : ""}">${esc(l.txt)}</p>`).join("")}</div>
        <div class="composer"><input class="field-input" id="chat-in" placeholder="${esc(t("typeMsg"))}" /><button class="send-btn" data-action="send-cs">${ico("send")}</button></div>
      </div>
      ${drv ? `<div class="chat-card">
        <div class="chat-hd">${avatar(drv.name)} <div><b>${esc(drv.name)}</b><span class="muted">${t("chatDriver")}</span></div></div>
        <div class="chat-log">${(drv.lines || []).map((l) => `<p class="bubble ${l.who === "p" ? "me" : ""}">${esc(l.txt)}</p>`).join("")}</div>
        <div class="composer"><input class="field-input" id="chat-drv" placeholder="${esc(t("typeMsg"))}" /><button class="send-btn" data-action="send-drv">${ico("send")}</button></div>
      </div>` : ""}`;
  }
  function pagePMe() {
    const p = db.passenger;
    const pays = db.payments || [];
    return `<div class="profile-hero">${avatar(p.name, "lg")}<div><p class="eyebrow">${greet()}</p><h2>${esc(p.nick || p.name)}</h2><span class="muted">${esc(p.email)}</span></div></div>
      <button class="cell" data-action="edit-profile"><span>${t("editProfile")}<small>${esc(p.phone)}</small></span><i>›</i></button>
      <div class="card"><b>${t("pay")}</b>${chips(["stripe", "paypal", "wise", "revolut"], "pay", p.pay)}
        ${(pays).map((x) => `<div class="pay-line"><span>${esc(x.orderId)}</span><b>${money(x.amount)}</b></div>`).join("") || `<p class="muted">${t("none")}</p>`}
      </div>
      <div class="card"><b>${t("savedAddr")}</b>
        <div class="chips">${(p.saved || []).map((a) => `<button class="chip on" data-action="del-addr" data-v="${a}">${esc(addrName(a))} ×</button>`).join("")}</div>
        <div class="chips">${cityIds("la").filter((id) => !(p.saved || []).includes(id)).slice(0, 4).map((a) => `<button class="chip" data-action="add-addr" data-v="${a}">+ ${esc(addrName(a))}</button>`).join("")}</div>
      </div>
      <div class="card faq"><b>${t("help")}</b>
        <p><b>${t("faq1q")}</b><span class="muted">${t("faq1a")}</span></p>
        <p><b>${t("faq2q")}</b><span class="muted">${t("faq2a")}</span></p>
        <p><b>${t("faq3q")}</b><span class="muted">${t("faq3a")}</span></p>
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
    const doneN = db.orders.filter((o) => o.driverId === d.id && o.status === "completed").length;
    const offer = mine.find((o) => o.status === "assigned" && !ui.offerSeen[o.id]);
    return `<section class="drv-hero">
        <div><p class="eyebrow">${greet()}</p><h2>${esc(d.name.split(" ")[0])}</h2><span class="muted">${esc(d.plate)} · ${t(d.level)}</span></div>
        <button class="switch ${d.online ? "on" : ""}" data-action="toggle-online"><i></i><span>${d.online ? t("online") : t("offline")}</span></button>
      </section>
      ${offer ? `<div class="card offer pulse"><div class="card-hd"><b>${t("newOffer")}</b><span class="tag tag-wait">${esc(offer.id)}</span></div>
        <p class="muted">${esc(addrName(offer.from))} → ${esc(addrName(offer.to))} · ${esc(offer.flight || "—")}</p>
        <div class="btn-row"><button class="btn btn-primary" data-action="accept-o" data-id="${offer.id}">${t("accept")}</button>
        <button class="btn btn-ghost" data-action="reject-o" data-id="${offer.id}">${t("reject")}</button></div></div>` : ""}
      <div class="stat-grid">
        <div class="stat"><b>${todayN}</b><span>${t("todayOrders")}</span></div>
        <div class="stat"><b>${doneN}</b><span>${t("doneOrders")}</span></div>
        <div class="stat"><b>${money(d.earnings)}</b><span>${t("earnings")}</span></div>
        <div class="stat"><b>${mine.length}</b><span>${t("upcoming")}</span></div>
      </div>
      <div class="btn-row" style="margin:8px 0 12px">
        <button class="btn btn-navy" data-action="nav-home">${t("nav")}</button>
        <button class="btn btn-ghost" data-action="cs-drv">${t("cs")}</button>
      </div>
      ${mine.map((o) => orderCard(o)).join("") || emptyBox()}`;
  }
  function pageDOrders() {
    const d = myDriver();
    const rows = db.orders.filter((o) => o.driverId === d.id);
    const show = ui.filter === "all" ? rows : rows.filter((o) => ST_MAP[o.status] === ui.filter);
    return `${pageHead(t("orders"), t("upcoming"))}
      <div class="seg wrap">${["all", "assigned", "toPickup", "waiting", "inTrip", "done", "canceled"].map((k) => `<button class="${ui.filter === k ? "on" : ""}" data-action="filter" data-v="${k}">${t(k)}</button>`).join("")}</div>
      ${show.map((o) => orderCard(o)).join("") || emptyBox()}`;
  }
  function pageDInbox() {
    return `${pageHead(t("inbox"), t("sysMsg"))}
      ${db.notices.map((n) => `<div class="msg-row">${avatar("Apron")}<div><b>${esc(n.title)}</b><p class="muted">${esc(n.body)}</p></div><span class="tag tag-navy">${t("sysMsg")}</span></div>`).join("")}
      ${db.messages.filter((m) => m.kind === "order").map((m) => `<div class="msg-row"><span class="avatar sm">O</span><div><b>${esc(m.title)}</b><p class="muted">${esc(m.body)}</p></div></div>`).join("")}`;
  }
  function pageDMe() {
    const d = myDriver();
    const mine = db.orders.filter((o) => o.driverId === d.id && o.status === "completed");
    const month = mine.reduce((s, o) => s + o.fare.total * (1 - db.fees.commission), 0);
    return `<div class="profile-hero">${avatar(d.name, "lg")}<div><p class="eyebrow">${t(d.level)}</p><h2>${esc(d.name)}</h2><span class="muted">★ ${d.rating.toFixed(2)} · ${esc(d.plate)}</span></div></div>
      <div class="card"><b>${t("docs")}</b>
        <div class="kv">
          <div><span>${t("license")}</span><span class="tag tag-ok">${t("docsOk")}</span></div>
          <div><span>${t("insurance")}</span><span class="tag tag-ok">${t("docsOk")}</span></div>
          <div><span>${t("tlc")}</span><span class="tag tag-ok">${t("docsOk")}</span></div>
        </div>
      </div>
      <div class="card"><b>${t("bills")}</b>
        <div class="kv"><div><span>${t("dayBill")}</span><b>${money(d.earnings)}</b></div>
        <div><span>${t("monthBill")}</span><b>${money(month)}</b></div></div>
        ${mine.map((o) => `<p class="pay-line"><span>${esc(o.id)}</span><b>${money(o.fare.total * (1 - db.fees.commission))}</b></p>`).join("")}
      </div>
      <div class="card"><b>${t("withdraw")}</b><p class="hint">${t("zelleHint")}</p>
        <button class="btn btn-navy" data-action="withdraw">${t("withdraw")}</button>
      </div>`;
  }

  /* ---------- dispatch ---------- */
  function pageCQueue() {
    const open = db.orders.filter((o) => {
      if (!ui.filter || ui.filter === "all") return ["pending_dispatch", "assigned", "to_pickup", "waiting", "overtime_confirm"].includes(o.status);
      return ST_MAP[o.status] === ui.filter;
    });
    return `${pageHead(t("dispatch"), t("manualQ"))}
      <div class="btn-row tight">
        <button class="btn btn-navy" data-action="batch">${t("batch")}</button>
        <button class="btn btn-ghost" data-action="near">${t("near")}</button>
        <button class="btn btn-ghost" data-action="flight-re">${t("flightRe")}</button>
        <button class="btn btn-ghost" data-action="sync-flight">${t("syncFlight")}</button>
      </div>
      <div class="seg wrap">${["all", "pendingDispatch", "assigned", "inTrip", "done"].map((k) => `<button class="${(ui.filter || "all") === k ? "on" : ""}" data-action="filter" data-v="${k}">${t(k)}</button>`).join("")}</div>
      ${open.map((o) => {
        const ranks = aiRank(o).slice(0, 3);
        const fl = o.flight && db.flights[o.flight];
        return `<div class="card">
          <button type="button" class="trip-card nested" data-action="open-order" data-id="${o.id}">
            <div class="spine"><i class="dot from"></i><i class="line"></i><i class="dot to"></i></div>
            <div class="trip-mid">
              <b>${esc(addrName(o.from))}</b>
              <span class="muted">${esc(addrName(o.to))}</span>
              <span class="trip-meta">${esc(o.id)} · ${esc(o.flight || "—")}${fl ? ` · ${fl.status.replace("_", " ")}` : ""} · ${fmtTime(o.when, o.city)}</span>
            </div>
            <div class="trip-side"><span class="tag ${tagClass(o.status)}">${esc(st(o.status))}</span><b class="num">${money(o.fare.total)}</b></div>
          </button>
          ${fl ? `<p class="hint">${t("actualLand")}: ${fmtTime(fl.actual || fl.sched, o.city)} · ${t("landingHow")}</p>` : ""}
          ${["pending_dispatch", "assigned"].includes(o.status) ? `<p class="muted">${t("ai")}</p>
          <div class="ai-list">${ranks.map((r) => `<div class="ai-item">
            ${avatar(r.d.name)}
            <div><b>${esc(r.d.name)}</b> · ${t(r.d.level)} · ${r.score} ${t("score")}<div class="muted">${t("distance")} ${r.dist} mi · ${t(r.d.vehicle)} · ${!r.d.online ? t("off") : r.d.busy ? t("busy") : t("idle")}</div></div>
            <button class="btn btn-primary" style="height:34px;width:auto" data-action="assign" data-oid="${o.id}" data-did="${r.d.id}">${t("assign")}</button>
          </div>`).join("")}</div>` : ""}
          ${o.driverId && ["pending_dispatch", "assigned", "to_pickup"].includes(o.status) ? `<button class="btn btn-ghost" data-action="recall" data-id="${o.id}">${t("recall")}</button>` : ""}
        </div>`;
      }).join("") || emptyBox()}`;
  }
  function pageCDrivers() {
    return `${pageHead(t("monitor"), t("onlineDrivers"))}
      <div class="map-stage fleet">${mapHtml("lax", "dtla", { mode: "fleet", h: 228 })}</div>
      ${db.drivers.map((d) => `<div class="msg-row">${avatar(d.name)}
        <div><b>${esc(d.name)}</b><p class="muted">${t(d.level)} · ★ ${d.rating || "—"} · ${d.lat ? `${d.lat.toFixed(3)}, ${d.lng.toFixed(3)}` : "GPS —"}</p></div>
        <span class="tag ${d.online ? (d.busy ? "tag-wait" : "tag-ok") : "tag-mist"}">${d.online ? (d.busy ? t("busy") : t("idle")) : t("off")}</span>
      </div>`).join("")}`;
  }
  function pageCInbox() {
    const cs = db.chats.find((c) => c.with === "cs") || db.chats[0];
    return `${pageHead(t("inbox"), t("csMsg"))}
      ${db.messages.map((m) => `<div class="msg-row"><span class="avatar sm">${m.kind === "cs" ? "CS" : "i"}</span><div><b>${esc(m.title)}</b><p class="muted">${esc(m.body)}</p></div></div>`).join("")}
      <div class="chat-card">
        <div class="chat-hd">${avatar("Elena Ruiz")} <div><b>Elena Ruiz</b><span class="muted">${t("csMsg")}</span></div></div>
        <div class="chat-log">${(cs.lines || []).map((l) => `<p class="bubble ${l.who === "cs" ? "me" : ""}">${esc(l.txt)}</p>`).join("")}</div>
        <div class="composer"><input class="field-input" id="chat-cs-out" placeholder="${esc(t("typeMsg"))}" /><button class="send-btn" data-action="send-cs-out">${ico("send")}</button></div>
      </div>`;
  }
  function pageCShift() {
    const n = db.orders.filter((o) => o.driverId).length;
    const batch = (db.logs || []).filter((l) => /batch|recall|flight/.test(l.e)).length;
    const pending = db.orders.filter((o) => o.status === "pending_dispatch").length;
    return `${pageHead(t("shift"), t("csMe"))}
      <div class="profile-hero">${avatar("Ana Díaz", "lg")}<div><p class="eyebrow">PDT</p><h2>Ana Díaz</h2><span class="muted">${t("csMe")}</span></div></div>
      <div class="stat-grid">
        <div class="stat"><b>${n}</b><span>${t("assign")}</span></div>
        <div class="stat"><b>${pending}</b><span>${t("pendingDispatch")}</span></div>
        <div class="stat"><b>${batch}</b><span>${t("logs")}</span></div>
        <div class="stat"><b>105</b><span>${t("freeWait")}</span></div>
      </div>
      <button class="cell" data-action="cs-pwd"><span>${t("pwdChange")}<small>${t("pwdChanged")}</small></span><i>›</i></button>
      <p class="hint">${t("walk2")}</p>`;
  }

  /* ---------- admin ---------- */
  function canSee(route) {
    const r = ui.adminRole || "super";
    if (r === "super") return true;
    const map = {
      ops: ["a-dash", "a-orders", "a-comp", "a-users", "a-drivers", "a-cs", "a-msg"],
      fin: ["a-dash", "a-fin", "a-fees"],
      cs: ["a-dash", "a-orders", "a-comp", "a-msg"],
    };
    return (map[r] || []).includes(route);
  }
  function adminMenus() {
    return [
      { g: t("dashboard"), items: [{ id: "a-dash", title: t("dashboard") }] },
      { g: t("orderCtrl"), items: [{ id: "a-orders", title: t("orderCtrl") }, { id: "a-comp", title: t("dispute") }] },
      { g: t("users"), items: [{ id: "a-users", title: t("users") }, { id: "a-drivers", title: t("drivers") }, { id: "a-cs", title: t("csMgr") }] },
      { g: t("finance"), items: [{ id: "a-fin", title: t("finance") }, { id: "a-fees", title: t("fees") }] },
      { g: t("announce"), items: [{ id: "a-msg", title: t("announce") }, { id: "a-set", title: t("settings") }] },
    ].map((g) => ({ ...g, items: g.items.filter((it) => canSee(it.id)) })).filter((g) => g.items.length);
  }
  function adminHead(title, extra) {
    return `<div class="card-hd admin-hd"><div><p class="eyebrow">${t("admin")}</p><h2 class="page-title">${esc(title)}</h2></div><div class="admin-actions">${extra || ""}</div></div>`;
  }
  function adminSearch(ph) {
    return `<input class="field-input admin-q" data-admin="q" value="${esc(ui.adminQ || "")}" placeholder="${esc(ph)}" />`;
  }
  function inRange(ms) {
    const span = { "1": 1, "7": 7, "30": 30 }[ui.dashRange] || 7;
    return ms >= ui.tick - span * 86400000;
  }
  function findUser(id) { return db.users.find((u) => u.id === id); }
  function exportCsv(name, rows) {
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = name;
    a.click();
  }
  function pageADash() {
    const all = db.orders;
    const o = all.filter((x) => inRange(x.when));
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const from = ui.tick - (6 - i) * 86400000;
      const to = from + 86400000;
      const day = all.filter((x) => x.when >= from && x.when < to);
      return { n: day.length, rev: day.reduce((s, x) => s + x.fare.total, 0) };
    });
    const maxN = Math.max(...days.map((d) => d.n), 1);
    const maxR = Math.max(...days.map((d) => d.rev), 1);
    return `${adminHead(t("dashboard"), `
        <div class="seg">${[["1", "rangeToday"], ["7", "range7"], ["30", "range30"]].map(([v, k]) => `<button class="${ui.dashRange === v ? "on" : ""}" data-action="admin-range" data-v="${v}">${t(k)}</button>`).join("")}</div>
        <button class="btn btn-ghost" data-action="export">${t("exportReport")}</button>`)}
      <div class="dash-grid wide">
        <div class="dash-card"><b>${o.length}</b><span>${t("todayOrders")}</span></div>
        <div class="dash-card"><b>${o.filter((x) => x.status === "pending_dispatch").length}</b><span>${t("pendingDispatch")}</span></div>
        <div class="dash-card"><b>${o.filter((x) => x.status === "completed").length}</b><span>${t("done")}</span></div>
        <div class="dash-card"><b>${o.filter((x) => x.status === "cancelled").length}</b><span>${t("canceled")}</span></div>
        <div class="dash-card"><b>${db.drivers.filter((d) => d.online).length}</b><span>${t("onlineDrivers")}</span></div>
        <div class="dash-card"><b>${db.users.filter((u) => !u.frozen).length}</b><span>${t("activeUsers")}</span></div>
        <div class="dash-card"><b>${money(o.reduce((s, x) => s + x.fare.total, 0))}</b><span>${t("revenue")}</span></div>
      </div>
      <div class="admin-split">
        <div class="card"><b>${t("trend7")}</b>
          <div class="bars">${days.map((d) => `<i title="${d.n}" style="height:${Math.round(d.n / maxN * 64)}px"></i>`).join("")}</div>
        </div>
        <div class="card"><b>${t("trendRev")}</b>
          <div class="bars gold">${days.map((d) => `<i title="${money(d.rev)}" style="height:${Math.round(d.rev / maxR * 64)}px"></i>`).join("")}</div>
        </div>
      </div>
      <p class="muted">${t("statusMix")}: ${all.filter((x) => x.status === "completed").length} ${t("done")} · ${all.filter((x) => x.status === "noshow").length} No-show · ${all.filter((x) => x.status === "cancelled").length} ${t("canceled")}</p>
      <div class="fids-board">${["UA123", "AA88", "DL401"].map(fidsRow).join("")}</div>
      <p class="hint">${t("landingHow")}</p>`;
  }
  function pageAOrders() {
    const q = (ui.adminQ || "").toLowerCase();
    const rows = db.orders.filter((o) => {
      if (ui.filter !== "all" && ST_MAP[o.status] !== ui.filter) return false;
      if (!q) return true;
      const u = findUser(o.passengerId);
      const d = findDriver(o.driverId);
      return [o.id, o.flight, o.from, o.to, u?.phone, u?.name, d?.name].some((x) => String(x || "").toLowerCase().includes(q));
    });
    return `${adminHead(t("orderCtrl"), `<button class="btn btn-ghost" data-action="export">${t("export")}</button>`)}
      <div class="admin-tools">${adminSearch(t("searchOrder"))}
        <div class="seg wrap">${["all", "pendingDispatch", "assigned", "toPickup", "waiting", "overtime", "inTrip", "done", "canceled", "noshow"].map((k) => `<button class="${ui.filter === k ? "on" : ""}" data-action="filter" data-v="${k}">${t(k)}</button>`).join("")}</div>
      </div>
      <div class="table-wrap"><table><thead><tr>
        <th>ID</th><th>${t("timeCol")}</th><th>${t("status")}</th><th>${t("vehCol")}</th><th>${t("userCol")}</th><th>${t("from")}</th><th>${t("driverInfo")}</th><th>${t("total")}</th><th>${t("actions")}</th>
      </tr></thead><tbody>
      ${rows.map((o) => {
        const u = findUser(o.passengerId);
        const d = findDriver(o.driverId);
        return `<tr>
        <td>${esc(o.id)}</td><td>${fmtTime(o.when, o.city)}</td>
        <td><span class="tag ${tagClass(o.status)}">${esc(st(o.status))}</span></td>
        <td>${esc(t(o.vehicle))}</td><td>${esc(u?.name || o.passengerId)}<div class="muted">${esc(u?.phone || "")}</div></td>
        <td>${esc(addrName(o.from))} → ${esc(addrName(o.to))}<div class="muted">${esc(o.flight || "—")}</div></td>
        <td>${esc(d?.name || "—")}</td><td class="num">${money(o.fare.total)}</td>
        <td class="td-ops">
          <button class="chip" data-action="open-order" data-id="${o.id}">${t("detail")}</button>
          ${["pending_dispatch", "assigned", "to_pickup"].includes(o.status) ? `<button class="chip" data-action="force" data-id="${o.id}">${t("forceAssign")}</button>` : ""}
          ${["pending_dispatch", "assigned"].includes(o.status) ? `<button class="chip" data-action="edit-when" data-id="${o.id}">${t("modifyTime")}</button>` : ""}
          ${o.status === "noshow" || o.evidence ? `<button class="chip" data-action="evidence" data-id="${o.id}">${t("evidence")}</button>` : ""}
          ${["completed", "cancelled", "noshow"].includes(o.status) ? `<button class="chip" data-action="refund" data-id="${o.id}">${t("refund")}</button>` : ""}
          ${!["completed", "cancelled", "noshow"].includes(o.status) ? `<button class="chip" data-action="force-cancel" data-id="${o.id}">${t("forceCancel")}</button>` : ""}
        </td></tr>`;
      }).join("")}
      </tbody></table></div>
      <p class="hint">${rows.length} / ${db.orders.length}</p>`;
  }
  function pageAUsers() {
    const q = (ui.adminQ || "").toLowerCase();
    const rows = db.users.filter((u) => !q || [u.name, u.email, u.phone, u.id].some((x) => String(x || "").toLowerCase().includes(q)));
    return `${adminHead(t("users"), `<button class="btn btn-ghost" data-action="export-users">${t("export")}</button>`)}
      <div class="admin-tools">${adminSearch(t("searchOrder"))}</div>
      <div class="table-wrap"><table><thead><tr>
        <th>${t("name")}</th><th>${t("email")}</th><th>${t("phone")}</th><th>${t("revenue")}</th><th>${t("balance")}</th><th>${t("status")}</th><th>${t("actions")}</th>
      </tr></thead><tbody>
      ${rows.map((u) => `<tr>
        <td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td>
        <td class="num">${money(u.spend)}</td><td class="num">${money(u.balance)}</td>
        <td><span class="tag ${u.frozen ? "tag-bad" : "tag-ok"}">${u.frozen ? t("accountOff") : t("accountOn")}</span></td>
        <td class="td-ops">
          <button class="chip" data-action="user-detail" data-id="${u.id}">${t("viewDetail")}</button>
          <button class="chip" data-action="edit-bal" data-id="${u.id}">${t("adjustBal")}</button>
          <button class="chip" data-action="freeze" data-id="${u.id}">${u.frozen ? t("unfreeze") : t("freeze")}</button>
        </td>
      </tr>`).join("")}
      </tbody></table></div>`;
  }
  function pageADrivers() {
    const q = (ui.adminQ || "").toLowerCase();
    const rows = db.drivers.filter((d) => !q || [d.name, d.plate, d.phone, d.id].some((x) => String(x || "").toLowerCase().includes(q)));
    return `${adminHead(t("drivers"), `<button class="btn btn-ghost" data-action="export-drv">${t("export")}</button>`)}
      <div class="admin-tools">${adminSearch(t("searchOrder"))}</div>
      ${rows.map((d) => `<div class="card">
        <div class="card-hd">${avatar(d.name)}<div><b>${esc(d.name)}</b><div class="muted">${esc(d.plate)} · ${esc(d.phone)}</div></div>
          <span class="tag ${d.docs === "ok" ? "tag-ok" : "tag-wait"}">${d.docs === "ok" ? t("docsOk") : t("docsPending")}</span>
          <span class="tag ${d.disabled ? "tag-bad" : d.online ? "tag-ok" : "tag-mist"}">${d.disabled ? t("disabled") : d.online ? t("online") : t("off")}</span>
        </div>
        <div class="kv">
          <div><span>${t("level")}</span><b>${t(d.level)}</b></div>
          <div><span>${t("credit")}</span><b>${d.rating} · ${t("acceptRate")} ${Math.round(d.accept * 100)}% · ${t("complaints")} ${d.complaints}</b></div>
          <div><span>${t("earnings")}</span><b>${money(d.earnings)}</b></div>
        </div>
        <div class="btn-row tight">
          <button class="btn btn-ghost" data-action="drv-detail" data-id="${d.id}">${t("docPreview")}</button>
          ${d.docs !== "ok" ? `<button class="btn btn-navy" data-action="approve-d" data-id="${d.id}">${t("approve")}</button><button class="btn btn-ghost" data-action="reject-d" data-id="${d.id}">${t("rejectDoc")}</button>` : ""}
          <button class="btn btn-ghost" data-action="toggle-drv" data-id="${d.id}">${d.disabled ? t("enableDrv") : t("disabled")}</button>
        </div>
      </div>`).join("")}`;
  }
  function pageACS() {
    return `${adminHead(t("csMgr"))}
      <div class="card">
        <b>${t("addCs")}</b>
        <div class="btn-row" style="margin-top:10px">
          <input class="field-input" id="cs-name" placeholder="${esc(t("name"))}" />
          <input class="field-input" id="cs-email" placeholder="${esc(t("csEmail"))}" />
          <button class="btn btn-navy" data-action="add-cs">${t("addCs")}</button>
        </div>
      </div>
      ${db.cs.map((c) => `<div class="card">
        <div class="card-hd">${avatar(c.name)}<div><b>${esc(c.name)}</b><span class="muted">${esc(c.email)}</span></div>
          <span class="tag ${c.active ? "tag-ok" : "tag-mist"}">${c.active ? t("csActive") : t("csInactive")}</span></div>
        <div class="kv"><div><span>${t("level")}</span><b>${esc(c.role)}</b></div><div><span>${t("shift")}</span><b>${c.shift}</b></div></div>
        <div class="btn-row tight">
          <button class="btn btn-ghost" data-action="cs-toggle" data-id="${c.id}">${c.active ? t("csInactive") : t("csActive")}</button>
          <button class="btn btn-ghost" data-action="cs-pwd">${t("pwdChange")}</button>
        </div>
      </div>`).join("")}`;
  }
  function pageAFin() {
    const rev = db.orders.reduce((s, o) => s + o.fare.total, 0);
    const plat = rev * db.fees.commission;
    const drv = rev - plat;
    const pays = db.payments || [];
    return `${adminHead(t("finance"), `<button class="btn btn-ghost" data-action="export-pay">${t("export")}</button>`)}
      <div class="dash-grid">
        <div class="dash-card"><b>${money(rev)}</b><span>${t("revenue")}</span></div>
        <div class="dash-card"><b>${money(plat)}</b><span>${t("settlePlat")}</span></div>
        <div class="dash-card"><b>${money(drv)}</b><span>${t("settleDrv")}</span></div>
        <div class="dash-card"><b>${Math.round(db.fees.commission * 100)}%</b><span>${t("commission")}</span></div>
      </div>
      <div class="card"><div class="card-hd"><b>${t("commission")}</b>
        <div class="btn-row"><input class="field-input" id="fee-comm" type="number" step="0.01" value="${db.fees.commission}" /><button class="btn btn-navy" data-action="save-comm">${t("save")}</button></div>
      </div>
      <h3 class="sub-title">${t("withdraw")}</h3>
      ${db.withdrawals.map((w) => {
        const d = findDriver(w.driverId);
        return `<div class="card kv">
        <div><span>${esc(w.id)} · ${esc(d?.name || w.driverId)}</span><b>${money(w.amount)}</b></div>
        <div><span>${esc(w.account)}</span><span class="tag ${w.status === "paid" ? "tag-ok" : w.status === "rejected" ? "tag-bad" : "tag-wait"}">${w.status === "paid" ? t("paidW") : w.status === "rejected" ? t("rejectW") : t("pendingW")}</span></div>
        ${w.status === "pending" ? `<div class="btn-row"><button class="btn btn-navy" data-action="pay-w" data-id="${w.id}">${t("paidW")}</button>
          <button class="btn btn-ghost" data-action="reject-w" data-id="${w.id}">${t("rejectW")}</button></div>` : ""}
      </div>`;
      }).join("")}
      <h3 class="sub-title">${t("payLog")}</h3>
      <div class="table-wrap"><table><thead><tr><th>ID</th><th>${t("orders")}</th><th>${t("payWith")}</th><th>${t("status")}</th><th>${t("total")}</th></tr></thead><tbody>
        ${pays.map((p) => `<tr><td>${esc(p.id)}</td><td>${esc(p.orderId)}</td><td>${esc(t(p.channel) === p.channel ? p.channel : t(p.channel))}</td>
          <td><span class="tag ${p.status === "captured" || p.status === "refunded" ? "tag-ok" : "tag-wait"}">${esc(t(p.status) === p.status ? p.status : t(p.status))}</span></td>
          <td class="num">${money(p.amount)}</td></tr>`).join("")}
      </tbody></table></div>`;
  }
  function pageAFees() {
    const f = db.fees;
    return `${adminHead(t("fees"))}
      <div class="card">
        <b>${t("vehCol")}</b>
        <div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>${t("vehCol")}</th><th>${t("pax")}</th><th>${t("bags")}</th><th>${t("mile")}</th><th>/${t("mi")}</th></tr></thead><tbody>
          ${vehicles().map((v) => `<tr>
            <td>${esc(t(v.id))}</td>
            <td><input class="field-input slim" id="v-${v.id}-seats" type="number" value="${v.seats}" /></td>
            <td><input class="field-input slim" id="v-${v.id}-bags" type="number" value="${v.bags}" /></td>
            <td><input class="field-input slim" id="v-${v.id}-start" type="number" step="0.1" value="${v.start}" /></td>
            <td><input class="field-input slim" id="v-${v.id}-per" type="number" step="0.05" value="${v.per}" /></td>
          </tr>`).join("")}
        </tbody></table></div>
        <div class="field"><label>${t("freeWait")}</label><input class="field-input" id="fee-wait" type="number" value="${f.freeWait}" /></div>
        <div class="field"><label>${t("bookingFee")} USD</label><input class="field-input" id="fee-book" type="number" value="${f.booking}" /></div>
        <div class="field"><label>${t("bagFee")}</label><input class="field-input" id="fee-bag" type="number" value="${f.bag}" /></div>
        <div class="field"><label>${t("airportFee")}</label><input class="field-input" id="fee-air" type="number" value="${f.airport || 0}" /></div>
        <div class="field"><label>${t("noshowFee")}</label><input class="field-input" id="fee-ns" type="number" value="${f.noshow}" /></div>
        <div class="field"><label>${t("waitFee")} / min</label><input class="field-input" id="fee-wpm" type="number" step="0.05" value="${f.waitPerMin}" /></div>
        <div class="field"><label>${t("perMin")}</label><input class="field-input" id="fee-min" type="number" step="0.05" value="${f.perMin || 0.4}" /></div>
        <div class="field"><label>${t("nightFee")} %</label><input class="field-input" id="fee-night" type="number" step="0.05" value="${f.nightRate}" /></div>
        <button class="btn btn-primary" data-action="save-fees">${t("save")}</button>
      </div>`;
  }
  function pageAComp() {
    const rows = db.complaints || [];
    return `${adminHead(t("dispute"))}
      ${rows.map((c) => `<div class="card">
        <div class="card-hd"><b>${esc(c.orderId)}</b><span class="tag ${c.status === "open" ? "tag-wait" : "tag-ok"}">${esc(c.status)}</span></div>
        <p>${esc(c.text)}</p>
        ${c.reply ? `<p class="muted">${t("reply")}: ${esc(c.reply)}</p>` : ""}
        <div class="btn-row tight">
          <button class="btn btn-ghost" data-action="open-order" data-id="${c.orderId}">${t("detail")}</button>
          <button class="btn btn-ghost" data-action="evidence" data-id="${c.orderId}">${t("evidence")}</button>
          <button class="btn btn-ghost" data-action="refund" data-id="${c.orderId}">${t("refund")}</button>
        </div>
        ${c.status === "open" ? `<div class="btn-row" style="margin-top:8px"><input class="field-input" id="rep-${c.id}" placeholder="${esc(t("reply"))}" /><button class="btn btn-navy" data-action="reply-k" data-id="${c.id}">${t("reply")}</button></div>` : ""}
      </div>`).join("") || emptyBox()}`;
  }
  function pageAMsg() {
    const to = ui.form.nTo || "all";
    return `${adminHead(t("announce"))}
      <div class="card">
        <div class="seg">${[["all", "targetAll"], ["passenger", "targetPax"], ["driver", "targetDrv"]].map(([v, k]) => `<button class="${to === v ? "on" : ""}" data-action="set-form" data-k="nTo" data-v="${v}">${t(k)}</button>`).join("")}</div>
        <div class="field"><label>${t("announce")}</label><input class="field-input" id="n-title" /></div>
        <textarea class="field-area" id="n-body"></textarea>
        <button class="btn btn-navy" data-action="push-n">${t("send")}</button>
      </div>
      ${db.notices.map((n) => `<div class="card"><div class="card-hd"><b>${esc(n.title)}</b><span class="tag tag-navy">${esc(t({ all: "targetAll", passenger: "targetPax", driver: "targetDrv" }[n.to] || "targetAll"))}</span></div>
        <p class="muted">${esc(n.body)}</p>
        <button class="chip" data-action="del-notice" data-id="${n.id}">${t("deleteNotice")}</button>
      </div>`).join("")}`;
  }
  function pageASet() {
    const s = db.settings;
    return `${adminHead(t("settings"))}
      <div class="card">
        <div class="field"><label>${t("brand")}</label><input class="field-input" id="set-platform" value="${esc(s.platform)}" /></div>
        <div class="field"><label>${t("timezone")}</label><select class="field-select" id="set-tz">
          ${["America/Los_Angeles", "America/New_York", "America/Chicago"].map((z) => `<option ${s.tz === z ? "selected" : ""}>${z}</option>`).join("")}
        </select></div>
        <div class="field"><label>${t("mapsKey")}</label><input class="field-input" id="set-maps" value="${esc(s.maps)}" /></div>
        <div class="field"><label>Stripe</label><input class="field-input" id="set-stripe" value="${esc(s.stripe)}" /></div>
        <div class="field"><label>PayPal</label><input class="field-input" id="set-paypal" value="${esc(s.paypal)}" /></div>
        <div class="field"><label>${t("wiseApi")}</label><input class="field-input" id="set-wise" value="${esc(s.wise || "")}" /></div>
        <div class="field"><label>${t("revolutApi")}</label><input class="field-input" id="set-rev" value="${esc(s.revolut || "")}" /></div>
        <div class="field"><label>${t("flightSrcLabel")}</label><input class="field-input" id="set-flight" value="${esc(s.flightSrc || "demo")}" /></div>
        <div class="field"><label>${t("privacy")}</label><textarea class="field-area" id="set-privacy">${esc(s.privacy || "")}</textarea></div>
        <div class="field"><label>${t("agreement")}</label><textarea class="field-area" id="set-agree">${esc(s.agreement || "")}</textarea></div>
        <label class="hint"><input type="checkbox" id="set-ccpa" ${s.ccpaOn ? "checked" : ""} /> CCPA</label>
        <p class="hint">${t("rbac")}: ${t("superAdmin")} / ${t("ops")} / ${t("fin")} / ${t("csRole")}</p>
        <div class="btn-row" style="margin-top:12px">
          <button class="btn btn-primary" data-action="save-set">${t("saveSettings")}</button>
          <button class="btn btn-ghost" data-action="backup">${t("backup")}</button>
        </div>
      </div>
      <p class="hint">${t("flightSrc")}</p>
      <p class="hint">${t("manualQ")}</p>`;
  }

  /* ---------- order modal ---------- */
  function orderModal(id) {
    const o = findOrder(id); if (!o) return "";
    const d = findDriver(o.driverId);
    const w = waitInfo(o);
    const who = ui.role;
    const flight = o.flight && db.flights[o.flight];
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <div class="card-hd"><b>${esc(o.id)}</b><span class="tag ${tagClass(o.status)}">${esc(st(o.status))}</span><button type="button" class="sheet-x" data-action="close-modal">✕</button></div>
      ${mapHtml(o.from, o.to, { oid: o.id, did: d && d.id, mode: o.status === "in_trip" ? "track" : "route", h: 180, progress: o.status === "in_trip" ? 0.42 : "" })}
      <div class="route-pick slim">
        <div class="spine tall"><i class="dot from"></i><i class="line"></i><i class="dot to"></i></div>
        <div><b>${esc(addrName(o.from))}</b><span class="muted">${esc(addrName(o.to))}</span></div>
      </div>
      <div class="kv">
        <div><span>${t("when")}</span><b>${fmtTime(o.when, o.city)}</b></div>
        ${o.flight ? `<div><span>${t("flight")}</span><b>${esc(o.flight)} · ${t("actualLand")} ${fmtTime(flight?.actual || flight?.sched, o.city)}</b></div>` : ""}
        <div><span>${t("vehicle")}</span><b>${esc(t(o.vehicle))} · ${o.pax} ${t("paxUnit")} · ${o.bags} ${t("bagUnit")}</b></div>
        ${o.notes ? `<div><span>${t("notes")}</span><b>${esc(o.notes)}</b></div>` : ""}
        <div><span>${t("mile")}</span><b>${money(o.fare.mile)}</b></div>
        <div><span>${t("waitFee")}</span><b>${money(o.fare.wait || 0)}</b></div>
        <div><span>${t("total")}</span><b>${money(o.fare.total)}</b></div>
      </div>
      ${(o.logs || []).length ? `<p class="muted">${t("dispatchLog")}: ${(o.logs || []).slice(0, 5).map((l) => l.e).join(" → ")}</p>` : ""}
      ${d && ["assigned", "to_pickup", "waiting", "overtime_confirm", "in_trip", "completed"].includes(o.status) ? `<div class="card"><b>${t("driverInfo")}</b>
        <div class="kv"><div><span>${esc(d.name)}</span><b>${esc(d.plate)} · ${esc(d.color)}</b></div></div>
        <div class="btn-row"><button class="btn btn-ghost" data-action="nav" data-from="${o.from}" data-to="${o.to}">${t("nav")}</button><button class="btn btn-ghost" data-action="call">${t("call")}</button></div>
      </div>` : ""}
      ${w && ["waiting", "overtime_confirm"].includes(o.status) ? `<div class="wait-clock" data-oid="${esc(o.id)}">
        <div class="muted">${w.left >= 0 ? t("waitLeft") : t("waitOver")} · ${t("freeWait")}</div>
        <div class="big">${w.text}</div>
        <div class="muted">${t("waitStart")}: ${t("actualLand")} ${fmtTime(flight?.actual, o.city)}</div>
      </div>` : ""}
      <div class="btn-row" style="flex-wrap:wrap;margin-top:10px">
        ${who === "passenger" && o.status === "overtime_confirm" ? `<button class="btn btn-primary" data-action="pay-wait" data-id="${o.id}">${t("payWait")}</button><button class="btn btn-danger" data-action="refuse-wait" data-id="${o.id}">${t("refuseWait")}</button>` : ""}
        ${who === "passenger" && ["pending_dispatch", "assigned"].includes(o.status) ? `<button class="btn btn-ghost" data-action="cancel-o" data-id="${o.id}">${t("cancel")}</button>` : ""}
        ${who === "passenger" && o.status === "completed" ? `<button class="btn btn-navy" data-action="rate" data-id="${o.id}">${t("rate")}</button><button class="btn btn-ghost" data-action="receipt" data-id="${o.id}">${t("receipt")}</button>` : ""}
        ${who === "passenger" ? `<button class="btn btn-ghost" data-action="share" data-id="${o.id}">${t("share")}</button><button class="btn btn-ghost" data-action="cs-open">${t("cs")}</button><button class="btn btn-ghost" data-action="complain" data-id="${o.id}">${t("complain")}</button>` : ""}
        ${who === "driver" && o.status === "assigned" ? `<button class="btn btn-primary" data-action="accept-o" data-id="${o.id}">${t("accept")}</button><button class="btn btn-ghost" data-action="reject-o" data-id="${o.id}">${t("reject")}</button>` : ""}
        ${who === "driver" && o.status === "to_pickup" ? `<button class="btn btn-primary" data-action="arrive" data-id="${o.id}">${t("arrive")}</button>` : ""}
        ${who === "driver" && o.status === "waiting" ? `<button class="btn btn-teal" data-action="start-o" data-id="${o.id}">${t("startTrip")}</button><button class="btn btn-ghost" data-action="ask-wait" data-id="${o.id}">${t("applyWait")}</button><button class="btn btn-danger" data-action="noshow" data-id="${o.id}">${t("closeNoshow")}</button>` : ""}
        ${who === "driver" && o.status === "overtime_confirm" ? `<button class="btn btn-teal" data-action="start-o" data-id="${o.id}">${t("startTrip")}</button><button class="btn btn-danger" data-action="noshow" data-id="${o.id}">${t("closeNoshow")}</button>` : ""}
        ${who === "driver" && o.status === "in_trip" ? `<button class="btn btn-primary" data-action="end-o" data-id="${o.id}">${t("endTrip")}</button>` : ""}
        ${who === "admin" || who === "dispatch" ? `<button class="btn btn-ghost" data-action="evidence" data-id="${o.id}">${t("genEvidence")}</button><button class="btn btn-ghost" data-action="force-cancel" data-id="${o.id}">${t("forceCancel")}</button>` : ""}
        ${who === "admin" && ["pending_dispatch", "assigned", "to_pickup"].includes(o.status) ? `<button class="btn btn-navy" data-action="edit-when" data-id="${o.id}">${t("modifyTime")}</button>` : ""}
      </div>
      <p class="hint">${t("cancelRule")}</p>
      ${who === "admin" && ["pending_dispatch", "assigned", "to_pickup"].includes(o.status) ? `<div class="card" style="margin-top:10px"><b>${t("forceAssign")}</b>
        <div class="ai-list">${aiRank(o).slice(0, 4).map((r) => `<div class="ai-item">${avatar(r.d.name)}
          <div><b>${esc(r.d.name)}</b> · ${t(r.d.level)} · ${r.score}<div class="muted">${r.dist} mi · ${!r.d.online ? t("off") : r.d.busy ? t("busy") : t("idle")}</div></div>
          <button class="btn btn-primary" style="height:34px;width:auto" data-action="force-assign" data-oid="${o.id}" data-did="${r.d.id}">${t("assign")}</button>
        </div>`).join("")}</div></div>` : ""}
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
          <div><span>${t("waitFee")}</span><b>${money(o.fare.wait || 0)}</b></div>
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
    const pickup = window.ApronMap ? ApronMap.place(o.from) : { lat: 33.9416, lng: -118.4085 };
    const ev = o.evidence || {
      arrivedAt: o.arrivedAt, waitLog: `Free wait ${db.fees.freeWait} min from actual landing`,
      chat: (db.chats.find((c) => c.with === "D1")?.lines || []).map((l) => l.txt).join(" / ") || "—",
      gps: `${pickup.lat.toFixed(5)} · ${pickup.lng.toFixed(5)}`,
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
      ${mapHtml(o.from, o.to, { h: 160, oid: o.id + "-ev" })}
      ${ui.role === "admin" && o.status === "noshow" ? `<div class="btn-row" style="margin-top:10px">
        <button class="btn btn-navy" data-action="approve-ns" data-id="${o.id}">${t("approvedNs")}</button>
        <button class="btn btn-ghost" data-action="overturn-ns" data-id="${o.id}">${t("overturn")}</button>
      </div>` : ""}
    </div></div>`;
  }
  function rateModal(id) {
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <h3>${t("rate")}</h3>
      <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button data-action="star" data-id="${id}" data-n="${n}">★</button>`).join("")}</div>
      <div class="chips">${["punctual", "clean", "safe"].map((tg) => `<button class="chip ${(ui.rateTags || []).includes(tg) ? "on" : ""}" data-action="tag-r" data-id="${id}" data-v="${tg}">${esc(t(tg) === tg ? tg : t(tg))}</button>`).join("")}</div>
      <textarea class="field-area" id="rate-c" placeholder="${esc(t("comment"))}"></textarea>
      <button class="btn btn-primary" data-action="save-rate" data-id="${id}">${t("save")}</button>
    </div></div>`;
  }
  function rejectModal(id) {
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <h3>${t("rejectNeed")}</h3>
      <div class="chips">
        ${[["rConflict", "conflict"], ["rVehicle", "vehicle"], ["rLate", "late"], ["rOther", "other"]].map(([k, v]) =>
          `<button class="chip" data-action="reject-o" data-id="${id}" data-reason="${v}">${esc(t(k))}</button>`).join("")}
      </div>
    </div></div>`;
  }
  function complainModal(id) {
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <h3>${t("complain")}</h3>
      <textarea class="field-area" id="k-text" placeholder="${esc(t("complain"))}"></textarea>
      <button class="btn btn-primary" data-action="save-k" data-id="${id}">${t("send")}</button>
    </div></div>`;
  }
  function profileModal() {
    const p = db.passenger;
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <h3>${t("editProfile")}</h3>
      <div class="field"><label>${t("nick")}</label><input class="field-input" id="p-nick" value="${esc(p.nick || p.name)}" /></div>
      <div class="field"><label>${t("phone")}</label><input class="field-input" id="p-phone" value="${esc(p.phone)}" /></div>
      <button class="btn btn-primary" data-action="save-profile">${t("saveProfile")}</button>
    </div></div>`;
  }
  function whenModal(id) {
    const o = findOrder(id); if (!o) return "";
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <h3>${t("modifyTime")} · ${esc(o.id)}</h3>
      <div class="field"><label>${t("when")}</label><input class="field-input" type="datetime-local" id="edit-when" value="${esc(toLocalInput(o.when))}" /></div>
      <button class="btn btn-primary" data-action="save-when" data-id="${o.id}">${t("saveWhen")}</button>
    </div></div>`;
  }
  function userModal(id) {
    const u = findUser(id); if (!u) return "";
    const trips = db.orders.filter((o) => o.passengerId === u.id);
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <div class="profile-hero">${avatar(u.name, "lg")}<div><h2>${esc(u.name)}</h2><span class="muted">${esc(u.email)}</span></div></div>
      <div class="kv">
        <div><span>${t("phone")}</span><b>${esc(u.phone)}</b></div>
        <div><span>${t("balance")}</span><b>${money(u.balance)}</b></div>
        <div><span>${t("revenue")}</span><b>${money(u.spend)}</b></div>
        <div><span>${t("status")}</span><b>${u.frozen ? t("accountOff") : t("accountOn")}</b></div>
      </div>
      <p class="muted">${trips.length} ${t("orders")}</p>
      <div class="btn-row"><button class="btn btn-navy" data-action="edit-bal" data-id="${u.id}">${t("adjustBal")}</button>
        <button class="btn btn-ghost" data-action="freeze" data-id="${u.id}">${u.frozen ? t("unfreeze") : t("freeze")}</button></div>
    </div></div>`;
  }
  function balModal(id) {
    const u = findUser(id); if (!u) return "";
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <h3>${t("adjustBal")} · ${esc(u.name)}</h3>
      <p class="hint">${t("balHint")} · ${t("balance")} ${money(u.balance)}</p>
      <input class="field-input" id="bal-delta" type="number" step="0.01" placeholder="12.00" />
      <button class="btn btn-primary" style="margin-top:10px" data-action="save-bal" data-id="${u.id}">${t("save")}</button>
    </div></div>`;
  }
  function driverModal(id) {
    const d = findDriver(id); if (!d) return "";
    return `<div class="modal-mask" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()">
      <div class="card-hd"><b>${esc(d.name)}</b><span class="tag ${d.docs === "ok" ? "tag-ok" : "tag-wait"}">${d.docs === "ok" ? t("docsOk") : t("docsPending")}</span></div>
      <div class="doc-grid">
        <div class="doc-card"><span>${t("license")}</span><b>CA DL · ${esc(d.plate)}</b></div>
        <div class="doc-card"><span>${t("insurance")}</span><b>TCP ${d.docs === "ok" ? "2026" : "—"}</b></div>
        <div class="doc-card"><span>${t("tlc")}</span><b>${d.level === "gold" ? "TNC-OK" : "TNC"}</b></div>
      </div>
      <p class="muted">${t("setLevel")}</p>
      <div class="chips">${["gold", "silver", "bronze"].map((lv) => `<button class="chip ${d.level === lv ? "on" : ""}" data-action="set-level" data-id="${d.id}" data-v="${lv}">${t(lv)}</button>`).join("")}</div>
      ${d.docs !== "ok" ? `<div class="btn-row"><button class="btn btn-navy" data-action="approve-d" data-id="${d.id}">${t("approve")}</button><button class="btn btn-ghost" data-action="reject-d" data-id="${d.id}">${t("rejectDoc")}</button></div>` : ""}
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
        <button class="btn btn-ghost" style="margin-top:8px" data-action="forgot">${t("forgot")}</button>
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
    </div>${ui.role === "admin" ? `${ui.modal ? ui.modal.html : ""}${toastHtml()}` : ""}`;
  }
  function toastHtml() {
    return `<div class="toast-wrap">${ui.toast ? `<div class="toast ${ui.toast.kind}">${esc(ui.toast.msg)}</div>` : ""}</div>`;
  }

  function phone(tabs, body) {
    const hh = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: false }).format(now());
    return `<div class="mini-stage"><div class="mini-phone">
      <div class="mini-body">
        <div class="status-bar">
          <span class="sb-time">${hh}</span>
          <span class="island" aria-hidden="true"></span>
          <span class="sb-meta"><i class="sig"><em></em><em></em><em></em><em></em></i>5G<i class="batt"><em></em></i></span>
        </div>
        ${body}
        <nav class="tabbar">${tabs.map((tb) => `<button class="tab ${ui.route === tb.id ? "on" : ""}" data-go="${tb.id}">${ico(tb.ico)}<span>${esc(tb.label)}</span></button>`).join("")}</nav>
        <i class="home-ind" aria-hidden="true"></i>
      </div>
      ${ui.modal ? ui.modal.html : ""}
      ${toastHtml()}
    </div><p class="hint">${t("overlayHint")}</p></div>`;
  }

  function renderPhone() {
    if (ui.role === "passenger") {
      const tabs = [
        { id: "p-home", ico: "book", label: t("book") },
        { id: "p-orders", ico: "orders", label: t("orders") },
        { id: "p-inbox", ico: "inbox", label: t("inbox") },
        { id: "p-me", ico: "me", label: t("me") },
      ];
      const page = { "p-home": pagePHome, "p-orders": () => `<div class="mini-scroll">${pagePOrders()}</div>`, "p-inbox": () => `<div class="mini-scroll">${pagePInbox()}</div>`, "p-me": () => `<div class="mini-scroll">${pagePMe()}</div>` }[ui.route] || pagePHome;
      return phone(tabs, page());
    }
    if (ui.role === "driver") {
      const tabs = [
        { id: "d-home", ico: "work", label: t("workbench") },
        { id: "d-orders", ico: "orders", label: t("orders") },
        { id: "d-inbox", ico: "inbox", label: t("inbox") },
        { id: "d-me", ico: "me", label: t("me") },
      ];
      const page = { "d-home": () => `<div class="mini-scroll">${pageDHome()}</div>`, "d-orders": () => `<div class="mini-scroll">${pageDOrders()}</div>`, "d-inbox": () => `<div class="mini-scroll">${pageDInbox()}</div>`, "d-me": () => `<div class="mini-scroll">${pageDMe()}</div>` }[ui.route] || pageDHome;
      return phone(tabs, page());
    }
    const tabs = [
      { id: "c-queue", ico: "dispatch", label: t("dispatch") },
      { id: "c-drv", ico: "monitor", label: t("monitor") },
      { id: "c-inbox", ico: "inbox", label: t("inbox") },
      { id: "c-shift", ico: "shift", label: t("shift") },
    ];
    const page = { "c-queue": () => `<div class="mini-scroll">${pageCQueue()}</div>`, "c-drv": () => `<div class="mini-scroll">${pageCDrivers()}</div>`, "c-inbox": () => `<div class="mini-scroll">${pageCInbox()}</div>`, "c-shift": () => `<div class="mini-scroll">${pageCShift()}</div>` }[ui.route] || pageCQueue;
    return phone(tabs, page());
  }

  function renderAdmin() {
    const pages = { "a-dash": pageADash, "a-orders": pageAOrders, "a-comp": pageAComp, "a-users": pageAUsers, "a-drivers": pageADrivers, "a-cs": pageACS, "a-fin": pageAFin, "a-fees": pageAFees, "a-msg": pageAMsg, "a-set": pageASet };
    const page = pages[ui.route] || pageADash;
    if (!canSee(ui.route)) ui.route = "a-dash";
    return `<div class="admin">
      <div class="admin-top">
        <div class="chrome-brand"><img src="assets/logo.svg" alt="" />${t("admin")}<small>${esc(db.settings.platform || "Apron")}</small></div>
        <div class="seg rbac">${[["super", "superAdmin"], ["ops", "ops"], ["fin", "fin"], ["cs", "csRole"]].map(([v, k]) => `<button class="${ui.adminRole === v ? "on" : ""}" data-action="admin-role" data-v="${v}">${t(k)}</button>`).join("")}</div>
        <span class="muted">${t("demoNow")} 10:40 PDT</span>
      </div>
      <div class="admin-body">
        <aside class="sidebar">${adminMenus().map((g) => `<div class="nav-g">${esc(g.g)}</div>${g.items.map((it) => `<button class="nav-item ${ui.route === it.id ? "on" : ""}" data-go="${it.id}">${esc(it.title)}</button>`).join("")}`).join("")}</aside>
        <main class="content">${page()}</main>
      </div>
    </div>`;
  }

  function render() {
    const root = document.getElementById("app");
    document.documentElement.lang = ui.lang === "zh" ? "zh-CN" : ui.lang === "es" ? "es" : "en";
    if (window.ApronMap) ApronMap.destroy();
    if (!ui.authed) { root.innerHTML = renderPortal(); bind(); return; }
    const inner = ui.role === "admin" ? renderAdmin() : renderPhone();
    root.innerHTML = chrome(inner);
    bind();
    if (window.ApronMap) {
      ApronMap.mount(root, { drivers: db.drivers, city: ui.form.city || "la" });
    }
  }

  function go(id) {
    ui.route = id;
    location.hash = id;
    ui.modal = null;
    ui.adminQ = "";
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
    document.querySelectorAll("[data-admin]").forEach((el) => {
      el.addEventListener("change", () => { ui.adminQ = el.value; render(); });
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") { ui.adminQ = el.value; render(); } });
    });
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
    if (name === "role") { ui.role = ds.v; ui.route = defaultRoute(ds.v); ui.filter = "all"; ui.modal = null; sessionStorage.setItem("apron_role", ui.role); location.hash = ui.route; render(); return; }
    if (name === "reset") { resetDemo(); return; }
    if (name === "forgot") { toast(t("forgotSent"), "ok"); return; }
    if (name === "set-city") {
      ui.form.city = ds.v;
      if (ds.v === "ny") { ui.form.from = "jfk"; ui.form.to = "midtown"; }
      else if (ds.v === "mia") { ui.form.from = "mia"; ui.form.to = "southb"; }
      else { ui.form.from = "lax"; ui.form.to = "dtla"; }
      render(); return;
    }
    if (name === "use-place") {
      if (ui.form.from === ds.v) ui.form.to = ds.v;
      else if (!ui.form.from) ui.form.from = ds.v;
      else ui.form.to = ds.v;
      render(); return;
    }
    if (name === "inbox-tab") { ui.inboxTab = ds.v; render(); return; }
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
    if (name === "near") {
      const soon = db.orders.filter((o) => o.status === "pending_dispatch" && o.when - ui.tick < 90 * 60000);
      soon.forEach((o) => {
        const top = aiRank(o)[0];
        o.nearSuggest = top && top.d.id;
        pushLog(o, "near_reshuffle:" + (top ? top.d.name : "none"));
      });
      db.logs.push({ t: ui.tick, who: "cs", e: "near" });
      save(); toast(`${t("toastNear")} · ${soon.length}`, "ok"); render(); return;
    }
    if (name === "sync-flight") {
      db.flights.AA88.status = "delayed";
      db.flights.AA88.actual = ui.tick + 90 * 60000;
      notify("AA88", t("flightSynced"), "sys");
      db.logs.push({ t: ui.tick, who: "cs", e: "sync-flight" });
      save(); toast(t("flightSynced"), "ok"); render(); return;
    }
    if (name === "flight-re") {
      let n = 0;
      db.orders.forEach((o) => {
        const fl = o.flight && db.flights[o.flight];
        if (!fl || (fl.status !== "delayed" && fl.status !== "cancelled")) return;
        if (!["pending_dispatch", "assigned"].includes(o.status)) return;
        if (o.driverId) {
          const d = findDriver(o.driverId); if (d) d.busy = false;
          o.driverId = null;
        }
        o.status = "pending_dispatch";
        pushLog(o, "flight_reshuffle:" + fl.status);
        n += 1;
      });
      db.logs.push({ t: ui.tick, who: "cs", e: "flight-re" });
      notify(t("flightRe"), String(n), "order");
      save(); toast(`${t("toastFlight")} · ${n}`, "ok"); render(); return;
    }
    if (name === "toggle-online") {
      const d = myDriver(); d.online = !d.online; save(); toast(d.online ? t("toastOnline") : t("toastOffline"), "ok"); render(); return;
    }
    if (name === "accept-o") {
      const o = findOrder(ds.id); o.status = "to_pickup"; ui.offerSeen[o.id] = 1; pushLog(o, "accepted"); save(); toast(t("toastAccepted"), "ok"); ui.modal = { html: orderModal(o.id) }; render(); return;
    }
    if (name === "reject-o") {
      if (!ds.reason) { ui.modal = { html: rejectModal(ds.id) }; render(); return; }
      const o = findOrder(ds.id); const d = findDriver(o.driverId);
      o.status = "pending_dispatch"; o.driverId = null; if (d) d.busy = false;
      pushLog(o, "rejected:" + ds.reason); notify(o.id, t("toastRejected") + " · " + ds.reason, "order");
      save(); toast(t("toastRejected")); ui.modal = null; render(); return;
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
      const o = findOrder(ds.id);
      const over = Math.max(1, Math.ceil((ui.tick - (o.freeUntil || ui.tick)) / 60000));
      o.overtimeMin = over;
      o.fare.wait = +(over * (db.fees.waitPerMin || 0.85)).toFixed(2);
      o.fare.total = +(o.fare.total - (o.fare._waitWas || 0) + o.fare.wait).toFixed(2);
      o.fare._waitWas = o.fare.wait;
      o.status = "waiting"; pushLog(o, "overtime_paid:" + o.fare.wait); save(); toast(t("toastPaidWait"), "ok"); ui.modal = { html: orderModal(o.id) }; render(); return;
    }
    if (name === "refuse-wait") {
      const o = findOrder(ds.id); pushLog(o, "overtime_refused"); save(); toast(t("toastRefuseWait")); ui.modal = { html: orderModal(o.id) }; render(); return;
    }
    if (name === "noshow") {
      const o = findOrder(ds.id); const d = findDriver(o.driverId);
      o.status = "noshow"; o.fare.total = db.fees.noshow;
      const gps = window.ApronMap ? ApronMap.place(o.from) : { lat: 33.9416, lng: -118.4085 };
      o.evidence = { arrivedAt: o.arrivedAt, waitLog: `Free wait ${db.fees.freeWait} min from actual landing`, chat: "overtime refused / no passenger", gps: `${gps.lat.toFixed(5)} · ${gps.lng.toFixed(5)}` };
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
      const o = findOrder(ds.id); o.rated = true; o.rating = ui._stars || 5; o.comment = $("#rate-c")?.value || ""; o.tags = ui.rateTags || [];
      const d = findDriver(o.driverId); if (d && o.rating) d.rating = +((d.rating * 8 + o.rating) / 9).toFixed(2);
      save(); toast(t("toastRated"), "ok"); ui.modal = null; render(); return;
    }
    if (name === "tag-r") {
      ui.rateTags = ui.rateTags || [];
      if (ui.rateTags.includes(ds.v)) ui.rateTags = ui.rateTags.filter((x) => x !== ds.v);
      else ui.rateTags.push(ds.v);
      ui.modal = { html: rateModal(ds.id) }; render(); return;
    }
    if (name === "star") { ui._stars = Number(ds.n); document.querySelectorAll(".stars button").forEach((b, i) => b.classList.toggle("on", i < ui._stars)); return; }
    if (name === "receipt") { ui.modal = { html: receiptModal(ds.id) }; render(); return; }
    if (name === "evidence") { ui.modal = { html: evidenceModal(ds.id) }; render(); return; }
    if (name === "nav" || name === "nav-home") {
      const o = ds.id ? findOrder(ds.id) : db.orders.find((x) => x.driverId === myDriver().id && ["assigned", "to_pickup", "waiting", "overtime_confirm", "in_trip"].includes(x.status));
      const dest = ds.to || (o && o.from) || "lax";
      const origin = ds.from || "";
      const url = window.ApronMap ? ApronMap.navUrl(dest, origin || undefined) : `https://www.google.com/maps/search/?api=1&query=${dest}`;
      window.open(url, "_blank", "noopener");
      toast(t("navOpen"), "ok"); return;
    }
    if (name === "call") { toast(t("contactMasked")); return; }
    if (name === "share") {
      const url = `${location.origin}${location.pathname}#${ds.id || "p-orders"}`;
      if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
      toast(t("shared"), "ok"); return;
    }
    if (name === "complain") { ui.modal = { html: complainModal(ds.id) }; render(); return; }
    if (name === "save-k") {
      const text = $("#k-text")?.value || t("complain");
      db.complaints = db.complaints || [];
      db.complaints.unshift({ id: uid("K"), orderId: ds.id, from: "P1", text, status: "open", reply: "" });
      save(); toast(t("complainSent"), "ok"); ui.modal = null; render(); return;
    }
    if (name === "edit-profile") { ui.modal = { html: profileModal() }; render(); return; }
    if (name === "save-profile") {
      db.passenger.nick = $("#p-nick")?.value || db.passenger.nick;
      db.passenger.phone = $("#p-phone")?.value || db.passenger.phone;
      save(); toast(t("toastSaved"), "ok"); ui.modal = null; render(); return;
    }
    if (name === "add-addr") {
      db.passenger.saved = db.passenger.saved || [];
      if (!db.passenger.saved.includes(ds.v)) db.passenger.saved.push(ds.v);
      save(); render(); return;
    }
    if (name === "del-addr") {
      db.passenger.saved = (db.passenger.saved || []).filter((x) => x !== ds.v);
      save(); render(); return;
    }
    if (name === "later-rate") { toast(t("reviewLater")); return; }
    if (name === "send-drv") {
      const v = $("#chat-drv")?.value || ""; if (!v) return;
      let c = db.chats.find((x) => x.with === "D1");
      if (!c) { c = { id: "C2", with: "D1", name: "Maya Chen", lines: [] }; db.chats.push(c); }
      c.lines.push({ who: "p", t: ui.tick, txt: v }); save(); render(); return;
    }
    if (name === "send-cs-out") {
      const v = $("#chat-cs-out")?.value || ""; if (!v) return;
      db.chats[0].lines.push({ who: "cs", t: ui.tick, txt: v }); save(); render(); return;
    }
    if (name === "cs-drv") { toast(t("cs")); go("d-inbox"); return; }
    if (name === "cs-pwd") { toast(t("pwdChanged"), "ok"); return; }
    if (name === "reply-k") {
      const c = (db.complaints || []).find((x) => x.id === ds.id); if (!c) return;
      c.reply = $(`#rep-${c.id}`)?.value || t("reply"); c.status = "closed"; save(); toast(t("toastSaved"), "ok"); render(); return;
    }
    if (name === "refund") {
      const o = findOrder(ds.id); if (!o) return;
      db.payments = db.payments || [];
      db.payments.unshift({ id: uid("PAY"), orderId: o.id, channel: o.pay || "stripe", kind: "refund", amount: o.fare.total, status: "refunded" });
      pushLog(o, "refund"); save(); toast(t("refunded"), "ok"); render(); return;
    }
    if (name === "force-cancel") {
      const o = findOrder(ds.id); if (!o) return;
      o.status = "cancelled"; const d = findDriver(o.driverId); if (d) d.busy = false;
      pushLog(o, "force_cancel"); save(); toast(t("toastCanceled")); ui.modal = null; render(); return;
    }
    if (name === "approve-ns") { toast(t("approvedNs"), "ok"); ui.modal = null; render(); return; }
    if (name === "overturn-ns") {
      const o = findOrder(ds.id); o.status = "cancelled"; o.fare.total = 0; pushLog(o, "noshow_overturn");
      db.payments = db.payments || [];
      db.payments.unshift({ id: uid("PAY"), orderId: o.id, channel: "stripe", kind: "refund", amount: db.fees.noshow, status: "refunded" });
      save(); toast(t("overturn"), "ok"); ui.modal = null; render(); return;
    }
    if (name === "toggle-drv") {
      const d = findDriver(ds.id); d.disabled = !d.disabled; if (d.disabled) d.online = false;
      save(); toast(t("toastSaved"), "ok"); render(); return;
    }
    if (name === "cs-open") { ui.role = "passenger"; go("p-inbox"); return; }
    if (name === "send-cs") {
      const v = $("#chat-in")?.value || ""; if (!v) return;
      db.chats[0].lines.push({ who: "p", t: ui.tick, txt: v }); save(); render(); return;
    }
    if (name === "delete-acct") { toast(t("deleteAccount"), "ok"); return; }
    if (name === "withdraw") {
      db.withdrawals.unshift({ id: uid("W"), driverId: "D1", amount: 80, account: "Wise · MAYA***", status: "pending" }); save(); toast(t("toastWithdraw"), "ok"); return;
    }
    if (name === "admin-range") { ui.dashRange = ds.v; render(); return; }
    if (name === "admin-role") { ui.adminRole = ds.v; if (!canSee(ui.route)) ui.route = "a-dash"; render(); return; }
    if (name === "force-assign") { assignOrder(ds.oid, ds.did, true); ui.modal = null; render(); return; }
    if (name === "edit-when") { ui.modal = { html: whenModal(ds.id) }; render(); return; }
    if (name === "save-when") {
      const o = findOrder(ds.id); if (!o) return;
      const when = parseWhen($("#edit-when")?.value);
      if (when < ui.tick) return toast(t("pastTime"), "err");
      o.when = when; pushLog(o, "time_changed"); save(); toast(t("toastSaved"), "ok"); ui.modal = null; render(); return;
    }
    if (name === "user-detail") { ui.modal = { html: userModal(ds.id) }; render(); return; }
    if (name === "edit-bal") { ui.modal = { html: balModal(ds.id) }; render(); return; }
    if (name === "save-bal") {
      const u = findUser(ds.id); if (!u) return;
      u.balance = +(Number(u.balance || 0) + Number($("#bal-delta")?.value || 0)).toFixed(2);
      save(); toast(t("toastSaved"), "ok"); ui.modal = null; render(); return;
    }
    if (name === "drv-detail") { ui.modal = { html: driverModal(ds.id) }; render(); return; }
    if (name === "set-level") {
      const d = findDriver(ds.id); if (!d) return;
      d.level = ds.v; save(); toast(t("toastSaved"), "ok"); ui.modal = { html: driverModal(d.id) }; render(); return;
    }
    if (name === "add-cs") {
      const nameV = $("#cs-name")?.value?.trim(); const email = $("#cs-email")?.value?.trim();
      if (!nameV) return toast(t("name"), "err");
      db.cs.push({ id: uid("CS"), name: nameV, email: email || "cs@apron.demo", role: "junior", shift: 0, active: true });
      save(); toast(t("toastSaved"), "ok"); render(); return;
    }
    if (name === "cs-toggle") {
      const c = db.cs.find((x) => x.id === ds.id); if (c) c.active = !c.active; save(); toast(t("toastSaved"), "ok"); render(); return;
    }
    if (name === "freeze") {
      const u = db.users.find((x) => x.id === ds.id); if (u) u.frozen = !u.frozen; save(); toast(t("toastSaved"), "ok"); ui.modal = null; render(); return;
    }
    if (name === "approve-d") { const d = findDriver(ds.id); d.docs = "ok"; save(); toast(t("toastSaved"), "ok"); ui.modal = null; render(); return; }
    if (name === "reject-d") { const d = findDriver(ds.id); if (d) d.docs = "pending"; save(); toast(t("rejectDoc")); ui.modal = null; render(); return; }
    if (name === "pay-w") { const w = db.withdrawals.find((x) => x.id === ds.id); if (w) w.status = "paid"; save(); toast(t("paidW"), "ok"); render(); return; }
    if (name === "reject-w") { const w = db.withdrawals.find((x) => x.id === ds.id); if (w) w.status = "rejected"; save(); toast(t("rejectW")); render(); return; }
    if (name === "save-comm") {
      db.fees.commission = Number($("#fee-comm")?.value || db.fees.commission); save(); toast(t("toastSaved"), "ok"); render(); return;
    }
    if (name === "save-fees") {
      db.fees.freeWait = Number($("#fee-wait")?.value || 105);
      db.fees.booking = Number($("#fee-book")?.value || 8);
      db.fees.bag = Number($("#fee-bag")?.value || 6);
      db.fees.airport = Number($("#fee-air")?.value || 0);
      db.fees.noshow = Number($("#fee-ns")?.value || 35);
      db.fees.waitPerMin = Number($("#fee-wpm")?.value || 0.85);
      db.fees.perMin = Number($("#fee-min")?.value || 0.4);
      db.fees.nightRate = Number($("#fee-night")?.value || 0.2);
      db.vehicles.forEach((v) => {
        v.seats = Number($(`#v-${v.id}-seats`)?.value || v.seats);
        v.bags = Number($(`#v-${v.id}-bags`)?.value || v.bags);
        v.start = Number($(`#v-${v.id}-start`)?.value || v.start);
        v.per = Number($(`#v-${v.id}-per`)?.value || v.per);
      });
      save(); toast(t("toastSaved"), "ok"); render(); return;
    }
    if (name === "push-n") {
      db.notices.unshift({ id: uid("N"), title: $("#n-title")?.value || t("announce"), body: $("#n-body")?.value || "", to: ui.form.nTo || "all" });
      save(); toast(t("toastSaved"), "ok"); render(); return;
    }
    if (name === "del-notice") {
      db.notices = db.notices.filter((n) => n.id !== ds.id); save(); toast(t("deleteNotice"), "ok"); render(); return;
    }
    if (name === "save-set") {
      Object.assign(db.settings, {
        platform: $("#set-platform")?.value || db.settings.platform,
        tz: $("#set-tz")?.value || db.settings.tz,
        maps: $("#set-maps")?.value || db.settings.maps,
        stripe: $("#set-stripe")?.value || db.settings.stripe,
        paypal: $("#set-paypal")?.value || db.settings.paypal,
        wise: $("#set-wise")?.value || db.settings.wise,
        revolut: $("#set-rev")?.value || db.settings.revolut,
        flightSrc: $("#set-flight")?.value || db.settings.flightSrc,
        privacy: $("#set-privacy")?.value || "",
        agreement: $("#set-agree")?.value || "",
        ccpaOn: !!$("#set-ccpa")?.checked,
      });
      save(); toast(t("toastSaved"), "ok"); render(); return;
    }
    if (name === "export") {
      exportCsv("apron-orders.csv", [["id", "status", "when", "vehicle", "from", "to", "flight", "driver", "total"], ...db.orders.map((o) => [o.id, o.status, o.when, o.vehicle, o.from, o.to, o.flight, o.driverId || "", o.fare.total])]);
      return;
    }
    if (name === "export-users") {
      exportCsv("apron-users.csv", [["id", "name", "email", "phone", "spend", "balance", "frozen"], ...db.users.map((u) => [u.id, u.name, u.email, u.phone, u.spend, u.balance, u.frozen])]);
      return;
    }
    if (name === "export-drv") {
      exportCsv("apron-drivers.csv", [["id", "name", "level", "rating", "plate", "docs", "online"], ...db.drivers.map((d) => [d.id, d.name, d.level, d.rating, d.plate, d.docs, d.online])]);
      return;
    }
    if (name === "export-pay") {
      exportCsv("apron-payments.csv", [["id", "order", "channel", "kind", "status", "amount"], ...(db.payments || []).map((p) => [p.id, p.orderId, p.channel, p.kind, p.status, p.amount])]);
      return;
    }
    if (name === "backup") {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: "application/json" }));
      a.download = "apron-backup.json";
      a.click();
      toast(t("toastSaved"), "ok");
      return;
    }
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
    db.orders.unshift(o);
    db.payments = db.payments || [];
    db.payments.unshift({ id: uid("PAY"), orderId: o.id, channel: o.pay, kind: "preauth", amount: fare.total, status: "authorized" });
    notify(o.id, t("submitted"), "order"); save(); toast(t("submitted"), "ok"); go("p-orders");
  }

  document.body.addEventListener("apron-drop", (ev) => {
    const id = ev.detail && ev.detail.id;
    if (!id) return;
    const slot = ui.form.pickTarget || "from";
    ui.form[slot] = id;
    ui.form.pickTarget = slot === "from" ? "to" : "from";
    render();
  });

  window.addEventListener("hashchange", () => {
    const h = location.hash.replace("#", "");
    if (h) { ui.route = h; render(); }
  });
  setInterval(() => {
    if (!ui.authed) return;
    ui.tick += 1000;
    const clock = document.querySelector(".wait-clock .big");
    const oid = document.querySelector(".wait-clock")?.getAttribute("data-oid");
    if (clock && oid) {
      const o = findOrder(oid);
      const w = o && waitInfo(o);
      if (w) {
        clock.textContent = w.text;
        const lab = document.querySelector(".wait-clock .muted");
        if (lab && w.left < 0) lab.textContent = t("waitOver") + " · " + t("freeWait");
      }
    }
  }, 1000);

  render();
})();
