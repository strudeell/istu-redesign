/* Каталог «Образовательные программы»: фильтры применяются сразу, состояние хранится в адресе страницы. */
(function () {
  var S = window.Site, I = window.ICONS, ALL = window.PROGRAMS;
  var esc = S.esc;

  var LEVELS = ['bachelor', 'specialist', 'master', 'postgrad', 'spo'];
  var EGE_LEVELS = { bachelor: true, specialist: true };
  var CATS = {
    eng: 'Инженерные и технические', it: 'IT и математика', hum: 'Социально-гуманитарные направления',
    art: 'Творческие направления', sport: 'Физическая культура и спорт', econ: 'Экономика, управление и право'
  };
  var BASE_SUBJECTS = ['Математика', 'Русский язык'];
  var PRICE_MIN = 40, PRICE_MAX = 200;
  var PER_PAGE = 6;
  var SORT_DEFAULT_DIR = { pass: 'asc', budget: 'desc', price: 'asc' };

  function defaults() {
    return {
      level: 'bachelor', q: '', cat: [], form: [], budget: false, dorm: false,
      ege: '', score: null, subj: [], pmin: PRICE_MIN, pmax: PRICE_MAX,
      sort: 'pass', dir: 'asc', view: 'grid', page: 1
    };
  }

  /* ---------- Состояние <-> адрес ---------- */
  function readState() {
    var st = defaults();
    var p = new URLSearchParams(location.search);
    var list = function (k) { return p.get(k) ? p.get(k).split(',').filter(Boolean) : []; };
    if (LEVELS.indexOf(p.get('level')) >= 0) st.level = p.get('level');
    st.q = p.get('q') || '';
    st.cat = list('cat').filter(function (c) { return CATS[c]; });
    st.form = list('form').filter(function (f) { return S.FORM[f]; });
    st.budget = p.get('budget') === '1';
    st.dorm = p.get('dorm') === '1';
    if (p.get('ege') === 'score' || p.get('ege') === 'subj') st.ege = p.get('ege');
    var sc = parseInt(p.get('score'), 10);
    st.score = isNaN(sc) ? null : Math.max(0, Math.min(400, sc));
    st.subj = list('subj');
    var pr = (p.get('price') || '').split('-').map(Number);
    if (pr.length === 2 && !isNaN(pr[0]) && !isNaN(pr[1])) {
      st.pmin = Math.max(PRICE_MIN, Math.min(pr[0], PRICE_MAX));
      st.pmax = Math.max(st.pmin, Math.min(pr[1], PRICE_MAX));
    }
    if (SORT_DEFAULT_DIR[p.get('sort')]) st.sort = p.get('sort');
    if (p.get('dir') === 'asc' || p.get('dir') === 'desc') st.dir = p.get('dir');
    else st.dir = SORT_DEFAULT_DIR[st.sort];
    if (p.get('view') === 'list') st.view = 'list';
    var pg = parseInt(p.get('page'), 10);
    if (pg > 0) st.page = pg;
    return st;
  }

  function query(st) {
    var d = defaults(), p = new URLSearchParams();
    if (st.level !== d.level) p.set('level', st.level);
    if (st.q) p.set('q', st.q);
    if (st.cat.length) p.set('cat', st.cat.join(','));
    if (st.form.length) p.set('form', st.form.join(','));
    if (st.budget) p.set('budget', '1');
    if (st.dorm) p.set('dorm', '1');
    if (st.ege) p.set('ege', st.ege);
    if (st.score !== null) p.set('score', st.score);
    if (st.subj.length) p.set('subj', st.subj.join(','));
    if (st.pmin !== PRICE_MIN || st.pmax !== PRICE_MAX) p.set('price', st.pmin + '-' + st.pmax);
    if (st.sort !== d.sort || st.dir !== SORT_DEFAULT_DIR[st.sort]) { p.set('sort', st.sort); p.set('dir', st.dir); }
    if (st.view !== d.view) p.set('view', st.view);
    if (st.page > 1) p.set('page', st.page);
    var s = p.toString();
    return s ? '?' + s : '';
  }

  /* ---------- Логика подбора ---------- */
  function norm(s) { return s.toLowerCase().replace(/ё/g, 'е'); }

  function egeApplies(st) { return !!EGE_LEVELS[st.level]; }

  function hasSubjects(p, subj) {
    var has = {};
    BASE_SUBJECTS.concat(subj).forEach(function (s) { has[s] = true; });
    var ex = p.exams;
    if (ex.text.length || ex.internal.length) return false;
    if (!ex.required.every(function (e) { return has[e.subject]; })) return false;
    if (ex.choice.length && !ex.choice.some(function (e) { return has[e.subject]; })) return false;
    return true;
  }

  function priceActive(st) { return st.pmin !== PRICE_MIN || st.pmax !== PRICE_MAX; }

  /* Форма, по которой показываем цену: подходящая под фильтры, очная — в приоритете */
  function pickForm(p, st) {
    var forms = p.forms.filter(function (f) { return !st.form.length || st.form.indexOf(f.form) >= 0; });
    if (!forms.length) forms = p.forms;
    if (priceActive(st)) {
      var inRange = forms.filter(function (f) { return f.price === null || (f.price >= st.pmin * 1000 && f.price <= st.pmax * 1000); });
      if (inRange.length) return inRange[0];
    }
    return forms[0];
  }

  function priceOk(p, st) {
    if (!priceActive(st)) return true;
    var f = pickForm(p, st);
    return f.price === null || (f.price >= st.pmin * 1000 && f.price <= st.pmax * 1000);
  }

  function matches(p, st, skip) {
    if (p.level !== st.level) return false;
    if (skip !== 'q' && st.q) {
      var q = norm(st.q.trim());
      if (q && norm(p.code + ' ' + p.name + ' ' + p.direction).indexOf(q) < 0) return false;
    }
    if (skip !== 'cat' && st.cat.length && st.cat.indexOf(p.category) < 0) return false;
    if (skip !== 'form' && st.form.length && !p.forms.some(function (f) { return st.form.indexOf(f.form) >= 0; })) return false;
    if (skip !== 'budget' && st.budget && !(p.budget > 0)) return false;
    if (skip !== 'dorm' && st.dorm && !p.dorm) return false;
    if (skip !== 'subj' && egeApplies(st) && st.subj.length && !hasSubjects(p, st.subj)) return false;
    if (skip !== 'price' && !priceOk(p, st)) return false;
    return true;
  }

  function sortValue(p, st) {
    if (st.sort === 'pass') return p.pass2025;
    if (st.sort === 'budget') return p.budget;
    return pickForm(p, st).price;
  }

  function compare(a, b, st) {
    var va = sortValue(a, st), vb = sortValue(b, st);
    if (va === null && vb === null) return a.name.localeCompare(b.name, 'ru');
    if (va === null) return 1;
    if (vb === null) return -1;
    if (va !== vb) return st.dir === 'asc' ? va - vb : vb - va;
    return a.name.localeCompare(b.name, 'ru');
  }

  /* Профили одного направления идут подряд; группы упорядочены по лучшему профилю */
  function arrange(list, st) {
    var groups = {}, order = [];
    list.forEach(function (p) {
      if (!groups[p.code]) { groups[p.code] = []; order.push(p.code); }
      groups[p.code].push(p);
    });
    order.forEach(function (c) { groups[c].sort(function (a, b) { return compare(a, b, st); }); });
    order.sort(function (x, y) {
      var r = compare(groups[x][0], groups[y][0], st);
      return r || x.localeCompare(y);
    });
    return order.reduce(function (acc, c) { return acc.concat(groups[c]); }, []);
  }

  function status(p, st) {
    if (!egeApplies(st) || st.score === null || st.score <= 0) return null;
    if (!(p.budget > 0)) return { kind: 'none', icon: 'xCircle', text: 'Бюджетных мест нет' };
    if (p.pass2025 === null) return { kind: 'ok', icon: 'checkCircle', text: 'Приём без конкурса' };
    var d = st.score - p.pass2025;
    if (d >= 10) return { kind: 'ok', icon: 'checkCircle', text: 'Проходишь на бюджет' };
    if (d >= 0) return { kind: 'edge', icon: 'alertCircle', text: d === 0 ? 'На грани: ровно проходной балл' : 'На грани: запас ' + d + ' ' + S.plural(d, 'балл', 'балла', 'баллов') };
    return { kind: 'miss', icon: 'xCircle', text: 'Не хватает ' + (-d) + ' ' + S.plural(-d, 'балла', 'баллов', 'баллов') };
  }

  /* ---------- Подписи ---------- */
  function formsLabel(p) {
    return p.forms.map(function (f, i) {
      var t = S.FORM[f.form].adv;
      return i ? t.toLowerCase() : t;
    }).join('/');
  }
  function durationLabel(p) {
    var seen = [];
    p.forms.forEach(function (f) { if (seen.indexOf(f.duration) < 0) seen.push(f.duration); });
    if (seen.length === 1) return S.durationShort(seen[0]);
    var short = seen.map(S.durationShort);
    var years = short.map(function (s) { return /^(\d+(?:,5)?) (год|года|лет)$/.exec(s); });
    if (years.every(Boolean)) {
      var nums = years.map(function (m) { return m[1]; }).sort(function (a, b) { return parseFloat(a.replace(',', '.')) - parseFloat(b.replace(',', '.')); });
      return nums[0] + '–' + nums[nums.length - 1] + ' года';
    }
    return 'от ' + short.sort()[0];
  }
  function priceView(p, st) {
    var f = pickForm(p, st);
    var prices = p.forms.map(function (x) { return x.price; });
    var differs = prices.some(function (x) { return x !== prices[0]; });
    var label = 'Стоимость обучения в год';
    if (f.price === null) return { text: true, value: 'нет платного набора', label: label };
    if (differs) label += ' (' + S.FORM[f.form].adv.toLowerCase() + ')';
    return { text: false, value: S.fmtInt(f.price) + ' р.', label: label };
  }
  function passView(p) {
    if (p.noContest || p.pass2025 === null) return { text: true, value: 'без конкурса' };
    return { text: false, value: S.fmtNum(p.pass2025) };
  }
  function examItems(p, grid) {
    var ex = p.exams, cols = [];
    if (ex.text.length) {
      cols.push({ cls: 'exams__col--plain', items: ex.text });
      return cols;
    }
    var req = ex.required.slice().sort(function (a, b) {
      return (a.subject === 'Русский язык' ? -1 : 0) - (b.subject === 'Русский язык' ? -1 : 0);
    }).map(function (e) { return e.subject + ' (ЕГЭ)'; });
    cols.push({ cls: '', items: req });
    if (ex.internal.length) cols.push({ cls: grid ? 'exams__col--plain' : '', items: ex.internal.map(function (e) { return e.subject; }) });
    if (ex.choice.length) cols.push({ cls: 'exams__col--choice', items: ex.choice.map(function (e) { return e.subject; }) });
    return cols;
  }

  /* ---------- Разметка карточек ---------- */
  function pillsHTML(p, row) {
    var html = '<span class="pcard__code">' + esc(p.code) + '</span>';
    var pills = '<span class="pill">' + S.LEVEL[p.level].pill + '</span>' +
      '<span class="pill">' + formsLabel(p) + '</span>' +
      '<span class="pill" data-optional>' + durationLabel(p) + '</span>';
    return '<div class="pcard__pills">' + html + pills + '</div>';
  }
  function perksHTML(p) {
    var perk = function (on, yes, no) {
      return '<span class="perk' + (on ? '' : ' perk--off') + '">' + (on ? I.checkCircle : I.xCircle) + (on ? yes : no) + '</span>';
    };
    return '<div class="perks">' + perk(p.military, 'Есть военная кафедра', 'Нет военной кафедры') +
      perk(p.dorm, 'Есть общежитие', 'Нет общежития') + '</div>';
  }
  function numsHTML(p, st) {
    var pass = passView(p), price = priceView(p, st);
    var num = function (v, label) {
      return '<div class="num"><p class="num__value' + (v.text ? ' num__value--text' : '') + '">' + v.value + '</p><p class="num__label">' + label + '</p></div>';
    };
    return '<div class="nums">' +
      num(pass, 'Проходной балл за 2025 год') +
      num({ text: false, value: S.fmtInt(p.budget) }, 'Бюджетных мест <br>в 2026 году') +
      num(price, price.label) + '</div>';
  }
  function statusHTML(p, st) {
    var s = status(p, st);
    if (!s) return '';
    return '<p class="status status--' + s.kind + '">' + I[s.icon] + s.text + '</p>';
  }
  function examsHTML(p, grid) {
    var cols = examItems(p, grid);
    return '<div class="exams-block"><h4 class="exams-block__title">Вступительные экзамены</h4><div class="exams">' +
      cols.map(function (c) {
        return '<ul class="exams__col ' + c.cls + '">' + c.items.map(function (t) { return '<li class="exam">' + esc(t) + '</li>'; }).join('') + '</ul>';
      }).join('') + '</div></div>';
  }
  function moreHTML(url) {
    return '<a class="btn btn--primary btn--lg" href="' + url + '">Подробнее ' + I.arrowRight.replace('class="icon"', 'class="icon icon-arrow"') + '</a>';
  }
  function titleHTML(p, url) {
    return '<h3 class="pcard__title"><a href="' + url + '">' + esc(p.name) + '</a></h3>';
  }

  function cardHTML(p, st, back) {
    var url = S.programUrl(p, back);
    if (st.view === 'list') {
      return '<article class="pcard pcard--row"><div class="pcard__row">' +
        '<div class="pcard__main">' + pillsHTML(p, true) + titleHTML(p, url) + perksHTML(p) + '</div>' +
        examsHTML(p, false) +
        '<div class="pcard__side">' + numsHTML(p, st) + statusHTML(p, st) + '<div class="pcard__actions">' + moreHTML(url) + '</div></div>' +
        '</div></article>';
    }
    return '<article class="pcard">' +
      '<div class="pcard__main">' + pillsHTML(p, false) + titleHTML(p, url) + perksHTML(p) + '</div>' +
      numsHTML(p, st) + statusHTML(p, st) + examsHTML(p, true) +
      '<div class="pcard__actions">' + moreHTML(url) + '</div></article>';
  }

  /* После вставки: длинные названия — меньшим кеглем, лишние бейджи прячем, чтобы ничего не переносилось */
  function lineCount(t) {
    var prev = t.style.cssText;
    t.style.display = 'block'; t.style.height = 'auto'; t.style.webkitLineClamp = 'unset'; t.style.overflow = 'visible';
    var n = Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight));
    t.style.cssText = prev;
    return n;
  }
  /* Как в макете: 24 px, если не влезает — 20 px, дальше 16 px (в списке допускаем три строки) */
  function fitCards(root) {
    root.querySelectorAll('.pcard__title').forEach(function (t) {
      var max = t.closest('.pcard--row') ? 3 : 2;
      t.classList.remove('is-md', 'is-long');
      if (lineCount(t) <= max) return;
      t.classList.add('is-md');
      if (lineCount(t) <= max) return;
      t.classList.remove('is-md');
      t.classList.add('is-long');
    });
    root.querySelectorAll('.pcard:not(.pcard--row) .pcard__pills').forEach(function (row) {
      var opt = row.querySelector('[data-optional]');
      if (opt) opt.hidden = false;
      if (opt && row.scrollWidth > row.clientWidth + 1) opt.hidden = true;
    });
  }

  /* ---------- Элементы страницы ---------- */
  var st = readState();
  var els = {
    tabs: document.getElementById('level-tabs'),
    q: document.getElementById('q'),
    search: document.getElementById('search'),
    qClear: document.getElementById('q-clear'),
    found: document.getElementById('found'),
    results: document.getElementById('results'),
    pagination: document.getElementById('pagination'),
    chips: document.getElementById('chips'),
    form: document.getElementById('filters'),
    secEge: document.getElementById('sec-ege'),
    panelScore: document.getElementById('panel-score'),
    panelSubj: document.getElementById('panel-subj'),
    score: document.getElementById('score'),
    scoreRange: document.getElementById('score-range'),
    pmin: document.getElementById('price-min'),
    pmax: document.getElementById('price-max'),
    priceOut: document.getElementById('price-out'),
    filtersOpen: document.getElementById('filters-open'),
    filtersCount: document.getElementById('filters-count')
  };

  function countFor(level) {
    var s = Object.assign({}, st, { level: level });
    return ALL.filter(function (p) { return matches(p, s); }).length;
  }

  function renderTabs() {
    els.tabs.innerHTML = LEVELS.map(function (lv) {
      var active = lv === st.level;
      return '<button class="level-tab' + (active ? ' is-active' : '') + '" type="button" data-level="' + lv + '"' +
        (active ? ' aria-current="true"' : '') + '>' + S.LEVEL[lv].tab + '</button>';
    }).join('');
  }

  function syncControls() {
    if (els.q.value !== st.q) els.q.value = st.q;
    els.search.classList.toggle('has-value', !!st.q);
    els.form.querySelectorAll('input[name=cat]').forEach(function (i) { i.checked = st.cat.indexOf(i.value) >= 0; });
    els.form.querySelectorAll('input[name=form]').forEach(function (i) { i.checked = st.form.indexOf(i.value) >= 0; });
    els.form.querySelector('input[name=budget]').checked = st.budget;
    els.form.querySelector('input[name=dorm]').checked = st.dorm;
    els.form.querySelectorAll('input[name=ege]').forEach(function (i) { i.checked = i.value === st.ege; });
    els.panelScore.hidden = st.ege !== 'score';
    els.panelSubj.hidden = st.ege !== 'subj';
    els.secEge.hidden = !egeApplies(st);
    if (document.activeElement !== els.score) els.score.value = st.score === null ? '' : st.score;
    els.scoreRange.value = st.score === null ? 0 : Math.min(st.score, 310);
    els.form.querySelectorAll('input[name=subj]').forEach(function (i) { i.checked = st.subj.indexOf(i.value) >= 0; });
    els.pmin.value = st.pmin;
    els.pmax.value = st.pmax;
    els.priceOut.textContent = st.pmin + '–' + st.pmax;
    document.querySelectorAll('.toggle[data-sort]').forEach(function (b) {
      var on = b.getAttribute('data-sort') === st.sort;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) b.setAttribute('data-dir', st.dir); else b.removeAttribute('data-dir');
      b.title = on ? (st.dir === 'asc' ? 'По возрастанию — нажмите, чтобы развернуть' : 'По убыванию — нажмите, чтобы развернуть') : '';
    });
    document.querySelectorAll('.view-btn').forEach(function (b) {
      var on = b.getAttribute('data-view') === st.view;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* Активные фильтры — чипами над списком */
  function activeFilters() {
    var out = [];
    if (st.q) out.push({ key: 'q', label: 'Поиск: «' + st.q + '»' });
    st.cat.forEach(function (c) { out.push({ key: 'cat', value: c, label: CATS[c] }); });
    st.form.forEach(function (f) { out.push({ key: 'form', value: f, label: S.FORM[f].filter }); });
    if (st.budget) out.push({ key: 'budget', label: 'Есть бюджетные места' });
    if (st.dorm) out.push({ key: 'dorm', label: 'Есть общежитие' });
    if (egeApplies(st)) {
      if (st.score !== null && st.score > 0) out.push({ key: 'score', label: 'Сумма баллов: ' + st.score });
      st.subj.forEach(function (s) { out.push({ key: 'subj', value: s, label: 'ЕГЭ: ' + s }); });
    }
    if (priceActive(st)) out.push({ key: 'price', label: st.pmin + '–' + st.pmax + ' тыс. ₽ в год' });
    return out;
  }

  function removeFilter(key, value) {
    if (key === 'cat' || key === 'form' || key === 'subj') st[key] = st[key].filter(function (v) { return v !== value; });
    else if (key === 'q') st.q = '';
    else if (key === 'budget' || key === 'dorm') st[key] = false;
    else if (key === 'score') st.score = null;
    else if (key === 'price') { st.pmin = PRICE_MIN; st.pmax = PRICE_MAX; }
  }

  function renderChips(list) {
    els.chips.hidden = !list.length;
    els.chips.innerHTML = list.length ? '<span class="chips__label">Выбрано:</span>' + list.map(function (f) {
      return '<button class="tag tag--filter" type="button" data-remove="' + f.key + '"' + (f.value ? ' data-value="' + esc(f.value) + '"' : '') +
        ' aria-label="Убрать фильтр ' + esc(f.label) + '">' + esc(f.label) + I.x + '</button>';
    }).join('') : '';
    var n = list.length;
    els.filtersCount.textContent = n ? '· ' + n : '';
  }

  /* Пустой результат: подсказываем, какой фильтр ослабить */
  function emptyHTML(list) {
    var title = 'Ничего не найдено', text = '', actions = [];
    var levelTotal = ALL.filter(function (p) { return p.level === st.level; }).length;
    if (!levelTotal) {
      title = 'В ' + (st.level === 'specialist' ? 'специалитете' : 'этом разделе') + ' сейчас нет программ';
      text = 'В 2026 году ИжГТУ не набирает студентов на специалитет. Посмотрите программы бакалавриата — там ' +
        countFor('bachelor') + ' ' + S.plural(countFor('bachelor'), 'программа', 'программы', 'программ') + ' по вашим условиям.';
      actions.push('<button class="btn btn--primary btn--md" type="button" data-level-go="bachelor">Открыть бакалавриат</button>');
    } else if (st.level === 'bachelor' && st.cat.indexOf('it') >= 0) {
      text = 'В бакалавриате ИжГТУ нет IT-направлений. С информатикой можно поступить на инженерные программы — «Строительство» и «Техносферная безопасность». IT-специальности есть в СПО.';
      actions.push('<button class="btn btn--primary btn--md" type="button" data-hint="it-eng">Показать инженерные программы</button>');
      actions.push('<button class="btn btn--outline" type="button" data-level-go="spo">IT-программы СПО</button>');
    } else {
      var best = null;
      ['subj', 'cat', 'form', 'price', 'budget', 'dorm', 'q'].forEach(function (key) {
        if (key === 'subj' && !(egeApplies(st) && st.subj.length)) return;
        var n = ALL.filter(function (p) { return matches(p, st, key); }).length;
        if (n > 0 && (!best || n > best.n)) best = { key: key, n: n };
      });
      var names = {
        subj: 'предметы ЕГЭ', cat: 'направление', form: 'форму обучения', price: 'стоимость',
        budget: 'бюджетные места', dorm: 'общежитие', q: 'поиск'
      };
      if (best) {
        text = 'Под все условия сразу не подходит ни одна программа. Если убрать фильтр «' + names[best.key] + '», найдётся ' +
          best.n + ' ' + S.plural(best.n, 'программа', 'программы', 'программ') + '.';
        actions.push('<button class="btn btn--primary btn--md" type="button" data-relax="' + best.key + '">Убрать «' + names[best.key] + '»</button>');
      } else {
        text = 'Попробуйте изменить условия поиска или сбросить фильтры.';
      }
      if (list.length > 1) actions.push('<button class="btn btn--outline" type="button" data-reset-filters>Сбросить все фильтры</button>');
    }
    return '<div class="empty"><p class="empty__face" aria-hidden="true">;(</p><h2 class="t-heading">' + title + '</h2>' +
      '<p class="t-body empty__text">' + S.typo(text) + '</p><div class="empty__actions">' + actions.join('') + '</div></div>';
  }

  function renderPagination(pages) {
    if (pages <= 1) { els.pagination.innerHTML = ''; return; }
    var items = [], cur = st.page;
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - cur) <= 1) items.push(i);
      else if (items[items.length - 1] !== '…') items.push('…');
    }
    els.pagination.innerHTML =
      '<button class="pg-btn" type="button" data-page="' + (cur - 1) + '"' + (cur === 1 ? ' disabled' : '') + '>' + I.arrowLeftSmall + '<span>Назад</span></button>' +
      '<div class="pagination__list">' + items.map(function (i) {
        return i === '…' ? '<span class="pg-gap">...</span>' :
          '<button class="pg-btn' + (i === cur ? ' is-current' : '') + '" type="button" data-page="' + i + '"' + (i === cur ? ' aria-current="page"' : '') + '>' + i + '</button>';
      }).join('') + '</div>' +
      '<button class="pg-btn" type="button" data-page="' + (cur + 1) + '"' + (cur === pages ? ' disabled' : '') + '><span>Далее</span>' + I.arrowRightSmall + '</button>';
  }

  function render(opts) {
    opts = opts || {};
    var list = arrange(ALL.filter(function (p) { return matches(p, st); }), st);
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    st.page = Math.min(Math.max(1, st.page), pages);
    var qs = query(st);
    try { history.replaceState(null, '', location.pathname + qs); } catch (e) { /* file:// в некоторых браузерах */ }
    try { sessionStorage.setItem('catalogQuery', qs); } catch (e) { /* хранилище может быть недоступно */ }

    renderTabs();
    syncControls();
    var active = activeFilters();
    renderChips(active);
    els.found.innerHTML = 'Найдено <b>' + list.length + '</b> ' + S.plural(list.length, 'программа', 'программы', 'программ');

    if (!list.length) {
      els.results.innerHTML = emptyHTML(active);
      els.pagination.innerHTML = '';
      return;
    }
    var pageItems = list.slice((st.page - 1) * PER_PAGE, st.page * PER_PAGE);
    els.results.innerHTML = '<div class="cards cards--' + st.view + '">' + pageItems.map(function (p) { return cardHTML(p, st, qs); }).join('') + '</div>';
    fitCards(els.results);
    renderPagination(pages);
    if (opts.scroll) els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function update(changes, opts) {
    Object.assign(st, changes);
    if (!('page' in changes)) st.page = 1;
    render(opts);
  }

  /* ---------- События ---------- */
  els.tabs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-level]');
    if (b && b.getAttribute('data-level') !== st.level) update({ level: b.getAttribute('data-level') });
  });

  els.q.addEventListener('input', function () { update({ q: els.q.value }); });
  els.qClear.addEventListener('click', function (e) { e.preventDefault(); update({ q: '' }); els.q.focus(); });

  document.querySelectorAll('.view-btn').forEach(function (b) {
    b.addEventListener('click', function () { update({ view: b.getAttribute('data-view'), page: st.page }); });
  });

  document.querySelectorAll('.toggle[data-sort]').forEach(function (b) {
    b.addEventListener('click', function () {
      var key = b.getAttribute('data-sort');
      if (key === st.sort) update({ dir: st.dir === 'asc' ? 'desc' : 'asc' });
      else update({ sort: key, dir: SORT_DEFAULT_DIR[key] });
    });
  });

  document.getElementById('reset-all').addEventListener('click', function () {
    var d = defaults();
    d.level = st.level; d.view = st.view;
    st = d;
    render();
  });

  function resetFilters() {
    update({ q: '', cat: [], form: [], budget: false, dorm: false, ege: '', score: null, subj: [], pmin: PRICE_MIN, pmax: PRICE_MAX });
  }
  document.getElementById('reset-filters').addEventListener('click', resetFilters);
  document.getElementById('apply').addEventListener('click', function () {
    render({ scroll: true });
    if (els.found.animate) els.found.animate([{ color: '#1f90ec' }, { color: '#757575' }], { duration: 900 });
  });

  els.form.addEventListener('change', function (e) {
    var t = e.target, name = t.name;
    var values = function (n) {
      return Array.prototype.map.call(els.form.querySelectorAll('input[name=' + n + ']:checked'), function (i) { return i.value; });
    };
    if (name === 'cat' || name === 'form' || name === 'subj') update(obj(name, values(name)));
    else if (name === 'budget' || name === 'dorm') update(obj(name, t.checked));
    else if (name === 'ege') {
      update({ ege: t.value });
      var focusEl = t.value === 'score' ? els.score : els.panelSubj.querySelector('input');
      if (focusEl && t.value === 'score') focusEl.focus();
    }
  });
  function obj(k, v) { var o = {}; o[k] = v; return o; }

  els.score.addEventListener('input', function () {
    var v = parseInt(els.score.value, 10);
    update({ score: isNaN(v) ? null : Math.max(0, Math.min(400, v)) });
  });
  els.score.addEventListener('blur', function () { els.score.value = st.score === null ? '' : st.score; });
  els.scoreRange.addEventListener('input', function () {
    var v = parseInt(els.scoreRange.value, 10);
    update({ score: v > 0 ? v : null });
  });

  function onPrice(which) {
    var a = parseInt(els.pmin.value, 10), b = parseInt(els.pmax.value, 10);
    if (a > b - 5) { if (which === 'min') a = b - 5; else b = a + 5; }
    update({ pmin: Math.max(PRICE_MIN, a), pmax: Math.min(PRICE_MAX, b) });
  }
  els.pmin.addEventListener('input', function () { onPrice('min'); });
  els.pmax.addEventListener('input', function () { onPrice('max'); });
  /* Нижний ползунок поверх верхнего, когда они сходятся у правого края */
  els.pmin.addEventListener('pointerdown', function () { els.pmin.style.zIndex = 2; els.pmax.style.zIndex = 1; });
  els.pmax.addEventListener('pointerdown', function () { els.pmax.style.zIndex = 2; els.pmin.style.zIndex = 1; });

  els.chips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-remove]');
    if (!b) return;
    removeFilter(b.getAttribute('data-remove'), b.getAttribute('data-value'));
    update({});
  });

  els.results.addEventListener('click', function (e) {
    var relax = e.target.closest('[data-relax]');
    if (relax) {
      var key = relax.getAttribute('data-relax');
      if (key === 'subj') st.subj = []; else if (key === 'price') { st.pmin = PRICE_MIN; st.pmax = PRICE_MAX; }
      else if (key === 'cat' || key === 'form') st[key] = []; else if (key === 'q') st.q = ''; else st[key] = false;
      update({});
      return;
    }
    var go = e.target.closest('[data-level-go]');
    if (go) {
      var lv = go.getAttribute('data-level-go');
      update(lv === 'spo' ? { level: 'spo', cat: ['it'] } : { level: lv });
      return;
    }
    if (e.target.closest('[data-hint="it-eng"]')) { update({ cat: ['eng'] }); return; }
    if (e.target.closest('[data-reset-filters]')) resetFilters();
  });

  els.pagination.addEventListener('click', function (e) {
    var b = e.target.closest('[data-page]');
    if (!b || b.disabled) return;
    update({ page: parseInt(b.getAttribute('data-page'), 10) }, { scroll: true });
  });

  /* Скрыть / показать панель фильтров */
  document.getElementById('filters-close').addEventListener('click', function () {
    els.form.hidden = true; els.filtersOpen.hidden = false; els.filtersOpen.focus();
  });
  els.filtersOpen.addEventListener('click', function () {
    els.form.hidden = false; els.filtersOpen.hidden = true;
  });

  window.addEventListener('resize', function () { fitCards(els.results); });
  S.onFonts(function () { fitCards(els.results); });

  render();
})();
