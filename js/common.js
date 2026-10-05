/* Общие части: шапка, подвал, форматирование, ссылки между страницами. */
(function () {
  var I = window.ICONS;
  var STUB = 'stub.html';
  var CATALOG = 'programs.html';

  var MENU = [
    { title: 'Открытый университет', items: [
      'Сведения об образовательной организации', 'Политика открытости', 'Документы', 'Виртуальная приемная',
      'Материалы приема граждан', 'Работа в ИжГТУ', 'Противодействие коррупции', 'Осторожно мошенники!',
      'Университет помогает в условиях специальной военной операции'] },
    { title: 'Поступающим', items: [
      'Приемная комиссия', { text: 'Образовательные программы', href: CATALOG }, 'Дополнительное образование',
      'Календарь приема', 'Подготовка к ЕГЭ', 'Онлайн-курсы ИжГТУ', 'Целевое обучение'] },
    { title: 'Студентам', items: [
      'Центр карьер', 'Студенческий совет', 'Студенческие инициативы', 'Иностранным студентам', 'Медицинская помощь',
      'Социальная защита', 'Отдых', 'Спорт и здоровый образ жизни', '«Зеленый университет»', 'Воинский учет'] },
    { title: 'Выпускникам' },
    { title: 'Партнёрам' },
    { title: 'Посетителям' }
  ];

  var FOOTER = [
    { title: 'Контакты', plain: true, items: [
      '426 069, Удмуртская Республика, <br>г. Ижевск, ул. Студенческая, 7',
      'Единый многоканальный телефон: (3412) 77‑60‑55',
      'Email: info@⁠istu.⁠ru',
      'Факс: (3412) 50⁠–⁠40–55'] },
    { title: 'Открытый университет', items: [
      'Сведения об образовательной организации', 'Виртуальная приёмная', 'Материалы приёма граждан', 'Перезагрузка',
      'Работа в ИжГТУ', 'Общественное обсуждение', 'Противодействие коррупции'] },
    { title: 'Поступающим', items: [
      'Приёмная комиссия', { text: 'Образовательные программы', href: CATALOG }, 'Дополнительное образование',
      'Подготовка к ЕГЭ', 'Онлайн‑курсы ИжГТУ', 'Целевое обучение'] },
    { title: 'Студентам', items: [
      'Центр карьер', 'Студенческий совет', 'Студенческий кампус', 'Медицинская помощь', 'Социальная защита',
      'Отдых', 'Воинский учёт'] }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function link(item, cls) {
    var text = typeof item === 'string' ? item : item.text;
    var href = typeof item === 'string' ? STUB : item.href;
    return '<a class="' + cls + '" href="' + href + '">' + esc(text) + '</a>';
  }

  function headerHTML() {
    var nav = MENU.map(function (m, i) {
      if (!m.items) {
        return '<li class="nav__item"><a class="nav__pill" href="' + STUB + '">' + m.title + '</a></li>';
      }
      var id = 'dd-' + i;
      return '<li class="nav__item" data-dropdown>' +
        '<button class="nav__pill" type="button" aria-expanded="false" aria-controls="' + id + '">' + m.title + '</button>' +
        '<div class="dropdown" id="' + id + '"><ul class="dropdown__list">' +
        m.items.map(function (it) { return '<li>' + link(it, 'dropdown__link') + '</li>'; }).join('') +
        '</ul></div></li>';
    }).join('');
    return '<div class="container header__inner">' +
      '<a class="logo" href="index.html" aria-label="ИжГТУ им. М.Т. Калашникова — на главную">' +
      '<img src="assets/img/logo-header.png" width="35" height="32" alt="">' +
      '<span>ИжГТУ им.<br>М.Т. Калашникова</span></a>' +
      '<nav class="nav" aria-label="Основное меню"><ul class="nav__list">' + nav + '</ul></nav>' +
      '<div class="header__tools">' +
      '<a class="header__tool" href="' + STUB + '" title="Версия для слабовидящих" aria-label="Версия для слабовидящих">' + I.eye + '</a>' +
      '<a class="header__tool" href="' + STUB + '" title="Поиск по сайту" aria-label="Поиск по сайту">' + I.searchLarge + '</a>' +
      '</div></div>';
  }

  function footerHTML() {
    var cols = FOOTER.map(function (c) {
      return '<div class="footer__col"><h2 class="footer__title">' + c.title + '</h2><ul class="footer__list">' +
        c.items.map(function (it) {
          return '<li>' + (c.plain ? it : link(it, '')) + '</li>';
        }).join('') + '</ul></div>';
    }).join('');
    return '<div class="container footer__inner">' +
      '<div class="footer__brand">' +
      '<a href="index.html" aria-label="На главную"><img src="assets/img/logo-footer.png" width="98" height="89" alt="Логотип ИжГТУ"></a>' +
      '<div class="socials">' +
      '<a href="' + STUB + '" aria-label="Telegram">' + I.telegram + '</a>' +
      '<a href="' + STUB + '" aria-label="ВКонтакте">' + I.vk + '</a>' +
      '<a href="' + STUB + '" aria-label="MAX">' + I.max + '</a>' +
      '</div></div>' +
      '<div class="footer__cols">' + cols + '</div>' +
      '<p class="footer__note">Неофициальный концепт редизайна раздела «Абитуриенту» сайта ИжГТУ им. М.Т. Калашникова. Данные о программах — istu.ru, 2026.</p>' +
      '</div>';
  }

  function initDropdowns(root) {
    var items = root.querySelectorAll('[data-dropdown]');
    var closeTimer = null;
    function setOpen(item, open) {
      item.classList.toggle('is-open', open);
      item.querySelector('.nav__pill').setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function closeAll(except) {
      items.forEach(function (it) { if (it !== except) setOpen(it, false); });
    }
    items.forEach(function (item) {
      var pill = item.querySelector('.nav__pill');
      item.addEventListener('mouseenter', function () { clearTimeout(closeTimer); closeAll(item); setOpen(item, true); });
      item.addEventListener('mouseleave', function () {
        closeTimer = setTimeout(function () { setOpen(item, false); }, 120);
      });
      pill.addEventListener('click', function () {
        var open = !item.classList.contains('is-open');
        closeAll(item); setOpen(item, open);
      });
      item.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) setOpen(item, false);
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-dropdown]')) closeAll(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });
  }

  /* ---------- Форматирование ---------- */
  var NBSP = ' ';
  function fmtInt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  }
  function fmtNum(n) {
    if (n === null || n === undefined) return '—';
    return Number.isInteger(n) ? fmtInt(n) : String(n).replace('.', ',');
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function durationShort(d) {
    var m = /^(\d+)\s+(года|год|лет)(?:\s+(\d+)\s+месяц[а-яё]*)?$/.exec(d);
    if (!m) return d;
    var y = +m[1], mon = m[3] ? +m[3] : 0;
    if (!mon) return y + NBSP + plural(y, 'год', 'года', 'лет');
    if (mon === 6) return y + ',5' + NBSP + 'года';
    return y + NBSP + 'г.' + NBSP + mon + NBSP + 'мес.';
  }

  var FORM = {
    och: { adj: 'Очная', adv: 'Очно', filter: 'Очная' },
    ochzaoch: { adj: 'Очно-заочная', adv: 'Очно-заочно', filter: 'Очно-заочная' },
    zaoch: { adj: 'Заочная', adv: 'Заочно', filter: 'Заочная' }
  };
  var LEVEL = {
    bachelor: { pill: 'Бакалавриат', tab: 'Бакалавриат' },
    specialist: { pill: 'Специалитет', tab: 'Специалитет' },
    master: { pill: 'Магистратура', tab: 'Магистратура' },
    postgrad: { pill: 'Аспирантура', tab: 'Высшая квалификация' },
    spo: { pill: 'СПО', tab: 'Среднее профессиональное образование' }
  };

  /* Неразрывные пробелы, как в макете: короткие слова, «имени», инициалы, числа с единицами, тире */
  function typo(s) {
    return String(s)
      .replace(/(?<=^|[\s(«"])([А-Яа-яЁё]{1,3}|имени)\s+(?=\S)/g, '$1' + NBSP)
      .replace(/(\d)\s+(?=[А-Яа-яЁё₽%])/g, '$1' + NBSP)
      .replace(/\s+—/g, NBSP + '—')
      .replace(/([А-ЯЁ]\.)\s?([А-ЯЁ]\.)\s+(?=[А-ЯЁ])/g, '$1$2' + NBSP);
  }

  function programUrl(p, backQuery) {
    var url = 'program.html?id=' + p.id;
    if (backQuery) url += '&back=' + encodeURIComponent(backQuery);
    return url;
  }

  window.Site = {
    STUB: STUB,
    CATALOG: CATALOG,
    esc: esc,
    typo: typo,
    fmtInt: fmtInt,
    fmtNum: fmtNum,
    plural: plural,
    durationShort: durationShort,
    FORM: FORM,
    LEVEL: LEVEL,
    programUrl: programUrl,
    byId: function (id) {
      for (var i = 0; i < window.PROGRAMS.length; i++) if (window.PROGRAMS[i].id === id) return window.PROGRAMS[i];
      return null;
    },
    renderHeader: function () {
      var el = document.getElementById('header');
      el.className = 'header';
      el.innerHTML = headerHTML();
      initDropdowns(el);
    },
    renderFooter: function () {
      var el = document.getElementById('footer');
      el.className = 'footer';
      el.innerHTML = footerHTML();
    },
    /* Вызывает fn, когда загрузятся начертания Inter (замеры текста до этого неточные) */
    onFonts: function (fn) {
      if (!document.fonts || !document.fonts.load) return;
      Promise.all(['400 16px Inter', '600 16px Inter', '600 24px Inter', '700 48px Inter'].map(function (f) {
        return document.fonts.load(f);
      })).then(fn, fn);
      document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', fn);
    },
    /* <span data-icon="имя"> → svg из ICONS */
    injectIcons: function (root) {
      (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
        var svg = I[el.getAttribute('data-icon')];
        if (!svg) return;
        var tmp = document.createElement('div');
        tmp.innerHTML = svg;
        var node = tmp.firstChild;
        if (el.className) node.setAttribute('class', 'icon ' + el.className);
        el.replaceWith(node);
      });
    }
  };

  document.addEventListener('DOMContentLoaded', function () { window.Site.injectIcons(document); });
})();
