// Visual Rebuild: a ~28 second, purely visual "rebuild" of this site, back end first. Each layer drops onto a 3D stack on
// top of the ones before it, builds itself, and at the end the stack collapses flat into the real desktop.
// It is all theatre: nothing here reads or writes data or touches the network. Loaded on demand by app.js.
(() => {
  const RB_LAYERS = [];
  // ---- layer 0 ----
RB_LAYERS[0] = {
  key: "infra",
  name: "INFRASTRUCTURE",
  sub: "Vercel edge network · static + serverless",
  tagline: "18 regions. One-year immutable cache.",
  color: "#22d3ee",
  dur: 3400,
  log: [
    "provisioning edge network · 18 regions",
    "anycast 76.76.21.21 → nearest PoP",
    "pinning functions to iad1 (washington, d.c.)",
    "home region bom1 · mumbai online",
    "racking 24 units · otp.js contact.js proxy.js",
    "cache-control: max-age=31536000, immutable",
    "headers: nosniff · referrer · permissions",
    "TLS 1.3 · HTTP/2 · brotli at every edge",
    "edge ready · p50 31ms",
  ],
  css: `
.rb-L0 .w{position:absolute;left:0;width:1000px;height:508px;font-family:var(--rb-mono)}
.rb-L0 .w svg{position:absolute;left:0;top:0;overflow:visible}
.rb-L0 .hd,.rb-L0 .rh0{position:absolute;top:10px;height:26px;display:flex;align-items:baseline;gap:12px;white-space:nowrap;opacity:0}
.rb-L0 .hd{left:16px;width:620px}
.rb-L0 .rh0{left:660px;width:328px}
.rb-L0 .ht{font:600 15px var(--rb-mono);letter-spacing:.16em;color:var(--c)}
.rb-L0 .hs{font:12px var(--rb-mono);letter-spacing:.04em;color:#94a3b8}
.rb-L0 .ck{margin-left:auto;font:12px var(--rb-mono);letter-spacing:.08em;color:#e2e8f0}
.rb-L0 .ck::before{content:"";display:inline-block;width:7px;height:7px;margin-right:7px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c);vertical-align:1px}
.rb-L0 .ck em{font-style:normal;color:#94a3b8;margin-left:8px;letter-spacing:.04em}
.rb-L0.rb-go .hd{animation:rbL0rise .5s cubic-bezier(.2,.8,.2,1) both}
.rb-L0.rb-go .rh0{animation:rbL0rise .5s cubic-bezier(.2,.8,.2,1) 90ms both}
.rb-L0.rb-go .ck::before{animation:rbL0blink 1.1s steps(1,end) infinite}

.rb-L0 .fd{opacity:0}
.rb-L0.rb-go .fd{animation:rbL0in .7s ease-out both}
.rb-L0 .br{fill:none;stroke:var(--c);stroke-width:1.5;opacity:0;transform-box:fill-box;transform-origin:center}
.rb-L0.rb-go .br{animation:rbL0lock .6s cubic-bezier(.2,.8,.2,1) 60ms both}
.rb-L0 .gr{fill:none;stroke:#94a3b8;stroke-opacity:.17;stroke-width:1;stroke-dasharray:1 2;stroke-dashoffset:1}
.rb-L0 .gr.eq{stroke:var(--c);stroke-opacity:.36}
.rb-L0.rb-go .gr{animation:rbL0draw .8s cubic-bezier(.3,.6,.2,1) calc(var(--d)*1ms) both}
.rb-L0 .ld{opacity:0}
.rb-L0.rb-go .ld{animation:rbL0land calc(var(--t)*1ms) ease-out calc(var(--d)*1ms) both}
.rb-L0 .gl{font:12px var(--rb-mono);letter-spacing:.05em;fill:#64748b;opacity:0}
.rb-L0.rb-go .gl{animation:rbL0in .5s ease-out calc(var(--d)*1ms) both}

.rb-L0 .ar{fill:none;stroke:var(--c);stroke-opacity:.62;stroke-width:1.1;stroke-dasharray:1 2;stroke-dashoffset:1}
.rb-L0 .ar.b{stroke:#e2e8f0;stroke-opacity:.42}
.rb-L0.rb-go .ar{animation:rbL0draw .72s cubic-bezier(.35,.1,.2,1) calc(var(--d)*1ms) both}

.rb-L0 .nr,.rb-L0 .nc,.rb-L0 .ns,.rb-L0 .hx{transform-box:fill-box;transform-origin:center;opacity:0}
.rb-L0 .nr{fill:none;stroke:var(--c);stroke-width:1;vector-effect:non-scaling-stroke}
.rb-L0 .nc{fill:#ecfeff;stroke:var(--c);stroke-opacity:.38;stroke-width:5}
.rb-L0 .nc.k{fill:var(--c);stroke-opacity:.45;stroke-width:7}
.rb-L0 .ns{fill:none;stroke:var(--c);stroke-width:1.2;stroke-dasharray:3 3.3}
.rb-L0 .hx{fill:none;stroke:#f8fafc;stroke-width:1.3;vector-effect:non-scaling-stroke}
.rb-L0.rb-go .nc{animation:rbL0pop .5s cubic-bezier(.2,1.5,.4,1) calc(var(--d)*1ms) both}
.rb-L0.rb-go .nr{animation:rbL0ring 2.8s cubic-bezier(.1,.6,.3,1) calc(var(--d)*1ms) infinite both}
.rb-L0.rb-go .ns{animation:rbL0in .5s ease-out calc(var(--d)*1ms + 200ms) both,rbL0spin 9s linear infinite}
.rb-L0 .hx.ha{animation:rbL0hitA .7s ease-out both}
.rb-L0 .hx.hb{animation:rbL0hitB .7s ease-out both}
.rb-L0 .nl{font:12px var(--rb-mono);letter-spacing:.04em;fill:#cbd5e1;paint-order:stroke;stroke:#020617;stroke-opacity:.85;stroke-width:3px;stroke-linejoin:round;opacity:0}
.rb-L0 .nl.k{font-size:14px;font-weight:700;letter-spacing:.08em;fill:var(--c)}
.rb-L0 .nl.s{font-size:12px;font-weight:400;letter-spacing:.06em;fill:#94a3b8}
.rb-L0.rb-go .nl{animation:rbL0in .45s ease-out calc(var(--d)*1ms + 160ms) both}
.rb-L0 .pk{fill:#f0fdff;stroke:var(--c);stroke-opacity:.45;stroke-width:4}
.rb-L0 .sc{opacity:0}
.rb-L0.rb-go .sc{animation:rbL0sweep 1.15s cubic-bezier(.45,.05,.55,.95) 40ms both,rbL0sweepL 4.6s linear 2900ms infinite}

.rb-L0 .lg{position:absolute;left:16px;top:392px;width:620px;font:12px var(--rb-mono);letter-spacing:.06em;color:#64748b;white-space:nowrap;opacity:0}
.rb-L0 .sw{display:inline-block;vertical-align:middle;width:18px;height:2px;margin:0 8px 0 22px;background:var(--c)}
.rb-L0 .sw.n{width:7px;height:7px;margin-left:0;border-radius:50%;box-shadow:0 0 6px var(--c)}
.rb-L0 .sw.b{background:#e2e8f0;opacity:.6}
.rb-L0.rb-go .lg{animation:rbL0rise .5s ease-out 1150ms both}
.rb-L0 .tq{position:absolute;left:16px;top:414px;width:620px;height:72px;box-sizing:border-box;padding:2px 0 0 10px;border-left:1px solid rgba(34,211,238,.4);overflow:hidden;font:12px/17px var(--rb-mono);color:#94a3b8;white-space:pre;opacity:0}
.rb-L0 .tq div{height:17px}
.rb-L0 .tq div:nth-child(1){opacity:.28}
.rb-L0 .tq div:nth-child(2){opacity:.5}
.rb-L0 .tq div:nth-child(3){opacity:.72}
.rb-L0 .tq div:nth-child(4){color:#e2e8f0}
.rb-L0 .tq .fa{animation:rbL0flA .45s ease-out}
.rb-L0 .tq .fb{animation:rbL0flB .45s ease-out}
.rb-L0.rb-go .tq{animation:rbL0in .4s ease-out 2000ms both}

.rb-L0 .rks{position:absolute;left:660px;top:44px;width:328px;display:flex;gap:8px}
.rb-L0 .rk{position:relative;flex:0 0 104px;box-sizing:border-box;padding:4px 3px 5px;border:1px solid rgba(34,211,238,.32);background:linear-gradient(180deg,rgba(34,211,238,.08),rgba(2,6,23,.3) 40%,rgba(34,211,238,.05));box-shadow:inset 0 0 18px rgba(34,211,238,.07),0 0 14px rgba(34,211,238,.08);opacity:0}
.rb-L0 .rk::before,.rb-L0 .rk::after{content:"";position:absolute;top:27px;bottom:5px;width:2px;background:repeating-linear-gradient(180deg,rgba(148,163,184,.5) 0 2px,transparent 2px 7px)}
.rb-L0 .rk::before{left:0}
.rb-L0 .rk::after{right:0}
.rb-L0 .rkh{height:18px;padding:0 3px;font:12px/16px var(--rb-mono);color:#94a3b8;white-space:nowrap;overflow:hidden;border-bottom:1px solid rgba(148,163,184,.2)}
.rb-L0 .rkh::before{content:attr(data-n);color:var(--c);font-weight:600;margin-right:6px}
.rb-L0.rb-go .rk{animation:rbL0drop .55s cubic-bezier(.2,.9,.3,1) calc(var(--d)*1ms) both}
.rb-L0 .u{position:relative;height:24px;margin-top:4px;box-sizing:border-box;padding-left:5px;border:1px solid rgba(34,211,238,.24);background:linear-gradient(90deg,rgba(34,211,238,.11),rgba(15,23,42,.6) 72%);font:12px/22px var(--rb-mono);color:#cbd5e1;white-space:nowrap;overflow:hidden;opacity:0}
.rb-L0 .u::before{content:"";position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,rgba(34,211,238,0),rgba(165,243,252,.6));opacity:0;transform:scaleX(0);transform-origin:left}
.rb-L0 .u::after{content:"";position:absolute;left:0;bottom:0;height:2px;width:calc(var(--ld)*1px);background:var(--c);opacity:.65;transform:scaleX(0);transform-origin:left}
.rb-L0 .u .l{position:absolute;right:3px;top:8px;width:13px;height:5px;opacity:0}
.rb-L0 .u .l::before,.rb-L0 .u .l::after{content:"";position:absolute;top:0;width:5px;height:5px;border-radius:50%}
.rb-L0 .u .l::before{left:0;background:var(--c);box-shadow:0 0 6px var(--c)}
.rb-L0 .u .l::after{right:0;background:#e2e8f0;box-shadow:0 0 4px rgba(226,232,240,.7)}
.rb-L0 .u.o .l::before{opacity:.12}
.rb-L0.rb-go .u{animation:rbL0unit .55s linear calc(var(--d)*1ms) both}
.rb-L0.rb-go .u::before{animation:rbL0wipe .55s linear calc(var(--d)*1ms) both}
.rb-L0.rb-go .u::after{animation:rbL0bar .7s cubic-bezier(.2,.8,.2,1) calc(var(--d)*1ms + 320ms) both}
.rb-L0.rb-go .u .l{animation:rbL0in .06s linear calc(var(--d)*1ms + 290ms) both}

.rb-L0 .st{position:absolute;left:660px;top:318px;width:328px}
.rb-L0 .sh{padding-bottom:6px;border-bottom:1px solid rgba(34,211,238,.35);font:12px var(--rb-mono);letter-spacing:.12em;color:#94a3b8;opacity:0}
.rb-L0 .sr{display:flex;align-items:baseline;justify-content:space-between;height:31px;line-height:31px;border-bottom:1px dashed rgba(148,163,184,.18);opacity:0}
.rb-L0 .sk{font:12px var(--rb-mono);letter-spacing:.14em;color:#94a3b8}
.rb-L0 .sv{font:500 17px var(--rb-mono);color:#e2e8f0;white-space:pre}
.rb-L0 .sv.c{color:var(--c)}
.rb-L0.rb-go .sh,.rb-L0.rb-go .sr{animation:rbL0rise .45s cubic-bezier(.2,.8,.2,1) calc(var(--d)*1ms) both}

@keyframes rbL0in{from{opacity:0}to{opacity:1}}
@keyframes rbL0rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes rbL0drop{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:none}}
@keyframes rbL0lock{from{opacity:0;transform:scale(1.05)}to{opacity:1;transform:scale(1)}}
@keyframes rbL0draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes rbL0land{0%{opacity:0}45%{opacity:1}100%{opacity:.8}}
@keyframes rbL0pop{0%{opacity:0;transform:scale(0)}55%{opacity:1;transform:scale(1.9)}100%{opacity:1;transform:scale(1)}}
@keyframes rbL0ring{0%{opacity:0;transform:scale(.8)}6%{opacity:.9}100%{opacity:0;transform:scale(6)}}
@keyframes rbL0spin{to{transform:rotate(360deg)}}
@keyframes rbL0hitA{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(5)}}
@keyframes rbL0hitB{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(5)}}
@keyframes rbL0sweep{0%{opacity:0;transform:translateX(16px)}8%{opacity:1}88%{opacity:1}100%{opacity:0;transform:translateX(640px)}}
@keyframes rbL0sweepL{0%{opacity:0;transform:translateX(16px)}5%{opacity:.75}44%{opacity:.75}48%{opacity:0;transform:translateX(640px)}100%{opacity:0;transform:translateX(640px)}}
@keyframes rbL0blink{0%{opacity:1}50%{opacity:.15}}
@keyframes rbL0unit{0%{opacity:0;transform:translateX(-10px)}22%{opacity:.4;transform:none}48%{opacity:.4}52%{opacity:1}58%{opacity:.55}63%{opacity:1}100%{opacity:1;transform:none}}
@keyframes rbL0wipe{0%,48%{opacity:0;transform:scaleX(0)}53%{opacity:1;transform:scaleX(.12)}80%{opacity:.8;transform:scaleX(1)}100%{opacity:0;transform:scaleX(1)}}
@keyframes rbL0bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes rbL0flA{from{opacity:.2;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes rbL0flB{from{opacity:.2;transform:translateX(-8px)}to{opacity:1;transform:none}}
`,
  build(body, api) {
    const BH = api.BH || 508;
    const oy = Math.max(0, Math.round((BH - 508) / 2));
    const id = "rbL0" + api.hex(6);
    // equirectangular projection of the map window (lon -155..180, lat 74..-48)
    const MX = 16, MY = 44, MW = 620, MH = 340, L0 = -155, L1 = 180, A0 = 74, A1 = -48;
    const kx = MW / (L1 - L0), ky = MH / (A0 - A1);
    const r1 = n => Math.round(n * 10) / 10;
    const P = (lon, lat) => [r1(MX + (lon - L0) * kx), r1(MY + (A0 - lat) * ky)];
    const poly = s => {
      const a = s.trim().split(/\s+/).map(Number);
      let d = "";
      for (let i = 0; i + 1 < a.length; i += 2) { const p = P(a[i], a[i + 1]); d += (i ? "L" : "M") + p[0] + "," + p[1]; }
      return d + "Z";
    };

    // coarse coastlines "lon lat lon lat ..." rendered as a dot matrix; [delay, fade ms, polygons]
    const LAND = [
      [150, 650, [
        "-168 65.6 -163 70 -156 71.3 -141 69.6 -128 70 -117 68.5 -108 68 -97 68 -95 67 -87 68 -81 69 -82 64 -90 64 -94 60 -93 57 -87 55.5 -82 55 -80 51.5 -79 55 -77 58 -78 62 -73 62 -69 59 -65 60 -61 56 -56 52.5 -59 48 -64 49 -65 45 -61 45.5 -66 44.5 -70 43.5 -70 41.6 -74 40.5 -76 38 -76 35 -78 34 -81 31.5 -80 27 -80.5 25.2 -82 26.5 -83 29 -85 30 -89 30.3 -94 29.6 -97 27.5 -97.5 24 -97.5 21 -95 18.5 -91 18.5 -90.5 21 -87 21.5 -88 16 -84 15.8 -83.5 11 -81.5 9 -79 9.5 -77.5 8.5 -79 7.5 -80.5 7.3 -83 8.5 -85.7 10 -86 12.5 -88 13.3 -91.5 14 -94 16 -97 15.8 -101 17.3 -105 19.5 -105.5 22 -109 26 -112.8 30 -114.8 31.8 -114.2 30 -112.5 28 -110.5 24.5 -109.9 22.9 -112 24.8 -114.2 27.5 -115.8 30.4 -117.1 32.5 -118.5 34 -120.6 34.6 -121.9 36.6 -122.5 37.8 -124 40.4 -124.3 43 -124 46.2 -124.7 48.4 -123 49 -125 50 -127.5 51 -130 54.5 -133.5 57.5 -137 59 -140.5 59.8 -146 60.5 -149.5 59.8 -152 59.5 -154.5 57.5 -157 58.5 -158 56.5 -162 55 -164.5 54.5 -160 56.5 -157.5 58.7 -161.5 59 -164 60.5 -165.5 62 -164.5 63.2 -161 64.4 -166 64.6",
        "-80 73.5 -68 70.5 -61.5 66.5 -65 62.3 -72 63.5 -77.5 65 -73.5 68 -84 70.5 -89 72.5",
        "-117 73 -105 73 -101 69.5 -109 68.7 -118 69.8",
        "-84.9 21.9 -81 23.1 -77 21.7 -74.2 20.2 -77.5 19.9 -80.5 21.6",
        "-74.4 18.5 -72.8 19.9 -69.9 19.6 -68.4 18.6 -71.5 17.6",
      ]],
      [300, 650, [
        "-77.3 8.4 -75.5 10.5 -72 11.8 -71.3 11 -71.9 10 -71 9 -68 10.6 -64 10.7 -61.5 10.6 -60 8.5 -57 6 -53.5 5.5 -51 4 -50 1.8 -48.5 -0.5 -44.5 -2.5 -41 -3 -38 -4 -35.2 -5.5 -35 -9 -37 -12.5 -39 -15 -39 -18 -40.5 -21 -42 -23 -45 -23.8 -48.5 -26 -48.6 -28.5 -50.5 -31 -53 -33.8 -56 -34.8 -57.5 -36 -57.5 -38.2 -62 -39 -62.5 -41 -65 -41 -64.5 -42.5 -67.5 -46 -66 -48 -69 -51 -68.5 -52.5 -68 -55 -72 -54 -75 -51 -74 -46.5 -73.5 -43 -73.2 -39 -72.5 -35.5 -71.5 -31 -71.4 -27 -70.5 -23 -70.2 -19 -71.5 -17.3 -76 -14 -78.5 -9 -81.2 -6 -80.3 -3.4 -80 -1 -80.5 0.8 -79 1.5 -78 3.5 -77.3 4 -77.5 6.5 -77.9 7.2",
      ]],
      [330, 650, [
        "-58 76 -68 77 -72 78.5 -60 82 -30 83.5 -18 81 -19 76 -22 72.5 -25 70.5 -22 70 -27 68.5 -34 66.5 -40 65 -43 60 -48.5 61 -51 64 -53.5 66.5 -54 70.5 -56 72.5",
        "-24 65.5 -22.5 66.4 -16.5 66.5 -13.5 65.2 -15 64.2 -18.7 63.4 -22.5 63.8",
      ]],
      [470, 700, [
        "32.3 31.3 34.3 31.3 34.9 29.5 34.3 27.8 33.5 28.5 32.6 29.9 33.5 27.5 34.2 26 35.6 23.8 36.9 22 37.3 19 38.6 17.8 39.7 15.5 41.5 13.8 43.3 12.5 44 10.5 46 10.7 48.8 11.3 51.2 11.8 51 10.5 50.5 9 49.5 6.8 47.8 4.5 46 2.2 43.5 -0.5 41.5 -1.8 40 -3.2 39.3 -4.8 38.8 -6.5 39.5 -8.5 40.4 -10.5 40.5 -13 40.7 -15 39.5 -16.8 37 -18 35.3 -21.3 35.5 -23.9 33 -25.5 32.8 -28 31.3 -29.5 30 -31.2 27.5 -33.3 25.6 -34 22.5 -34 20 -34.8 18.4 -34.2 18.3 -32.5 17.3 -30 16.5 -28.6 15.2 -27 14.5 -22.9 13 -20 11.8 -17.3 11.8 -15.8 12.5 -13.5 13.6 -11 12.3 -6.1 11 -3.9 9.4 -1 9.6 2.4 9.7 3.9 8.6 4.5 6.7 4.3 5.2 5.8 4 6.4 1.6 6.2 -1.9 4.8 -4 5.2 -7.5 4.4 -9.3 5.6 -11.5 6.9 -13.2 8.8 -15 11 -16.7 12.4 -17.2 14.7 -16.4 16.2 -16.2 19.5 -16.9 21.3 -15 24.5 -13.3 27.7 -10 29.5 -9.7 32 -6.8 34.1 -5.9 35.8 -2 35.1 0.5 36 3 36.8 7.5 37 10.2 37.2 11 36.8 10.3 33.8 11.5 33.1 15.2 32.3 17 31 19 30.3 20 31.2 20 32.3 23 32.7 25 31.9 29 30.9",
        "49.3 -12 50.5 -15.5 49.8 -17 48.5 -20.5 47.1 -24.9 45.2 -25.5 43.6 -23.5 43.3 -21.7 44.4 -19.5 44 -17 46.3 -15.7 48 -13.6",
        "-5.7 50 -3.4 50.6 1.4 51.2 1.7 52.7 0.2 53.5 -1.6 55.6 -2 57.6 -3.3 58.6 -5 58.6 -6.2 56.6 -5 54.7 -3.2 54.2 -3 53.4 -4.6 53.3 -4.2 52.2 -5.2 51.7 -3.2 51.4 -4.3 51.1",
        "-6 52.2 -6.2 53.9 -5.6 54.6 -7.3 55.3 -8.5 54.4 -10 54.2 -9.6 53 -10.3 51.8 -8.5 51.6",
      ]],
      [520, 1000, [
        "-9.3 36.9 -9.5 38.8 -8.8 42.2 -9.2 43.2 -7.6 43.8 -4 43.5 -1.6 43.4 -1.2 45.8 -2.3 47.2 -4.7 47.9 -4.6 48.6 -1.7 48.7 -1.3 49.7 0.3 49.5 1.6 50.9 3.3 51.4 4.6 52.9 6.8 53.5 8.6 53.9 8.2 55.6 8.2 56.9 10.6 57.7 10.3 56.6 10.8 55.5 10 54.6 11 54 12.5 54.4 14.2 53.9 16.5 54.5 18.6 54.6 19.8 54.4 21.1 55.6 21.1 56.8 22.5 57.7 24.3 57.4 23.4 58.5 24 59.4 28 59.4 30 59.9 28.5 60.5 25 60.2 22.5 60.2 21.4 61 21.5 62.8 24.6 64.1 25.4 65.2 22.7 65.8 21.5 64.8 19.9 63.6 17.5 62.3 17.3 60.7 18.6 59.4 16.6 57.9 16.3 56.6 14.3 55.6 12.9 55.4 12.6 56.2 11.8 57.7 11 59.1 10.6 59.9 10 59 8 58.1 6 58.1 5.3 59.3 5 61 5.3 62.3 7 63 9.5 63.6 11 64.8 13 66.2 14.5 67.6 15.5 68.5 18 69.6 20.5 70.2 23.5 70.7 25.8 71.1 28.5 70.9 31 70.3 33 69.4 36 69.1 40.5 67.8 44 68.5 46 68 53.5 68.6 58 68.9 60 69.8 64 69.3 69 73 73.5 71.6 73.6 68.5 75 72.3 80 72.5 82 73.7 87 74 95 76 104 77.7 113 73.7 120 73 128 72.8 130 71 136 71.6 142 72.7 150 71.5 155 70.9 160 70 170 69.8 176 69.8 181 69 181 65 178 64.5 176 62.5 172 61 170 60 164 59.9 163 57.8 162 56 160 53 156.6 51 156 57 159 61.5 155 59.3 152 59 148 59.3 143 59.3 141.5 57.5 138 54.5 140.5 52 141.2 48 138 46.5 135.4 43.8 133 42.8 131 42.5 129.7 41 129.5 38.5 129.4 36 129 35.1 126.5 34.4 126.4 36.8 126.1 37.7 124.8 39.6 121.7 39 121.6 40.8 119.5 39.9 117.8 39 118.8 37.5 121.5 37.4 122.5 37 120.5 36 119.3 35 120.8 32.4 121.9 31 121.5 29.5 120.4 27.3 119 25.4 117 23.6 114.2 22.3 111 21.5 110.3 20.3 108.8 21.6 106.6 20.5 105.8 19 107 16.7 108.8 15.4 109.3 11.8 107 10.4 105 8.7 104.8 10.2 103 11 100.9 12.6 100 13.4 99.2 10.4 100.3 8.4 101 6.9 103.3 5 103.5 2.6 104.3 1.4 103.5 1.3 101.3 2.8 100.4 5.6 98.3 8.3 98.6 10 97.6 16.5 94.5 16 94.3 18.8 92.4 21 91.8 22.4 90.3 21.9 88.5 21.7 87 21.4 86.4 19.9 84.8 19.2 82.4 17 80.3 15.8 80.2 13 79.8 10.3 78.4 8.9 77.5 8.1 76.4 9.5 75.4 11.8 74.6 14.7 73.4 16.5 72.8 19.1 72.6 21.4 70.4 20.9 68.8 22.3 67.4 23.9 66.6 25.4 61.6 25.2 57.3 25.8 56.5 27 54.7 26.5 51.5 27.9 50.1 30.1 48.9 30.4 48 29.9 48.6 28 50 26.4 50.8 24.8 51.6 24.4 54 24.2 56.3 26.3 56.4 24.9 57.3 23.9 58.8 23.5 59.8 22.4 58.5 20.5 57.7 19 55.4 17.6 52.2 15.6 49.6 14.7 45 12.8 43.5 12.7 42.8 15.3 42.6 16.5 41 19.5 39.1 21.5 38.4 23.8 37 25.9 35.1 28.2 35 29.5 34.5 31.5 34.9 32.8 35.9 35.3 36 36.9 34.6 36.8 32.5 36.1 30.5 36.4 28.2 36.7 27.3 37.4 26.3 38.3 26.6 40.1 29 41.2 31.2 41.1 35 42 38.3 40.9 41.5 41.5 41.6 42.6 39.8 43.5 37.5 44.8 38.6 46.9 35.2 45.3 33.6 44.6 32.6 45.4 33.5 46.1 31.7 46.6 30.3 45.9 29.6 45.3 28.7 44.2 28 43 28 41.9 28.9 41.3 26.2 40.8 24 40.9 22.9 40.6 23.9 38.2 22.5 36.4 21.6 37.3 21.1 38.6 20.2 39.6 19.4 41.8 18.5 42.5 16 43.5 14.5 45.3 13.6 45.7 12.3 45.3 12.5 44.2 14 42.5 16.2 41.4 18.5 40.1 17 39 16.5 38.3 15.6 38 16.1 39.5 15.6 40.1 14.2 40.8 12.4 41.8 10.5 42.9 10 44 8.4 44.2 6.6 43.1 4.6 43.4 3.1 43 3.2 41.9 0.9 41 0.2 39.8 -0.3 38.4 -0.8 37.6 -2.1 36.7 -4.4 36.7 -5.6 36 -6.3 36.8 -7.4 37.2",
        "46.7 44.5 47.5 43 48.6 41.8 49.4 40.2 49 38.4 48.9 37.6 50.3 37.1 51.8 36.7 53.9 36.9 53.9 38.8 53 39.4 53.2 40.7 52.8 41.8 52.5 42.8 51.3 43.2 50.3 44.4 51.4 45.3 53.1 45.3 53.2 46.6 51.2 47.1 49.2 46.4 48.4 46.4",
        "79.8 6.2 80.6 5.9 81.9 7.3 81 9 80 9.8 79.7 8",
        "108.6 19.2 110.4 20.1 111 19.6 110 18.3 108.7 18.5",
      ]],
      [820, 700, [
        "130.2 31.3 131.4 31.5 132 33 133.5 33.4 134.7 33.8 135.8 33.5 136.9 34.3 138.8 34.6 140.9 35.7 140.6 37.5 141.5 38.3 142 39.8 141.5 41.4 140.3 41 140 39.5 139.4 38.2 138.5 37.4 137 36.8 136 35.9 133.1 35.5 131.4 34.4 130.9 33.9 129.7 33.2 130.1 32",
        "140 41.6 141.2 41.8 143.3 42 145.8 43.3 144.3 44.1 141.7 45.4 141.3 43.2 140.2 42.6",
        "120.1 23 120.9 22 121.9 24.9 121.5 25.3 120.5 24.4",
        "95.3 5.5 97.6 5.2 100.5 2.2 104.5 -1.8 106 -3.2 105.8 -5.8 104.5 -5.9 102.3 -4 100.3 -1 98.6 1.8 96 4.2",
        "105.3 -6.8 108.3 -6.2 111 -6.4 114.5 -7.8 114.4 -8.7 110 -8.1 106.5 -7.4",
        "109 1.5 110 -1 111 -3 114.5 -4 116.4 -2.6 117.6 0.5 118.5 1 117.8 2.5 119.2 5.3 117.2 7 116 6 113.9 4.6 111.3 2.6 109.6 2",
        "119.4 -5.4 119.6 0 120.8 1.4 124.8 1.4 121.2 -0.9 123.3 -1 121 -2.7 121.5 -4.7 120.3 -5.6",
        "120.6 18.5 122.2 18.5 122.5 17 121.6 15.8 124 13 123 13.5 120.6 14.3 120 16",
        "122 7 125.5 9.8 126.5 7.3 125.4 5.6 124 6.4 122.2 6.9",
        "131 -1.2 134 -0.8 135.5 -3.3 138 -1.6 141 -2.6 144.5 -3.8 146 -5.6 148 -8 150.5 -10.5 147.5 -10.1 146 -8.2 143.4 -8.2 143 -9.1 141 -9.1 139 -8 138 -8.4 137.6 -5.2 134 -3.9 132 -2.8",
        "113.6 -22 114.2 -26.3 115.1 -30 115 -33.6 116.6 -35 118 -35 120 -34 123.5 -33.9 126 -32.3 129 -31.6 131.3 -31.5 134.2 -32.6 135.6 -34.8 137.8 -33 137.6 -35.6 139.6 -36.5 140.6 -38 143.5 -38.8 146.3 -39.1 148 -37.8 150 -37.5 150.8 -34.8 151.3 -33.8 152.5 -32 153.6 -28.8 153 -25.3 150.8 -22.6 149 -20.6 146.3 -19 145.4 -16.3 145.3 -14.9 143.5 -14 143.5 -12.4 142.5 -10.7 141.6 -12.9 141.5 -15.5 140.6 -17.4 139 -17.1 137.4 -15.7 135.8 -15.1 136.9 -12.3 135.6 -12 132.6 -11.5 131 -12.2 130.1 -13.2 129.6 -14.9 128 -15 126.1 -14.2 124.4 -16.3 122.2 -18 121.1 -19.5 118.8 -20.3 116.7 -20.6 114.7 -21.8",
        "144.6 -40.7 148.3 -40.9 148 -43.2 146.9 -43.6 145.2 -42.3",
        "172.7 -34.4 174.5 -36 175.9 -37.3 178.5 -37.7 177.9 -39.2 176.9 -40.1 175.2 -41.6 174.6 -41.3 175.2 -40 173.8 -39.2 174.6 -37.5",
        "172.7 -40.5 174.3 -41.7 173 -43.7 171.2 -44.5 169.2 -46.6 166.5 -46 166.9 -45.2 168.4 -44 171 -42.5",
      ]],
    ];

    // edge regions: code, lon, lat, label dx, dy, anchor
    const N = [
      ["iad1", -77.45, 38.94, 12, 4, "start"],
      ["bom1", 72.88, 19.08, -12, 4, "end"],
      ["pdx1", -122.68, 45.52, -9, 4, "end"],
      ["sfo1", -122.42, 37.77, -9, 4, "end"],
      ["cle1", -81.69, 41.5, -8, -5, "end"],
      ["gru1", -46.47, -23.43, 9, 4, "start"],
      ["dub1", -6.26, 53.35, -9, -3, "end"],
      ["lhr1", -0.13, 51.5, -9, 11, "end"],
      ["cdg1", 2.35, 48.86, 0, 21, "middle"],
      ["fra1", 8.68, 50.11, 9, 5, "start"],
      ["arn1", 17.92, 59.33, 9, -3, "start"],
      ["cpt1", 18.42, -33.92, 9, 4, "start"],
      ["sin1", 103.82, 1.35, 9, 5, "start"],
      ["hkg1", 114.17, 22.32, 9, 5, "start"],
      ["icn1", 126.71, 37.46, -8, -6, "end"],
      ["kix1", 135.44, 34.43, 0, 20, "middle"],
      ["hnd1", 139.78, 35.55, 9, -4, "start"],
      ["syd1", 151.21, -33.87, -9, 4, "end"],
    ];
    const C = {};
    N.forEach(n => { C[n[0]] = P(n[1], n[2]); });

    // graticule
    let grid = "", gi = 0;
    for (let lon = -150; lon <= 180; lon += 30) {
      const x = P(lon, 0)[0];
      grid += `<path class="gr" pathLength="1" style="--d:${gi++ * 28}" d="M${x},${MY}V${MY + MH}"/>`;
    }
    for (let lat = 60; lat >= -40; lat -= 20) {
      const y = P(0, lat)[1];
      grid += `<path class="gr${lat === 0 ? " eq" : ""}" pathLength="1" style="--d:${120 + gi++ * 22}" d="M${MX},${y}H${MX + MW}"/>`;
    }
    let land = "";
    LAND.forEach(g => { land += `<path class="ld" fill="url(#${id}l)" fill-rule="evenodd" style="--d:${g[0]};--t:${g[1]}" d="${g[2].map(poly).join("")}"/>`; });

    let gl = "";
    [["60°N", MX + 4, P(0, 60)[1] - 4], ["0°", MX + 4, P(0, 0)[1] - 4], ["40°S", MX + 4, P(0, -40)[1] - 4],
     ["120°W", P(-120, 0)[0] + 4, MY + MH - 6], ["60°W", P(-60, 0)[0] + 4, MY + MH - 6], ["0°", P(0, 0)[0] + 4, MY + MH - 6],
     ["60°E", P(60, 0)[0] + 4, MY + MH - 6], ["120°E", P(120, 0)[0] + 4, MY + MH - 6]]
      .forEach((t, i) => { gl += `<text class="gl" style="--d:${300 + i * 45}" x="${r1(t[1])}" y="${r1(t[2])}">${t[0]}</text>`; });

    const b0x = MX - 3, b0y = MY - 3, b1x = MX + MW + 3, b1y = MY + MH + 3, ba = 16;
    const brk = `<path class="br" d="M${b0x},${b0y + ba}V${b0y}H${b0x + ba}M${b1x - ba},${b0y}H${b1x}V${b0y + ba}M${b1x},${b1y - ba}V${b1y}H${b1x - ba}M${b0x + ba},${b1y}H${b0x}V${b1y - ba}"/>`;

    // arcs: quadratic curves bowed "upward" (away from the equator side of the chord)
    const AR = {};
    const dist = (a, b) => Math.hypot(C[a][0] - C[b][0], C[a][1] - C[b][1]);
    const arcD = (a, b) => {
      const A = C[a], B = C[b], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
      let nx = dy / L, ny = -dx / L;
      if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
      const k = L * 0.24;
      const cx = (A[0] + B[0]) / 2 + nx * k, cy = Math.max(12, (A[1] + B[1]) / 2 + ny * k);
      return `M${A[0]},${A[1]}Q${r1(cx)},${r1(cy)} ${B[0]},${B[1]}`;
    };
    let arcs = "";
    N.map(n => n[0]).filter(c => c !== "iad1").sort((a, b) => dist("iad1", a) - dist("iad1", b)).forEach((c, i) => {
      const d = arcD("iad1", c); AR["iad1>" + c] = d;
      arcs += `<path class="ar" pathLength="1" style="--d:${1250 + i * 45}" d="${d}"/>`;
    });
    ["sin1", "hkg1", "fra1", "hnd1", "lhr1", "syd1", "cpt1", "arn1"].sort((a, b) => dist("bom1", a) - dist("bom1", b)).forEach((c, i) => {
      const d = arcD("bom1", c); AR["bom1>" + c] = d;
      arcs += `<path class="ar b" pathLength="1" style="--d:${1470 + i * 62}" d="${d}"/>`;
    });

    // nodes
    let rings = "", cores = "", labels = "";
    N.forEach((n, i) => {
      const c = n[0], x = C[c][0], y = C[c][1], k = i < 2;
      const d = k ? [700, 820][i] : 920 + (i - 2) * 52;
      rings += `<circle class="nr" style="--d:${d}" cx="${x}" cy="${y}" r="${k ? 4.5 : 3}"/>`;
      if (k) rings += `<circle class="ns" style="--d:${d}" cx="${x}" cy="${y}" r="12"/>`;
      cores += `<circle class="nc${k ? " k" : ""}" style="--d:${d}" cx="${x}" cy="${y}" r="${k ? 3.6 : 2.6}"/>`;
      const lx = r1(x + n[3]), ly = r1(y + n[4]);
      labels += `<text class="nl${k ? " k" : ""}" style="--d:${d}" x="${lx}" y="${ly}" text-anchor="${n[5]}">${c}</text>`;
      if (k) labels += `<text class="nl s" style="--d:${d + 120}" x="${lx}" y="${r1(ly + 15)}" text-anchor="${n[5]}">${c === "iad1" ? "functions" : "home"}</text>`;
    });

    // packets (SMIL, started in go())
    let pk = "";
    [["iad1", "lhr1", 1.7], ["hnd1", "iad1", 2.4], ["iad1", "gru1", 1.5], ["bom1", "syd1", 1.8], ["fra1", "bom1", 2.0], ["bom1", "iad1", 2.2]]
      .forEach((p, i) => {
        let d = AR[p[0] + ">" + p[1]], kp = "0;1;1";
        if (!d) { d = AR[p[1] + ">" + p[0]]; kp = "1;0;0"; }
        if (!d) return;
        const t = Math.round((2.38 + i * 0.17) * 100) / 100;
        pk += `<circle class="pk" r="2.3" opacity="0"><animateMotion data-t="${t}" begin="indefinite" dur="${p[2]}s" repeatCount="indefinite" path="${d}" keyPoints="${kp}" keyTimes="0;.72;1" calcMode="spline" keySplines=".45 0 .55 1;0 0 1 1"/><animate data-t="${t}" attributeName="opacity" begin="indefinite" dur="${p[2]}s" repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;.06;.66;.74;1"/></circle>`;
      });
    const hx = `<circle class="hx" cx="0" cy="0" r="3"/>`.repeat(4);
    const scan = `<g clip-path="url(#${id}c)"><g class="sc"><rect x="-70" y="${MY}" width="70" height="${MH}" fill="url(#${id}s)"/><path d="M0,${MY}V${MY + MH}" stroke="#a5f3fc" stroke-width="1.2" stroke-opacity=".9"/></g></g>`;

    const svg = `<svg width="650" height="508" viewBox="0 0 650 508"><defs>` +
      `<pattern id="${id}f" width="7" height="7" x="${MX}" y="${MY}" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r=".75" fill="#94a3b8" fill-opacity=".14"/></pattern>` +
      `<pattern id="${id}l" width="7" height="7" x="${MX}" y="${MY}" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.6" fill="#22d3ee" fill-opacity=".8"/></pattern>` +
      `<linearGradient id="${id}s" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#22d3ee" stop-opacity="0"/><stop offset=".8" stop-color="#22d3ee" stop-opacity=".09"/><stop offset="1" stop-color="#67e8f9" stop-opacity=".3"/></linearGradient>` +
      `<clipPath id="${id}c"><rect x="${MX}" y="${MY}" width="${MW}" height="${MH}"/></clipPath></defs>` +
      `<g clip-path="url(#${id}c)"><rect class="fd" x="${MX}" y="${MY}" width="${MW}" height="${MH}" fill="url(#${id}f)"/>${grid}${land}</g>` +
      gl + brk + arcs + rings + cores + pk + labels + hx + scan + `</svg>`;

    // racks
    const RK = [
      ["R1", "iad1 · fn", ["fn-iad1-01", "fn-iad1-02", "otp.js", "contact.js", "proxy.js", "_mail.js", "fn-iad1-07", "fn-iad1-08"]],
      ["R2", "edge pop", ["edge-bom1", "edge-sin1", "edge-fra1", "edge-lhr1", "edge-hnd1", "edge-sfo1", "edge-gru1", "edge-syd1"]],
      ["R3", "cache·tls", ["cache-01", "cache-02", "cache-03", "tls-term", "h2-mux", "waf-01", "anycast", "log-drain"]],
    ];
    let rk = "";
    RK.forEach((r, ri) => {
      rk += `<div class="rk" style="--d:${140 + ri * 90}"><div class="rkh" data-n="${r[0]}">${r[1]}</div>`;
      r[2].forEach((u, i) => { rk += `<div class="u" style="--d:${380 + i * 75 + ri * 28};--ld:${Math.round(api.rand(16, 72))}">${u}<span class="l"></span></div>`; });
      rk += `</div>`;
    });

    // stats
    const ST = [
      { k: "REGIONS", n: 18, suf: "", t: 1700, c: 1 },
      { k: "CACHE", v: "1y immutable", t: 1820 },
      { k: "TRANSPORT", v: "TLS 1.3 · HTTP/2", t: 1940 },
      { k: "P50 EDGE", n: 31, suf: "ms", t: 2060, c: 1 },
      { k: "HEADERS", v: "nosniff ✓", t: 2180 },
    ];
    let st = `<div class="st"><div class="sh" style="--d:1550">▸ VERCEL.JSON · EDGE CONFIG</div>`;
    ST.forEach(s => { st += `<div class="sr" style="--d:${s.t}"><span class="sk">${s.k}</span><span class="sv${s.c ? " c" : ""}">${s.n != null ? "0" + s.suf : ""}</span></div>`; });
    st += `</div>`;

    body.innerHTML = `<div class="w" style="top:${oy}px">${svg}` +
      `<div class="hd"><span class="ht">◆ EDGE NETWORK</span><span class="hs">anycast 76.76.21.21 · 18 regions</span><span class="ck">LIVE<em>UTC --:--:--.---</em></span></div>` +
      `<div class="rh0"><span class="ht">▣ COMPUTE</span><span class="hs">3 racks · 24u · all green</span></div>` +
      `<div class="rks">${rk}</div>${st}` +
      `<div class="lg"><span class="sw n"></span>edge region<span class="sw"></span>fn route → iad1<span class="sw b"></span>origin → bom1</div>` +
      `<div class="tq"><div></div><div></div><div></div><div></div></div></div>`;

    const svs = body.querySelectorAll(".st .sv");
    body.__rbL0 = {
      pos: C,
      ck: body.querySelector(".ck em"),
      units: Array.from(body.querySelectorAll(".u")),
      lines: Array.from(body.querySelectorAll(".tq div")),
      hx: Array.from(body.querySelectorAll(".hx")),
      smil: Array.from(body.querySelectorAll("[data-t]")),
      stats: ST.map((s, i) => Object.assign({ el: svs[i] }, s)),
      hi: 0,
      flip: false,
    };
  },
  go(body, api) {
    const S = body.__rbL0;
    if (!S) return;
    const pick = a => a[Math.min(a.length - 1, Math.floor(api.rand(0, a.length)))];

    // live UTC clock in the header
    const clock = () => { if (S.ck) S.ck.textContent = "UTC " + new Date().toISOString().slice(11, 23); };
    clock();
    api.every(70, clock);

    // a few key moments get a click
    [700, 1250, 1700, 2380].forEach(t => api.at(t, () => api.tick()));

    // packets start flowing once the arcs are drawn
    S.smil.forEach(a => { try { a.beginElementAt(parseFloat(a.getAttribute("data-t")) || 0); } catch (e) { /* SMIL unsupported */ } });

    // random disk-activity flicker on the rack LEDs
    if (S.units.length) api.every(85, () => { for (let k = 0; k < 3; k++) pick(S.units).classList.toggle("o"); });

    // stats: count-ups and decode-scrambles
    const HEX = "0123456789abcdef";
    const decode = (el, txt, t0, n) => {
      for (let f = 0; f <= n; f++) {
        api.at(t0 + f * 42, () => {
          const keep = Math.floor(txt.length * f / n);
          let s = txt.slice(0, keep);
          for (let i = keep; i < txt.length; i++) s += txt[i] === " " ? " " : pick(HEX);
          el.textContent = s;
        });
      }
    };
    S.stats.forEach(s => {
      if (!s.el) return;
      if (s.n != null) api.at(s.t, () => api.count(s.el, s.n, 720, v => Math.round(v) + s.suf));
      else decode(s.el, s.v, s.t, s.v.length > 12 ? 16 : 12);
    });

    // request ticker + hit flashes on the map
    const hit = code => {
      const p = S.pos[code];
      if (!p || !S.hx.length) return;
      const h = S.hx[S.hi++ % S.hx.length];
      const nx = (h.getAttribute("class") || "").indexOf("ha") > -1 ? "hb" : "ha";
      h.setAttribute("cx", p[0]);
      h.setAttribute("cy", p[1]);
      h.setAttribute("class", "hx " + nx);
    };
    const pops = "bom1 bom1 bom1 bom1 sin1 fra1 lhr1 iad1 sfo1 hnd1 syd1 gru1 cdg1 dub1 hkg1 icn1 arn1 cpt1 kix1 pdx1 cle1".split(" ");
    const files = "/ /index.html /app.js /data.js /sound.js /games.js /extras.js /resume.pdf".split(" ");
    const apis = [["/api/otp", "POST"], ["/api/contact", "POST"], ["/api/proxy", "GET"]];
    const mk = () => {
      const pop = pick(pops);
      if (api.rand(0, 1) < 0.27) {
        const a = pick(apis), lim = a[0] === "/api/proxy" && api.rand(0, 1) < 0.3;
        const ms = lim ? Math.round(api.rand(2, 6)) : Math.round(api.rand(68, 236));
        return { pop, fn: true, s: (lim ? "429" : "200") + "  " + a[1].padEnd(5) + a[0].padEnd(13) + (lim ? "LIMIT " : "MISS  ") + (pop + "→iad1").padEnd(11) + String(ms).padStart(4) + "ms  " + pop + "::iad1::" + api.hex(5) };
      }
      const ms = Math.round(api.rand(5, 29));
      return { pop, fn: false, s: (api.rand(0, 1) < 0.18 ? "304" : "200") + "  GET  " + pick(files).padEnd(13) + "HIT   " + pop.padEnd(11) + String(ms).padStart(4) + "ms  " + pop + "::" + api.hex(5) + "-" + api.hex(4) };
    };
    const push = fx => {
      const L = S.lines;
      if (!L.length) return;
      const r = mk();
      for (let i = 0; i < L.length - 1; i++) L[i].textContent = L[i + 1].textContent;
      const last = L[L.length - 1];
      last.textContent = r.s;
      last.className = (S.flip = !S.flip) ? "fa" : "fb";
      if (fx) { hit(r.pop); if (r.fn && r.pop !== "iad1") hit("iad1"); }
    };
    api.at(1950, () => {
      for (let i = 0; i < 4; i++) push(false);
      api.every(380, () => push(true));
    });
  },
};

  // ---- layer 1 ----
RB_LAYERS[1] = {
  key: "data",
  name: "DATA",
  sub: "Firestore · project resume-41921 · straight from the browser",
  tagline: "Eight collections. Every write checked by the rules.",
  color: "#fbbf24",
  dur: 3600,
  log: [
    "attach firestore · project resume-41921",
    "region nam5 · handshake ok 38ms",
    "mount 8 collections · 6,105 docs",
    "load firestore.rules · validate every field",
    "board, scores: create only · edits denied",
    "stats: increment by 1 max · ok",
    "limits: hmac keys · zero addresses stored",
    "subscribe 3 realtime listeners",
    "snapshot in sync ✓",
  ],
  css: `
.rb-L1 .cd{position:absolute;box-sizing:border-box;font-family:var(--rb-mono);color:#e2e8f0;opacity:0;
  background:
    linear-gradient(var(--c),var(--c)) 0 0/12px 2px no-repeat,
    linear-gradient(var(--c),var(--c)) 0 0/2px 12px no-repeat,
    linear-gradient(var(--c),var(--c)) 100% 100%/12px 2px no-repeat,
    linear-gradient(var(--c),var(--c)) 100% 100%/2px 12px no-repeat,
    linear-gradient(180deg,rgba(251,191,36,.12),rgba(251,191,36,.035) 34px,rgba(15,23,42,.62) 34px,rgba(2,6,23,.7));
  box-shadow:0 0 26px rgba(251,191,36,.07),inset 0 0 22px rgba(251,191,36,.035)}
.rb-L1 .cd::before{content:"";position:absolute;left:0;top:0;right:0;bottom:0;border-top:1px solid rgba(251,191,36,.8);border-bottom:1px solid rgba(251,191,36,.3);transform:scaleX(0);transform-origin:0 50%;pointer-events:none}
.rb-L1 .cd::after{content:"";position:absolute;left:0;top:0;right:0;bottom:0;border-left:1px solid rgba(251,191,36,.3);border-right:1px solid rgba(251,191,36,.3);transform:scaleY(0);transform-origin:50% 0;pointer-events:none}
.rb-L1.rb-go .cd{animation:rbL1card .55s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(var(--d) * 1ms)}
.rb-L1.rb-go .cd::before{animation:rbL1sx .5s cubic-bezier(.6,0,.2,1) both;animation-delay:calc(var(--d) * 1ms + 60ms)}
.rb-L1.rb-go .cd::after{animation:rbL1sy .4s cubic-bezier(.6,0,.2,1) both;animation-delay:calc(var(--d) * 1ms + 280ms)}

.rb-L1 .bm{position:absolute;left:0;top:-1px;width:70px;height:2px;background:linear-gradient(90deg,transparent,var(--c),transparent);box-shadow:0 0 8px rgba(251,191,36,.6);opacity:0;pointer-events:none}
.rb-L1 .bm.on{animation:rbL1beam .8s cubic-bezier(.3,0,.2,1)}

.rb-L1 .hd{position:absolute;left:10px;right:10px;top:0;height:34px;display:flex;align-items:center;gap:7px;white-space:nowrap}
.rb-L1 .gl{color:var(--c);font-size:14px;opacity:0}
.rb-L1 .nm{font-size:15px;font-weight:600;letter-spacing:.02em;opacity:0}
.rb-L1 .lv{width:6px;height:6px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c);opacity:0}
.rb-L1 .ct{margin-left:auto;font-size:14px;color:var(--c);opacity:0;transform-origin:100% 50%;font-variant-numeric:tabular-nums}
.rb-L1 .ct::before{content:attr(data-p);color:#64748b;font-size:12px}
.rb-L1 .ct::after{content:attr(data-u);color:#64748b;font-size:12px}
.rb-L1.rb-go .gl{animation:rbL1pop .45s cubic-bezier(.2,1.6,.4,1) both;animation-delay:calc(var(--d) * 1ms + 260ms)}
.rb-L1.rb-go .nm{animation:rbL1slide .4s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(var(--d) * 1ms + 320ms)}
.rb-L1.rb-go .lv{animation:rbL1pulse 1.4s ease-in-out infinite both;animation-delay:calc(var(--d) * 1ms + 420ms)}
.rb-L1.rb-go .ct{animation:rbL1fade .3s both;animation-delay:calc(var(--d) * 1ms + 360ms)}
.rb-L1.rb-go .ct.bp{animation:rbL1fade .01s both,rbL1bump .5s ease-out}

.rb-L1 .sc{position:absolute;left:10px;right:10px;top:36px;height:22px;display:flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8;white-space:nowrap;border-bottom:1px dashed rgba(148,163,184,.2);opacity:0}
.rb-L1 .pl{margin-left:auto;border:1px solid rgba(251,191,36,.5);color:var(--c);padding:0 5px;border-radius:3px;line-height:15px}
.rb-L1.rb-go .sc{animation:rbL1slide .4s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(var(--d) * 1ms + 420ms)}

.rb-L1 .ls{position:absolute;left:6px;right:6px;top:62px;overflow:hidden}
.rb-L1 .li{transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.rb-L1 .r{position:relative;z-index:0;box-sizing:border-box;height:var(--rh);line-height:calc(var(--rh) - 1px);padding:0 4px;font-size:12px;color:#94a3b8;white-space:pre;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid rgba(148,163,184,.08);opacity:0}
.rb-L1 .r b{display:inline-block;width:9ch;font-weight:400;color:var(--c);opacity:.82}
.rb-L1 .r.hot{color:#e2e8f0}
.rb-L1 .r::before{content:"";position:absolute;z-index:-1;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,rgba(251,191,36,.3),rgba(251,191,36,.06) 70%,transparent);opacity:0;pointer-events:none}
.rb-L1.rb-go .r{animation:rbL1row .38s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(var(--d) * 1ms)}
.rb-L1.rb-go .r::before{animation:rbL1fl .9s ease-out both;animation-delay:calc(var(--d) * 1ms)}
.rb-L1.rb-go .r.nw::before{animation:rbL1fl2 1.7s ease-out both;box-shadow:inset 2px 0 0 var(--c)}
.rb-L1.rb-go .r.fl::before{animation:rbL1fl2 1.4s ease-out both;box-shadow:inset 2px 0 0 var(--c)}

.rb-L1 .st{position:absolute;left:10px;right:10px;bottom:0;height:24px;line-height:24px;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;border-top:1px solid rgba(148,163,184,.12);opacity:0}
.rb-L1 .st::before{content:"✓ ";color:var(--c)}
.rb-L1.rb-go .st{animation:rbL1fade .4s both;animation-delay:calc(var(--d) * 1ms + 1300ms)}

.rb-L1 .sw{position:absolute;left:0;width:140px;opacity:0;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(251,191,36,.06) 70%,rgba(251,191,36,.26) 97%,transparent)}
.rb-L1.rb-go .sw{opacity:1;animation:rbL1sw 6s cubic-bezier(.45,0,.3,1) .1s infinite both}

.rb-L1 .ft{position:absolute;height:30px;box-sizing:border-box;padding:0 10px;display:flex;align-items:center;gap:14px;font-family:var(--rb-mono);font-size:13px;letter-spacing:.03em;color:#94a3b8;white-space:nowrap;background:linear-gradient(90deg,rgba(251,191,36,.08),rgba(251,191,36,0) 60%);opacity:0}
.rb-L1 .ft::before{content:"";position:absolute;left:0;right:0;top:0;border-top:1px solid rgba(251,191,36,.5);transform:scaleX(0);transform-origin:0 50%}
.rb-L1 .lvb{display:flex;align-items:center;gap:6px;color:var(--c);font-weight:700;letter-spacing:.14em;border:1px solid rgba(251,191,36,.55);border-radius:3px;padding:0 6px 0 5px;line-height:18px}
.rb-L1 .lvb::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c)}
.rb-L1 .fr{margin-left:auto;color:#64748b}
.rb-L1 .fr b{font-weight:400;color:#e2e8f0}
.rb-L1.rb-go .ft{animation:rbL1fade .5s both;animation-delay:1780ms}
.rb-L1.rb-go .ft::before{animation:rbL1sx .7s cubic-bezier(.6,0,.2,1) both;animation-delay:1700ms}
.rb-L1.rb-go .lvb::before{animation:rbL1blink 1s linear infinite}

@keyframes rbL1card{0%{opacity:0;transform:translateY(18px) scale(.96)}60%{opacity:1}100%{opacity:1;transform:none}}
@keyframes rbL1sx{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
@keyframes rbL1sy{0%{transform:scaleY(0)}100%{transform:scaleY(1)}}
@keyframes rbL1pop{0%{opacity:0;transform:scale(.2) rotate(-90deg)}100%{opacity:1;transform:none}}
@keyframes rbL1slide{0%{opacity:0;transform:translateX(-12px)}100%{opacity:1;transform:none}}
@keyframes rbL1fade{0%{opacity:0}100%{opacity:1}}
@keyframes rbL1bump{0%{transform:scale(1.28)}100%{transform:none}}
@keyframes rbL1pulse{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes rbL1blink{0%,55%{opacity:1}56%,100%{opacity:.15}}
@keyframes rbL1row{0%{opacity:0;transform:translateX(-10px)}100%{opacity:1;transform:none}}
@keyframes rbL1fl{0%{opacity:0}18%{opacity:1}100%{opacity:0}}
@keyframes rbL1fl2{0%{opacity:1}35%{opacity:.85}100%{opacity:0}}
@keyframes rbL1beam{0%{opacity:0;transform:translateX(0)}15%{opacity:1}100%{opacity:0;transform:translateX(165px)}}
@keyframes rbL1sw{0%{transform:translateX(-160px)}32%{transform:translateX(1010px)}100%{transform:translateX(1010px)}}
`,
  build(body, api) {
    const W = api.W || 1000, BH = api.BH || 508;
    const CW = 235, G = 10, X0 = Math.round((W - (4 * CW + 3 * G)) / 2);
    const H = Math.max(196, Math.min(252, Math.floor((BH - 84) / 2)));
    const RH = Math.max(22, Math.min(30, Math.floor((H - 88) / 5)));
    const Y0 = Math.max(4, Math.round((BH - (2 * H + G + 42)) / 2));
    const day = o => {
      const t = new Date(Date.now() + o * 864e5);
      return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    };
    const md = o => day(o).slice(5);
    const stat = (d, v, u) => d + "  " + String(v).padStart(3) + " · " + u;
    const sco = (g, s) => g.padEnd(9) + s.padStart(7);
    const pic = (n, s) => n.padEnd(13) + s;
    const limKey = api.hex(4);
    const C = [
      { k: "board", n: 1284, pl: "add-only", sc: "{to, from, text, at}", st: "ok 11ms · orderBy at desc", live: 1,
        rows: ['riya → MK "hire him!"', 'jay → MK "gg pinball"', 'ana → MK "love the xp"', 'sam → riya "agreed"', 'kai → MK "so retro"'] },
      { k: "scores", n: 3912, pl: "add-only", sc: "{game, score, at}", st: "ok 9ms · top 10 per game", live: 1,
        rows: [sco("pinball", "48,210"), sco("bricks", "9,620"), sco("spider", "1,270"), sco("snake", "312"), sco("mines", "41s")] },
      { k: "stats", n: 368, pl: "+1 max", sc: "{day, views, uniq}", st: "ok 7ms · last 30 days",
        rows: [stat(day(0), 412, 97), stat(day(-1), 538, 121), stat(day(-2), 476, 104), stat(day(-3), 391, 88), stat(day(-4), 455, 112)] },
      { k: "tasks", n: 186, pl: "calendar", sc: "{date, title, done}", st: "ok 12ms · orderBy date asc",
        rows: [md(-2) + " [x] fix proxy", md(0) + " [x] ship rebuild", md(1) + " [ ] dsa mock", md(2) + " [ ] kaggle sub", md(5) + " [ ] gym 7am"] },
      { k: "pictures", n: 64, pl: "add / delete", sc: "{name, w, h}", st: "ok 16ms · orderBy at desc",
        rows: [pic("bliss.jpg", "800×600"), pic("desk.png", "1280×720"), pic("paint_01.png", "640×480"), pic("cat.jpg", "1024×768"), pic("sunset.jpg", "1920×1080")] },
      { k: "shared/notepad", n: 412, p: "rev ", u: "", pl: "anyone edits", sc: "{text, rev}", st: "ok 4ms · one doc · live", live: 1, rev: 1,
        rows: ['"hi from pune :)"', '"todo: dsa, gym"', '"who wrote this?"', '"lorem ipsum dolor"', '"MK was here"'] },
      { k: "otp", n: 57, pl: "attempts", sc: "{hash, tries, exp}", st: "ok 8ms · ttl 10m · api only",
        rows: [[1, 9], [2, 6], [1, 4], [3, 2], [1, 1]].map(a => api.hex(4) + "… tries:" + a[0] + " exp:" + a[1] + "m") },
      { k: "limits", n: 233, pl: "keyed hashes", sc: "{key, n, win}", st: "ok 6ms · no addresses stored",
        rows: [[3, "10m"], [1, "1h"], [5, "10m"], [2, "1m"], [1, "10m"]].map((a, i) => "hmac:" + (i ? api.hex(4) : limKey) + "… n:" + a[0] + " win:" + a[1]) },
    ];
    const mk = (id, pv, d) => {
      const r = document.createElement("div");
      r.className = "r";
      r.style.setProperty("--d", String(d));
      const b = document.createElement("b");
      b.textContent = id;
      r.appendChild(b);
      r.appendChild(document.createTextNode(pv));
      return r;
    };
    body.style.setProperty("--rh", RH + "px");
    const S = { rh: RH, cards: [], live: [], mk, stat };
    C.forEach((c, i) => {
      const col = i % 4, row = (i / 4) | 0;
      const d = 100 + col * 130 + row * 70;
      const cd = document.createElement("div");
      cd.className = "cd";
      cd.style.cssText = "left:" + (X0 + col * (CW + G)) + "px;top:" + (Y0 + row * (H + G)) + "px;width:" + CW + "px;height:" + H + "px;--d:" + d;
      cd.innerHTML = '<i class="bm"></i><div class="hd"><span class="gl">▣</span><span class="nm"></span>' +
        (c.live ? '<span class="lv"></span>' : "") +
        '<span class="ct">0</span></div><div class="sc"><span class="pl"></span></div><div class="ls"><div class="li"></div></div><div class="st"></div>';
      const nm = cd.querySelector(".nm");
      nm.textContent = c.k;
      if (c.k.length > 10) nm.style.fontSize = "14px";
      const ct = cd.querySelector(".ct");
      ct.setAttribute("data-p", c.p || "");
      ct.setAttribute("data-u", c.u === undefined ? " docs" : c.u);
      const scEl = cd.querySelector(".sc"), pl = cd.querySelector(".pl");
      scEl.insertBefore(document.createTextNode(c.sc), pl);
      pl.textContent = c.pl;
      cd.querySelector(".st").textContent = c.st;
      cd.querySelector(".ls").style.height = 5 * RH + "px";
      const li = cd.querySelector(".li");
      c.rows.forEach((pv, j) => li.appendChild(mk(c.rev ? "rev " + (c.n - j) : api.hex(8), pv, d + 560 + j * 170)));
      const st = { k: c.k, n: c.n, cur: c.n, rev: !!c.rev, d, ct, li, bm: cd.querySelector(".bm") };
      S.cards.push(st);
      if (c.live) S.live.push(st);
      if (c.k === "stats") S.day = { row: li.firstChild, d: day(0), v: 412, u: 97 };
      if (c.k === "limits") S.lim = { row: li.firstChild, key: limKey, n: 3 };
      body.appendChild(cd);
    });
    const sw = document.createElement("div");
    sw.className = "sw";
    sw.style.top = Y0 + "px";
    sw.style.height = 2 * H + G + "px";
    body.appendChild(sw);
    const ft = document.createElement("div");
    ft.className = "ft";
    ft.style.cssText = "left:" + X0 + "px;width:" + (4 * CW + 3 * G) + "px;top:" + (Y0 + 2 * H + G + 12) + "px";
    ft.innerHTML = '<span class="lvb">LIVE</span><span>firestore · nam5 · realtime listeners 3 · writes validated by rules</span><span class="fr">reads <b>0</b> · resume-41921</span>';
    body.appendChild(ft);
    S.rd = ft.querySelector(".fr b");
    S.reads = 1942;
    S.rcur = 1942;
    body._L1 = S;
  },
  go(body, api) {
    const S = body._L1;
    if (!S) return;
    const fmt = n => Math.round(n).toLocaleString("en-US");
    const re = (el, cl) => { el.classList.remove(cl); void el.offsetWidth; el.classList.add(cl); };
    const pick = a => a[(Math.random() * a.length) | 0];

    api.at(120, () => api.tick());
    S.cards.forEach(c => api.at(c.d + 380, () => api.count(c.ct, c.n, 1500, fmt)));
    api.at(1000, () => api.tick());
    api.at(1760, () => { api.tick(); api.count(S.rd, S.reads, 1200, fmt); });

    const dayUp = () => {
      const s = S.day;
      s.v++;
      if (Math.random() < 0.45) s.u++;
      s.row.lastChild.nodeValue = S.stat(s.d, s.v, s.u);
      re(s.row, "fl");
    };
    const limUp = () => {
      const l = S.lim;
      l.n = (l.n % 5) + 1;
      l.row.lastChild.nodeValue = "hmac:" + l.key + "… n:" + l.n + " win:10m";
      re(l.row, "fl");
    };
    api.at(2450, dayUp);

    const who = ["ana", "jay", "riya", "sam", "kai", "neha", "leo", "zoe", "arjun", "mia", "dev"];
    const to = ["ana", "jay", "sam", "kai", "leo", "zoe", "mia"];
    const msg = ["gg!", "nice xp", "hire him", "so retro", "10/10", "hi o/", "clean ui", "love it", "pinball!", "wow", "rad", "hello"];
    const games = [["pinball", 12000, 92000], ["bricks", 1500, 16000], ["snake", 60, 640], ["spider", 300, 2400], ["solitaire", 400, 5200]];
    const notes = ['"hello from pune"', '"todo: ship v3"', '"who is typing?"', '"hi MK!"', '"test test 123"', '"brb"', '"nice notepad"', '"lorem ipsum"', '":wq"'];
    const gen = {
      board: () => {
        const f = pick(who);
        return f + " → " + (Math.random() < 0.8 ? "MK" : pick(to.filter(x => x !== f))) + ' "' + pick(msg) + '"';
      },
      scores: () => {
        const g = pick(games);
        return g[0].padEnd(9) + Math.round(api.rand(g[1], g[2])).toLocaleString("en-US").padStart(7);
      },
      "shared/notepad": () => pick(notes),
    };
    const push = c => {
      c.cur++;
      const r = S.mk(c.rev ? "rev " + c.cur : api.hex(8), gen[c.k](), 0);
      r.classList.add("nw", "hot");
      const li = c.li;
      while (li.children.length > 5) li.removeChild(li.lastChild);
      const was = li.querySelector(".hot");
      if (was) was.classList.remove("hot");
      li.insertBefore(r, li.firstChild);
      li.style.transition = "none";
      li.style.transform = "translateY(" + -S.rh + "px)";
      void li.offsetWidth;
      li.style.transition = "";
      li.style.transform = "translateY(0px)";
      api.at(620, () => { while (li.children.length > 5) li.removeChild(li.lastChild); });
      c.ct.textContent = fmt(c.cur);
      re(c.ct, "bp");
      re(c.bm, "on");
      S.rcur += 1 + ((Math.random() * 4) | 0);
      S.rd.textContent = fmt(S.rcur);
    };

    let k = 0, last = -1, first = true;
    api.every(900, () => {
      k++;
      if (k < 3) return;
      if (k % 6 === 0) { dayUp(); return; }
      if (k % 7 === 0) { limUp(); return; }
      if (Math.random() < 0.18) return;
      let i = (Math.random() * S.live.length) | 0;
      if (i === last) i = (i + 1) % S.live.length;
      last = i;
      push(S.live[i]);
      if (first) { first = false; api.tick(); }
    });
  },
};

  // ---- layer 2 ----
RB_LAYERS[2] = {
  key: "security",
  name: "SECURITY",
  sub: "firestore.rules \u00b7 vercel.json headers \u00b7 sandboxed proxy",
  tagline: "No backend to hide behind. Every write proves itself.",
  color: "#a78bfa",
  dur: 3600,
  log: [
    "compiling firestore.rules (rules_version 2)",
    "default policy: deny every unmatched path",
    "board, scores: create-only, no update/delete",
    "stats: counters may only move by +1",
    "limits, otp: keyed SHA-256 ids, no addresses",
    "headers: nosniff, strict-origin referrer",
    "permissions-policy: camera, mic, geo off",
    "proxy: cookies stripped, logins refused",
    "ruleset deployed \u00b7 0 warnings",
  ],
  css: `
.rb-L2 .w{position:absolute;left:0;width:1000px;height:508px}
.rb-L2 .w *{box-sizing:border-box}
@keyframes rbL2fade{from{opacity:0}to{opacity:1}}
@keyframes rbL2rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes rbL2out{to{opacity:0}}
@keyframes rbL2grow{from{transform:scaleY(0)}to{transform:none}}
@keyframes rbL2spin{to{transform:rotate(360deg)}}
@keyframes rbL2spinR{to{transform:rotate(-360deg)}}

.rb-L2 .ed{position:absolute;left:24px;top:14px;width:556px;height:440px;border:1px solid rgba(167,139,250,.32);border-radius:6px;background:rgba(2,6,23,.62);box-shadow:0 0 0 1px rgba(167,139,250,.06),0 0 30px rgba(167,139,250,.15),inset 0 0 40px rgba(167,139,250,.05);opacity:0}
.rb-L2.rb-go .ed{animation:rbL2rise .55s cubic-bezier(.2,.8,.2,1) both}
.rb-L2 .ed::before,.rb-L2 .ed::after{content:'';position:absolute;width:14px;height:14px;border:0 solid var(--c)}
.rb-L2 .ed::before{left:-6px;top:-6px;border-left-width:2px;border-top-width:2px}
.rb-L2 .ed::after{right:-6px;bottom:-6px;border-right-width:2px;border-bottom-width:2px}

.rb-L2 .tb{position:absolute;left:0;right:0;top:0;height:31px;display:flex;align-items:stretch;border-bottom:1px solid #1e293b;background:rgba(15,23,42,.75);border-radius:6px 6px 0 0;font:12px var(--rb-mono);color:#64748b;white-space:nowrap;overflow:hidden}
.rb-L2 .tab{display:flex;align-items:center;gap:8px;padding:0 14px;border-right:1px solid #1e293b;font-size:13px}
.rb-L2 .tab i{font-style:normal;font-size:12px}
.rb-L2 .tab.on{color:#e2e8f0;background:rgba(2,6,23,.8);box-shadow:inset 0 2px 0 var(--c)}
.rb-L2 .ti{color:var(--c)}
.rb-L2 .dot{color:#94a3b8}
.rb-L2.rb-go .dot{animation:rbL2out .3s 2880ms forwards}
.rb-L2 .pj{margin-left:auto;padding:0 12px;display:flex;align-items:center;letter-spacing:.05em}

.rb-L2 .code{position:absolute;left:0;right:0;top:31px;height:380px;overflow:hidden;padding-top:9px;counter-reset:rbl2n;background:linear-gradient(90deg,rgba(15,23,42,.55) 0,rgba(15,23,42,.55) 40px,rgba(51,65,85,.75) 40px,rgba(51,65,85,.75) 41px,transparent 41px)}
.rb-L2 .hlb{position:absolute;left:41px;right:0;top:9px;height:19px;background:linear-gradient(90deg,rgba(167,139,250,.16),rgba(167,139,250,.03));box-shadow:inset 2px 0 0 var(--c);opacity:0;transition:transform .09s ease-out,opacity .2s}
.rb-L2 .ln{position:relative;height:19px;font:14px/19px var(--rb-mono);color:#cbd5e1;white-space:pre;padding-left:calc(52px + var(--i) * 2ch);counter-increment:rbl2n}
.rb-L2 .ln::before{content:counter(rbl2n);position:absolute;left:0;top:0;width:34px;text-align:right;font-size:12px;color:#475569;opacity:0}
.rb-L2.rb-go .ln::before{animation:rbL2fade .15s calc(var(--d) * 1ms) both}
.rb-L2 .ln.cur::before{color:var(--c)}
.rb-L2 .ln.ok::after{content:'\u2713';position:absolute;left:5px;top:0;font-size:12px;color:#86efac;opacity:0}
.rb-L2.rb-go .ln.ok::after{animation:rbL2pop2 .3s cubic-bezier(.2,1.6,.4,1) calc(var(--k) * 1ms) both}
@keyframes rbL2pop2{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:none}}
.rb-L2 .cl{position:relative;display:inline-block;vertical-align:top;overflow:hidden;white-space:pre;width:0;height:19px}
.rb-L2.rb-go .cl{width:calc(var(--n) * 1ch + 4px);animation:rbL2type calc(var(--t) * 1ms) steps(8,start) calc(var(--d) * 1ms) both}
@keyframes rbL2type{from{width:0}}
.rb-L2 .cl::after{content:'';position:absolute;right:1px;top:2px;width:2px;height:15px;background:var(--c);box-shadow:0 0 6px var(--c);opacity:0}
.rb-L2.rb-go .cl::after{animation:rbL2car calc((var(--t) + 18) * 1ms) linear calc(var(--d) * 1ms) forwards}
.rb-L2.rb-go .ln.last .cl::after{animation:rbL2car calc(var(--t) * 1ms) linear calc(var(--d) * 1ms) forwards,rbL2blink 1.05s linear calc((var(--d) + var(--t)) * 1ms) infinite}
@keyframes rbL2car{0%,99%{opacity:1}100%{opacity:0}}
@keyframes rbL2blink{0%,49%{opacity:1}50%,100%{opacity:0}}
.rb-L2 .xk{color:var(--c)}
.rb-L2 .xs{color:#86efac}
.rb-L2 .xf{color:#67e8f9}
.rb-L2 .xc{color:#64748b;font-style:italic}
.rb-L2 .xo{color:#f9a8d4}
.rb-L2 .xp{color:#e2e8f0}
.rb-L2 .xw{color:#fcd34d}
.rb-L2 .xn{color:#fdba74}
.rb-L2 .csn{position:absolute;left:41px;right:0;top:9px;height:2px;background:var(--c);box-shadow:0 0 12px 2px rgba(167,139,250,.65);opacity:0}
.rb-L2.rb-go .csn{animation:rbL2csn .42s ease-in 2470ms forwards}
@keyframes rbL2csn{0%{opacity:1;transform:translateY(0)}90%{opacity:1}100%{opacity:0;transform:translateY(361px)}}
.rb-L2 .swp{position:absolute;top:-20px;bottom:-20px;left:0;width:150px;background:linear-gradient(90deg,transparent,rgba(167,139,250,.15) 36%,rgba(237,233,254,.17) 50%,rgba(167,139,250,.15) 64%,transparent);opacity:0;transform:translateX(-200px) skewX(-16deg)}
.rb-L2.rb-go .swp{animation:rbL2swp 3.8s ease-in-out 3000ms infinite}
@keyframes rbL2swp{0%{opacity:1;transform:translateX(-200px) skewX(-16deg)}55%,100%{opacity:1;transform:translateX(640px) skewX(-16deg)}}

.rb-L2 .sb{position:absolute;left:0;right:0;bottom:0;height:28px;border-top:1px solid #1e293b;background:rgba(15,23,42,.75);display:flex;align-items:center;gap:16px;padding:0 12px;font:12px var(--rb-mono);color:#64748b;border-radius:0 0 6px 6px;white-space:nowrap;overflow:hidden}
.rb-L2 .md{color:var(--c);letter-spacing:.08em}
.rb-L2 .pos{color:#94a3b8;min-width:96px}
.rb-L2 .okc{margin-left:auto;color:#86efac;opacity:0}
.rb-L2.rb-go .okc{animation:rbL2rise .4s ease-out 2900ms both}

.rb-L2 .tkr{position:absolute;left:24px;top:466px;width:556px;height:28px;display:flex;border:1px solid rgba(167,139,250,.25);border-radius:4px;background:rgba(15,23,42,.55);overflow:hidden;opacity:0}
.rb-L2.rb-go .tkr{animation:rbL2rise .45s ease-out 2150ms both}
.rb-L2 .tl{flex:none;padding:0 10px;font:12px/26px var(--rb-mono);letter-spacing:.12em;color:var(--c);background:rgba(167,139,250,.12);border-right:1px solid rgba(167,139,250,.3)}
.rb-L2 .tw{position:relative;flex:1;overflow:hidden}
.rb-L2 .tw::after{content:'';position:absolute;right:0;top:0;bottom:0;width:60px;background:linear-gradient(90deg,transparent,rgba(2,6,23,.95))}
.rb-L2 .tt{position:absolute;left:0;top:0;white-space:pre;font:12px/26px var(--rb-mono);color:#94a3b8}
.rb-L2.rb-go .tt{animation:rbL2tkr 36s linear 2150ms infinite}
@keyframes rbL2tkr{to{transform:translateX(-50%)}}
.rb-L2 .hk{color:#c4b5fd}

.rb-L2 .dv{position:absolute;left:596px;top:14px;width:1px;height:480px;background:linear-gradient(180deg,transparent,rgba(167,139,250,.5),transparent);transform:scaleY(0)}
.rb-L2.rb-go .dv{animation:rbL2grow .9s ease-out 100ms both}

.rb-L2 .sh{position:absolute;left:608px;top:16px;overflow:visible}
.rb-L2 .sh *{transform-box:fill-box;transform-origin:center}
.rb-L2 .sh text{font:12px var(--rb-mono);fill:#64748b}
.rb-L2 .sh .lt{fill:var(--c);letter-spacing:1.5px}
.rb-L2 .sh .lr{fill:#94a3b8}
.rb-L2 .sh .stt.on{fill:var(--c)}
.rb-L2 .sh .lbl{opacity:0}
.rb-L2.rb-go .sh .lbl{animation:rbL2fade .5s 250ms both}
.rb-L2 .tk{fill:none;stroke:#475569;stroke-width:5;stroke-dasharray:1 9.82;opacity:0}
.rb-L2 .tk2{fill:none;stroke:var(--c);stroke-width:9;stroke-dasharray:2 62.93;stroke-dashoffset:1;opacity:0}
.rb-L2.rb-go .tk{animation:rbL2ring .9s cubic-bezier(.2,.8,.2,1) 80ms both}
.rb-L2.rb-go .tk2{animation:rbL2ring2 .9s cubic-bezier(.2,.8,.2,1) 260ms both}
@keyframes rbL2ring{from{opacity:0;transform:rotate(-50deg) scale(.9)}to{opacity:.8;transform:none}}
@keyframes rbL2ring2{from{opacity:0;transform:rotate(40deg) scale(.9)}to{opacity:.6;transform:none}}
.rb-L2 .rg{fill:none;stroke:rgba(167,139,250,.28);stroke-width:1;opacity:0}
.rb-L2.rb-go .rg{animation:rbL2fade .6s 150ms both}
.rb-L2 .cx{fill:none;stroke:#94a3b8;stroke-width:1;opacity:0}
.rb-L2.rb-go .cx{animation:rbL2fade .5s 320ms both}
.rb-L2 .sw{fill:none;stroke:var(--c);stroke-width:2.6;stroke-dasharray:12 88;stroke-linecap:round;opacity:0}
.rb-L2 .sw2{fill:none;stroke:var(--c);stroke-width:2;stroke-dasharray:26 74;stroke-dashoffset:14;opacity:0}
.rb-L2.rb-go .sw{animation:rbL2fade .4s 200ms both,rbL2spin 2.2s linear 200ms infinite}
.rb-L2.rb-go .sw2{animation:rbL2fadeQ .4s 200ms both,rbL2spin 2.2s linear 200ms infinite}
@keyframes rbL2fadeQ{from{opacity:0}to{opacity:.28}}
.rb-L2 .dr{fill:none;stroke:var(--c);stroke-width:1.2;stroke-dasharray:6 5;opacity:0}
.rb-L2.rb-go .dr{animation:rbL2fadeH .8s 2600ms both,rbL2spinR 40s linear 2600ms infinite}
@keyframes rbL2fadeH{from{opacity:0}to{opacity:.5}}
.rb-L2 .pl{fill:none;stroke:var(--c);stroke-width:1.2;opacity:0}
.rb-L2.rb-go .pl{animation:rbL2pulse 2.6s ease-out calc(var(--d) * 1ms) infinite}
@keyframes rbL2pulse{0%{opacity:.75;transform:scale(.85)}100%{opacity:0;transform:scale(1.42)}}
.rb-L2 .sf{fill:var(--c);opacity:0}
.rb-L2.rb-go .sf{animation:rbL2sf 1.1s ease-out 1360ms both}
@keyframes rbL2sf{0%{opacity:0}25%{opacity:.34}100%{opacity:.08}}
.rb-L2 .scb{opacity:0}
.rb-L2.rb-go .scb{animation:rbL2scan 2.1s linear 300ms infinite}
@keyframes rbL2scan{0%{opacity:0;transform:translateY(0)}12%,88%{opacity:1}100%{opacity:0;transform:translateY(178px)}}
.rb-L2 .sg{fill:none;stroke:var(--c);stroke-width:9;stroke-linejoin:round;opacity:0}
.rb-L2.rb-go .sg{animation:rbL2breathe 2.4s ease-in-out 1360ms infinite alternate}
@keyframes rbL2breathe{from{opacity:.24}to{opacity:.07}}
.rb-L2 .so{fill:none;stroke:var(--c);stroke-width:2.2;stroke-linejoin:round;stroke-dasharray:100;stroke-dashoffset:100}
.rb-L2.rb-go .so{animation:rbL2draw .95s cubic-bezier(.6,0,.3,1) 220ms both}
.rb-L2 .si{fill:none;stroke:#c4b5fd;stroke-width:1;stroke-linejoin:round;opacity:.55;stroke-dasharray:100;stroke-dashoffset:100}
.rb-L2.rb-go .si{animation:rbL2draw .85s cubic-bezier(.6,0,.3,1) 480ms both}
@keyframes rbL2draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
.rb-L2 .fl{fill:none;stroke:#ede9fe;stroke-width:2;opacity:0}
.rb-L2.rb-go .fl{animation:rbL2flash .7s ease-out 1380ms forwards}
@keyframes rbL2flash{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(2.8)}}
.rb-L2 .lb{fill:rgba(167,139,250,.16);stroke:var(--c);stroke-width:1.8;opacity:0}
.rb-L2.rb-go .lb{animation:rbL2pop .45s cubic-bezier(.2,1.5,.4,1) 950ms both}
@keyframes rbL2pop{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
.rb-L2 .ls{fill:none;stroke:var(--c);stroke-width:3.4;stroke-linecap:round;opacity:0}
.rb-L2.rb-go .ls{animation:rbL2fade .3s 1000ms both,rbL2snap .24s ease-in 1340ms both}
@keyframes rbL2snap{0%{transform:translateY(-12px)}70%{transform:translateY(1.5px)}100%{transform:translateY(0)}}
.rb-L2 .kh{fill:var(--c);opacity:0}
.rb-L2.rb-go .kh{animation:rbL2glow 1.6s ease-in-out 1380ms infinite alternate}
@keyframes rbL2glow{from{opacity:1}to{opacity:.35}}

.rb-L2 .ck{position:absolute;left:612px;width:360px;height:26px;display:flex;align-items:center;gap:11px;opacity:0}
.rb-L2.rb-go .ck{animation:rbL2slide .35s cubic-bezier(.2,.9,.3,1) calc(var(--d) * 1ms) both}
@keyframes rbL2slide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
.rb-L2 .bx{position:relative;flex:none;width:16px;height:16px;border:1px solid #475569;border-radius:3px}
.rb-L2 .bx::before{content:'';position:absolute;left:-1px;top:-1px;right:-1px;bottom:-1px;border-radius:3px;background:rgba(167,139,250,.24);box-shadow:inset 0 0 0 1px var(--c),0 0 10px rgba(167,139,250,.55);opacity:0}
.rb-L2.rb-go .bx::before{animation:rbL2fade .25s ease-out calc((var(--d) + 130) * 1ms) both}
.rb-L2 .bx svg{position:absolute;left:0;top:0;width:14px;height:14px;overflow:visible}
.rb-L2 .bx path{fill:none;stroke:#f5f3ff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1}
.rb-L2.rb-go .bx path{animation:rbL2tick .25s ease-out calc((var(--d) + 150) * 1ms) both}
@keyframes rbL2tick{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.rb-L2 .tx{flex:1;font:14px var(--rb-sans);color:#e2e8f0;white-space:nowrap}
.rb-L2 .st{font:12px var(--rb-mono);color:#64748b;white-space:nowrap}
.rb-L2 .rl{position:absolute;left:27px;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,rgba(167,139,250,.4),rgba(167,139,250,0));transform-origin:left;transform:scaleX(0)}
.rb-L2.rb-go .rl{animation:rbL2line .5s ease-out calc((var(--d) + 60) * 1ms) both}
@keyframes rbL2line{from{transform:scaleX(0)}to{transform:none}}

.rb-L2 .mt{position:absolute;left:612px;top:464px;width:360px;height:30px;opacity:0}
.rb-L2.rb-go .mt{animation:rbL2fade .4s 1450ms both}
.rb-L2 .ml{position:absolute;left:0;top:3px;font:12px var(--rb-mono);letter-spacing:.12em;color:#94a3b8}
.rb-L2 .mv{position:absolute;right:0;top:-2px;font:18px var(--rb-mono);color:var(--c)}
.rb-L2 .mb{position:absolute;left:0;right:0;bottom:2px;height:2px;background:#1e293b}
.rb-L2 .mb b{position:absolute;left:0;top:0;width:100%;height:100%;background:linear-gradient(90deg,#f87171,var(--c));box-shadow:0 0 8px rgba(167,139,250,.6);transform-origin:left;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
`,

  build(body, api) {
    const top = Math.max(0, Math.round((api.BH - 508) / 2));
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const KW = new Set(["rules_version", "service", "match", "allow", "if", "function", "return", "true", "false", "in", "is"]);
    const OP = new Set(["read", "create", "update", "delete", "write", "get", "list"]);
    const tok = (s) => {
      let out = "", i = 0, m;
      while (i < s.length) {
        const r = s.slice(i);
        if (r.startsWith("//")) { out += `<span class="xc">${esc(r)}</span>`; break; }
        if ((m = r.match(/^'[^']*'/))) { out += `<span class="xs">${esc(m[0])}</span>`; i += m[0].length; continue; }
        if ((m = r.match(/^\/[\w{}\/=*.]+/))) {
          out += m[0].split(/(\{[^}]*\})/).filter(Boolean)
            .map((p) => `<span class="${p[0] === "{" ? "xw" : "xp"}">${esc(p)}</span>`).join("");
          i += m[0].length; continue;
        }
        if ((m = r.match(/^\d+/))) { out += `<span class="xn">${m[0]}</span>`; i += m[0].length; continue; }
        if ((m = r.match(/^[A-Za-z_]\w*/))) {
          const w = m[0], nx = s[i + w.length];
          const c = KW.has(w) ? "xk" : nx === "(" ? "xf" : OP.has(w) ? "xo" : "";
          out += c ? `<span class="${c}">${w}</span>` : w;
          i += w.length; continue;
        }
        out += esc(r[0]); i++;
      }
      return out;
    };

    const L = [
      [0, "rules_version = '2';"],
      [0, "// the only gatekeeper. unmatched paths: denied"],
      [0, "service cloud.firestore {"],
      [1, "match /databases/{db}/documents {"],
      [2, "match /board/{id} {"],
      [3, "allow read: if true;"],
      [3, "allow create: if valid(request.resource.data)"],
      [4, "&& request.resource.data.text.size() <= 280;"],
      [3, "allow update, delete: if false;"],
      [2, "}"],
      [2, "match /stats/{id} {"],
      [3, "allow update: if plusOne('views', 'visitors');"],
      [2, "}"],
      [2, "match /scores/{game}/entries/{id} {"],
      [3, "allow create: if fairScore(game);"],
      [2, "}"],
      [2, "match /limits/{id} { allow update: if bump(); }"],
      [1, "}"],
      [0, "}"],
    ];

    // typing schedule: proportional to line length, 150ms .. 2440ms
    const T0 = 150, T1 = 2440, GAP = 16;
    const lens = L.map(([, s]) => Math.max(1, s.length));
    const wts = lens.map((n) => n + 8);
    const sumW = wts.reduce((a, b) => a + b, 0);
    const avail = T1 - T0 - GAP * (L.length - 1);
    const starts = [], durs = [];
    let t = T0;
    wts.forEach((x) => { const d = Math.round((avail * x) / sumW); starts.push(t); durs.push(d); t += d + GAP; });

    let rows = "";
    L.forEach(([ind, s], i) => {
      const ok = s.includes("allow ");
      const k = 2490 + Math.round((i / L.length) * 400);
      const cls = "ln" + (ok ? " ok" : "") + (i === L.length - 1 ? " last" : "");
      rows += `<div class="${cls}" style="--i:${ind};--d:${starts[i]};--t:${durs[i]};--n:${lens[i]};--k:${k}">` +
        `<span class="cl" style="animation-timing-function:steps(${lens[i]},start)">${tok(s)}</span></div>`;
    });

    const hdr = [
      ["x-content-type-options", "nosniff"],
      ["referrer-policy", "strict-origin-when-cross-origin"],
      ["permissions-policy", "camera=(), microphone=(), geolocation=()"],
      ["cache-control", "public, max-age=31536000, immutable"],
    ];
    const one = hdr.map(([k, v]) => `   <span class="hk">${k}:</span> ${esc(v)}   \u00b7`).join("");

    const checks = [
      ["every field validated", "hasOnly()"],
      ["add-only collections", "board \u00b7 scores"],
      ["rate limits \u00b7 keyed hashes", "sha-256"],
      ["no secrets client-side", "env only"],
      ["nosniff \u00b7 referrer-policy", "vercel.json"],
      ["proxy: no cookies, no logins", "api/proxy"],
    ];
    const CK = [1550, 1780, 2010, 2240, 2470, 2700];
    const ckHtml = checks.map(([a, b], i) =>
      `<div class="ck" style="--d:${CK[i]};top:${284 + i * 28}px">` +
      `<i class="bx"><svg viewBox="0 0 14 14"><path pathLength="1" d="M3.2 7.4 6 10.2 11 3.9"/></svg></i>` +
      `<span class="tx">${esc(a)}</span><span class="st">${esc(b)}</span><b class="rl"></b></div>`
    ).join("");

    const SH = "M188 44 C206 56 230 62 254 62 L254 120 C254 166 226 196 188 214 C150 196 122 166 122 120 L122 62 C146 62 170 56 188 44 Z";
    const SI = "M188 58 C203 68 222 73 242 74 L242 120 C242 158 218 184 188 199 C158 184 134 158 134 120 L134 74 C154 73 173 68 188 58 Z";
    const svg =
      `<svg class="sh" width="376" height="262" viewBox="0 0 376 262">` +
      `<defs><clipPath id="rbL2clip"><path d="${SH}"/></clipPath>` +
      `<linearGradient id="rbL2grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a78bfa" stop-opacity="0"/><stop offset="1" stop-color="#a78bfa" stop-opacity=".55"/></linearGradient></defs>` +
      `<circle class="tk" cx="188" cy="130" r="124"/>` +
      `<circle class="tk2" cx="188" cy="130" r="124"/>` +
      `<circle class="rg" cx="188" cy="130" r="104"/>` +
      `<path class="cx" d="M188 18v16 M188 226v16 M76 130h16 M284 130h16"/>` +
      `<circle class="sw2" cx="188" cy="130" r="104" pathLength="100"/>` +
      `<circle class="sw" cx="188" cy="130" r="104" pathLength="100"/>` +
      `<circle class="dr" cx="188" cy="130" r="113"/>` +
      `<circle class="pl" cx="188" cy="130" r="72" style="--d:1400"/>` +
      `<circle class="pl" cx="188" cy="130" r="72" style="--d:2700"/>` +
      `<path class="sf" d="${SH}"/>` +
      `<g clip-path="url(#rbL2clip)"><rect class="scb" x="118" y="18" width="140" height="30" fill="url(#rbL2grad)"/></g>` +
      `<path class="sg" d="${SH}"/>` +
      `<path class="so" d="${SH}" pathLength="100"/>` +
      `<path class="si" d="${SI}" pathLength="100"/>` +
      `<circle class="fl" cx="188" cy="140" r="30"/>` +
      `<rect class="lb" x="168" y="126" width="40" height="32" rx="5"/>` +
      `<path class="ls" d="M176 126 V114 A12 12 0 0 1 200 114 V126"/>` +
      `<circle class="kh" cx="188" cy="139" r="3.6"/><rect class="kh" x="186.6" y="140" width="2.8" height="8" rx="1.2"/>` +
      `<text class="lbl lt" x="6" y="14">\u25c6 POLICY ENGINE</text>` +
      `<text class="lbl lr" x="370" y="14" text-anchor="end">deny-by-default</text>` +
      `<text class="lbl hx" x="6" y="258">sha256 ${api.hex(8)}\u2026</text>` +
      `<text class="lbl stt" x="370" y="258" text-anchor="end">\u25cb scanning\u2026</text>` +
      `</svg>`;

    body.innerHTML =
      `<div class="w" style="top:${top}px">` +
        `<div class="ed">` +
          `<div class="tb"><span class="tab on"><i class="ti">\u25c6</i>firestore.rules<i class="dot">\u25cf</i></span>` +
          `<span class="tab"><i>{ }</i>vercel.json</span><span class="pj">project resume-41921</span></div>` +
          `<div class="code"><div class="hlb"></div>${rows}<div class="csn"></div><div class="swp"></div></div>` +
          `<div class="sb"><span class="md">\u25c6 RULES v2</span><span class="pos">Ln 1, Col 1</span><span>UTF-8 \u00b7 LF</span>` +
          `<span class="okc">\u2713 0 errors \u00b7 deployed</span></div>` +
        `</div>` +
        `<div class="tkr"><span class="tl">RESPONSE HEADERS</span><div class="tw"><div class="tt">${one}${one}</div></div></div>` +
        `<div class="dv"></div>` +
        svg +
        ckHtml +
        `<div class="mt"><span class="ml">UNVALIDATED WRITES</span><span class="mv">8</span><i class="mb"><b></b></i></div>` +
      `</div>`;

    body.__rbL2 = { starts, durs, lens, ind: L.map(([ind]) => ind), CK };
  },

  go(body, api) {
    const st = body.__rbL2;
    if (!st) return;
    const rows = body.querySelectorAll(".ln");
    const hlb = body.querySelector(".hlb");
    const pos = body.querySelector(".pos");

    st.starts.forEach((s, i) => {
      api.at(s, () => {
        if (i > 0 && rows[i - 1]) rows[i - 1].classList.remove("cur");
        if (rows[i]) rows[i].classList.add("cur");
        if (hlb) { hlb.style.opacity = "1"; hlb.style.transform = `translateY(${i * 19}px)`; }
        if (pos) pos.textContent = `Ln ${i + 1}, Col ${st.ind[i] * 2 + 1}`;
      });
      api.at(s + st.durs[i], () => {
        if (pos) pos.textContent = `Ln ${i + 1}, Col ${st.ind[i] * 2 + st.lens[i] + 1}`;
      });
    });

    // rolling hash readout until the lock snaps shut
    const hx = body.querySelector(".hx");
    const stt = body.querySelector(".stt");
    let sealed = false;
    api.every(80, () => { if (!sealed && hx) hx.textContent = "sha256 " + api.hex(8) + "\u2026"; });
    api.at(1350, () => {
      sealed = true;
      if (hx) hx.textContent = "ruleset 7c1e\u00b79f3a";
      if (stt) { stt.textContent = "\u25cf SEALED"; stt.classList.add("on"); }
      api.tick();
    });

    // checklist drives the "unvalidated writes" meter down to zero
    const mv = body.querySelector(".mv");
    const bar = body.querySelector(".mb b");
    const left = [6, 5, 3, 2, 1, 0];
    st.CK.forEach((t, i) => {
      api.at(t + 140, () => {
        if (mv) mv.textContent = String(left[i]);
        if (bar) bar.style.transform = `scaleX(${left[i] / 8})`;
        if (i === 0 || i === 3) api.tick();
      });
    });

    api.at(2900, () => api.tick());
  },
};

  // ---- layer 3 ----
RB_LAYERS[3] = {
  key: "api",
  name: "API",
  sub: "Vercel serverless functions · /api · node 22",
  tagline: "Three functions. Zero secrets in the browser.",
  color: "#34d399",
  dur: 3400,
  log: [
    "mounting /api as serverless functions",
    "λ otp.js → nodejs22.x · iad1",
    "λ contact.js → nodejs22.x · iad1",
    "λ proxy.js → sandboxed, no cookies relayed",
    "linking shared _mail.js ⟶ otp, contact",
    "smtp.gmail.com:465 · TLS handshake ok",
    "firestore resume-41921 · otp/ limits/ bound",
    "cold 212ms → warm 9ms · routes live",
  ],
  css: `
.rb-L3 .zst{position:absolute;left:0;width:1000px;height:508px;font-family:var(--rb-sans);color:#e2e8f0}
.rb-L3 .zwr{position:absolute;left:0;top:0;overflow:visible}
.rb-L3 .zgd{fill:none;stroke:#334155;stroke-width:1;stroke-dasharray:2 6;opacity:0}
.rb-L3.rb-go .zgd{animation:rbL3gd .9s ease .25s both}
.rb-L3 .zeg{fill:none;stroke:var(--c);stroke-width:7;stroke-linecap:round;opacity:0}
.rb-L3.rb-go .zeg{animation:rbL3eg .8s ease both;animation-delay:calc(var(--d) * 1ms)}
.rb-L3 .ze{fill:none;stroke:var(--c);stroke-width:1.5;stroke-dasharray:100;stroke-dashoffset:100;opacity:0}
.rb-L3.rb-go .ze{animation:rbL3draw .65s cubic-bezier(.6,0,.25,1) both;animation-delay:calc(var(--d) * 1ms)}
.rb-L3 .zmk{fill:var(--c)}
.rb-L3 .zel{font:12px var(--rb-mono);letter-spacing:.06em;fill:#94a3b8;stroke:#020617;stroke-width:4px;stroke-linejoin:round;paint-order:stroke;opacity:0}
.rb-L3.rb-go .zel{animation:rbL3fade .5s ease both;animation-delay:calc(var(--d) * 1ms)}
.rb-L3 .zpu{fill:rgba(52,211,153,.06);stroke:var(--c);stroke-width:1.5}
.rb-L3 .zpq{fill:var(--c);stroke:var(--c);stroke-width:8;stroke-opacity:.28}
.rb-L3 .zpr{fill:#f8fafc;stroke:#f8fafc;stroke-width:7;stroke-opacity:.22}
.rb-L3 .zsc{position:absolute;left:0;top:0;width:140px;height:508px;background:linear-gradient(90deg,rgba(52,211,153,0),rgba(52,211,153,.07),rgba(52,211,153,0));opacity:0}
.rb-L3.rb-go .zsc{animation:rbL3scan 5.5s linear 2.4s infinite}
.rb-L3 .zhd{position:absolute;top:4px;height:22px;font:600 12px/16px var(--rb-mono);letter-spacing:.14em;color:#94a3b8;white-space:nowrap;opacity:0}
.rb-L3 .zhd b{color:var(--c);margin-right:7px}
.rb-L3 .zhd i{position:absolute;right:0;top:0;font-style:normal;letter-spacing:.06em;color:#475569}
.rb-L3 .zhd::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,var(--c),rgba(52,211,153,.04));transform:scaleX(0);transform-origin:0 0}
.rb-L3.rb-go .zhd{animation:rbL3in .4s ease both;animation-delay:calc(var(--d) * 1ms)}
.rb-L3.rb-go .zhd::after{animation:rbL3sx .7s cubic-bezier(.6,0,.2,1) both;animation-delay:calc(var(--d) * 1ms + 150ms)}
.rb-L3 .znd{position:absolute;box-sizing:border-box;border:1px solid rgba(52,211,153,.5);border-radius:10px;background:linear-gradient(180deg,rgba(10,36,30,.94),rgba(3,9,18,.95));box-shadow:0 0 0 1px rgba(52,211,153,.06),0 0 22px rgba(52,211,153,.16),inset 0 1px 0 rgba(255,255,255,.07);opacity:0}
.rb-L3 .znd::before,.rb-L3 .znd::after{content:'';position:absolute;width:9px;height:9px;border:0 solid var(--c)}
.rb-L3 .znd::before{left:-5px;top:-5px;border-left-width:2px;border-top-width:2px}
.rb-L3 .znd::after{right:-5px;bottom:-5px;border-right-width:2px;border-bottom-width:2px}
.rb-L3.rb-go .znd{animation:rbL3pop .55s cubic-bezier(.2,1.35,.4,1) both;animation-delay:calc(var(--d) * 1ms)}
.rb-L3 .zfn{width:260px;height:108px;padding:9px 14px;display:flex;flex-direction:column;justify-content:space-between}
.rb-L3 .zr1{display:flex;align-items:center;gap:9px;height:24px}
.rb-L3 .zm{font:700 12px/18px var(--rb-mono);padding:0 6px;border-radius:4px;background:var(--c);color:#022c22;letter-spacing:.04em}
.rb-L3 .zm.zg{background:#e2e8f0;color:#0f172a}
.rb-L3 .zrt{font:700 19px/24px var(--rb-mono);color:#f8fafc;white-space:nowrap}
.rb-L3 .zds{font:13px/16px var(--rb-sans);color:#94a3b8;white-space:nowrap}
.rb-L3 .zr3{display:flex;align-items:center;gap:6px;font:12px/16px var(--rb-mono)}
.rb-L3 .zbd{padding:0 6px;border:1px solid rgba(52,211,153,.45);border-radius:8px;color:#a7f3d0;white-space:nowrap}
.rb-L3 .zbd.zn::before{content:'';display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:var(--c);box-shadow:0 0 6px var(--c);vertical-align:1px}
.rb-L3 .zbd.zq{border-color:#334155;color:#94a3b8}
.rb-L3 .zid{margin-left:auto;font-style:normal;color:#64748b}
.rb-L3 .zcw{position:relative;height:16px;display:flex;align-items:center;font:12px/16px var(--rb-mono)}
.rb-L3 .zbar{display:block;width:56px;height:4px;border-radius:2px;background:#1e293b;overflow:hidden}
.rb-L3 .zbar b{display:block;height:4px;background:linear-gradient(90deg,#7dd3fc,var(--c));transform:scaleX(0);transform-origin:0 0}
.rb-L3 .zc,.rb-L3 .zw{position:absolute;left:66px;top:0;white-space:nowrap;opacity:0}
.rb-L3 .zc{color:#7dd3fc}
.rb-L3 .zw{color:var(--c)}
.rb-L3.rb-go .zbar b{animation:rbL3sx .8s cubic-bezier(.5,0,.3,1) both;animation-delay:calc(var(--w) * 1ms - 800ms)}
.rb-L3.rb-go .zc{animation-name:rbL3cold;animation-timing-function:linear;animation-fill-mode:both;animation-duration:calc((var(--w) - var(--d) - 200) * 1ms);animation-delay:calc((var(--d) + 200) * 1ms)}
.rb-L3.rb-go .zw{animation:rbL3in .35s ease both;animation-delay:calc(var(--w) * 1ms)}
.rb-L3 .zch{position:absolute;top:-11px;right:12px;font:600 12px/18px var(--rb-mono);padding:0 8px;border-radius:9px;border:1px solid var(--c);background:#03140e;color:var(--c);box-shadow:0 0 12px rgba(52,211,153,.35);white-space:nowrap;opacity:0}
.rb-L3 .zch.zam{border-color:#fbbf24;color:#fbbf24;background:#1a1204;box-shadow:0 0 12px rgba(251,191,36,.35)}
.rb-L3 .zch.zwh{border-color:#cbd5e1;color:#e2e8f0;background:#0b1220;box-shadow:0 0 10px rgba(226,232,240,.18)}
.rb-L3.rb-go .zch{animation:rbL3chip .5s cubic-bezier(.2,1.6,.4,1) both;animation-delay:calc(var(--k) * 1ms)}
.rb-L3.rb-go .zch.zam{animation:rbL3chip .5s cubic-bezier(.2,1.6,.4,1) calc(var(--k) * 1ms) both,rbL3blink 1.3s ease-in-out calc(var(--k) * 1ms + 700ms) infinite}
.rb-L3 .zsv{width:168px;height:88px;padding:9px 12px;display:flex;flex-direction:column;justify-content:space-between}
.rb-L3 .zt{display:flex;align-items:center;gap:8px;font:700 15px/20px var(--rb-sans);letter-spacing:.08em;color:#f8fafc;white-space:nowrap}
.rb-L3 .zic{width:20px;height:20px;flex:none;fill:none;stroke:var(--c);stroke-width:1.5;stroke-linejoin:round;overflow:visible}
.rb-L3 .za{font:12px/15px var(--rb-mono);color:#a7f3d0;white-space:nowrap}
.rb-L3 .zb{font:12px/15px var(--rb-sans);color:#94a3b8;white-space:nowrap}
.rb-L3 .zbr{width:192px;height:172px;padding:12px;display:flex;flex-direction:column;align-items:center;text-align:center}
.rb-L3 .zbr .zt{justify-content:center;font-size:17px;line-height:22px;letter-spacing:.16em}
.rb-L3 .zbr .za{margin-top:3px}
.rb-L3 .zbr .zb{margin-top:2px}
.rb-L3 .zxp{width:100px;height:62px;flex:none;box-sizing:border-box;margin-bottom:10px;border:1px solid #0b3fa8;border-radius:6px 6px 2px 2px;overflow:hidden;box-shadow:0 0 16px rgba(61,139,242,.35)}
.rb-L3 .ztb{position:relative;height:13px;background:linear-gradient(#5b9cf5,#0a5ad8 55%,#0848b8)}
.rb-L3 .ztb::before{content:'';position:absolute;left:5px;top:4.5px;width:34px;height:4px;border-radius:1px;background:rgba(255,255,255,.85)}
.rb-L3 .ztb i{position:absolute;right:3px;top:2.5px;width:8px;height:8px;border-radius:2px;background:#e2452a;box-shadow:-10px 0 0 #3c7ff0,-20px 0 0 #3c7ff0}
.rb-L3 .zxb{position:relative;height:47px;background-color:#ece9d8;background-image:repeating-linear-gradient(180deg,rgba(10,90,216,0) 0 6px,rgba(10,90,216,.35) 6px 8px);background-size:60% 26px;background-repeat:no-repeat;background-position:9px 6px}
.rb-L3 .zxb::after{content:'';position:absolute;left:0;right:0;bottom:0;height:8px;background:linear-gradient(90deg,#3a9a3a 0 22px,#245edb 22px)}
.rb-L3 .zml{position:absolute;left:401px;top:167px;height:24px;box-sizing:border-box;padding:0 10px;display:flex;align-items:center;gap:7px;border:1px dashed rgba(52,211,153,.7);border-radius:5px;background:rgba(3,20,14,.92);font:600 12px/16px var(--rb-mono);color:var(--c);white-space:nowrap;opacity:0}
.rb-L3 .zml i{font-style:normal;font-weight:400;color:#94a3b8}
.rb-L3.rb-go .zml{animation:rbL3pop .5s cubic-bezier(.2,1.35,.4,1) both;animation-delay:calc(var(--d) * 1ms)}
.rb-L3 .zlg{position:absolute;left:24px;top:306px;width:192px;box-sizing:border-box;padding:7px 10px 8px;border:1px solid #1e293b;border-left:2px solid var(--c);border-radius:3px;background:rgba(2,6,23,.7);font:12px/18px var(--rb-mono);color:#94a3b8;opacity:0}
.rb-L3 .zlh{font:600 12px/16px var(--rb-mono);letter-spacing:.16em;color:#64748b;margin-bottom:3px}
.rb-L3 .zlh i{font-style:normal;float:right;letter-spacing:.04em;color:var(--c)}
.rb-L3 .zln{height:18px;white-space:nowrap;overflow:hidden}
.rb-L3 .zln em{font-style:normal;color:var(--c)}
.rb-L3 .zln em.zx{color:#fbbf24}
.rb-L3 .zln em.zi{color:#7dd3fc}
.rb-L3 .zl0{color:#e2e8f0}
.rb-L3 .zl2{opacity:.6}
.rb-L3 .zl3{opacity:.32}
.rb-L3 .zcur::after{content:'_';animation:rbL3cur 1s steps(1,end) infinite}
.rb-L3 .zln.zna{animation:rbL3nla .4s ease both}
.rb-L3 .zln.znb{animation:rbL3nlb .4s ease both}
.rb-L3.rb-go .zlg{animation:rbL3in .45s ease both;animation-delay:calc(var(--d) * 1ms)}
.rb-L3 .zft{position:absolute;left:24px;right:32px;top:480px;display:flex;justify-content:space-between;font:12px/16px var(--rb-mono);color:#64748b;white-space:nowrap;opacity:0}
.rb-L3 .zft b{font-weight:400;color:#a7f3d0}
.rb-L3.rb-go .zft{animation:rbL3in .5s ease both;animation-delay:calc(var(--d) * 1ms)}
@keyframes rbL3in{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}
@keyframes rbL3fade{from{opacity:0}to{opacity:1}}
@keyframes rbL3sx{to{transform:scaleX(1)}}
@keyframes rbL3pop{0%{opacity:0;transform:translateY(14px) scale(.84)}55%{opacity:1}100%{opacity:1;transform:none}}
@keyframes rbL3draw{0%{opacity:0;stroke-dashoffset:100}2%{opacity:.85}100%{opacity:.85;stroke-dashoffset:0}}
@keyframes rbL3eg{to{opacity:.09}}
@keyframes rbL3gd{to{opacity:.7}}
@keyframes rbL3cold{0%{opacity:0}10%{opacity:1}88%{opacity:1}100%{opacity:0}}
@keyframes rbL3chip{0%{opacity:0;transform:translateY(6px) scale(.6)}100%{opacity:1;transform:none}}
@keyframes rbL3blink{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes rbL3cur{0%{opacity:1}50%,100%{opacity:0}}
@keyframes rbL3nla{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes rbL3nlb{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes rbL3scan{0%{opacity:1;transform:translateX(-150px)}100%{opacity:1;transform:translateX(1010px)}}
`,
  build(body, api) {
    const H = 508, P = 3.6;
    const oy = Math.max(0, Math.round((api.BH - H) / 2));
    const r4 = (n) => Math.round(n * 1e4) / 1e4;
    // edges: 0-2 browser -> otp/contact/proxy, 3 otp->gmail, 4 otp->fs, 5 contact->gmail,
    // 6 contact->fs, 7 proxy->fs, 8 proxy->web
    const E = [
      "M216,168 C294,168 294,94 372,94",
      "M216,198 C294,198 294,264 372,264",
      "M216,228 C294,228 294,416 372,416",
      "M632,80 C716,80 716,80 800,80",
      "M632,108 C716,108 716,246 800,246",
      "M632,250 C716,250 716,108 800,108",
      "M632,278 C716,278 716,264 800,264",
      "M632,402 C716,402 716,282 800,282",
      "M632,430 C716,430 716,416 800,416",
    ];
    const ED = [820, 890, 960, 1080, 1140, 1200, 1260, 1320, 1380];

    let s = '<defs><marker id="rbL3pt" viewBox="-4 -4 8 8" refX="0" refY="0" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse"><circle class="zmk" r="2.6"/></marker></defs>';
    s += '<path class="zgd" d="M294,36V472M716,36V472"/>';
    E.forEach((d, i) => { s += `<path class="zeg" d="${d}" style="--d:${ED[i] + 300}"/>`; });
    E.forEach((d, i) => {
      s += `<path class="ze" pathLength="100" d="${d}" marker-start="url(#rbL3pt)" marker-end="url(#rbL3pt)" style="--d:${ED[i]}"/>`;
    });
    s += '<path class="ze" pathLength="100" d="M440,148V167" style="--d:640"/>';
    s += '<path class="ze" pathLength="100" d="M440,191V210" style="--d:700"/>';
    [
      [300, 204, "HTTPS", "middle", 1650],
      [716, 73, "SMTPS 465", "middle", 1720],
      [716, 262, "verify code", "middle", 1790],
      [726, 346, "limits/{hash}", "start", 1860],
    ].forEach(([x, y, t, a, d]) => {
      s += `<text class="zel" x="${x}" y="${y}" text-anchor="${a}" style="--d:${d}">${t}</text>`;
    });

    // pulse rings behind nodes: [x, y, w, h, [[lane, [arrival fractions of P]]]]
    const PR = 0.012, PD = 0.1;
    [
      [19, 107, 202, 182, [[0, [0.74]], [1, [0.74]], [2, [0.78]]]],
      [367, 35, 270, 118, [[0, [0.13, 0.36, 0.59]]]],
      [367, 205, 270, 118, [[1, [0.13, 0.36, 0.59]]]],
      [367, 357, 270, 118, [[2, [0.13, 0.34, 0.64]]]],
      [795, 45, 178, 98, [[0, [0.48]], [1, [0.48]]]],
      [795, 215, 178, 98, [[0, [0.25]], [1, [0.25]], [2, [0.24]]]],
      [795, 367, 178, 98, [[2, [0.5]]]],
    ].forEach(([x, y, w, h, ls]) => {
      let a = "";
      ls.forEach(([l, ps]) => {
        const kt = [0], v = [0];
        ps.forEach((p) => { kt.push(r4(p), r4(p + PR), r4(p + PD)); v.push(0, 1, 0); });
        kt.push(1); v.push(0);
        a += `<animate attributeName="opacity" additive="sum" dur="${P}s" begin="indefinite" repeatCount="indefinite" calcMode="linear" keyTimes="${kt.join(";")}" values="${v.join(";")}" data-l="${l}"/>`;
      });
      s += `<rect class="zpu" x="${x}" y="${y}" width="${w}" height="${h}" rx="13" opacity="0">${a}</rect>`;
    });

    // packets per lane: [edge, isResponse, start, end] as fractions of the cycle P
    const FE = 0.014;
    [
      [[0, 0, 0.005, 0.13], [4, 0, 0.15, 0.25], [4, 1, 0.27, 0.36], [3, 0, 0.38, 0.48], [3, 1, 0.5, 0.59], [0, 1, 0.61, 0.74]],
      [[1, 0, 0.005, 0.13], [6, 0, 0.15, 0.25], [6, 1, 0.27, 0.36], [5, 0, 0.38, 0.48], [5, 1, 0.5, 0.59], [1, 1, 0.61, 0.74]],
      [[2, 0, 0.005, 0.13], [7, 0, 0.15, 0.24], [7, 1, 0.26, 0.34], [8, 0, 0.36, 0.5], [8, 1, 0.52, 0.64], [2, 1, 0.66, 0.78]],
    ].forEach((segs, l) => segs.forEach(([e, back, a, b]) => {
      s += `<circle class="${back ? "zpr" : "zpq"}" r="${back ? 3.2 : 4}" opacity="0">` +
        `<animateMotion dur="${P}s" begin="indefinite" repeatCount="indefinite" calcMode="linear" path="${E[e]}" keyPoints="${back ? "1;1;0;0" : "0;0;1;1"}" keyTimes="0;${a};${b};1" data-l="${l}"/>` +
        `<animate attributeName="opacity" dur="${P}s" begin="indefinite" repeatCount="indefinite" calcMode="linear" values="0;0;1;1;0;0" keyTimes="0;${a};${r4(a + FE)};${r4(b - FE)};${b};1" data-l="${l}"/></circle>`;
    }));

    const hd = (x, w, d, n, t, m) => `<div class="zhd" style="left:${x}px;width:${w}px;--d:${d}"><b>${n}</b>▸ ${t}<i>${m}</i></div>`;

    const fn = (o) => `<div class="znd zfn" style="left:372px;top:${o.top}px;--d:${o.d};--w:${o.w}">` +
      `<div class="zr1"><b class="zm${o.get ? " zg" : ""}">${o.m}</b><span class="zrt">${o.r}</span></div>` +
      `<div class="zds">${o.ds}</div>` +
      `<div class="zr3"><span class="zbd zn">node 22</span><span class="zbd zq">iad1</span><i class="zid">λ ${api.hex(4)}</i></div>` +
      `<div class="zcw"><i class="zbar"><b></b></i><span class="zc">◇ cold start <span class="zms" data-ms="${o.cold}" data-at="${o.d + 260}">0ms</span></span><span class="zw">◆ warm · ${o.warm}ms</span></div>` +
      `<span class="zch${o.cc || ""}" style="--k:${o.k}"${o.dc ? ` data-c="${o.dc}"` : ""}>${o.chip}</span></div>`;

    const IC = {
      gm: '<svg class="zic" width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="4.5" width="16" height="11" rx="1.5"/><path d="M2.6 5.4 10 11l7.4-5.6"/></svg>',
      fs: '<svg class="zic" width="20" height="20" viewBox="0 0 20 20"><ellipse cx="10" cy="5" rx="7" ry="2.5"/><path d="M3 5v10c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5M3 10c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/></svg>',
      wb: '<svg class="zic" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><path d="M2.5 10h15M10 2.5c-3.6 4.2-3.6 10.8 0 15M10 2.5c3.6 4.2 3.6 10.8 0 15"/></svg>',
    };
    const sv = (top, d, ic, t, a, b, chip, cc, k) => `<div class="znd zsv" style="left:800px;top:${top}px;--d:${d}">` +
      `<div class="zt">${IC[ic]}${t}</div><div class="za">${a}</div><div class="zb">${b}</div>` +
      `<span class="zch${cc}" style="--k:${k}">${chip}</span></div>`;

    body.innerHTML =
      `<div class="zst" style="top:${oy}px">` +
      `<svg class="zwr" width="1000" height="${H}" viewBox="0 0 1000 ${H}">${s}</svg>` +
      '<div class="zsc"></div>' +
      hd(24, 192, 0, "01", "CLIENT", "tls 1.3") +
      hd(372, 260, 90, "02", "SERVERLESS /api", "3 fn") +
      hd(800, 168, 180, "03", "UPSTREAM", "3 svc") +
      '<div class="znd zbr" style="left:24px;top:112px;--d:120">' +
      '<div class="zxp"><div class="ztb"><i></i></div><div class="zxb"></div></div>' +
      '<div class="zt">BROWSER</div><div class="za">medhansh-xp.vercel.app</div><div class="zb">fetch() · same-origin</div>' +
      '<span class="zch zwh" style="--k:1950">MK-PC</span></div>' +
      fn({ top: 40, d: 380, w: 1900, m: "POST", r: "/api/otp", ds: "emails a 4-digit one-time code", cold: 212, warm: 9, chip: "200 · 41ms", dc: "o", k: 2010 }) +
      fn({ top: 210, d: 470, w: 1980, m: "POST", r: "/api/contact", ds: "verifies code · mails message", cold: 238, warm: 11, chip: "200 · 63ms", dc: "c", k: 2070 }) +
      fn({ top: 362, d: 560, w: 2060, m: "GET", get: 1, r: "/api/proxy", ds: "sandboxed fetch for in-site IE", cold: 187, warm: 8, chip: "429 guard", cc: " zam", k: 2130 }) +
      '<div class="zml" style="--d:680">◆ _mail.js<i>· shared mailer</i></div>' +
      sv(50, 780, "gm", "GMAIL SMTP", "smtp.gmail.com:465", "TLS · App Password", "✓ code sent", "", 2190) +
      sv(220, 860, "fs", "FIRESTORE", "resume-41921", "otp/ · limits/", "attempts 1/5", "", 2250) +
      sv(372, 940, "wb", "THE WEB", "any https origin", "cookies never relayed", "sandboxed", " zwh", 2310) +
      '<div class="zlg" style="--d:1500"><div class="zlh">REQUESTS<i>● live</i></div>' +
      '<div class="zln zl0 zcur">◆ booting λ ×3</div><div class="zln zl1"></div><div class="zln zl2"></div><div class="zln zl3"></div></div>' +
      '<div class="zft" style="--d:2150"><span>▸ GMAIL_APP_PASSWORD <b>●●●●●●</b> server-only</span>' +
      "<span>▸ proxy relays no cookies or logins</span><span>▸ limits/ keyed by hash · no addresses</span></div>" +
      "</div>";
  },
  go(body, api) {
    const P = 3.6, t0 = 2.16;
    [120, 380, 780, 1900, 2130].forEach((t) => api.at(t, () => api.tick()));

    body.querySelectorAll(".zms").forEach((el) => {
      api.at(+el.getAttribute("data-at"), () =>
        api.count(el, +el.getAttribute("data-ms"), 650, (n) => Math.round(n) + "ms"));
    });

    // packets + node pulses: three request lanes, a third of a cycle apart
    body.querySelectorAll("[data-l]").forEach((a) => {
      try { a.beginElementAt(t0 + (+a.getAttribute("data-l")) * P / 3); } catch (e) { /* no SMIL */ }
    });

    const lines = Array.from(body.querySelectorAll(".zln"));
    const chips = {};
    body.querySelectorAll("[data-c]").forEach((c) => { chips[c.getAttribute("data-c")] = c; });
    const hist = [];
    let flip = false;
    const push = (h) => {
      hist.unshift(h);
      if (hist.length > 4) hist.length = 4;
      lines.forEach((el, i) => { el.innerHTML = hist[i] || ""; });
      flip = !flip;
      if (lines[0]) lines[0].className = "zln zl0 " + (flip ? "zna" : "znb");
    };
    api.at(1950, () => push('INIT otp.js <em class="zi">212ms</em>'));
    api.at(2030, () => push('INIT contact.js <em class="zi">238ms</em>'));
    api.at(2110, () => push('INIT proxy.js <em class="zi">187ms</em>'));

    // responses land back at the browser roughly every P/3 seconds, from t0 + 0.74P
    const ri = (a, b) => Math.round(api.rand(a, b));
    let n = 0;
    api.every(1200, () => {
      n++;
      if (n < 4) return;
      const lane = (n - 4) % 3;
      let ms;
      if (lane === 0) {
        ms = ri(36, 58);
        push(`POST otp <em>200</em> ${ms}ms`);
        if (chips.o) chips.o.textContent = `200 · ${ms}ms`;
      } else if (lane === 1) {
        ms = ri(52, 79);
        push(`POST contact <em>200</em> ${ms}ms`);
        if (chips.c) chips.c.textContent = `200 · ${ms}ms`;
      } else {
        push(n % 4 === 0 ? 'GET proxy <em class="zx">429</em> 2ms' : `GET proxy <em>200</em> ${ri(140, 260)}ms`);
      }
    });
  },
};

  // ---- layer 4 ----
RB_LAYERS[4] = {
  key: "runtime",
  name: "RUNTIME",
  sub: "app.js · sound.js · lazy games.js + extras.js",
  tagline: "One thread. Eight modules. Sixty frames a second.",
  color: "#60a5fa",
  dur: 3300,
  log: [
    "spawning main thread · evaluating app.js",
    "event loop online · frame budget 16.6ms",
    "mount: window manager, desktop grid, start menu",
    "firestore: resume-41921 attached · rules-gated",
    "sound.js: XP scheme synthesized via WebAudio",
    "games.js + extras.js parked behind import()",
    "tray: navigator.onLine + battery API wired",
    "heap 14.2 MB · 212 listeners · 3,140 nodes",
    "runtime ready on MK-PC · 60 fps",
  ],
  css: `
.rb-L4 .rb-body{font-family:var(--rb-sans);color:#e2e8f0}
.rb-L4 .L4v{position:absolute;left:0;top:0;overflow:visible}
.rb-L4 .L4v text{font-family:var(--rb-mono);font-size:12px;fill:#94a3b8}
.rb-L4 .L4v .hn{font-size:20px;font-weight:700;fill:#f8fafc;letter-spacing:.02em}
.rb-L4 .L4v .hf{fill:#93c5fd}
.rb-L4 .L4v .hs{fill:#64748b;letter-spacing:.1em}
.rb-L4 .L4v .hl{fill:#60a5fa;letter-spacing:.16em}
.rb-L4 .L4v .lt{fill:#94a3b8;letter-spacing:.06em}
.rb-L4 .o,.rb-L4 .p,.rb-L4 .hglow,.rb-L4 .wv,.rb-L4 .mch,.rb-L4 .pk,.rb-L4 .sw,.rb-L4 .eqb{opacity:0}
.rb-L4 .L4v .p,.rb-L4 .wv,.rb-L4 .sw,.rb-L4 .sp1,.rb-L4 .sp2,.rb-L4 .spr{transform-box:fill-box;transform-origin:50% 50%}
.rb-L4.rb-go .o{animation:rbL4in .5s ease-out both;animation-delay:calc(var(--d)*1ms)}
.rb-L4.rb-go .p{animation:rbL4pop .55s cubic-bezier(.2,1.35,.4,1) both;animation-delay:calc(var(--d)*1ms)}
.rb-L4.rb-go .dr{animation:rbL4draw .34s cubic-bezier(.65,0,.25,1) both;animation-delay:calc(var(--d)*1ms)}
.rb-L4.rb-go .dl{animation:rbL4draw .42s ease-in-out both;animation-delay:calc(var(--d)*1ms)}
.rb-L4.rb-go .mch{animation:rbL4in .4s ease-out both,rbL4march 1.1s linear infinite;animation-delay:calc(var(--d)*1ms),0s}
.rb-L4.rb-go .hglow{animation:rbL4in .8s ease-out both,rbL4breathe 2.4s ease-in-out 1s infinite alternate}
.rb-L4.rb-go .wv{animation:rbL4wave 1.1s cubic-bezier(.1,.7,.3,1) forwards;animation-delay:calc(var(--d)*1ms)}
.rb-L4 .sp1{animation:rbL4spin 9s linear infinite}
.rb-L4 .sp2{animation:rbL4spin 1.6s linear infinite}
.rb-L4 .spr{animation:rbL4spin 30s linear infinite reverse}
.rb-L4.rb-go .sw{animation:rbL4sweep 1727ms linear 230ms both}
.rb-L4.rb-go .pk{animation:rbL4pk calc(var(--pt)*1ms) cubic-bezier(.45,0,.55,1) infinite both;animation-delay:calc(var(--d)*1ms)}
.rb-L4 .md{position:absolute;width:184px;height:76px;box-sizing:border-box;padding:7px 10px 0 12px;background:linear-gradient(180deg,rgba(15,23,42,.94),rgba(2,6,23,.9));border:1px solid rgba(96,165,250,.3);opacity:0}
.rb-L4.rb-go .md{animation:rbL4box .5s cubic-bezier(.2,1.3,.4,1) both;animation-delay:calc(var(--d)*1ms)}
.rb-L4 .md::before{content:"";position:absolute;left:-1px;top:-1px;right:-1px;bottom:-1px;border:1px solid var(--c);box-shadow:0 0 18px rgba(96,165,250,.32),inset 0 0 14px rgba(96,165,250,.1);opacity:0;pointer-events:none}
.rb-L4 .md::after{content:"";position:absolute;left:-1px;top:-1px;bottom:-1px;width:3px;background:var(--c);transform:scaleY(0);transform-origin:50% 0}
.rb-L4.rb-go .md.ek::before{animation:rbL4in .35s ease-out both;animation-delay:calc(var(--f)*1ms)}
.rb-L4.rb-go .md.ek::after{animation:rbL4grow .3s ease-out both;animation-delay:calc(var(--f)*1ms)}
.rb-L4 .md .nm{font:600 15px/18px var(--rb-sans);color:#f1f5f9;white-space:nowrap}
.rb-L4 .md .fi{font:12px/15px var(--rb-mono);color:#94a3b8;white-space:nowrap}
.rb-L4 .md .br{position:relative;height:3px;margin:6px 0 5px;background:rgba(148,163,184,.16);overflow:hidden}
.rb-L4 .md .br i{position:absolute;left:0;top:0;bottom:0;width:100%;background:linear-gradient(90deg,rgba(96,165,250,.35),var(--c) 70%,#e0f2fe);transform:scaleX(0);transform-origin:0 50%}
.rb-L4.rb-go .md .br i{animation:rbL4fill calc(var(--bt)*1ms) cubic-bezier(.3,.1,.3,1) both;animation-delay:calc(var(--b)*1ms)}
.rb-L4 .md .st{position:relative;height:15px;font:12px/15px var(--rb-mono);white-space:nowrap}
.rb-L4 .md .st span{position:absolute;left:0;top:0}
.rb-L4 .md .st .w{color:#64748b}
.rb-L4 .md .st .ok{color:var(--c);opacity:0}
.rb-L4 .md .st .hx{left:auto;right:0;color:#64748b}
.rb-L4.rb-go .md .st .w{animation:rbL4out .12s linear both;animation-delay:calc(var(--f)*1ms)}
.rb-L4.rb-go .md .st .ok{animation:rbL4in .25s ease-out both;animation-delay:calc(var(--f)*1ms)}
.rb-L4 .md.lz{border-style:dashed;border-color:rgba(148,163,184,.38);background:rgba(2,6,23,.62)}
.rb-L4 .md.lz .nm{color:#94a3b8}
.rb-L4 .md.lz .fi{color:#64748b}
.rb-L4 .md.lz .st .ok{color:#64748b}
.rb-L4 .md.lz .br i{transform:none;opacity:0;background:linear-gradient(-45deg,rgba(148,163,184,.6) 25%,transparent 25%,transparent 50%,rgba(148,163,184,.6) 50%,rgba(148,163,184,.6) 75%,transparent 75%);background-size:10px 10px}
.rb-L4.rb-go .md.lz .br i{animation:rbL4in .4s ease-out both,rbL4stripe .9s linear infinite;animation-delay:calc(var(--b)*1ms),0s}
.rb-L4 .md .fl{position:absolute;left:-2px;top:-2px;right:-2px;bottom:-2px;border:1px solid #dbeafe;box-shadow:0 0 22px rgba(96,165,250,.7);opacity:0;pointer-events:none}
.rb-L4.rb-go .md .fl{animation:rbL4fl calc(var(--pt)*1ms) linear infinite both;animation-delay:calc(var(--d)*1ms)}
.rb-L4 .pn{position:absolute;width:180px;padding:6px 0 6px 10px;border-left:1px solid rgba(96,165,250,.5);background:linear-gradient(90deg,rgba(96,165,250,.08),rgba(96,165,250,0) 75%);font:12px/16px var(--rb-mono);color:#94a3b8}
.rb-L4 .pn .hd{display:flex;justify-content:space-between;margin-bottom:6px;color:var(--c);letter-spacing:.16em;text-transform:uppercase}
.rb-L4 .pn .hd b{color:#e2e8f0;font-weight:600;letter-spacing:.04em;text-transform:none}
.rb-L4 .pn .kv{display:flex;justify-content:space-between;align-items:baseline}
.rb-L4 .pn .kv b{color:#f1f5f9;font-weight:600;font-size:14px}
.rb-L4 .pn .tr{height:2px;margin:3px 0 7px;background:rgba(148,163,184,.16)}
.rb-L4 .pn .tr i{display:block;height:100%;background:var(--c);transform:scaleX(0);transform-origin:0 50%}
.rb-L4.rb-go .pn .tr i{animation:rbL4tw 2.1s cubic-bezier(.2,.6,.3,1) both;animation-delay:calc(var(--d)*1ms)}
.rb-L4 .pn .ft{display:flex;justify-content:space-between;margin-top:4px;color:#64748b}
.rb-L4 .pn svg{display:block}
.rb-L4 .eqb{transform-box:fill-box;transform-origin:50% 100%}
.rb-L4.rb-go .eqb{animation:rbL4in .3s ease-out both,rbL4eq calc(var(--t)*1ms) ease-in-out infinite alternate both;animation-delay:calc(var(--d)*1ms),calc(var(--d)*1ms)}
.rb-L4 .pn .q{position:relative;height:22px;overflow:hidden;border-left:2px solid var(--c)}
.rb-L4 .pn .qs{position:absolute;left:0;top:2px;display:flex;width:max-content}
.rb-L4.rb-go .pn .qs{animation:rbL4q 11s linear infinite}
.rb-L4 .pn .qs i{flex:none;font-style:normal;margin-left:6px;padding:0 6px;border:1px solid rgba(96,165,250,.3);color:#cbd5e1;line-height:16px;background:rgba(96,165,250,.07)}
.rb-L4 .rdy{display:inline-block;margin-top:7px;padding:2px 8px;border:1px solid var(--c);background:rgba(96,165,250,.16);color:#f8fafc;font-weight:700;letter-spacing:.12em;box-shadow:0 0 18px rgba(96,165,250,.45)}
.rb-L4 .rdy i{font-style:normal;color:#93c5fd;animation:rbL4blink 1s ease-in-out infinite alternate}
@keyframes rbL4in{from{opacity:0}to{opacity:1}}
@keyframes rbL4out{to{opacity:0}}
@keyframes rbL4pop{from{opacity:0;transform:scale(.55)}to{opacity:1;transform:scale(1)}}
@keyframes rbL4draw{to{stroke-dashoffset:0}}
@keyframes rbL4march{from{stroke-dashoffset:0}to{stroke-dashoffset:-16}}
@keyframes rbL4breathe{from{opacity:1}to{opacity:.5}}
@keyframes rbL4wave{from{opacity:.9;transform:scale(1)}to{opacity:0;transform:scale(3.4)}}
@keyframes rbL4spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes rbL4sweep{0%{opacity:0;transform:rotate(-142.5deg)}8%{opacity:1}86%{opacity:1}100%{opacity:0;transform:rotate(227.5deg)}}
@keyframes rbL4pk{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}52%{opacity:1}58%{opacity:0;transform:translate(var(--dx),var(--dy))}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
@keyframes rbL4box{from{opacity:0;transform:translateY(10px) scale(.92)}to{opacity:1;transform:none}}
@keyframes rbL4grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes rbL4fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes rbL4stripe{from{background-position:0 0}to{background-position:10px 0}}
@keyframes rbL4fl{0%,54%{opacity:0}58%{opacity:1}82%,100%{opacity:0}}
@keyframes rbL4tw{from{transform:scaleX(0)}to{transform:scaleX(var(--w))}}
@keyframes rbL4eq{from{transform:scaleY(var(--a))}to{transform:scaleY(var(--z))}}
@keyframes rbL4q{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes rbL4blink{to{opacity:.25}}
`,
  build(body, api) {
    const BH = api.BH || 508, oy = Math.max(0, Math.round((BH - 508) / 2));
    const CX = 500, CY = 254, RX = 345, RY = 194, HW = 92, HH = 38, C = "#60a5fa";
    const r1 = n => Math.round(n * 10) / 10;
    const rad = a => a * Math.PI / 180;

    // name, file, load status (empty = lazy), bar ms
    const mods = [
      ["Window Manager", "app.js · z-order", "12ms", 300],
      ["Desktop Grid", "app.js · snap + save", "8ms", 300],
      ["Start Menu", "app.js · menu tree", "5ms", 300],
      ["Firestore Sync", "sdk · resume-41921", "84ms · live", 420],
      ["Games", "games.js · lazy", "", 200],
      ["Sound Synth", "sound.js · WebAudio", "3ms · armed", 300],
      ["Extras", "extras.js · lazy", "", 200],
      ["Taskbar + Tray", "app.js · net + batt", "9ms", 300],
    ];
    const per = [1900, 2300, 2100, 2500, 0, 2000, 0, 2200];
    const back = { 1: 2900, 3: 2700, 7: 3100 };

    let spokes = "", pulses = "", boxes = "", k = 0;
    mods.forEach(([nm, file, ok, bt], i) => {
      const lz = !ok;
      const a = rad(-112.5 + 45 * i);
      const mx = CX + RX * Math.cos(a), my = CY + RY * Math.sin(a);
      const dx = mx - CX, dy = my - CY, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const t = Math.min(Math.abs(dx) > 0.01 ? (HW + 6) / Math.abs(dx) : 1, Math.abs(dy) > 0.01 ? (HH + 6) / Math.abs(dy) : 1);
      const sx = r1(CX + ux * 90), sy = r1(CY + uy * 90), ex = r1(mx - dx * t), ey = r1(my - dy * t);
      const len = Math.ceil(Math.hypot(ex - sx, ey - sy)) + 1;
      const S = 400 + 210 * i, fl = S + 210 + bt;
      const ln = `x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}"`;
      const dash = `stroke-dasharray="${len} ${len}" stroke-dashoffset="${len}"`;
      let flash = "";
      if (lz) {
        spokes += `<line class="dr" ${ln} stroke="#64748b" stroke-opacity=".6" ${dash} style="--d:${S}"/>`
          + `<line class="mch" ${ln} stroke="${C}" stroke-opacity=".55" stroke-dasharray="2 6" style="--d:${S + 300}"/>`;
      } else {
        spokes += `<line class="dr" ${ln} stroke="${C}" stroke-opacity=".14" stroke-width="6" ${dash} style="--d:${S}"/>`
          + `<line class="dr" ${ln} stroke="${C}" stroke-opacity=".8" stroke-width="1.2" ${dash} style="--d:${S}"/>`;
        const D = 2500 + k * 150, P = per[i];
        pulses += `<g class="pk" style="--dx:${r1(ex - sx)}px;--dy:${r1(ey - sy)}px;--pt:${P};--d:${D}">`
          + `<circle cx="${sx}" cy="${sy}" r="7" fill="${C}" fill-opacity=".22"/><circle cx="${sx}" cy="${sy}" r="2.6" fill="#e0f2fe"/></g>`;
        if (back[i]) {
          pulses += `<circle class="pk" cx="${ex}" cy="${ey}" r="2.2" fill="#f8fafc" style="--dx:${r1(sx - ex)}px;--dy:${r1(sy - ey)}px;--pt:${back[i]};--d:${D + 900}"/>`;
        }
        flash = `<div class="fl" style="--pt:${P};--d:${D}"></div>`;
        k++;
      }
      boxes += `<div class="md ${lz ? "lz" : "ek"}" style="left:${r1(mx - HW)}px;top:${r1(oy + my - HH)}px;--d:${S + 100};--b:${S + 180};--bt:${bt};--f:${fl}">`
        + `<div class="nm">${nm}</div><div class="fi">${file}</div><div class="br"><i></i></div>`
        + `<div class="st"><span class="w">${lz ? "resolving…" : "boot…"}</span>`
        + `<span class="ok">${lz ? "lazy · on demand" : "ok " + ok}</span>`
        + (lz ? "" : `<span class="hx">0x${api.hex(4)}</span>`)
        + `</div>${flash}</div>`;
    });

    // radar sweep: rotates in circle space, scaled onto the module ellipse
    let sw = `<circle r="104" fill="none"/>`;
    const sop = [0.24, 0.14, 0.08, 0.045, 0.02];
    for (let j = 0; j < 5; j++) {
      const a0 = rad(-7 * j), a1 = rad(-7 * (j + 1));
      sw += `<path d="M0 0L${r1(104 * Math.cos(a0))} ${r1(104 * Math.sin(a0))}A104 104 0 0 0 ${r1(104 * Math.cos(a1))} ${r1(104 * Math.sin(a1))}Z" fill="${C}" fill-opacity="${sop[j]}"/>`;
    }
    sw += `<line x1="0" y1="0" x2="104" y2="0" stroke="#bfdbfe" stroke-opacity=".85" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;
    const sweep = `<g transform="translate(${CX} ${CY}) scale(${RX / 100} ${RY / 100})"><g class="sw">${sw}</g></g>`;

    // dependency side-links: quadratic curves between neighbours
    const links = [
      [728, 437, 770, 437, 770, 370, 2050, "scores", 734, 458, "start"],
      [538, 446, 500, 476, 462, 446, 2170, "sfx", 500, 480, "middle"],
      [232, 138, 232, 78, 272, 76, 2300, "windows", 240, 132, "start"],
    ];
    let lk = "";
    links.forEach(([x0, y0, x1, y1, x2, y2, d, lb, lx, ly, an]) => {
      let len = 0, px = x0, py = y0;
      for (let s = 1; s <= 24; s++) {
        const t = s / 24, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * x1 + t * t * x2, y = u * u * y0 + 2 * u * t * y1 + t * t * y2;
        len += Math.hypot(x - px, y - py); px = x; py = y;
      }
      len = Math.ceil(len) + 2;
      const p = `d="M${x0} ${y0}Q${x1} ${y1} ${x2} ${y2}" fill="none"`;
      lk += `<path class="dl" ${p} stroke="#cbd5e1" stroke-opacity=".45" stroke-dasharray="${len} ${len}" stroke-dashoffset="${len}" style="--d:${d}"/>`
        + `<path class="mch" ${p} stroke="${C}" stroke-opacity=".9" stroke-width="1.4" stroke-dasharray="2 6" style="--d:${d + 380}"/>`
        + `<circle class="p" cx="${x2}" cy="${y2}" r="3" fill="${C}" style="--d:${d + 380}"/>`
        + `<text class="o lt" x="${lx}" y="${ly}" text-anchor="${an}" style="--d:${d + 250}">${lb}</text>`;
    });

    const orbits = `<ellipse class="o" cx="${CX}" cy="${CY}" rx="${RX}" ry="${RY}" fill="none" stroke="${C}" stroke-opacity=".18" stroke-dasharray="2 7" style="--d:180"/>`
      + `<ellipse class="mch" cx="${CX}" cy="${CY}" rx="215" ry="121" fill="none" stroke="${C}" stroke-opacity=".22" stroke-dasharray="1 7" style="--d:260"/>`;

    const hub = `<g transform="translate(${CX} ${CY})">`
      + `<circle class="wv" r="54" fill="none" stroke="#93c5fd" stroke-width="1.5" style="--d:40"/>`
      + `<circle class="wv" r="54" fill="none" stroke="#93c5fd" stroke-width="1.5" style="--d:2650"/>`
      + `<g class="p" style="--d:300"><circle class="spr" r="84" fill="none" stroke="${C}" stroke-opacity=".35" stroke-width="3" stroke-dasharray="1 7.8"/></g>`
      + `<g class="p" style="--d:200"><circle class="sp1" r="70" fill="none" stroke="${C}" stroke-opacity=".5" stroke-dasharray="3 5"/>`
      + `<circle class="sp2" r="70" fill="none" stroke="#e0f2fe" stroke-width="2.4" stroke-dasharray="34 406" stroke-linecap="round"/></g>`
      + `<g class="p" style="--d:40"><circle r="54" fill="#050b1c" fill-opacity=".92" stroke="${C}" stroke-width="1.6"/>`
      + `<circle r="47" fill="none" stroke="${C}" stroke-opacity=".28"/></g>`
      + `<text class="o hs" y="-24" text-anchor="middle" style="--d:300">◆ main</text>`
      + `<text class="o hn" y="2" text-anchor="middle" style="--d:260">app.js</text>`
      + `<text class="o hf" y="20" text-anchor="middle" style="--d:380">frame 16.6ms</text>`
      + `<text class="o hl" x="-100" y="4" text-anchor="end" style="--d:420">EVENT LOOP</text>`
      + `<text class="o hl tk" x="100" y="4" style="--d:420">tick 000000</text>`
      + `</g>`;

    const glow = `<radialGradient id="rbL4glow"><stop offset="0" stop-color="${C}" stop-opacity=".34"/>`
      + `<stop offset=".45" stop-color="${C}" stop-opacity=".09"/><stop offset="1" stop-color="${C}" stop-opacity="0"/></radialGradient>`;

    // frame-time bars
    let bars = "";
    for (let i = 0; i < 14; i++) {
      const last = i === 13;
      bars += `<rect class="eqb" x="${r1(i * 13)}" y="0" width="8" height="54" fill="${last ? "#e0f2fe" : C}" fill-opacity="${last ? 0.95 : 0.7}"`
        + ` style="--d:${520 + i * 24};--t:${Math.round(api.rand(380, 900))};--a:${api.rand(0.16, 0.4).toFixed(2)};--z:${api.rand(0.36, 0.66).toFixed(2)}"/>`;
    }
    bars += `<line x1="0" y1="13" x2="180" y2="13" stroke="#94a3b8" stroke-opacity=".55" stroke-dasharray="3 3"/>`;

    const ev = ["click", "pointermove", "dragend", "keydown", "resize", "online", "storage"];
    const chips = ev.map(e => `<i>${e}</i>`).join("");

    const panels =
      `<div class="pn o" style="left:16px;top:10px;--d:300">`
      + `<div class="hd">Main thread<b>● live</b></div>`
      + `<div class="kv"><span>heap</span><b class="L4h">0.0 MB</b></div><div class="tr"><i style="--w:.47;--d:340"></i></div>`
      + `<div class="kv"><span>listeners</span><b class="L4l">0</b></div><div class="tr"><i style="--w:.62;--d:400"></i></div>`
      + `<div class="kv"><span>DOM nodes</span><b class="L4n">0</b></div><div class="tr"><i style="--w:.78;--d:460"></i></div>`
      + `</div>`
      + `<div class="pn o" style="right:16px;top:10px;--d:480">`
      + `<div class="hd">Frames<b>60 fps</b></div>`
      + `<svg width="180" height="54" viewBox="0 0 180 54">${bars}</svg>`
      + `<div class="ft"><span>budget 16.6ms</span><span>p99 9.8</span></div>`
      + `</div>`
      + `<div class="pn o" style="left:16px;bottom:10px;--d:640">`
      + `<div class="hd">Event queue<b class="L4q">3</b></div>`
      + `<div class="q"><div class="qs">${chips}${chips}</div></div>`
      + `<div class="ft"><span class="L4i">idle 71% · 0 dropped</span></div>`
      + `</div>`
      + `<div class="pn o" style="right:16px;bottom:10px;--d:820">`
      + `<div class="hd">Boot<b>MK-PC</b></div>`
      + `<div class="kv"><span>DOMContentLoaded</span><b>182ms</b></div>`
      + `<div class="kv"><span>eager</span><b class="L4e">0 / 6</b></div>`
      + `<div class="kv"><span>lazy chunks</span><b>2 parked</b></div>`
      + `<div class="rdy p" style="--d:2650"><i>●</i> RUNTIME READY</div>`
      + `</div>`;

    body.innerHTML =
      `<svg class="L4v" width="1000" height="${BH}" viewBox="0 0 1000 ${BH}"><defs>${glow}</defs>`
      + `<g transform="translate(0 ${oy})">`
      + `<circle class="hglow" cx="${CX}" cy="${CY}" r="150" fill="url(#rbL4glow)"/>`
      + orbits + sweep + spokes + lk + pulses + hub
      + `</g></svg>` + boxes + panels;
  },
  go(body, api) {
    const q = s => body.querySelector(s);
    const comma = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const v1 = q(".L4h"), v2 = q(".L4l"), v3 = q(".L4n");
    const fr = q(".hf"), tk = q(".tk"), eg = q(".L4e"), qn = q(".L4q"), idl = q(".L4i");

    api.at(40, () => api.tick());
    api.at(340, () => {
      if (v1) api.count(v1, 142, 2100, n => (Math.round(n) / 10).toFixed(1) + " MB");
      if (v2) api.count(v2, 212, 2100, n => String(Math.round(n)));
      if (v3) api.count(v3, 3140, 2100, comma);
    });

    // eager modules flip to "ok": bump the boot counter, click on a few key ones
    const eks = body.querySelectorAll(".md.ek");
    eks.forEach((m, i) => {
      const f = parseFloat(m.style.getPropertyValue("--f")) || 0;
      api.at(f, () => {
        if (eg) eg.textContent = (i + 1) + " / " + eks.length;
        if (i === 0 || i === 3 || i === eks.length - 1) api.tick();
      });
    });
    api.at(2650, () => api.tick());

    // ambient: event-loop tick counter, frame jitter, queue depth
    let n = 0;
    api.every(100, () => {
      n += 6;
      if (tk) tk.textContent = "tick " + String(n).padStart(6, "0");
    });
    api.every(480, () => {
      if (fr) fr.textContent = "frame " + (16.4 + api.rand(0, 0.45)).toFixed(1) + "ms";
    });
    api.every(420, () => {
      if (qn) qn.textContent = String(1 + Math.floor(api.rand(0, 4)));
    });
    api.every(900, () => {
      if (idl) idl.textContent = "idle " + Math.round(api.rand(62, 79)) + "% · 0 dropped";
    });

    // after the count-up: heap sawtooth with GC drops, DOM node drift
    let heap = 14.2;
    api.at(2600, () => api.every(650, () => {
      heap += api.rand(0.04, 0.22);
      if (heap > 15.3) heap = 13.9;
      if (v1) v1.textContent = heap.toFixed(1) + " MB";
      if (v3) v3.textContent = comma(3140 + Math.round(api.rand(-8, 14)));
    }));
  },
};

  const CSS = `
@property --gap { syntax: "<length>"; inherits: true; initial-value: 120px; }
.rb { position: fixed; inset: 0; z-index: 100001; overflow: hidden; color: #e2e8f0; cursor: default; user-select: none; -webkit-user-select: none;
  --rb-mono: ui-monospace, "Cascadia Mono", "SF Mono", Consolas, "Courier New", monospace; --rb-sans: "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif;
  font: 12px var(--rb-sans); --c: #22d3ee; opacity: 0; transition: opacity .5s ease;
  background: radial-gradient(ellipse 80% 70% at 50% 58%, #0c1733 0%, #050a1c 48%, #010208 100%); }
.rb.on { opacity: 1; }
.rb.rb-out { opacity: 0; transition: opacity .8s ease; pointer-events: none; }
.rb.rb-handoff { background: transparent; transition: background .3s; }
.rb-bg { position: absolute; inset: 0; width: 100%; height: 100%; transition: opacity .8s; }
.rb-scene { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; perspective: 2600px; perspective-origin: 50% 42%; }
.rb-cam { position: relative; flex: none; transform-style: preserve-3d; --gap: 120px; opacity: 0;
  transition: transform 1.3s cubic-bezier(.7,0,.3,1), --gap 1.3s cubic-bezier(.7,0,.3,1), opacity .6s; }
.rb-cam.on { opacity: 1; }
.rb-floor { position: absolute; left: -520px; right: -520px; top: -420px; bottom: -420px; transform: translateZ(calc(var(--gap) * -.7)); pointer-events: none; transition: opacity 1s;
  -webkit-mask-image: radial-gradient(closest-side, #000 20%, transparent 100%); mask-image: radial-gradient(closest-side, #000 20%, transparent 100%);
  background: linear-gradient(rgba(56,189,248,.16) 1px, transparent 1px) 0 0 / 60px 60px, linear-gradient(90deg, rgba(56,189,248,.16) 1px, transparent 1px) 0 0 / 60px 60px; }
.rb-layer { position: absolute; inset: 0; transform: translateZ(calc(var(--i) * var(--gap))); transition: opacity .9s; }
.rb-layer.rb-drop { animation: rbDrop 1s cubic-bezier(.16,.84,.24,1) both; }
@keyframes rbDrop { from { transform: translateZ(calc(var(--i) * var(--gap) + 620px)); opacity: 0; } 45% { opacity: 1; } to { transform: translateZ(calc(var(--i) * var(--gap))); opacity: 1; } }
.rb-plate { position: absolute; inset: 0; border-radius: 12px; border: 1px solid var(--c); transition: opacity .8s, box-shadow .8s;
  background: linear-gradient(color-mix(in srgb, var(--c) 11%, transparent) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(90deg, color-mix(in srgb, var(--c) 11%, transparent) 1px, transparent 1px) 0 0 / 40px 40px, rgba(2,6,23,.74);
  box-shadow: 0 0 0 1px rgba(0,0,0,.5), 0 0 46px -8px var(--c), inset 0 0 70px -24px var(--c); }
.rb-plate::before { content: ""; position: absolute; inset: -1px; border-radius: inherit; pointer-events: none;
  background: linear-gradient(var(--c), var(--c)) 0 0 / 26px 2px no-repeat, linear-gradient(var(--c), var(--c)) 0 0 / 2px 26px no-repeat,
    linear-gradient(var(--c), var(--c)) 100% 100% / 26px 2px no-repeat, linear-gradient(var(--c), var(--c)) 100% 100% / 2px 26px no-repeat; }
.rb-go .rb-plate::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background-size: 260% 100%; background-repeat: no-repeat;
  background-image: linear-gradient(100deg, transparent 42%, color-mix(in srgb, var(--c) 30%, transparent) 50%, transparent 58%); animation: rbSweep 1.3s ease-out both; }
@keyframes rbSweep { from { background-position: 115% 0; } to { background-position: -20% 0; } }
.rb-tag { position: absolute; left: 0; right: 0; top: 0; height: 48px; display: flex; align-items: center; gap: 14px; padding: 0 18px; box-sizing: border-box; z-index: 2;
  border-bottom: 1px solid color-mix(in srgb, var(--c) 40%, transparent); font: 600 14px var(--rb-mono); letter-spacing: .16em; color: #f1f5f9; transition: opacity .6s; }
.rb-tag b { color: #020617; background: var(--c); padding: 3px 8px; border-radius: 3px; letter-spacing: .08em; }
.rb-tag small { color: #94a3b8; font: 400 12px var(--rb-mono); letter-spacing: .04em; }
.rb-tag em { margin-left: auto; font: 600 11px var(--rb-mono); font-style: normal; color: var(--c); letter-spacing: .2em; }
.rb-tag em::before { content: ""; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: currentColor; margin-right: 8px; vertical-align: 1px; animation: rbBlink .9s steps(2) infinite; }
.rb-done .rb-tag em::before { animation: none; }
.rb-body { position: absolute; left: 0; top: 52px; width: 1000px; overflow: hidden; }
.rb-past .rb-body, .rb-past .rb-tag { opacity: .4; transition: opacity 1s; }
.rb-past .rb-plate { box-shadow: 0 0 26px -10px var(--c), inset 0 0 40px -26px var(--c); }
.rb-past .rb-body * { animation-play-state: paused !important; }
.rb-side { position: absolute; right: 100%; top: 50%; margin-right: 46px; transform: translateY(-50%); white-space: nowrap; display: flex; align-items: center; gap: 16px;
  font: 700 40px var(--rb-mono); letter-spacing: .2em; color: var(--c); opacity: 0; transition: opacity .7s; }
.rb-side::after { content: ""; width: 46px; height: 1px; background: var(--c); }
.rb-side i { font-style: normal; color: #94a3b8; font-size: 26px; }
.rb-explode .rb-side { opacity: 1; }
.rb-sink { opacity: 0 !important; }
.rb-final .rb-L5 .rb-tag, .rb-final .rb-L5 .rb-plate, .rb-final .rb-floor { opacity: 0; }
.rb-L5 .rb-tag { background: rgba(2,6,23,.78); border-radius: 12px 12px 0 0; }
.rb-L5 .rb-body { top: 0; border-radius: 12px; transition: border-radius .8s; }
.rb-final .rb-L5 .rb-body { border-radius: 0; }
.rb-ui { position: absolute !important; inset: auto !important; left: 0 !important; top: 0 !important; transform-origin: 0 0; pointer-events: none; contain: strict; animation: none !important; }
.rb-ui.rb-nowall { background: transparent !important; }
.rb-ui .rb-w, .rb-ui .rb-w * { background: transparent !important; color: transparent !important; box-shadow: none !important; text-shadow: none !important;
  border-color: color-mix(in srgb, var(--c) 60%, transparent) !important; }
.rb-ui .rb-w { outline: 1px dashed var(--c) !important; outline-offset: -1px; }
.rb-ui .rb-w * { outline: 1px solid color-mix(in srgb, var(--c) 26%, transparent); outline-offset: -1px; }
.rb-ui .rb-w svg, .rb-ui .rb-w img, .rb-ui .rb-w canvas, .rb-ui .rb-w .avatar { opacity: 0 !important; }
.rb-ui .rb-p { animation: rbPaint .75s ease-out both !important; }
@keyframes rbPaint { 0% { opacity: .15; outline: 2px solid #fff; outline-offset: 2px; } 40% { opacity: 1; } 100% { opacity: 1; outline: 2px solid transparent; outline-offset: 0; } }
.rb-wipe { position: absolute; inset: 0; pointer-events: none; z-index: 1; opacity: 0; background-size: 300% 100%; background-repeat: no-repeat;
  background-image: linear-gradient(100deg, transparent 40%, rgba(255,255,255,.55) 49%, color-mix(in srgb, var(--c) 60%, transparent) 51%, transparent 60%); }
.rb-wipe.go { animation: rbWipe 1s ease-in-out both; }
@keyframes rbWipe { 0% { opacity: 1; background-position: 120% 0; } 90% { opacity: 1; } 100% { opacity: 0; background-position: -30% 0; } }

.rb-hud { position: absolute; inset: 0; pointer-events: none; font-family: var(--rb-mono); transition: opacity .7s; }
.rb-hud.off { opacity: 0; }
.rb-top { position: absolute; left: 26px; right: 26px; top: 20px; display: flex; align-items: center; gap: 26px; }
.rb-brand b { display: block; font: 700 15px var(--rb-mono); letter-spacing: .42em; color: #fff; }
.rb-brand span { display: block; margin-top: 3px; font-size: 11px; color: #64748b; letter-spacing: .12em; }
.rb-prog { flex: 1; min-width: 60px; height: 2px; background: #172033; position: relative; }
.rb-prog i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: var(--c); box-shadow: 0 0 12px var(--c); transition: width .8s ease, background .6s; }
.rb-prog i::after { content: ""; position: absolute; right: -3px; top: -3px; width: 8px; height: 8px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px var(--c); }
.rb-meta { text-align: right; font-size: 11px; color: #64748b; letter-spacing: .12em; }
.rb-meta b { display: block; color: var(--c); font-size: 13px; letter-spacing: .24em; transition: color .6s; }
.rb-log { position: absolute; left: 26px; top: 86px; bottom: 132px; width: 310px; overflow: hidden; font-size: 11.5px; line-height: 1.6; color: #94a3b8;
  -webkit-mask-image: linear-gradient(transparent, #000 30%); mask-image: linear-gradient(transparent, #000 30%); }
.rb-log-b { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; }
.rb-log { transition: opacity .6s; } .rb-x .rb-log { opacity: 0; }
.rb-ln { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: rbLn .35s ease-out both; }
.rb-ln s { text-decoration: none; color: #475569; } .rb-ln b { font-weight: 700; } .rb-ln.ok { color: #e2e8f0; }
@keyframes rbLn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
.rb-h { font-size: 10px; letter-spacing: .4em; color: #475569; padding-bottom: 8px; border-bottom: 1px solid #172033; margin-bottom: 8px; }
.rb-list { position: absolute; right: 26px; top: 86px; width: 236px; }
.rb-list ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.rb-list li { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border: 1px solid #172033; border-radius: 4px; font-size: 11.5px; color: #3b4a61; letter-spacing: .12em; transition: color .4s, border-color .4s, box-shadow .4s, background .4s; }
.rb-list li i { width: 8px; height: 8px; border-radius: 2px; background: #1e293b; flex: none; }
.rb-list li em { margin-left: auto; font-style: normal; font-size: 10px; letter-spacing: .14em; }
.rb-list li.build { color: #f1f5f9; border-color: var(--lc); box-shadow: 0 0 16px -5px var(--lc); background: color-mix(in srgb, var(--lc) 8%, transparent); }
.rb-list li.build i { background: var(--lc); animation: rbBlink .5s steps(2) infinite; }
.rb-list li.ok { color: #94a3b8; } .rb-list li.ok i { background: var(--lc); } .rb-list li.ok em { color: var(--lc); }
.rb-cap { position: absolute; left: 0; right: 0; bottom: 44px; text-align: center; }
.rb-cap::before { content: ""; position: absolute; left: 50%; top: 50%; width: min(1100px, 96vw); height: 260%; transform: translate(-50%, -46%); z-index: -1; pointer-events: none;
  background: radial-gradient(closest-side, rgba(1,3,11,.88), rgba(1,3,11,.6) 55%, transparent); }
.rb-cap small { display: block; font-size: 11px; letter-spacing: .55em; color: var(--c); transition: color .6s; }
.rb-cap b { display: block; font: 800 clamp(22px, 3.3vw, 46px)/1.15 var(--rb-sans); letter-spacing: .3em; text-indent: .3em; color: #fff; margin: 6px 0 4px; text-shadow: 0 0 30px color-mix(in srgb, var(--c) 60%, transparent); }
.rb-cap span { font: 14px var(--rb-sans); color: #94a3b8; letter-spacing: .05em; }
.rb-cap.swap { animation: rbCap 1s cubic-bezier(.2,.8,.2,1) both; }
.rb-cap.swap b { animation: rbCapB 1.2s cubic-bezier(.2,.8,.2,1) both; }
@keyframes rbCap { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes rbCapB { from { letter-spacing: .9em; text-indent: .9em; } to { letter-spacing: .3em; text-indent: .3em; } }
.rb-skip { position: absolute; right: 26px; bottom: 26px; pointer-events: auto; background: rgba(2,6,23,.5); border: 1px solid #334155; color: #cbd5e1; cursor: pointer;
  font: 12px var(--rb-mono); letter-spacing: .22em; padding: 8px 14px; border-radius: 3px; transition: border-color .2s, color .2s; }
.rb-skip small { margin-left: 10px; color: #64748b; letter-spacing: .1em; font-size: 10px; }
.rb-skip:hover, .rb-skip:focus-visible { border-color: var(--c); color: #fff; outline: none; }
.rb-vig { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.7) 100%), repeating-linear-gradient(0deg, rgba(255,255,255,.022) 0 1px, transparent 1px 3px); }
.rb-intro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; pointer-events: none; transition: opacity .6s, transform .9s cubic-bezier(.7,0,.3,1); }
.rb-intro.off { opacity: 0; transform: scale(1.25); }
.rb-intro-t { font: 800 clamp(26px, 4.6vw, 64px) var(--rb-sans); letter-spacing: .42em; text-indent: .42em; color: #fff; white-space: nowrap; text-shadow: 0 0 34px rgba(34,211,238,.55); }
.rb-intro-s { font: 13px var(--rb-mono); color: #64748b; letter-spacing: .22em; min-height: 1.5em; text-align: center; }
.rb-intro-s b { color: #22d3ee; font-weight: 400; }
.rb-intro-bar { width: min(420px, 70vw); height: 1px; background: linear-gradient(90deg, transparent, #22d3ee, transparent); transform: scaleX(0); transition: transform 1.2s cubic-bezier(.7,0,.3,1); }
.rb-intro-bar.on { transform: none; }
.rb-glitch-bars { position: absolute; inset: 0; pointer-events: none; opacity: 0; }
.rb-glitch-bars.go { animation: rbBars .9s steps(1) both; }
.rb-glitch-bars i { position: absolute; left: 0; right: 0; background: rgba(34,211,238,.35); }
@keyframes rbBars { 0%, 100% { opacity: 0; } 10%, 30%, 55%, 80% { opacity: 1; } 20%, 45%, 70% { opacity: 0; } }
.rb-flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
.rb-flash.go { animation: rbFlash .8s ease-out both; }
@keyframes rbFlash { 0% { opacity: 0; } 12% { opacity: .55; } 100% { opacity: 0; } }
@keyframes rbBlink { 50% { opacity: .15; } }
@media (max-width: 900px) { .rb-log, .rb-list, .rb-brand span, .rb-meta span { display: none; } .rb-top { gap: 14px; } .rb-cap { bottom: 70px; } .rb-cap span { display: block; padding: 0 16px; font-size: 12px; } }
@media (max-height: 560px) { .rb-cap span { display: none; } .rb-log { bottom: 90px; } }
.rb-rm .rb-body *, .rb-rm .rb-body *::before, .rb-rm .rb-body *::after { opacity: 1 !important; stroke-dashoffset: 0 !important; }
#desktop.rb-glitch { animation: rbGlitch 1s steps(1, end) both; }
@keyframes rbGlitch {
  0% { filter: none; transform: none; clip-path: none; }
  8% { transform: translate(-8px, 2px) skewX(5deg); filter: hue-rotate(90deg) saturate(3); }
  16% { transform: translate(6px, -3px); filter: contrast(2.2) brightness(1.3); clip-path: inset(12% 0 58% 0); }
  24% { transform: none; filter: invert(1) hue-rotate(180deg); clip-path: none; }
  32% { transform: translate(12px, 0) skewX(-8deg); filter: grayscale(1) brightness(1.8); clip-path: inset(0 0 72% 0); }
  42% { transform: translate(-4px, 5px); filter: hue-rotate(-120deg) saturate(4); clip-path: inset(46% 0 20% 0); }
  52% { transform: none; filter: brightness(2.6) contrast(.6); clip-path: none; }
  62% { transform: translate(0, -6px) scaleY(.96); filter: hue-rotate(40deg) brightness(.7); clip-path: inset(30% 0 30% 0); }
  74% { transform: scaleY(.3); filter: brightness(3); clip-path: inset(47% 0 47% 0); }
  86% { transform: scaleY(.02) scaleX(.6); filter: brightness(4); clip-path: inset(49.5% 0 49.5% 0); }
  100% { transform: scale(0); filter: brightness(0); clip-path: inset(50% 50% 50% 50%); }
}
#desktop.rb-reveal { animation: rbReveal 1.1s ease-out both; }
@keyframes rbReveal { from { filter: brightness(2.2) saturate(1.8) hue-rotate(-20deg); } to { filter: none; } }
`;

  // The last layer is the live interface itself: a copy of the visitor's desktop, drawn as a wireframe and then painted in.
  const UI_LAYER = {
    key: "ui", name: "INTERFACE", sub: "Luna shell · desktop, taskbar, windows", tagline: "Every pixel, back where you left it.", color: "#f472b6", dur: 4300,
    log: ["cloning live DOM tree", "wireframe: icon grid snap 84×86", "painting wallpaper", "compositing taskbar + tray", "hydrating desktop icons", "restoring windows + z-order", "binding pointer + keyboard", "frame ready · 60 fps"],
  };

  let running = false;

  window.REBUILD = function start(opts = {}) {
    if (running) return;
    running = true;
    const real = opts.desktop || document.getElementById("desktop");
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sp = opts.speed || (rm ? 0.6 : 1); // reduced motion: shorter, and every layer appears already built
    const soundOn = () => { try { return localStorage.getItem("xp-sounds") !== "0"; } catch { return true; } };
    const blip = (...a) => soundOn() && window.XPS?.blip?.(...a);
    const play = (n) => window.XPS?.play?.(n);

    if (!document.getElementById("rb-css")) { const st = document.createElement("style"); st.id = "rb-css"; st.textContent = CSS; document.head.appendChild(st); }

    // ---------- timers (all cancelled on skip) ----------
    let done = false;
    const timers = new Set();
    const at = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); if (!done) { try { fn(); } catch (e) { console.error("rebuild", e); } } }, Math.max(0, ms * sp)); timers.add(id); return id; };
    const every = (ms, fn) => { const id = setInterval(() => { if (!done) { try { fn(); } catch (e) { console.error("rebuild", e); } } }, ms); timers.add(id); return id; };
    const stop = (id) => { clearInterval(id); timers.delete(id); };
    const rand = (a, b) => a + Math.random() * (b - a);
    const hex = (n) => Array.from({ length: n }, () => "0123456789abcdef"[(Math.random() * 16) | 0]).join("");
    const count = (el, to, ms = 900, fmt = (n) => Math.round(n).toLocaleString("en-US")) => {
      if (!el) return; const t0 = performance.now();
      const id = every(33, () => { const p = Math.min(1, (performance.now() - t0) / (ms * sp)); el.textContent = fmt(to * (1 - Math.pow(1 - p, 3))); if (p >= 1) stop(id); });
    };
    const tick = () => blip(1300 + Math.random() * 900, 0.025, "square", 0.16);

    // ---------- geometry ----------
    const vw = innerWidth, vh = innerHeight, W = 1000;
    const H = Math.round(Math.min(700, Math.max(560, (W * vh) / vw))), BH = H - 52;
    const wide = vw > 900;
    const fit = Math.min((vw - (wide ? 620 : 20)) / 1180, (vh - (wide ? 230 : 210)) / 640, 1.1);
    const S = Math.max(0.24, fit);

    const layers = [...RB_LAYERS.filter(Boolean), UI_LAYER];
    const N = layers.length;
    const pad = (n) => String(n).padStart(2, "0");

    // ---------- DOM ----------
    const ov = document.createElement("div");
    ov.className = "rb" + (rm ? " rb-rm" : "");
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Visual Rebuild");
    ov.innerHTML = `<canvas class="rb-bg"></canvas>
      <div class="rb-scene"><div class="rb-cam" style="width:${W}px;height:${H}px"><div class="rb-floor"></div></div></div>
      <div class="rb-glitch-bars">${Array.from({ length: 7 }, () => `<i style="top:${rand(0, 96).toFixed(1)}%;height:${rand(1, 9).toFixed(1)}px"></i>`).join("")}</div>
      <div class="rb-intro"><div class="rb-intro-t">&nbsp;</div><div class="rb-intro-bar"></div><div class="rb-intro-s">&nbsp;</div></div>
      <div class="rb-hud off">
        <div class="rb-top"><div class="rb-brand"><b>VISUAL REBUILD</b><span>MK-PC · medhansh-xp · build 0x${hex(4)}</span></div>
          <div class="rb-prog"><i></i></div><div class="rb-meta"><b class="rb-lnum">LAYER --/${pad(N - 1)}</b><span class="rb-clock">00:00.000</span></div></div>
        <div class="rb-log" aria-hidden="true"><div class="rb-log-b"></div></div>
        <div class="rb-list"><div class="rb-h">STACK</div><ol>${layers.map((l, i) => `<li data-i="${i}" style="--lc:${l.color}"><i></i>L${pad(i)} ${l.name}<em>queued</em></li>`).reverse().join("")}</ol></div>
        <div class="rb-cap" aria-live="polite"><small></small><b></b><span></span></div>
      </div>
      <button class="rb-skip" type="button">SKIP<small>SPACE / ESC</small></button>
      <div class="rb-vig"></div><div class="rb-flash"></div>`;
    const q = (s) => ov.querySelector(s);
    const cam = q(".rb-cam"), hud = q(".rb-hud"), logB = q(".rb-log-b"), cap = q(".rb-cap"), intro = q(".rb-intro"), flash = q(".rb-flash");

    // snapshot the live desktop now, before the glitch touches it
    const clone = real.cloneNode(true);
    clone.removeAttribute("id"); clone.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
    clone.querySelectorAll("iframe, video, audio, script, .start-menu, .ctx, .tray-pop, .balloons").forEach((e) => e.remove());
    const realCanvases = real.querySelectorAll("canvas");
    clone.querySelectorAll("canvas").forEach((c, i) => { try { c.getContext("2d")?.drawImage(realCanvases[i], 0, 0); } catch {} });
    clone.classList.remove("arrive", "drop-over", "rb-glitch", "rb-reveal");
    clone.classList.add("rb-ui", "rb-nowall");
    clone.setAttribute("aria-hidden", "true");
    // fit the copy inside the plane, centred; at the end the camera scales the plane by 1/K so the copy lands exactly on the real screen
    const K = Math.min(W / vw, H / vh), OX = (W - vw * K) / 2, OY = (H - vh * K) / 2;
    clone.style.cssText = `width:${vw}px;height:${vh}px;transform:translate(${OX}px,${OY}px) scale(${K});`;
    // inside the overlay the copy would inherit its light HUD text: give it the page's own text styles back
    const bs = getComputedStyle(document.body);
    ["color", "font", "lineHeight", "letterSpacing", "textAlign"].forEach((k) => (clone.style[k] = bs[k]));
    const parts = { bar: [...clone.querySelectorAll(".taskbar")], icons: [...clone.querySelectorAll(".dicon")], wins: [...clone.querySelectorAll(".win:not(.min), .board-dock:not(.hidden), .board-tab:not(.hidden)")] };
    [...parts.bar, ...parts.icons, ...parts.wins].forEach((e) => e.classList.add("rb-w"));
    UI_LAYER.build = (body) => { body.style.height = H + "px"; body.appendChild(clone); body.insertAdjacentHTML("beforeend", `<div class="rb-wipe"></div>`); };
    UI_LAYER.go = (body, api) => {
      const paint = (e) => { e.classList.remove("rb-w"); e.classList.add("rb-p"); };
      api.at(500, () => { clone.classList.remove("rb-nowall"); body.querySelector(".rb-wipe").classList.add("go"); blip(220, 0.4, "sine", 1.2, 440); });
      api.at(1250, () => { parts.bar.forEach(paint); api.tick(); });
      const step = Math.min(70, 1300 / Math.max(1, parts.icons.length));
      parts.icons.forEach((e, i) => api.at(1500 + i * step, () => { paint(e); if (i % 3 === 0) api.tick(); }));
      parts.wins.forEach((e, i) => api.at(2900 + i * 160, () => { paint(e); api.tick(); }));
      UI_LAYER.log[0] = `cloning live DOM · ${clone.getElementsByTagName("*").length.toLocaleString("en-US")} nodes`;
      UI_LAYER.log[4] = `hydrating ${parts.icons.length} desktop icons`;
    };

    const layerEls = layers.map((l, i) => {
      const el = document.createElement("div");
      el.className = `rb-layer rb-L${i}`;
      el.style.setProperty("--i", i); el.style.setProperty("--c", l.color);
      el.innerHTML = `<div class="rb-plate"></div><div class="rb-tag"><b>L${pad(i)}</b><span>${l.name}</span><small>${l.sub || ""}</small><em>QUEUED</em></div>
        <div class="rb-body" style="height:${BH}px"></div><div class="rb-side"><i>L${pad(i)}</i>${l.name}</div>`;
      el.style.display = "none";
      if (l.css) { const st = document.createElement("style"); st.textContent = l.css; el.prepend(st); }
      cam.appendChild(el);
      return el;
    });
    const api = (i) => ({ W, BH, at, every, tick, count, rand, hex, index: i });
    layers.forEach((l, i) => { try { l.build?.(layerEls[i].querySelector(".rb-body"), api(i)); } catch (e) { console.error("rebuild layer " + i, e); } });

    document.body.appendChild(ov);
    const prevFocus = document.activeElement;
    q(".rb-skip").addEventListener("click", () => finish(true));

    // ---------- camera ----------
    let camState = { s: S * 0.55, rx: 20, rz: -8, z: 0, gap: 120, dx: 0, dy: 0 };
    const camTo = (p, ms = 1300, ease = "cubic-bezier(.7,0,.3,1)") => {
      camState = { ...camState, ...p };
      const { s, rx, rz, z, gap, dx, dy } = camState;
      const t = rm || ms === 0 ? "none" : `transform ${ms}ms ${ease}, --gap ${ms}ms ${ease}, opacity .6s`;
      cam.style.transition = t;
      cam.style.setProperty("--gap", gap + "px");
      cam.style.transform = `translate(${dx}px, ${dy}px) scale3d(${s}, ${s}, ${s}) rotateX(${rx}deg) rotateZ(${rz}deg) translateZ(${-z}px)`;
    };
    camTo({}, 0);

    // ---------- background: drifting data motes ----------
    const cv = q(".rb-bg"), cx = cv.getContext("2d");
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    cv.width = vw * dpr; cv.height = vh * dpr; cx.scale(dpr, dpr);
    const motes = Array.from({ length: Math.round(Math.min(140, (vw * vh) / 9000)) }, () => ({ x: rand(0, vw), y: rand(0, vh), v: rand(0.15, 0.9), r: rand(0.4, 1.6), a: rand(0.15, 0.7) }));
    let accent = "#22d3ee", raf = 0;
    const t0 = performance.now(), clockEl = q(".rb-clock");
    const frame = () => {
      raf = requestAnimationFrame(frame);
      cx.clearRect(0, 0, vw, vh);
      cx.fillStyle = accent;
      for (const m of motes) {
        m.y -= m.v; if (m.y < -4) { m.y = vh + 4; m.x = rand(0, vw); }
        cx.globalAlpha = m.a * (0.5 + 0.5 * Math.sin((performance.now() / 600) + m.x));
        cx.fillRect(m.x, m.y, m.r, m.r * (m.v > 0.7 ? 6 : 1));
      }
      cx.globalAlpha = 1;
      const e = performance.now() - t0;
      clockEl.textContent = `${pad((e / 60000) | 0)}:${pad(((e / 1000) | 0) % 60)}.${String((e | 0) % 1000).padStart(3, "0")}`;
    };
    raf = requestAnimationFrame(frame);

    // ---------- HUD helpers ----------
    const stamp = () => { const e = performance.now() - t0; return `${pad(((e / 1000) | 0) % 60)}.${String((e | 0) % 1000).padStart(3, "0")}`; };
    const log = (txt, i, ok) => {
      const d = document.createElement("div"); d.className = "rb-ln" + (ok ? " ok" : "");
      const c = i == null ? "#94a3b8" : layers[i].color;
      d.innerHTML = `<s>[${stamp()}]</s> <b style="color:${c}">${i == null ? "SYS" : "L" + pad(i)}</b> ${ok ? "✓ " : "▸ "}${txt}`;
      logB.appendChild(d); while (logB.children.length > 40) logB.firstChild.remove();
    };
    const setAccent = (c) => { accent = c; ov.style.setProperty("--c", c); };
    const listItem = (i) => q(`.rb-list li[data-i="${i}"]`);
    const caption = (small, big, line) => {
      cap.classList.remove("swap"); void cap.offsetWidth; cap.classList.add("swap");
      cap.querySelector("small").textContent = small; cap.querySelector("b").textContent = big; cap.querySelector("span").textContent = line;
    };
    const decode = (el, text, ms) => {
      const glyphs = "▓▒░█<>/\\|=+*#01ABCDEF"; const s0 = performance.now();
      const id = every(28, () => {
        const p = (performance.now() - s0) / (ms * sp);
        el.textContent = [...text].map((ch, k) => (ch === " " || k / text.length < p ? ch : glyphs[(Math.random() * glyphs.length) | 0])).join("");
        if (p >= 1) { el.textContent = text; stop(id); }
      });
    };

    // ---------- the show ----------
    // intro: the live desktop glitches out, the title decodes, then the stack starts from bedrock
    real.classList.add("rb-glitch");
    if (!rm) { q(".rb-glitch-bars").classList.add("go"); play("tilt"); }
    at(650, () => { ov.classList.add("on"); q(".rb-skip").focus({ preventScroll: true }); });
    at(900, () => { decode(q(".rb-intro-t"), "VISUAL REBUILD", 900); q(".rb-intro-bar").classList.add("on"); blip(90, 0.9, "sawtooth", 0.6, 45); });
    at(1150, () => { q(".rb-intro-s").innerHTML = "unmounting render tree · <b>0 layers remain</b>"; tick(); });
    at(1900, () => { q(".rb-intro-s").innerHTML = "rebuilding from bedrock ▸ <b>infrastructure → interface</b>"; tick(); });
    at(2700, () => {
      intro.classList.add("off"); hud.classList.remove("off");
      cam.classList.add("on");
      log("visual rebuild started · " + N + " layers queued");
    });

    let T = 2800;
    const DROP = 1000;
    layers.forEach((l, i) => {
      const start = T, dur = l.dur || 3400;
      at(start, () => {
        const el = layerEls[i];
        layerEls.forEach((p, k) => k < i && p.classList.add("rb-past"));
        el.style.display = "";
        if (!rm) el.classList.add("rb-drop");
        setAccent(l.color);
        q(".rb-lnum").textContent = `LAYER ${pad(i)}/${pad(N - 1)}`;
        q(".rb-prog i").style.width = ((i + 0.35) / N) * 100 + "%";
        listItem(i).className = "build"; listItem(i).querySelector("em").textContent = "building";
        el.querySelector(".rb-tag em").textContent = "BUILDING";
        caption(`LAYER ${pad(i)} / ${pad(N - 1)}`, l.name, l.tagline || "");
        const dz = i * 120;
        camTo({ s: S, rx: 56, rz: -38 + i * 1.5, z: dz, gap: 120, dx: wide ? 40 : 0, dy: wide ? -10 : 0 }, i === 0 ? 1600 : 1300);
        at(i === 0 ? 1600 : 1300, () => camTo({ rz: -38 + i * 1.5 + 4, s: S * 1.04 }, Math.max(800, dur + DROP - 1300) * sp, "cubic-bezier(.3,0,.7,1)"));
        log(`mounting ${l.name.toLowerCase()} layer`, i);
      });
      at(start + 620, () => blip(70, 0.45, "sine", 2.2, 34)); // the thud of a layer landing
      at(start + DROP - 250, () => {
        const el = layerEls[i];
        el.classList.add("rb-go");
        try { l.go?.(el.querySelector(".rb-body"), api(i)); } catch (e) { console.error("rebuild layer " + i, e); }
        const lines = l.log || [];
        const gapMs = (dur - 500) / Math.max(1, lines.length);
        lines.forEach((t, k) => at(120 + k * gapMs, () => log(t, i)));
      });
      at(start + DROP + dur - 150, () => {
        const el = layerEls[i];
        el.classList.add("rb-done"); el.querySelector(".rb-tag em").textContent = "READY";
        listItem(i).className = "ok"; listItem(i).querySelector("em").textContent = "ok";
        q(".rb-prog i").style.width = ((i + 1) / N) * 100 + "%";
        log(`${l.name.toLowerCase()} ready · ${((DROP + dur) / 1000).toFixed(1)}s`, i, true);
        blip(1760, 0.07, "triangle", 0.5); blip(2640, 0.09, "triangle", 0.4, 0, 0.07);
      });
      T += DROP + dur;
    });

    // outro: pull back to an exploded view of the whole stack, then collapse it flat into the live desktop
    at(T + 50, () => {
      layerEls.forEach((p) => p.classList.remove("rb-past"));
      cam.classList.add("rb-explode"); ov.classList.add("rb-x");
      setAccent("#e2e8f0");
      q(".rb-lnum").textContent = "COMPOSITE";
      caption(`${N} LAYERS · 0 ERRORS`, "COMPOSITING", "Back end first. Then everything you can see.");
      camTo({ s: S * (wide ? 0.62 : 0.5), rx: 62, rz: -24, z: ((N - 1) * 165) / 2, gap: 165, dx: wide ? 40 : 0, dy: 0 }, 1700);
      log("compositing " + N + " layers");
      blip(55, 1.4, "sawtooth", 0.5, 110);
    });
    at(T + 2300, () => { log("collapse → 1 frame"); camTo({ rz: -18 }, 700, "ease-in-out"); });
    at(T + 3000, () => {
      cam.classList.remove("rb-explode"); ov.classList.add("rb-final"); hud.classList.add("off");
      layerEls.slice(0, -1).forEach((p) => p.classList.add("rb-sink"));
      camTo({ s: 1 / K, rx: 0, rz: 0, z: 0, gap: 0, dx: 0, dy: 0 }, 1500, "cubic-bezier(.75,0,.25,1)");
      log("handoff to live desktop", null, true);
      blip(880, 1.2, "sine", 0.6, 220);
    });
    at(T + 4500, () => { flash.classList.add("go"); real.classList.remove("rb-glitch"); ov.classList.add("rb-handoff"); q(".rb-bg").style.opacity = 0; play("startup"); });
    at(T + 4700, () => finish(false));

    // ---------- skip + exit ----------
    const onKey = (e) => {
      e.stopImmediatePropagation();
      if (e.key === "Escape" || e.key === " " || e.key === "Spacebar" || e.key === "Enter") { e.preventDefault(); finish(true); }
      else if (e.key === "Tab") { e.preventDefault(); q(".rb-skip").focus(); }
    };
    addEventListener("keydown", onKey, true);
    function finish(skipped) {
      if (done) return;
      done = true;
      timers.forEach((id) => { clearTimeout(id); clearInterval(id); }); timers.clear();
      removeEventListener("keydown", onKey, true);
      real.classList.remove("rb-glitch");
      if (skipped) real.classList.add("rb-reveal");
      ov.classList.add("rb-out");
      setTimeout(() => {
        cancelAnimationFrame(raf); ov.remove(); real.classList.remove("rb-reveal"); running = false;
        if (prevFocus?.isConnected) prevFocus.focus?.({ preventScroll: true });
        opts.onDone?.();
      }, skipped ? 800 : 900);
    }
  };
})();
