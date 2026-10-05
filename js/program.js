/* Страница программы: всё ключевое — на первом экране, возврат к списку с сохранёнными фильтрами. */
(function () {
  var S = window.Site, I = window.ICONS, esc = S.esc, T = S.typo;
  var params = new URLSearchParams(location.search);
  var p = S.byId(parseInt(params.get('id'), 10));
  if (!p) { location.replace(S.STUB); return; }

  var back = params.get('back');
  if (back === null) {
    try { back = sessionStorage.getItem('catalogQuery'); } catch (e) { back = null; }
  }
  if (!back || back.charAt(0) !== '?') back = back ? '?' + back.replace(/^\?/, '') : '';
  /* Если пришли из другого раздела каталога — вернёмся в раздел этой программы */
  var catalogUrl = S.CATALOG + (back || (p.level !== 'bachelor' ? '?level=' + p.level : ''));

  document.title = p.name + ' — ИжГТУ, неофициальный концепт';

  var FORM = S.FORM;
  var PAID = { och: 'Платных (очно)', ochzaoch: 'Платных (очно-заочно)', zaoch: 'Платных (заочно)' };
  var ORDER_663 = 'https://istu.ru/storage/admission_campaign/2026/1781471714.pdf';

  /* Фото по смыслу направления: в шапке — объект на фоне неба (как здание в макете),
     в «О программе» — люди за работой по этой специальности. Файлы — assets/img/programs. */
  var PHOTO = {
    arch:   { hero: 'arch',   about: 'arch' },
    design: { hero: 'arch',   about: 'design' },
    craft:  { hero: 'craft',  about: 'craft' },
    build:  { hero: 'build',  about: 'build' },
    water:  { hero: 'water',  about: 'water' },
    heat:   { hero: 'heat',   about: 'heat' },
    safety: { hero: 'rescue', about: 'safety' },
    med:    { hero: 'rescue', about: 'med' },
    lang:   { hero: 'lang',   about: 'lang' },
    sport:  { hero: 'sport',  about: 'sport' },
    it:     { hero: 'it',     about: 'it' },
    econ:   { hero: 'econ',   about: 'econ' },
    law:    { hero: 'law',    about: 'law' },
    drone:  { hero: 'drone',  about: 'drone' },
    mech:   { hero: 'mech',   about: 'mech' }
  };
  function topic(p) {
    var c = p.code, n = p.name.toLowerCase();
    if (/^07\./.test(c)) return 'arch';
    if (/^54\./.test(c)) return 'design';
    if (/^29\./.test(c)) return 'craft';
    if (/^13\./.test(c) || /газоснабж|вентиляц/.test(n)) return 'heat';
    if (/водоснабж|водоотвед/.test(n)) return 'water';
    if (/^08\.|^2\.1\./.test(c)) return 'build';
    if (/^20\./.test(c)) return 'safety';
    if (/^12\./.test(c)) return 'med';
    if (/^45\./.test(c)) return 'lang';
    if (/^49\./.test(c)) return 'sport';
    if (/^09\./.test(c)) return 'it';
    if (/^38\./.test(c)) return 'econ';
    if (/^40\./.test(c)) return 'law';
    if (/^25\./.test(c)) return 'drone';
    return 'mech';
  }
  var photo = PHOTO[topic(p)];

  function row(label, value) {
    return '<div class="kv__row"><span>' + label + '</span><span>' + value + '</span></div>';
  }
  /* Плашка справа: стрелка в строке заголовка, строки значений — на всю ширину плашки */
  function acard(icon, title, rows, mod) {
    return '<a class="acard' + (mod ? ' ' + mod : '') + '" href="' + S.STUB + '">' +
      '<span class="bubble">' + I[icon] + '</span>' +
      '<div class="acard__body">' +
      '<div class="acard__head"><p class="acard__title">' + title + '</p><span class="acard__arrow">' + I.chevronRightSmall + '</span></div>' +
      '<div class="acard__rows">' + rows + '</div>' +
      '</div></a>';
  }
  function arow(label, value) {
    return '<div class="acard__row"><span>' + label + '</span>' + (value !== undefined ? '<b>' + value + '</b>' : '') + '</div>';
  }

  /* ---------- Колонка 1 ---------- */
  var crumbs = '<nav class="crumbs" aria-label="Хлебные крошки">' +
    '<a class="crumbs__home" href="index.html" aria-label="Главная">' + I.home + '</a>' +
    '<a class="crumbs__link" href="' + S.STUB + '">Поступающим</a>' + I.chevronCrumb +
    '<a class="crumbs__link" href="' + catalogUrl + '">Образовательные программы</a>' + I.chevronCrumb +
    '<span class="crumbs__current" aria-current="page">' + esc(p.name) + '</span></nav>';

  var hero = '<section class="phero" aria-labelledby="ptitle">' +
    '<p class="phero__level">' + S.LEVEL[p.level].tab.replace('Высшая квалификация', 'Аспирантура') + '</p>' +
    '<h1 class="phero__title" id="ptitle">' + esc(p.name) + '</h1>' +
    '<div class="phero__meta"><p>' + esc(T(p.faculty)) + '</p><p>' + esc(p.code + ' ' + p.direction) + '</p></div>' +
    '<div class="phero__actions">' +
    '<a class="btn btn--primary btn--md" href="' + S.STUB + '">Подать документы</a>' +
    '<a class="btn btn--outline" href="' + S.STUB + '">Задать вопрос</a></div>' +
    '<img class="phero__img" src="assets/img/programs/hero-' + photo.hero + '.webp" width="418" height="278" alt="">' +
    '</section>';

  var tabs = '<nav class="ptabs" aria-label="Разделы программы">' +
    '<span class="ptab is-active" aria-current="page">Основное</span>' +
    ['Карьера', 'Преподаватели', 'Учебный план', 'Контакты'].map(function (t) {
      return '<a class="ptab" href="' + S.STUB + '">' + t + '</a>';
    }).join('') + '</nav>';

  var formsRows = p.forms.map(function (f) {
    return '<p class="icard__value">' + FORM[f.form].adj + ', ' + T(f.duration) + '</p>';
  }).join('');
  var places = [row('Бюджетных*', S.fmtInt(p.budget))];
  if (p.quotaSpecial) places.push(row('В т.ч. по особой квоте', p.quotaSpecial));
  if (p.quotaSeparate) places.push(row('В т.ч. по отдельной квоте', p.quotaSeparate));
  if (p.target) places.push(row('В т.ч. целевых', p.target));
  ['och', 'ochzaoch', 'zaoch'].forEach(function (k) { if (p.paid[k]) places.push(row(PAID[k], p.paid[k])); });

  var ex = p.exams, scores = [];
  ex.required.forEach(function (e) { scores.push(row(esc(T(e.subject)) + ' (ЕГЭ)', e.min)); });
  ex.internal.forEach(function (e) { scores.push(row(esc(T(e.subject)), e.min)); });
  if (ex.choice.length) {
    scores.push('<p class="t-small" style="color:var(--muted)">Один предмет на выбор:</p>');
    ex.choice.forEach(function (e) { scores.push(row(esc(T(e.subject)) + ' (ЕГЭ)', e.min)); });
  }
  ex.text.forEach(function (t) { scores.push(row(esc(t === 'Не предусмотрены' ? 'Без вступительных испытаний' : t), '')); });

  var info = '<div class="pinfo">' +
    '<div class="pinfo__stack">' +
    '<div class="icard">' + '<span class="bubble">' + I.school + '</span><div class="icard__body"><p class="icard__title">Форма обучения</p>' + formsRows + '</div></div>' +
    '<div class="icard">' + '<span class="bubble">' + I.language + '</span><div class="icard__body" style="gap:10px"><p class="icard__title" style="color:var(--text-2)">Язык обучения</p><p class="icard__value--small">Русский</p></div></div>' +
    '</div>' +
    '<div class="icard icard--pad icard--tall"><span class="bubble">' + I.nums + '</span><div class="icard__body"><p class="icard__title">Количество мест</p><div class="kv">' + places.join('') + '</div></div></div>' +
    '<div class="icard icard--pad icard--tall"><span class="bubble">' + I.exam + '</span><div class="icard__body"><p class="icard__title">Минимальные баллы</p><div class="kv">' + scores.join('') + '</div></div></div>' +
    '</div>';

  var about = '<section class="about" aria-labelledby="about-title">' +
    '<div class="about__text"><h2 class="t-heading" id="about-title">О программе</h2>' +
    '<p>' + esc(T(p.description)) + '</p>' +
    '<a class="btn btn--link" href="' + S.STUB + '">Подробнее о программе ' + I.arrowRightSmall + '</a></div>' +
    '<img class="about__img" src="assets/img/programs/about-' + photo.about + '.jpg" width="297" height="222" alt="">' +
    '</section>';

  /* ---------- Колонка 2 ---------- */
  var noContest = p.noContest || p.pass2025 === null;
  var stats = arow('Проходной балл:', noContest ? 'без конкурса' : S.fmtNum(p.pass2025));
  if (!noContest && p.avg2025 !== null) stats += arow('Средний балл:', S.fmtNum(p.avg2025));
  var priceRows = p.forms.map(function (f) {
    return arow(f.price === null ? 'Нет платного набора (' + FORM[f.form].adj + ', ' + T(f.duration) + ')' :
      S.fmtInt(f.price) + ' ₽ в год (' + FORM[f.form].adj + ', ' + T(f.duration) + ')');
  }).join('');
  /* На десктопе стоимость стоит сразу после госаккредитации (порядок задаёт CSS, см. .program__aside),
     в разметке она предпоследняя — на это опирается мобильная раскладка */
  var aside = [
    acard('chart', 'СТАТИСТИКА В 2025 ГОДУ', stats),
    acard('users', 'Общежитие', p.dorm ? arow('Кампусов', '6') : arow('Не предоставляется')),
    acard('school', 'Военный учебный центр', p.military ? arow('Обучение', '3 года') : arow('Нет')),
    acard('cert', 'Госаккредитация', arow(p.accreditation ? 'Есть' : 'Нет'))
  ];
  if (p.spoExams.length) {
    aside.push('<div class="icard icard--spo"><span class="bubble">' + I.exam + '</span><div class="icard__body"><p class="icard__title">Вступительные экзамены после СПО</p><div class="kv">' +
      p.spoExams.map(function (e) { return row(esc(T(e.subject)), e.min); }).join('') + '</div></div></div>');
  }
  aside.push(acard('ruble', 'Стоимость платного обучения**', priceRows, 'acard--price'));
  /* Сноски: звёздочки — в отдельной колонке, текст не рвётся после коротких слов */
  aside.push('<div class="icard icard--notes"><span class="bubble bubble--light">' + I.info + '</span>' +
    '<ul class="notes">' +
    '<li><span class="notes__mark">*</span><span>Количество бюджетных мест на&nbsp;направление</span></li>' +
    '<li><span class="notes__mark">**</span><span>Для&nbsp;граждан РФ, цена указана за&nbsp;первый год обучения с&nbsp;учётом скидки в&nbsp;соответствии с&nbsp;<a href="' + ORDER_663 + '" target="_blank" rel="noopener">приказом №&nbsp;663 от&nbsp;29.05.2026</a></span></li>' +
    '</ul></div>');

  document.getElementById('program').innerHTML =
    '<div class="program__col">' + crumbs + hero + tabs + info + about + '</div>' +
    '<aside class="program__aside" aria-label="Ключевые факты">' + aside.join('') + '</aside>';

  /* Длинное название — меньшим кеглем, чтобы первый экран не разъезжался */
  function fitTitle() {
    var t = document.getElementById('ptitle');
    t.classList.remove('is-md', 'is-sm');
    var lines = function () { return Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight)); };
    if (lines() > 2) t.classList.add('is-md');
    if (lines() > 3) { t.classList.remove('is-md'); t.classList.add('is-sm'); }
  }
  fitTitle();
  window.addEventListener('resize', fitTitle);
  S.onFonts(fitTitle);
})();
