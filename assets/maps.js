(() => {
  const PLACES = {
    lax: { lat: 33.9416, lng: -118.4085, city: "la" },
    dtla: { lat: 34.0522, lng: -118.2437, city: "la" },
    santa: { lat: 34.0161, lng: -118.4962, city: "la" },
    home: { lat: 34.0900, lng: -118.3617, city: "la" },
    work: { lat: 34.0610, lng: -118.4173, city: "la" },
    hiltonlax: { lat: 33.9463, lng: -118.3820, city: "la" },
    unionsta: { lat: 34.0561, lng: -118.2365, city: "la" },
    bhills: { lat: 34.0696, lng: -118.4053, city: "la" },
    jfk: { lat: 40.6413, lng: -73.7781, city: "ny" },
    lga: { lat: 40.7769, lng: -73.8740, city: "ny" },
    midtown: { lat: 40.7549, lng: -73.9840, city: "ny" },
    mia: { lat: 25.7959, lng: -80.2870, city: "mia" },
    southb: { lat: 25.7826, lng: -80.1341, city: "mia" },
    downtownmia: { lat: 25.7743, lng: -80.1937, city: "mia" },
  };
  const BY_CITY = {
    la: ["lax", "hiltonlax", "dtla", "unionsta", "santa", "bhills", "home", "work"],
    ny: ["jfk", "lga", "midtown"],
    mia: ["mia", "southb", "downtownmia"],
    ch: [],
  };
  const DRIVER_HOME = {
    D1: { lat: 33.9448, lng: -118.4012 },
    D2: { lat: 34.0488, lng: -118.2551 },
    D3: { lat: 33.9872, lng: -118.4410 },
    D4: { lat: 33.9616, lng: -118.3531 },
    D5: { lat: 34.0736, lng: -118.2400 },
  };
  const routes = {};
  const live = [];

  function haversineMi(a, b) {
    if (!a || !b) return 14;
    const R = 3958.8;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
  function roadMiles(a, b) {
    return +(haversineMi(place(a), place(b)) * 1.28).toFixed(1);
  }
  function place(id) {
    return PLACES[id] || PLACES.lax;
  }
  function navUrl(destId, originId) {
    const d = place(destId);
    const o = originId ? place(originId) : null;
    const dest = `${d.lat},${d.lng}`;
    const org = o ? `&origin=${o.lat},${o.lng}` : "";
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}${org}&travelmode=driving`;
  }
  function search(q, city) {
    const ids = BY_CITY[city] || BY_CITY.la;
    const s = String(q || "").trim().toLowerCase();
    if (!s) return ids;
    return ids.filter((id) => id.includes(s) || labelHit(id, s));
  }
  function labelHit(id, s) {
    return id === s;
  }
  function destroy() {
    while (live.length) {
      const m = live.pop();
      try { m.remove(); } catch (_) {}
    }
  }

  async function getRoute(fromId, toId) {
    const key = `${fromId}|${toId}`;
    if (routes[key]) return routes[key];
    const a = place(fromId);
    const b = place(toId);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      const json = await res.json();
      const geom = json.routes && json.routes[0] && json.routes[0].geometry;
      const meters = json.routes && json.routes[0] && json.routes[0].distance;
      if (geom) {
        routes[key] = { geometry: geom, miles: +(meters / 1609.34).toFixed(1) };
        return routes[key];
      }
    } catch (_) {}
    routes[key] = {
      geometry: { type: "LineString", coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
      miles: roadMiles(fromId, toId),
    };
    return routes[key];
  }

  function markerEl(kind, text) {
    const el = document.createElement("div");
    el.className = `map-pin map-pin-${kind}`;
    el.innerHTML = `<i></i>${text ? `<span>${text}</span>` : ""}`;
    return el;
  }

  function addMarker(map, lngLat, kind, text) {
    return new maplibregl.Marker({ element: markerEl(kind, text), anchor: "bottom" })
      .setLngLat(lngLat)
      .addTo(map);
  }

  function fit(map, coords) {
    if (!coords.length) return;
    const b = new maplibregl.LngLatBounds(coords[0], coords[0]);
    coords.forEach((c) => b.extend(c));
    map.fitBounds(b, { padding: 36, maxZoom: 13, duration: 0 });
  }

  function paintRoute(map, geometry, id) {
    const src = `rte-${id}`;
    if (map.getSource(src)) {
      map.getSource(src).setData(geometry);
      return;
    }
    map.addSource(src, { type: "geojson", data: geometry });
    map.addLayer({
      id: `${src}-glow`,
      type: "line",
      source: src,
      paint: { "line-color": "#f4efe6", "line-width": 8, "line-opacity": 0.9 },
    });
    map.addLayer({
      id: src,
      type: "line",
      source: src,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#1a2744", "line-width": 4 },
    });
  }

  function along(geometry, t) {
    const coords = geometry.coordinates || [];
    if (coords.length < 2) return coords[0];
    const i = Math.min(coords.length - 1, Math.max(0, Math.floor(t * (coords.length - 1))));
    return coords[i];
  }

  function fallbackIframe(el, fromId, toId) {
    const a = place(fromId);
    const b = place(toId);
    const minLng = Math.min(a.lng, b.lng) - 0.08;
    const minLat = Math.min(a.lat, b.lat) - 0.08;
    const maxLng = Math.max(a.lng, b.lng) + 0.08;
    const maxLat = Math.max(a.lat, b.lat) + 0.08;
    el.innerHTML = `<iframe title="map" class="map-iframe" src="https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&amp;layer=mapnik&amp;marker=${a.lat}%2C${a.lng}"></iframe>`;
  }

  function makeMap(el, center) {
    const map = new maplibregl.Map({
      container: el,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center,
      zoom: 11,
      attributionControl: false,
      interactive: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    live.push(map);
    return map;
  }

  async function fillRoute(map, fromId, toId, drivers, oid) {
    const a = place(fromId);
    const b = place(toId);
    addMarker(map, [a.lng, a.lat], "a", "P");
    addMarker(map, [b.lng, b.lat], "b", "D");
    const rte = await getRoute(fromId, toId);
    if (!map.getStyle()) return rte;
    paintRoute(map, rte.geometry, oid || `${fromId}-${toId}`);
    const coords = (rte.geometry.coordinates || []).map((c) => [c[0], c[1]]);
    fit(map, coords.length ? coords : [[a.lng, a.lat], [b.lng, b.lat]]);
    if (drivers && drivers.length) {
      drivers.forEach((d) => {
        if (d.lat == null) return;
        addMarker(map, [d.lng, d.lat], d.busy ? "busy" : "car", "");
      });
    }
    return rte;
  }

  async function mountOne(el, ctx) {
    const fromId = el.dataset.from || "lax";
    const toId = el.dataset.to || "dtla";
    const mode = el.dataset.mode || "route";
    const a = place(fromId);
    if (!window.maplibregl) {
      fallbackIframe(el, fromId, toId);
      return;
    }
    const map = makeMap(el, [a.lng, a.lat]);
    map.on("load", async () => {
      if (mode === "fleet") {
        const pts = [];
        (ctx.drivers || []).forEach((d) => {
          if (d.lat == null) return;
          addMarker(map, [d.lng, d.lat], d.online ? (d.busy ? "busy" : "car") : "off", (d.name || "").split(" ")[0]);
          pts.push([d.lng, d.lat]);
        });
        addMarker(map, [PLACES.lax.lng, PLACES.lax.lat], "a", "LAX");
        addMarker(map, [PLACES.dtla.lng, PLACES.dtla.lat], "b", "DTLA");
        const rte = await getRoute("lax", "dtla");
        paintRoute(map, rte.geometry, "fleet");
        fit(map, pts.concat([[PLACES.lax.lng, PLACES.lax.lat], [PLACES.dtla.lng, PLACES.dtla.lat]]));
        return;
      }
      const car = (ctx.drivers || []).filter((d) => d.id === el.dataset.did);
      const rte = await fillRoute(map, fromId, toId, car, el.dataset.oid);
      if (mode === "track" && rte) {
        const p = along(rte.geometry, Number(el.dataset.progress || 0.35));
        if (p) addMarker(map, p, "car", "");
      }
    });
    if (el.dataset.pickable === "1") {
      map.on("click", (ev) => {
        const id = "drop";
        PLACES[id] = { lat: +ev.lngLat.lat.toFixed(5), lng: +ev.lngLat.lng.toFixed(5), city: ctx.city || "la" };
        el.dispatchEvent(new CustomEvent("apron-drop", { bubbles: true, detail: { id, lat: PLACES[id].lat, lng: PLACES[id].lng } }));
      });
    }
  }

  async function mount(root, ctx) {
    destroy();
    const nodes = [...(root || document).querySelectorAll("[data-map]")];
    for (const el of nodes) await mountOne(el, ctx || {});
  }

  window.ApronMap = {
    PLACES, BY_CITY, DRIVER_HOME, haversineMi, roadMiles, place, navUrl, search, getRoute, mount, destroy,
  };
})();
