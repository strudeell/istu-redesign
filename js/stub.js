/* Заглушка «404»: цифры собраны из балок, как ферма на листе чертежа. Узлы можно тянуть мышью или пальцем —
   балки под нагрузкой меняют цвет и рвутся, потом восстанавливаются; нажатие на лист даёт ударную волну.
   Размеры на чертеже считаются по живой конструкции. Раскладку скрипт берёт из размеров листа и штампа,
   поэтому одинаково работает на десктопе и в мобильной версии. */
(function () {
  var sheet = document.getElementById('stub-sheet');
  var canvas = sheet && sheet.querySelector('canvas');
  var ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  var legend = sheet.querySelector('.stub__legend');
  var outForce = document.getElementById('stub-force');
  var outBeams = document.getElementById('stub-beams');
  var CALM = !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = getComputedStyle(document.documentElement);
  function token(name, fallback) { return css.getPropertyValue(name).trim() || fallback; }
  var BRAND = token('--brand', '#1f90ec');
  var INK = token('--text-3', '#5a5a5a');
  var TEXT = token('--text', '#1e1e1e');
  var PAPER = token('--surface', '#ffffff');
  var HOT = '#e5484d';
  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { t = 1 - clamp(t, 0, 1); return 1 - t * t * t; }
  function backOut(t) { t = clamp(t, 0, 1) - 1; return 1 + t * t * (2.7 * t + 1.7); }
  function fmt1(v) { return v.toFixed(1).replace('.', ','); }

  /* ---------- Ферма ----------
     Цифра — сетка 4×7 клеток: # — клетка с раскосом, a b c d — клетка со срезанным углом
     (левый верхний и дальше по часовой). Нижний ряд узлов стоит на опорах. */
  var GLYPH = {
    '4': ['#..#', '#..#', '#..#', '#..#', '####', '...#', '...#'],
    '0': ['a##b', '#..#', '#..#', '#..#', '#..#', '#..#', 'd##c']
  };
  var WORD = '404', GW = 4, ROWS = 7, PITCH = 5, COLS = PITCH * (WORD.length - 1) + GW;
  var SIZE_W = 404, SIZE_H = 202;   /* размеры на чертеже: ширина и высота надписи */

  var nodes = [], sticks = [], supports = [];
  var cornerTL, cornerTR, cornerBR;

  (function build() {
    var nodeAt = {}, stickAt = {};
    function node(gx, gy) {
      var key = gx + ':' + gy, n = nodeAt[key];
      if (!n) {
        n = nodeAt[key] = {
          i: nodes.length, gx: gx, gy: gy, x: 0, y: 0, px: 0, py: 0, hx: 0, hy: 0,
          pin: gy === ROWS, heat: 0, delay: 120 + gx / COLS * 760 + gy / ROWS * 140, born: 0
        };
        nodes.push(n);
      }
      return n;
    }
    function stick(a, b, brace) {
      var key = Math.min(a.i, b.i) + ':' + Math.max(a.i, b.i), s = stickAt[key];
      if (s) { s.edge = false; return; }   /* сторона общая для двух клеток — внутренняя стойка */
      if (a.delay > b.delay) { s = a; a = b; b = s; }
      var dx = b.gx - a.gx, dy = b.gy - a.gy;
      s = stickAt[key] = {
        a: a, b: b, k: Math.sqrt(dx * dx + dy * dy), len: 0, edge: !brace,
        strain: 0, heat: 0, broken: false, mend: false, born: 0, snapAt: 0, healAt: 0
      };
      sticks.push(s);
    }
    WORD.split('').forEach(function (ch, di) {
      var pins = [];
      GLYPH[ch].forEach(function (row, y) {
        for (var x = 0; x < GW; x++) {
          var c = row.charAt(x);
          if (c === '.') continue;
          var gx = di * PITCH + x, cut = 'abcd'.indexOf(c), k;
          var q = [[gx, y], [gx + 1, y], [gx + 1, y + 1], [gx, y + 1]].map(function (p, j) {
            return j === cut ? null : node(p[0], p[1]);
          });
          for (k = 0; k < 4; k++) if (q[k] && q[(k + 1) % 4]) stick(q[k], q[(k + 1) % 4], false);
          if (cut >= 0) stick(q[(cut + 1) % 4], q[(cut + 3) % 4], false);
          else if ((gx + y) % 2) stick(q[0], q[2], true);
          else stick(q[1], q[3], true);
          for (k = 0; k < 4; k++) if (q[k] && q[k].pin && pins.indexOf(q[k]) < 0) pins.push(q[k]);
        }
      });
      pins.sort(function (a, b) { return a.gx - b.gx; });
      supports.push({ node: pins[0], roller: false }, { node: pins[pins.length - 1], roller: true });
    });
    cornerTL = nodeAt['0:0']; cornerTR = nodeAt[COLS + ':0']; cornerBR = nodeAt[COLS + ':' + ROWS];
  })();

  /* ---------- Раскладка ---------- */
  var W = 0, H = 0, dpr = 1, cell = 0, ox = 0, oy = 0;
  var small = false, sideDim = false, gapTop = 0, gapSide = 0;
  var lwEdge = 2, lwBrace = 1.2, nodeR = 3.5;

  var fitted = '';

  function layout() {
    var box = sheet.getBoundingClientRect(), w = sheet.clientWidth, h = sheet.clientHeight;
    if (!w || !h) return false;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);

    /* Чертёж занимает место слева от штампа, а если штамп во всю ширину листа — над ним */
    var right = w, bottom = h;
    if (legend) {
      var l = legend.getBoundingClientRect();
      if (l.width > w * 0.8) bottom = Math.round(l.top - box.top); else right = Math.round(l.left - box.left);
    }
    var key = [w, h, ratio, right, bottom].join(' ');
    if (key === fitted) return false;
    fitted = key;

    var was = cell;
    W = w; H = h; dpr = ratio;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    small = right < 560;
    sideDim = !small;
    var pad = small ? 14 : 32;
    var availW = right - pad * 2, availH = bottom - pad * 2;
    var minTop = small ? 36 : 44, minFoot = 14, minSide = 46;
    cell = Math.min(
      56,
      sideDim ? Math.min(availW / (COLS + 1.5), (availW - minSide) / COLS) : availW / COLS,
      Math.min(availH / (ROWS + 2), (availH - minTop - minFoot) / ROWS));
    cell = Math.max(8, Math.floor(cell));
    gapTop = Math.max(cell * 1.25, minTop);
    gapSide = sideDim ? Math.max(cell * 1.5, minSide) : 0;
    var foot = Math.max(cell * 0.75, minFoot);
    ox = Math.round(pad + (availW - COLS * cell - gapSide) / 2);
    oy = Math.round(pad + (availH - gapTop - ROWS * cell - foot) / 2 + gapTop);

    lwEdge = clamp(cell * 0.05, 1.6, 2.5);
    lwBrace = clamp(cell * 0.028, 1, 1.4);
    nodeR = clamp(cell * 0.085, 2.4, 4);

    /* При смене размера листа узлы переезжают вместе со своим отклонением и скоростью */
    var i, n, k = was ? cell / was : 0;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var hx = ox + n.gx * cell, hy = oy + n.gy * cell;
      n.x = hx + (n.x - n.hx) * k; n.y = hy + (n.y - n.hy) * k;
      n.px = hx + (n.px - n.hx) * k; n.py = hy + (n.py - n.hy) * k;
      n.hx = hx; n.hy = hy;
    }
    if (grab) { target.x = grab.x; target.y = grab.y; }
    for (i = 0; i < sticks.length; i++) sticks[i].len = sticks[i].k * cell;

    /* Миллиметровка листа (фон в CSS) совпадает с узлами фермы */
    sheet.style.setProperty('--cell', cell + 'px');
    sheet.style.setProperty('--gx', (ox % cell) + 'px');
    sheet.style.setProperty('--gy', (oy % cell) + 'px');
    return true;
  }

  /* ---------- Физика ----------
     Узлы держатся за свои места (пружина) и друг за друга (балки). Балка хорошо держит растяжение
     и почти не держит сжатие — «теряет устойчивость», поэтому конструкция мнётся, а не выворачивается.
     Соотношение K_HOME и K_PULL задаёт, как далеко от узла расходится деформация (сейчас — на 2–3 клетки). */
  var STEP = 1 / 120, ITER = 3;
  var K_HOME = 700, DRAG = 8, K_PULL = 0.13, K_PUSH = 0.07;
  var SNAP = 0.62;       /* удлинение, при котором балка рвётся */
  var HEAL = 2400;       /* мс до восстановления */
  var SPARK = 420;       /* мс живёт искра от разрыва */

  var grab = null, hover = null, target = { x: 0, y: 0 }, grabOff = { x: 0, y: 0 };
  var rings = [], gusts = [], sparks = [];

  function physics() {
    var damp = Math.exp(-DRAG * STEP), pull = K_HOME * STEP * STEP, i, it, n, s;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.pin) continue;
      if (n === grab) { n.px = n.x; n.py = n.y; n.x = target.x; n.y = target.y; continue; }
      var vx = (n.x - n.px) * damp, vy = (n.y - n.py) * damp;
      n.px = n.x; n.py = n.y;
      n.x += vx + (n.hx - n.x) * pull;
      n.y += vy + (n.hy - n.y) * pull;
    }
    for (it = 0; it < ITER; it++) {
      for (i = 0; i < sticks.length; i++) {
        s = sticks[i];
        if (s.broken) continue;
        var a = s.a, b = s.b;
        var wa = a.pin || a === grab ? 0 : 1, wb = b.pin || b === grab ? 0 : 1, w = wa + wb;
        if (!w) continue;
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        var e = (d - s.len) / d * (d > s.len ? K_PULL : K_PUSH) / w;
        a.x += dx * e * wa; a.y += dy * e * wa;
        b.x -= dx * e * wb; b.y -= dy * e * wb;
      }
    }
  }

  /* Ударная волна и порыв ветра толкают узел в тот момент, когда до него доходит фронт */
  function waves(now) {
    var i, j, n, g, r, d, dx, dy, f;
    for (i = rings.length - 1; i >= 0; i--) {
      g = rings[i]; r = (now - g.t) / 1000 * g.speed;
      for (j = 0; j < nodes.length; j++) {
        n = nodes[j];
        if (n.pin || n === grab) continue;
        dx = n.x - g.x; dy = n.y - g.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d <= g.r || d > r || d >= g.R) continue;
        f = Math.pow(1 - d / g.R, 2) * g.power;
        n.px -= dx / d * f; n.py -= dy / d * f;
      }
      g.r = r;
      if (r > g.R) rings.splice(i, 1);
    }
    for (i = gusts.length - 1; i >= 0; i--) {
      g = gusts[i]; r = (now - g.t) / 1000 * g.speed;
      for (j = 0; j < nodes.length; j++) {
        n = nodes[j];
        d = g.dir > 0 ? n.hx - ox : ox + COLS * cell - n.hx;
        if (n.pin || n === grab || d < g.r || d >= r) continue;
        n.px -= g.dir * g.power * (0.6 + Math.random() * 0.4);
        n.py += (Math.random() - 0.5) * g.power * 0.5;
      }
      g.r = r;
      if (r > COLS * cell + 1) gusts.splice(i, 1);
    }
  }

  var start = 0, intact = 0, restless = false;

  function snap(s, now) {
    s.broken = true; s.snapAt = now; s.healAt = now + HEAL + Math.random() * 700; s.heat = 0; s.strain = 0;
    if (CALM) return;
    var mx = (s.a.x + s.b.x) / 2, my = (s.a.y + s.b.y) / 2;
    for (var k = 0; k < 5; k++) {
      var ang = Math.random() * TAU, v = cell * (2 + Math.random() * 5);
      sparks.push({ x: mx, y: my, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - cell * 2, t: now });
    }
  }

  /* Напряжения в балках, разрывы и восстановление */
  function measure(now) {
    var ready = now - start > 1500, i, s, n, dx, dy, d, t;
    intact = 0; restless = false;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i]; n.heat = 0;
      if (Math.abs(n.x - n.px) + Math.abs(n.y - n.py) > 0.02 || Math.abs(n.x - n.hx) + Math.abs(n.y - n.hy) > 0.1) restless = true;
    }
    for (i = 0; i < sticks.length; i++) {
      s = sticks[i];
      dx = s.b.x - s.a.x; dy = s.b.y - s.a.y; d = Math.sqrt(dx * dx + dy * dy);
      if (s.broken) {
        restless = true;
        if (now > s.healAt && s.a !== grab && s.b !== grab && Math.abs(d - s.len) < s.len * 0.12) {
          s.broken = false; s.mend = true; s.born = now;
        }
        continue;
      }
      intact++;
      s.strain = (d - s.len) / s.len;
      if (ready && s.strain > SNAP) { snap(s, now); intact--; restless = true; continue; }
      t = s.strain > 0 ? Math.min(1, s.strain / SNAP) : Math.min(0.55, -s.strain * 0.8);
      s.heat += (t - s.heat) * 0.35;
      if (s.heat < 0.004) s.heat = 0; else restless = true;
      if (now - s.born < 450) restless = true;
      if (s.heat > s.a.heat) s.a.heat = s.heat;
      if (s.heat > s.b.heat) s.b.heat = s.heat;
    }
  }

  var force = 0;   /* усилие на узле, который тянут, кН */

  function readouts() {
    force = 0;
    if (grab) {
      var dx = grab.x - grab.hx, dy = grab.y - grab.hy;
      force = Math.sqrt(dx * dx + dy * dy) / cell * 12;
    }
    var f = fmt1(force) + ' кН', b = intact + '/' + sticks.length;
    if (outForce && outForce.textContent !== f) outForce.textContent = f;
    if (outBeams && outBeams.textContent !== b) outBeams.textContent = b;
  }

  /* ---------- Отрисовка ---------- */
  /* Цвет балки: от фирменного синего через фиолетовый к красному — чем ближе к пределу, тем горячее */
  function heatColor(t) {
    if (t < 0.02) return BRAND;
    return 'hsl(' + Math.round(207 + 150 * t) + ',84%,' + Math.round(52 + 3 * t) + '%)';
  }
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function arrow(x, y, ux, uy, len, half) {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x - ux * len - uy * half, y - uy * len + ux * half);
    ctx.lineTo(x - ux * len + uy * half, y - uy * len - ux * half);
    ctx.closePath(); ctx.fill();
  }
  function label(text, x, y, color) {
    ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = PAPER; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function font(weight, size) { ctx.font = weight + ' ' + size + 'px Inter, system-ui, sans-serif'; }

  function drawSupports(now) {
    var alpha = CALM ? 1 : easeOut((now - start) / 500);
    var h = Math.max(7, cell * 0.36), w = h * 0.62, r = Math.max(1.5, h * 0.17), k, q, s, x, y, g;
    ctx.globalAlpha = alpha; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.lineJoin = 'round';
    for (k = 0; k < supports.length; k++) {
      s = supports[k]; x = s.node.hx; y = s.node.hy; g = y + h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - w, g); ctx.lineTo(x + w, g); ctx.closePath(); ctx.stroke();
      if (s.roller) {
        ctx.beginPath();
        ctx.arc(x - w * 0.5, g + r + 1, r, 0, TAU);
        ctx.moveTo(x + w * 0.5 + r, g + r + 1);
        ctx.arc(x + w * 0.5, g + r + 1, r, 0, TAU);
        ctx.stroke();
        g += r * 2 + 2;
      }
      line(x - w * 1.5, g, x + w * 1.5, g);
      for (q = -1.2; q < 1.5; q += 0.6) line(x + w * q, g, x + w * q - h * 0.3, g + h * 0.3);
    }
    ctx.globalAlpha = 1;
  }

  /* Размерные линии: выносные идут от живых узлов, число — текущий размер конструкции */
  function drawDims(now) {
    var p = CALM ? 1 : easeOut((now - start - 900) / 700);
    if (p <= 0) return;
    var fs = small ? 12 : 14, al = small ? 7 : 9, ah = small ? 2 : 2.5, over = small ? 4 : 6, off = nodeR + 4;
    var A = cornerTL, B = cornerTR, C = cornerBR, mid, half, v;
    ctx.strokeStyle = ctx.fillStyle = INK; ctx.lineWidth = 1; ctx.globalAlpha = p;
    font(500, fs); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

    var y = oy - gapTop + fs + 10;
    line(A.x, A.y - off, A.x, y - over); line(B.x, B.y - off, B.x, y - over);
    mid = (A.x + B.x) / 2; half = (B.x - A.x) / 2 * p;
    line(mid - half, y, mid + half, y);
    ctx.fillStyle = INK; arrow(mid - half, y, -1, 0, al, ah); arrow(mid + half, y, 1, 0, al, ah);
    v = Math.round((B.x - A.x) / (COLS * cell) * SIZE_W * p);
    label(String(v), mid, y - 6, TEXT);

    if (sideDim) {
      var x = ox + COLS * cell + gapSide - fs - 10;
      ctx.strokeStyle = INK; ctx.lineWidth = 1;
      line(B.x + off, B.y, x + over, B.y); line(C.x + off, C.y, x + over, C.y);
      mid = (B.y + C.y) / 2; half = (C.y - B.y) / 2 * p;
      line(x, mid - half, x, mid + half);
      ctx.fillStyle = INK; arrow(x, mid - half, 0, -1, al, ah); arrow(x, mid + half, 0, 1, al, ah);
      v = Math.round((C.y - B.y) / (ROWS * cell) * SIZE_H * p);
      ctx.save(); ctx.translate(x - 6, mid); ctx.rotate(-Math.PI / 2);
      label(String(v), 0, 0, TEXT);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawSticks(now) {
    var pass, i, s, a, b, p, t, mx, my;
    ctx.lineCap = 'round';
    for (pass = 0; pass < 2; pass++) {   /* сначала раскосы и стойки, поверх — контур цифр */
      for (i = 0; i < sticks.length; i++) {
        s = sticks[i];
        if (s.edge !== !!pass) continue;
        a = s.a; b = s.b;
        if (s.broken) {
          /* оборванная балка: два обрывка втягиваются к своим узлам */
          t = (now - s.snapAt) / 220;
          if (t >= 1) continue;
          mx = b.x - a.x; my = b.y - a.y;
          p = (1 - t) * 0.42 * s.len / (Math.sqrt(mx * mx + my * my) || 1);
          ctx.strokeStyle = HOT; ctx.globalAlpha = 1 - t; ctx.lineWidth = s.edge ? lwEdge : lwBrace;
          line(a.x, a.y, a.x + mx * p, a.y + my * p);
          line(b.x, b.y, b.x - mx * p, b.y - my * p);
          continue;
        }
        p = easeOut((now - s.born) / (s.mend ? 360 : 420));
        if (p <= 0) continue;
        ctx.strokeStyle = heatColor(s.heat);
        ctx.globalAlpha = s.edge ? 1 : 0.55 + 0.45 * Math.min(1, s.heat * 2);
        ctx.lineWidth = (s.edge ? lwEdge : lwBrace) * (1 - 0.3 * clamp(s.strain, -0.4, 1));
        if (p >= 1) line(a.x, a.y, b.x, b.y);
        else if (s.mend) {   /* восстановление: балка срастается с двух концов */
          mx = (b.x - a.x) * p / 2; my = (b.y - a.y) * p / 2;
          line(a.x, a.y, a.x + mx, a.y + my); line(b.x, b.y, b.x - mx, b.y - my);
        } else line(a.x, a.y, a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawNodes(now) {
    var i, n, p, held = grab || hover;
    if (held) {
      ctx.beginPath(); ctx.arc(held.x, held.y, Math.max(grab ? 12 : 10, cell * (grab ? 0.3 : 0.25)), 0, TAU);
      ctx.fillStyle = BRAND; ctx.globalAlpha = grab ? 0.18 : 0.12; ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.lineWidth = 1.5; ctx.fillStyle = PAPER;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      p = backOut((now - n.born) / 260);
      if (now < n.born || p <= 0) continue;
      ctx.beginPath(); ctx.arc(n.x, n.y, nodeR * p * (n === held ? 1.3 : 1), 0, TAU);
      ctx.fill(); ctx.strokeStyle = heatColor(n.heat); ctx.stroke();
    }
  }

  /* Вектор силы на узле, который тянут, и пунктир к его исходному месту */
  function drawForce() {
    if (!grab) return;
    var dx = grab.x - grab.hx, dy = grab.y - grab.hy, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 6) return;
    var ux = dx / d, uy = dy / d, r = nodeR + 5, len = Math.min(cell * 1.8, 18 + d * 0.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.globalAlpha = 0.7; ctx.lineCap = 'butt';
    ctx.setLineDash([3, 4]); line(grab.hx, grab.hy, grab.x - ux * r, grab.y - uy * r); ctx.setLineDash([]);
    line(grab.hx - 4, grab.hy, grab.hx + 4, grab.hy); line(grab.hx, grab.hy - 4, grab.hx, grab.hy + 4);
    ctx.globalAlpha = 1; ctx.strokeStyle = ctx.fillStyle = HOT; ctx.lineWidth = 2;
    var tx = grab.x + ux * (r + len), ty = grab.y + uy * (r + len);
    line(grab.x + ux * r, grab.y + uy * r, tx - ux * 7, ty - uy * 7);
    arrow(tx, ty, ux, uy, 10, 4);
    /* подпись — за остриём стрелки, но всегда в пределах листа */
    var text = 'F = ' + fmt1(force) + ' кН', tw;
    font(600, small ? 12 : 13);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    tw = ctx.measureText(text).width;
    label(text,
      clamp(tx + ux * 10 - (ux > 0.35 ? 0 : ux < -0.35 ? tw : tw / 2), 6, W - tw - 6),
      clamp(ty + uy * 14, 12, H - 12), HOT);
  }

  function drawRings() {
    for (var i = 0; i < rings.length; i++) {
      var g = rings[i], k = g.r / g.R;
      if (k <= 0 || k >= 1) continue;
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU);
      ctx.strokeStyle = BRAND; ctx.lineWidth = 2; ctx.globalAlpha = Math.pow(1 - k, 1.2) * 0.8; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawSparks(now) {
    ctx.strokeStyle = HOT; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (var i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      ctx.globalAlpha = clamp(1 - (now - s.t) / SPARK, 0, 1);
      line(s.x, s.y, s.x - s.vx * 0.025, s.y - s.vy * 0.025);
    }
    ctx.globalAlpha = 1;
  }

  function paint(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawSupports(now); drawDims(now); drawRings(); drawSticks(now); drawNodes(now); drawForce(); drawSparks(now);
  }

  /* ---------- Цикл: пока всё в покое, кадры не рисуются ---------- */
  var raf = 0, last = 0, clock = 0, acc = 0, visible = true, touched = 0;

  function frame(now) {
    raf = 0;
    if (!cell) return;
    if (!start) {
      start = CALM ? now - 1e5 : now;
      nodes.forEach(function (n) { n.born = start + n.delay; });
      sticks.forEach(function (s) { s.born = start + s.a.delay - 60; });
    }
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60, i, s;
    last = clock = now; acc += dt;
    waves(now);
    while (acc >= STEP) { physics(); acc -= STEP; }
    for (i = sparks.length - 1; i >= 0; i--) {
      s = sparks[i];
      if (now - s.t > SPARK) { sparks.splice(i, 1); continue; }
      s.vy += cell * 22 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    }
    measure(now);
    readouts();
    paint(now);

    if (grab || restless || rings.length || gusts.length || sparks.length || now - start < 1800) wake();
    else {   /* всё улеглось: узлы точно на своих местах, цикл засыпает до следующего события */
      last = 0;
      for (i = 0; i < nodes.length; i++) { s = nodes[i]; s.x = s.px = s.hx; s.y = s.py = s.hy; }
    }
  }
  function wake() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  /* ---------- Мышь и касания ---------- */
  function point(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function nearest(p, radius) {
    var best = null, min = radius * radius, i, n, dx, dy, d;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.pin) continue;
      dx = n.x - p.x; dy = n.y - p.y; d = dx * dx + dy * dy;
      if (d < min) { min = d; best = n; }
    }
    return best;
  }
  function reach(touch) { return touch ? Math.max(26, cell * 0.6) : Math.max(14, cell * 0.36); }
  function shock(p) {
    rings.push({ x: p.x, y: p.y, t: performance.now(), r: 0, R: cell * 6, speed: cell * 22, power: cell * 0.26 });
  }
  function setHover(n) {
    if (n === hover) return;
    hover = n;
    canvas.style.cursor = grab ? 'grabbing' : n ? 'grab' : '';
  }

  var pointerId = null, downAt = null, lastAt = null;

  function release(e) {
    if (e.pointerId !== pointerId) return;
    if (grab) { grab = null; canvas.style.cursor = hover ? 'grab' : ''; }
    pointerId = null; downAt = null; touched = performance.now();
    wake();
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.button || grab) return;
    var p = point(e), n = nearest(p, reach(e.pointerType === 'touch'));
    pointerId = e.pointerId; downAt = p; touched = performance.now();
    if (n) {
      grab = n; grabOff.x = n.x - p.x; grabOff.y = n.y - p.y; target.x = n.x; target.y = n.y;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* без захвата узел просто отпустится у края листа */ }
      canvas.style.cursor = 'grabbing';
    }
    wake();
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = point(e);
    if (grab) {
      if (e.pointerId === pointerId) { target.x = p.x + grabOff.x; target.y = p.y + grabOff.y; touched = performance.now(); wake(); }
      return;
    }
    if (e.pointerType === 'touch') return;
    setHover(nearest(p, reach(false)));
    /* Курсор «задевает» балки на ходу: узлы рядом получают толчок по направлению движения */
    if (lastAt && !CALM) {
      var mx = clamp(p.x - lastAt.x, -24, 24), my = clamp(p.y - lastAt.y, -24, 24), R = cell * 1.5, i, n, d, f;
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.pin) continue;
        d = Math.sqrt((n.x - p.x) * (n.x - p.x) + (n.y - p.y) * (n.y - p.y));
        if (d >= R) continue;
        f = Math.pow(1 - d / R, 2) * 0.22;
        n.px -= mx * f; n.py -= my * f;
      }
      touched = performance.now();
    }
    lastAt = p;
    wake();
  });
  canvas.addEventListener('pointerup', function (e) {
    var p = point(e), tap = !grab && downAt && e.pointerId === pointerId &&
      Math.abs(p.x - downAt.x) + Math.abs(p.y - downAt.y) < 10;
    if (tap) shock(p);
    release(e);
  });
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', function (e) {
    lastAt = null;
    if (grab && !(canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId))) release(e);
    if (!grab) { setHover(null); wake(); }
  });
  /* Палец на узле — тянем узел; мимо узла — страница прокручивается как обычно */
  canvas.addEventListener('touchstart', function (e) {
    if (nearest(point(e.changedTouches[0]), reach(true))) e.preventDefault();
  }, { passive: false });

  /* ---------- Жизнь без участия человека: порыв ветра раз в несколько секунд ---------- */
  function gust() {
    var now = performance.now();
    if (visible && !document.hidden && !grab && start && now - start > 2600 && now - touched > 4000) {
      gusts.push({ t: now, r: -1, dir: Math.random() < 0.5 ? 1 : -1, speed: cell * 16, power: cell * 0.05 });
      wake();
    }
    setTimeout(gust, 4200 + Math.random() * 2800);
  }
  if (!CALM) setTimeout(gust, 4200);

  /* ---------- Запуск ---------- */
  /* Смена размера стирает холст — перерисовываем сразу, не дожидаясь кадра, чтобы лист не мигал */
  function refit() {
    if (layout() && start) paint(clock);
    wake();
  }
  if (window.ResizeObserver) new ResizeObserver(refit).observe(sheet);
  else window.addEventListener('resize', refit);
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (list) {
      visible = list[list.length - 1].isIntersecting;
      if (visible) { last = 0; wake(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(sheet);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { last = 0; wake(); } });
  if (window.Site && window.Site.onFonts) window.Site.onFonts(wake);
  refit();
})();
