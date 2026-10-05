/* Главная: графика в карточке «Поступай в ИжГТУ» и карусель «Университет в цифрах». */
(function () {
  document.getElementById('hero-graphic').innerHTML = window.ICONS.heroGraphic;

  var track = document.getElementById('stats-track');
  var prev = document.querySelector('[data-carousel="prev"]');
  var next = document.querySelector('[data-carousel="next"]');
  var cards = track.children;
  var visible = 3;
  var index = 0;

  function step() {
    var gap = parseFloat(getComputedStyle(track).columnGap) || 20;
    return cards[0].getBoundingClientRect().width + gap;
  }
  function update() {
    var max = Math.max(0, cards.length - visible);
    index = Math.min(Math.max(index, 0), max);
    track.style.transform = 'translateX(' + (-index * step()) + 'px)';
    prev.disabled = index === 0;
    next.disabled = index === max;
  }
  prev.addEventListener('click', function () { index--; update(); });
  next.addEventListener('click', function () { index++; update(); });
  window.addEventListener('resize', update);
  update();
})();
