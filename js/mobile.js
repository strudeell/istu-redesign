/* Мобильная версия (макет Figma, секция mobile). Работает на телефонах и сенсорных экранах уже 1000 px.
   Десктопный код не меняется: файл только дополняет страницы. Всё, что он добавляет, помечено классом
   m-only и на десктопе скрыто (css/mobile.css), а обработчики срабатывают только в мобильном режиме. */
(function () {
  var S = window.Site, I = window.ICONS, esc = S.esc;
  /* Тот же запрос, что в css/mobile.css */
  var MQ = window.matchMedia('(max-width: 767.98px), (max-width: 999.98px) and (pointer: coarse)');
  var HUB = 'applicants.html';

  function isMobile() { return MQ.matches; }
  function onModeChange(fn) {
    if (MQ.addEventListener) MQ.addEventListener('change', fn); else MQ.addListener(fn);
  }

  var svg = function (size, body) {
    return '<svg class="icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + body + '</svg>';
  };
  var ICON = {
    menu: svg(20, '<path d="M3 12h18M3 6h18M3 18h18"/>'),
    back: svg(20, '<path d="M15 18l-6-6 6-6"/>'),
    sliders: svg(16, '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
    sort: svg(16, '<path d="M7 20V4M3 8l4-4 4 4M17 4v16M21 16l-4 4-4-4"/>')
  };

  function pageName() {
    var m = /([^\/]*)$/.exec(location.pathname);
    return (m && m[1]) || 'index.html';
  }
  var IN_SECTION = { 'applicants.html': true, 'programs.html': true, 'program.html': true };

  /* ---------- Блокировка прокрутки под меню и шторками ---------- */
  function lock(on) { document.documentElement.classList.toggle('m-lock', on); }

  /* Фокус не уходит из открытого меню или шторки */
  function trapTab(e, box) {
    if (e.key !== 'Tab') return;
    var list = Array.prototype.filter.call(
      box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'),
      function (el) { return el.offsetParent !== null || el === document.activeElement; });
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Шапка: бургер и меню на весь экран ---------- */
  var MENU = [
    { text: 'Открытый университет' },
    { text: 'Поступающим', href: HUB, section: true },
    { text: 'Выпускникам' },
    { text: 'Партнёрам' },
    { text: 'Посетителям' },
    { text: 'Контакты' }
  ];
  var LOGO = '<a class="logo" href="index.html" aria-label="ИжГТУ им. М.Т. Калашникова — на главную">' +
    '<img src="assets/img/logo-header.png" width="35" height="32" alt=""></a>';

  function menuHTML() {
    var here = IN_SECTION[pageName()];
    var items = MENU.map(function (m) {
      var cur = m.section && here;
      return '<li><a class="m-menu__link' + (cur ? ' is-current' : '') + '" href="' + (m.href || S.STUB) + '"' +
        (cur ? ' aria-current="true"' : '') + '>' + m.text + '</a></li>';
    }).join('');
    return '<div class="m-menu m-only" id="m-menu" role="dialog" aria-modal="true" aria-label="Меню сайта">' +
      '<div class="container m-menu__top">' + LOGO +
      '<button class="m-icon-btn" type="button" data-menu-close aria-label="Закрыть меню">' + I.close + '</button></div>' +
      '<nav class="container" aria-label="Основное меню"><ul class="m-menu__list">' + items + '</ul></nav></div>';
  }

  function initMenu(header) {
    var menu = header.querySelector('#m-menu');
    var burger = header.querySelector('.m-burger');
    var closeBtn = menu.querySelector('[data-menu-close]');
    function isOpen() { return menu.classList.contains('is-open'); }
    function set(open, keepFocus) {
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      lock(open);
      if (open) closeBtn.focus();
      else if (!keepFocus) burger.focus();
    }
    burger.addEventListener('click', function () { set(true); });
    closeBtn.addEventListener('click', function () { set(false); });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') set(false);
      trapTab(e, menu);
    });
    onModeChange(function () { if (!isMobile() && isOpen()) set(false, true); });
    /* Возврат на страницу кнопкой «Назад» — меню уже закрыто */
    window.addEventListener('pageshow', function () { if (isOpen()) set(false, true); });
  }

  var renderHeader = S.renderHeader;
  S.renderHeader = function () {
    renderHeader.apply(this, arguments);
    var el = document.getElementById('header');
    el.querySelector('.header__inner').insertAdjacentHTML('beforeend',
      '<button class="m-icon-btn m-burger m-only" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="m-menu">' + ICON.menu + '</button>');
    el.insertAdjacentHTML('beforeend', menuHTML());
    initMenu(el);
  };

  /* ---------- Подвал по мобильному макету ---------- */
  var FOOTER = [
    { title: 'Открытый университет', items: [
      'Сведения об образовательной организации', 'Виртуальная приёмная', 'Материалы приёма граждан', 'Работа в ИжГТУ'] },
    { title: 'Поступающим', items: [
      'Приёмная комиссия', { text: 'Образовательные программы', href: S.CATALOG }, 'Подготовка к ЕГЭ', 'Онлайн‑курсы ИжГТУ'] },
    { title: 'Студентам', items: [
      'Студенческий совет', 'Студенческий кампус', 'Социальная защита', 'Воинский учёт'] },
    { title: 'Контакты', html: [
      '426069, Удмуртская Республика, г.&nbsp;Ижевск, ул.&nbsp;Студенческая,&nbsp;7',
      'Единый многоканальный телефон: <a href="tel:+73412776055">(3412)&nbsp;77‑60‑55</a>',
      'Email: <a href="mailto:info@istu.ru">info@istu.ru</a>',
      'Факс: (3412)&nbsp;50‑40‑55'] }
  ];

  function footerHTML() {
    var cols = FOOTER.map(function (c) {
      var items = c.html || c.items.map(function (it) {
        var text = typeof it === 'string' ? it : it.text, href = typeof it === 'string' ? S.STUB : it.href;
        return '<a href="' + href + '">' + esc(text) + '</a>';
      });
      return '<section><h2 class="footer__title">' + c.title + '</h2><ul class="footer__list">' +
        items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></section>';
    }).join('');
    return '<div class="m-footer m-only">' +
      '<div class="m-footer__top">' +
      '<a href="index.html" aria-label="На главную"><img src="assets/img/logo-footer.png" width="35" height="32" alt="Логотип ИжГТУ"></a>' +
      '<div class="m-socials">' +
      '<a href="' + S.STUB + '" aria-label="Telegram">' + I.telegram + '</a>' +
      '<a href="' + S.STUB + '" aria-label="ВКонтакте">' + I.vk + '</a>' +
      '<a href="' + S.STUB + '" aria-label="MAX">' + I.max + '</a>' +
      '</div></div>' +
      '<div class="m-footer__cols">' + cols + '<a class="footer__title" href="' + S.STUB + '">Партнёрам</a></div>' +
      '<p class="footer__note">Неофициальный концепт редизайна раздела «Абитуриенту» сайта ИжГТУ им.&nbsp;М.Т.&nbsp;Калашникова. Данные о&nbsp;программах&nbsp;— istu.ru, 2026.</p>' +
      '</div>';
  }

  var renderFooter = S.renderFooter;
  S.renderFooter = function () {
    renderFooter.apply(this, arguments);
    document.getElementById('footer').insertAdjacentHTML('beforeend', footerHTML());
  };

  /* ---------- Хлебные крошки (как на десктопной странице программы) ---------- */
  function crumbsHTML(items) {
    return '<nav class="crumbs m-crumbs m-only" aria-label="Хлебные крошки">' +
      '<a class="crumbs__home" href="index.html" aria-label="Главная">' + I.home + '</a>' +
      items.map(function (it, i) {
        if (!it.href) return '<span class="crumbs__current" aria-current="page">' + esc(it.text) + '</span>';
        return '<a class="crumbs__link" href="' + it.href + '">' + esc(it.text) + '</a>' + (i < items.length - 1 ? I.chevronCrumb : '');
      }).join('') + '</nav>';
  }

  /* ---------- Нижние шторки ---------- */
  var backdrop = null, current = null;

  function openSheet(el, opener, focusEl, onClose) {
    if (current) closeSheet(true);
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'm-backdrop m-only';
      backdrop.addEventListener('click', function () { closeSheet(); });
      document.body.appendChild(backdrop);
    }
    current = { el: el, opener: opener, onClose: onClose };
    backdrop.classList.add('is-on');
    el.classList.add('is-open');
    lock(true);
    (focusEl || el).focus({ preventScroll: true });
  }

  function closeSheet(silent) {
    if (!current) return;
    var c = current;
    current = null;
    c.el.classList.remove('is-open');
    c.el.style.transform = '';
    backdrop.classList.remove('is-on');
    lock(false);
    if (c.onClose) c.onClose();
    if (!silent && c.opener) c.opener.focus({ preventScroll: true });
  }

  document.addEventListener('keydown', function (e) {
    if (!current) return;
    if (e.key === 'Escape') closeSheet();
    else trapTab(e, current.el);
  });
  onModeChange(function () { if (!isMobile()) closeSheet(true); });

  /* Шторку можно смахнуть вниз за верхнюю часть */
  function draggable(sheet, handle) {
    var y0 = null, dy = 0;
    handle.addEventListener('touchstart', function (e) {
      if (!sheet.classList.contains('is-open')) return;
      y0 = e.touches[0].clientY; dy = 0;
      sheet.style.transition = 'none';
    }, { passive: true });
    handle.addEventListener('touchmove', function (e) {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      sheet.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    function end() {
      if (y0 === null) return;
      y0 = null;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 80) closeSheet();
    }
    handle.addEventListener('touchend', end);
    handle.addEventListener('touchcancel', end);
  }

  /* ==========================================================================
     Каталог: «Сортировка» и «Фильтры» вверху, фильтры — в нижней шторке,
     кнопка «Показать N программ» закреплена внизу. Фильтры применяются сразу (логика catalog.js).
     ========================================================================== */
  var SORTS = [
    { key: 'code', dir: 'asc', text: 'По коду направления' },
    { key: 'pass', dir: 'asc', text: 'Ниже проходной балл' },
    { key: 'pass', dir: 'desc', text: 'Выше проходной балл' },
    { key: 'budget', dir: 'desc', text: 'Больше бюджетных мест' },
    { key: 'price', dir: 'asc', text: 'Ниже стоимость обучения' },
    { key: 'price', dir: 'desc', text: 'Выше стоимость обучения' }
  ];
  var SHORT_TABS = { spo: 'СПО' };

  function initCatalog() {
    var form = document.getElementById('filters');
    if (!form) return;
    var wrap = form.closest('.filters-wrap');
    var search = document.getElementById('search');
    var found = document.getElementById('found');
    var chips = document.getElementById('chips');
    var tabs = document.getElementById('level-tabs');
    var head = form.querySelector('.filters__head');

    document.querySelector('.page-head').insertAdjacentHTML('afterbegin',
      crumbsHTML([{ text: 'Поступающим', href: HUB }, { text: 'Образовательные программы' }]));

    search.insertAdjacentHTML('afterend',
      '<div class="m-actions m-only">' +
      '<button class="m-act" type="button" id="m-sort-open" aria-haspopup="dialog" aria-controls="m-sort">' + ICON.sort + 'Сортировка</button>' +
      '<button class="m-act" type="button" id="m-filters-open" aria-haspopup="dialog">' + ICON.sliders + 'Фильтры' +
      '<span class="m-act__count" hidden></span></button></div>');

    head.insertAdjacentHTML('afterbegin',
      '<button class="m-sheet-back m-only" type="button" aria-label="Закрыть фильтры">' + ICON.back + '</button>');
    head.insertAdjacentHTML('beforeend', '<button class="m-sheet-reset m-only" type="button" hidden>Сбросить</button>');
    form.querySelector('.filters__buttons').insertAdjacentHTML('beforeend',
      '<button class="btn btn--primary btn--lg btn--block m-only" type="button" id="m-show"></button>');

    /* Только варианты, для которых в каталоге есть переключатель: телефонную версию можно откатывать отдельно от десктопа */
    var sorts = SORTS.filter(function (s) { return document.querySelector('.toggle[data-sort="' + s.key + '"]'); });
    var deskSortReset = document.getElementById('reset-sort');

    document.body.insertAdjacentHTML('beforeend',
      '<div class="m-sheet m-only" id="m-sort" role="dialog" aria-modal="true" aria-labelledby="m-sort-title" tabindex="-1">' +
      '<div class="m-sheet__head"><span class="m-sheet__grab" aria-hidden="true"></span>' +
      '<div class="m-sheet__bar"><h2 class="m-sheet__title" id="m-sort-title">Сортировка</h2>' +
      '<button class="m-sheet-reset" type="button" id="m-sort-reset" hidden>Сбросить</button></div>' +
      '<p class="m-sheet__text" id="m-sort-text">Какие направления показывать сначала</p></div>' +
      '<div class="m-sheet__options" role="radiogroup" aria-labelledby="m-sort-text">' +
      sorts.map(function (s, i) {
        return '<label class="radio"><input type="radio" name="m-sort" value="' + i + '"><span class="radio__dot"></span>' +
          '<span class="check__text">' + s.text + '</span></label>';
      }).join('') + '</div>' +
      '<button class="btn btn--primary btn--lg btn--block" type="button" id="m-sort-apply">Применить сортировку</button></div>');

    var filtersBtn = document.getElementById('m-filters-open');
    var badge = filtersBtn.querySelector('.m-act__count');
    var sortBtn = document.getElementById('m-sort-open');
    var sortSheet = document.getElementById('m-sort');
    var sortReset = document.getElementById('m-sort-reset');
    var back = head.querySelector('.m-sheet-back');
    var reset = head.querySelector('.m-sheet-reset');
    var show = document.getElementById('m-show');

    /* К началу списка: панель с кнопками прилипает к верху, под ней — выбранные фильтры и карточки */
    function scrollToList() {
      var y = search.getBoundingClientRect().bottom + window.pageYOffset;
      if (window.pageYOffset > y) window.scrollTo({ top: y, behavior: 'smooth' });
    }

    /* Фильтры */
    wrap.setAttribute('tabindex', '-1');
    filtersBtn.addEventListener('click', function () {
      form.hidden = false;
      var collapsed = document.getElementById('filters-open');
      if (collapsed) collapsed.hidden = true;
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      filtersBtn.setAttribute('aria-expanded', 'true');
      openSheet(wrap, filtersBtn, back, function () {
        wrap.removeAttribute('role');
        wrap.removeAttribute('aria-modal');
        filtersBtn.setAttribute('aria-expanded', 'false');
      });
    });
    back.addEventListener('click', function () { closeSheet(); });
    reset.addEventListener('click', function () { document.getElementById('reset-filters').click(); });
    show.addEventListener('click', function () { closeSheet(); scrollToList(); });
    draggable(wrap, head);

    /* Сортировка: выбор применяем через десктопные переключатели — логика сортировки остаётся в catalog.js */
    function currentSort() {
      var b = document.querySelector('.toggle[data-sort].is-on');
      return b ? { key: b.getAttribute('data-sort'), dir: b.getAttribute('data-dir') } : null;
    }
    function applySort(key, dir) {
      for (var i = 0; i < 3; i++) {
        var c = currentSort();
        if (c && c.key === key && c.dir === dir) return;
        document.querySelector('.toggle[data-sort="' + key + '"]').click();
      }
    }
    function syncSortRadios() {
      var c = currentSort();
      sortSheet.querySelectorAll('input[name=m-sort]').forEach(function (r) {
        var s = sorts[+r.value];
        r.checked = !!c && s.key === c.key && s.dir === c.dir;
      });
      syncSortReset();
    }
    /* «Сбросить» — когда есть что сбрасывать: сортировка применена или выбран вариант */
    function syncSortReset() {
      sortReset.hidden = !deskSortReset || (!currentSort() && !sortSheet.querySelector('input:checked'));
    }
    sortSheet.addEventListener('change', syncSortReset);
    /* Сброс применяется сразу: все варианты гаснут, список снова идёт по коду направления */
    sortReset.addEventListener('click', function () {
      deskSortReset.click();
      syncSortRadios();
      sortSheet.focus({ preventScroll: true });
    });
    sortBtn.addEventListener('click', function () {
      syncSortRadios();
      sortBtn.setAttribute('aria-expanded', 'true');
      openSheet(sortSheet, sortBtn, sortSheet.querySelector('input:checked') || sortSheet.querySelector('input'), function () {
        sortBtn.setAttribute('aria-expanded', 'false');
      });
    });
    document.getElementById('m-sort-apply').addEventListener('click', function () {
      var r = sortSheet.querySelector('input:checked');
      if (r) applySort(sorts[+r.value].key, sorts[+r.value].dir);
      closeSheet();
      scrollToList();
    });
    draggable(sortSheet, sortSheet.querySelector('.m-sheet__head'));

    /* Подписи обновляются после каждой отрисовки списка */
    function sync() {
      var b = found.querySelector('b');
      var n = b ? parseInt(b.textContent, 10) : 0;
      show.textContent = n ? 'Показать ' + n + ' ' + S.plural(n, 'программу', 'программы', 'программ') : 'Ничего не найдено';
      var active = chips.hidden ? 0 : chips.querySelectorAll('[data-remove]:not([data-remove="q"])').length;
      badge.textContent = active;
      badge.hidden = !active;
      filtersBtn.setAttribute('aria-label', active ? 'Фильтры, выбрано: ' + active : 'Фильтры');
      reset.hidden = chips.hidden;
    }
    new MutationObserver(sync).observe(found, { childList: true, subtree: true, characterData: true });
    new MutationObserver(sync).observe(chips, { childList: true, attributes: true, attributeFilter: ['hidden'] });
    sync();

    /* Короткие подписи, как в макете: длинные на узком экране обрезаются */
    var q = document.getElementById('q');
    var deskPlaceholder = q.getAttribute('placeholder');
    function syncPlaceholder() { q.setAttribute('placeholder', isMobile() ? 'Введите код или название' : deskPlaceholder); }
    onModeChange(syncPlaceholder);
    syncPlaceholder();

    function syncTabs() {
      tabs.querySelectorAll('[data-level]').forEach(function (b) {
        var lv = b.getAttribute('data-level');
        if (!SHORT_TABS[lv]) return;
        var text = isMobile() ? SHORT_TABS[lv] : S.LEVEL[lv].tab;
        if (b.textContent !== text) b.textContent = text;
        if (isMobile()) b.setAttribute('aria-label', S.LEVEL[lv].tab); else b.removeAttribute('aria-label');
      });
    }
    new MutationObserver(syncTabs).observe(tabs, { childList: true });
    onModeChange(syncTabs);
    syncTabs();
  }

  /* ==========================================================================
     Страница программы: ключевые цифры и кнопки — на первом экране
     ========================================================================== */
  function initProgram() {
    var root = document.getElementById('program');
    if (!root || !root.firstChild) return;
    var p = S.byId(parseInt(new URLSearchParams(location.search).get('id'), 10));
    if (!p) return;

    /* «Поступающим» в крошках ведёт на страницу раздела (на десктопе ссылка прежняя) */
    var hubLink = Array.prototype.filter.call(root.querySelectorAll('.crumbs__link'), function (a) {
      return a.textContent.trim() === 'Поступающим';
    })[0];
    if (hubLink) {
      var deskHref = hubLink.getAttribute('href');
      var syncLink = function () { hubLink.setAttribute('href', isMobile() ? HUB : deskHref); };
      syncLink();
      onModeChange(syncLink);
    }

    var noContest = p.noContest || p.pass2025 === null;
    var priced = p.forms.filter(function (f) { return f.price !== null; });
    var differs = priced.some(function (f) { return f.price !== priced[0].price; });
    var num = function (value, label, text) {
      return '<div class="num"><p class="num__value' + (text ? ' num__value--text' : '') + '">' + value + '</p><p class="num__label">' + label + '</p></div>';
    };
    var facts = '<div class="nums m-facts m-only">' +
      num(noContest ? 'без конкурса' : S.fmtNum(p.pass2025), 'Проходной балл 2025', noContest) +
      num(S.fmtInt(p.budget), 'Бюджетных мест') +
      (priced.length ?
        num(S.fmtInt(priced[0].price) + '&nbsp;₽', 'Стоимость в&nbsp;год' + (differs ? ', ' + S.FORM[priced[0].form].adv.toLowerCase() : '')) :
        num('нет платного набора', 'Стоимость', true)) +
      '</div>';
    root.querySelector('.phero__meta').insertAdjacentHTML('afterend', facts);
  }

  /* ==========================================================================
     Главная: «Университет в цифрах» — по две плашки, листаются стрелками и свайпом
     ========================================================================== */
  function initHome() {
    var stats = document.querySelector('.stats');
    if (!stats) return;
    stats.insertAdjacentHTML('afterend',
      '<section class="m-stats m-only" aria-labelledby="m-stats-title"><div class="container">' +
      '<div class="section-head"><h2 class="t-heading" id="m-stats-title">Университет в&nbsp;цифрах</h2>' +
      '<div class="carousel-arrows">' +
      '<button class="carousel-arrow" type="button" data-m-carousel="-1" aria-label="Назад">' + I.chevronLeftThin + '</button>' +
      '<button class="carousel-arrow" type="button" data-m-carousel="1" aria-label="Вперёд">' + I.chevronRightThin + '</button>' +
      '</div></div>' +
      '<div class="m-stats__viewport"><div class="m-stats__track"></div></div></div></section>');
    var box = stats.nextElementSibling;
    var vp = box.querySelector('.m-stats__viewport');
    var track = box.querySelector('.m-stats__track');
    stats.querySelectorAll('.stat-card').forEach(function (c) { track.appendChild(c.cloneNode(true)); });
    var prev = box.querySelector('[data-m-carousel="-1"]');
    var next = box.querySelector('[data-m-carousel="1"]');

    function update() {
      var max = vp.scrollWidth - vp.clientWidth;
      prev.disabled = vp.scrollLeft <= 2;
      next.disabled = vp.scrollLeft >= max - 2;
    }
    [prev, next].forEach(function (b) {
      b.addEventListener('click', function () {
        var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        vp.scrollBy({ left: +b.getAttribute('data-m-carousel') * (vp.clientWidth + gap), behavior: 'smooth' });
      });
    });
    vp.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    onModeChange(update);
    update();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCatalog();
    initProgram();
    initHome();
  });
})();
