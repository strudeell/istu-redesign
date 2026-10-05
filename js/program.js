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

  function row(label, value) {
    return '<div class="kv__row"><span>' + label + '</span><span>' + value + '</span></div>';
  }
  function acard(icon, title, rows, opts) {
    opts = opts || {};
    var tag = opts.href ? 'a' : 'div';
    return '<' + tag + ' class="acard' + (opts.white ? ' acard--white' : '') + '"' + (opts.href ? ' href="' + opts.href + '"' : '') + '>' +
      '<span class="bubble' + (opts.light ? ' bubble--light' : '') + '">' + I[icon] + '</span>' +
      '<div class="acard__body">' + (title ? '<p class="acard__title">' + title + '</p>' : '') + rows + '</div>' +
      (opts.href ? '<span class="acard__arrow">' + I.chevronRightSmall + '</span>' : '') +
      '</' + tag + '>';
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
    '<img class="phero__img" src="assets/img/building.webp" width="418" height="278" alt="">' +
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
    '<img class="about__img" src="assets/img/program-photo.jpg" width="297" height="222" alt="">' +
    '</section>';

  /* ---------- Колонка 2 ---------- */
  var noContest = p.noContest || p.pass2025 === null;
  var stats = arow('Проходной балл:', noContest ? 'без конкурса' : S.fmtNum(p.pass2025));
  if (!noContest && p.avg2025 !== null) stats += arow('Средний балл:', S.fmtNum(p.avg2025));
  var aside = [
    acard('chart', 'СТАТИСТИКА В 2025 ГОДУ', '<div class="acard__rows">' + stats + '</div>'),
    acard('users', 'Общежитие', '<div class="acard__rows">' + (p.dorm ? arow('Кампусов', '6') : arow('Не предоставляется')) + '</div>', { href: S.STUB }),
    acard('school', 'Военный учебный центр', '<div class="acard__rows">' + (p.military ? arow('Обучение', '3 года') : arow('Нет')) + '</div>', { href: S.STUB }),
    acard('cert', 'Госаккредитация', '<div class="acard__rows">' + arow(p.accreditation ? 'Есть' : 'Нет') + '</div>', { href: S.STUB })
  ];
  if (p.spoExams.length) {
    aside.push('<div class="icard"><span class="bubble">' + I.exam + '</span><div class="icard__body"><p class="icard__title">Вступительные экзамены после СПО</p><div class="kv">' +
      p.spoExams.map(function (e) { return row(esc(T(e.subject)), e.min); }).join('') + '</div></div></div>');
  }
  var priceRows = p.forms.map(function (f) {
    return arow(f.price === null ? 'Нет платного набора (' + FORM[f.form].adj + ', ' + T(f.duration) + ')' :
      S.fmtInt(f.price) + ' ₽ в год (' + FORM[f.form].adj + ', ' + T(f.duration) + ')');
  }).join('');
  aside.push(acard('ruble', 'Стоимость платного обучения**', '<div class="acard__rows">' + priceRows + '</div>', { href: S.STUB }));
  aside.push(acard('info', '', '<p class="notes">*&nbsp;Количество бюджетных мест на&nbsp;направление<br>**&nbsp;Для&nbsp;граждан РФ, цена указана за&nbsp;первый год&nbsp;обучения с&nbsp;учётом скидки в&nbsp;соответствии с&nbsp;<a href="' + S.STUB + '"><u>приказом №&nbsp;663&nbsp;от&nbsp;29.05.2026</u></a></p>', { white: true, light: true }));

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
