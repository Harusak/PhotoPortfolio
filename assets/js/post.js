// 記事ページ：本文の写真を番号マーカーに置き換え、ステージで「ピント送り」する
(function () {
  const html = document.documentElement;
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const mqMobile = window.matchMedia('(max-width: 759px)');
  // live.staticflickr.com/<server>/<id>_<secret>[_<size>].<ext>
  const FLICKR = /^(https?:\/\/live\.staticflickr\.com\/\d+\/(\d+)_[0-9a-f]+)(?:_([a-z0-9]+))?\.(jpg|png|gif)$/i;
  // 同じ secret で取れるサイズ（_k / _h / _o は別の secret なので置換できない）
  const SAME_SECRET = ['', 's', 'q', 't', 'm', 'n', 'w', 'z', 'c', 'b'];

  // ---------- テーマ ----------
  const themeLabels = document.querySelectorAll('.theme-label');
  function applyTheme(t) {
    html.setAttribute('data-theme', t);
    html.style.colorScheme = t;
    themeLabels.forEach(el => { el.textContent = t === 'dark' ? 'Dark' : 'Light'; });
  }
  applyTheme(html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  document.querySelectorAll('.theme-toggle').forEach(btn => btn.addEventListener('click', () => {
    const t = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t);
    try { localStorage.setItem('theme', t); } catch (e) {}
  }));

  // ---------- ホログラムポップアップ ----------
  const lightbox = $('lightbox'), lbFrame = $('lb-frame'), lbImg = $('lb-img');
  const lbGlare = $('lb-glare'), lbTitle = $('lb-title'), lbFlickr = $('lb-flickr');
  const MAX_ROTATION = 15;
  let popped = null;

  function setTilt(nx, ny) {
    lbFrame.style.transform = mqMobile.matches
      ? 'translate(-50%, -50%)' // モバイルは傾けない
      : `translate(-50%, -50%) perspective(1000px) rotateX(${(-ny * MAX_ROTATION).toFixed(2)}deg) rotateY(${(nx * MAX_ROTATION).toFixed(2)}deg)`;
    lbGlare.style.background = `radial-gradient(circle at ${((nx + 1) / 2 * 100).toFixed(1)}% ${((ny + 1) / 2 * 100).toFixed(1)}%, rgba(255,255,255,.25) 0%, rgba(255,255,255,.15) 20%, transparent 50%)`;
  }

  function openPop(p) {
    popped = p;
    lbImg.src = p.full;
    lbImg.alt = p.caption;
    lbTitle.textContent = p.caption;
    lbFlickr.hidden = !p.page;
    lbFlickr.href = p.page || '#';
    setTilt(0, 0);
    lightbox.hidden = false;
    html.classList.add('lb-open');
  }

  function closePop() {
    if (!popped) return;
    popped = null;
    lightbox.hidden = true;
    html.classList.remove('lb-open');
  }

  lightbox.addEventListener('click', closePop);
  lbFlickr.addEventListener('click', e => e.stopPropagation());
  lightbox.addEventListener('mousemove', e => {
    if (mqMobile.matches) return;
    const w = window.innerWidth, h = window.innerHeight;
    const clamp = v => Math.max(-1, Math.min(1, v));
    setTilt(clamp((e.clientX - w / 2) / (w * .35)), clamp((e.clientY - h / 2) / (h * .35)));
  });
  lightbox.addEventListener('mouseleave', () => setTilt(0, 0));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

  // ---------- 写真を集める ----------
  const stageCol = $('stage-col'), stage = $('stage'), body = $('post-body');
  const flickrPage = src => {
    const m = src.match(FLICKR);
    return m ? `https://www.flickr.com/photo.gne?id=${m[2]}` : '';
  };
  const flickrThumb = src => {
    const m = src.match(FLICKR);
    return m && SAME_SECRET.includes((m[3] || '').toLowerCase()) ? `${m[1]}_c.${m[4]}` : src;
  };

  // 0 = cover、本文の写真は出現順に 1, 2, 3…（cover が無ければ 0 から）
  const photos = [];
  const cover = stage.dataset.cover;
  if (cover) {
    photos.push({
      full: cover,
      thumb: stage.dataset.coverThumb || flickrThumb(cover),
      page: stage.dataset.coverPage || flickrPage(cover),
      caption: stage.dataset.coverCaption || ''
    });
  }

  const marks = [];
  const blocks = [...body.querySelectorAll('figure.post-photo, p > img:only-child')]
    .map(n => (n.tagName === 'IMG' ? n.parentNode : n))
    .filter(n => n.tagName === 'FIGURE' || !n.textContent.trim()); // 画像だけの段落に限る
  blocks.forEach(block => {
    let p;
    if (block.tagName === 'FIGURE') {
      const d = block.dataset;
      p = { full: d.full, thumb: d.thumb || d.full, page: d.page || '', caption: d.caption || '' };
    } else {
      // Markdown の ![キャプション](URL)
      const img = block.querySelector('img');
      p = { full: img.src, thumb: flickrThumb(img.src), page: flickrPage(img.src), caption: img.alt || '' };
    }
    const i = photos.length;
    photos.push(p);
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.className = 'photo-mark';
    mark.dataset.mk = i;
    mark.textContent = pad(cover ? i : i + 1);
    mark.setAttribute('aria-label', `写真 ${mark.textContent}${p.caption ? '：' + p.caption : ''}`);
    mark.addEventListener('click', () => openPop(p));
    block.before(mark);
    block.hidden = true;
    marks.push(mark);
  });

  // 写真が 1 枚も無ければ 1 カラムのまま
  if (!photos.length) return;

  // ---------- ステージ ----------
  const fallback = stageCol.querySelector('.stage-fallback');
  if (fallback) fallback.remove();
  const stageNo = $('stage-no'), stageCap = $('stage-cap'), stageTicks = $('stage-ticks');
  const srcOf = p => (mqMobile.matches ? p.thumb : p.full);

  const shots = photos.map((p, i) => {
    const el = document.createElement('div');
    el.className = 'stage-photo';
    const img = document.createElement('img');
    img.alt = p.caption;
    img.decoding = 'async';
    el.appendChild(img);
    el.addEventListener('click', () => openPop(p));
    stage.appendChild(el);
    stageTicks.appendChild(document.createElement('span'));
    return img;
  });
  const ticks = [...stageTicks.children];

  let act = -1;
  function render(next) {
    act = next;
    shots.forEach((img, i) => {
      const d = i - act;
      img.parentNode.dataset.d = d < 0 ? -1 : Math.min(d, 2);
      if (Math.abs(d) <= 1 && !img.getAttribute('src')) img.src = srcOf(photos[i]); // 現在 ±1 だけ読み込む
      ticks[i].classList.toggle('is-on', d === 0);
    });
    stageNo.textContent = `${pad(act + 1)} / ${pad(photos.length)}`;
    stageCap.textContent = photos[act].caption;
  }

  // 上端が基準線を越えたマーカーのうち最大の番号（なければ先頭）。
  // 末尾近くのマーカーは基準線まで届かないことがあるので、最下部では画面内のものを越えた扱いにする
  function measure() {
    const bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const line = bottom ? window.innerHeight : window.innerHeight * (mqMobile.matches ? .72 : .55);
    let next = 0;
    marks.forEach(m => { if (m.getBoundingClientRect().top < line) next = Math.max(next, +m.dataset.mk); });
    if (next !== act) render(next);
  }

  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(measure);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  mqMobile.addEventListener('change', () => {
    // 読み込み済みの写真をサイズ違いに差し替える
    shots.forEach((img, i) => { if (img.getAttribute('src')) img.src = srcOf(photos[i]); });
    setTilt(0, 0);
    schedule();
  });

  stageCol.hidden = false;
  html.classList.add('has-stage');
  measure();
})();
