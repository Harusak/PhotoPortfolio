// 記事ページ：本文を写真ごとのシーンに区切り、1 スクロールで 1 シーンずつ進める「シーン送り」
(function () {
  const html = document.documentElement;
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const S = window.PostScenes;
  const mqMobile = window.matchMedia('(max-width: 759px)');
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
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
  const scenesEl = $('scenes');
  const flickrPage = src => {
    const m = src.match(FLICKR);
    return m ? `https://www.flickr.com/photo.gne?id=${m[2]}` : '';
  };
  const flickrThumb = src => {
    const m = src.match(FLICKR);
    return m && SAME_SECRET.includes((m[3] || '').toLowerCase()) ? `${m[1]}_c.${m[4]}` : src;
  };
  // figure.post-photo か、画像だけの段落（Markdown の ![キャプション](URL)）
  const isPhotoBlock = n => n.matches('figure.post-photo')
    || (n.tagName === 'P' && n.children.length === 1 && n.firstElementChild.tagName === 'IMG' && !n.textContent.trim());

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

  const blocks = [...body.children];
  const isPhoto = blocks.map(isPhotoBlock);
  blocks.forEach((block, i) => {
    if (!isPhoto[i]) return;
    if (block.tagName === 'FIGURE') {
      const d = block.dataset;
      photos.push({ full: d.full, thumb: d.thumb || d.full, page: d.page || '', caption: d.caption || '' });
    } else {
      const img = block.querySelector('img');
      photos.push({ full: img.src, thumb: flickrThumb(img.src), page: flickrPage(img.src), caption: img.alt || '' });
    }
    block.remove(); // 写真はステージ側に出す
  });

  // 各シーンでステージに出す写真。写真が 1 枚も無ければ普通の 1 カラムのまま
  const photoOf = S.scenePhotos(photos.length - (cover ? 1 : 0), !!cover);
  if (!photoOf.length) return;

  // ---------- シーンを組み立てる ----------
  const groups = S.splitScenes(isPhoto);
  const head = scenesEl.querySelector('.post-head'), foot = scenesEl.querySelector('.post-foot');
  const fallback = scenesEl.querySelector('.post-cover-fallback');
  if (fallback) fallback.remove();

  const scenes = groups.map((group, k) => {
    const sec = document.createElement('section');
    sec.className = 'scene';
    if (k === 0) {
      sec.appendChild(head);
    } else {
      const no = document.createElement('span');
      no.className = 'scene-no';
      no.textContent = pad(photoOf[k] + 1);
      sec.appendChild(no);
    }
    group.forEach(i => sec.appendChild(blocks[i]));
    return sec;
  });
  const end = document.createElement('section');
  end.className = 'scene scene-end';
  end.appendChild(foot);
  scenes.push(end);
  scenes.forEach((sec, i) => { sec.dataset.scene = i; body.appendChild(sec); });

  // 最初と最後のシーンも中央に来られるよう、前後に文章欄の高さの半分のスペーサー
  const spacers = [0, 1].map(() => {
    const el = document.createElement('div');
    el.className = 'scene-spacer';
    el.setAttribute('aria-hidden', 'true');
    return el;
  });
  scenesEl.prepend(spacers[0]);
  scenesEl.append(spacers[1]);

  // ---------- 計測・スクロール ----------
  const progress = $('scene-progress'), progFill = progress.querySelector('.scene-progress-fill');
  const cue = $('scroll-cue');
  const onActChange = [];
  const long = new Set();
  let act = 0, edge = 0, H = 0, cueReady = false, cueSeen = false;

  function goScene(i, smooth, fromBelow) {
    const sec = scenes[i];
    const top = S.snapTop(sec.offsetTop, sec.offsetHeight, H, edge, long.has(i), fromBelow);
    scenesEl.scrollTo({ top, behavior: smooth && !mqReduce.matches ? 'smooth' : 'auto' });
  }

  // スペーサー・edge・長いシーンを計算し直し、今のシーンを戻す
  function measure() {
    H = scenesEl.clientHeight;
    if (!H) return;
    spacers.forEach(el => { el.style.height = Math.round(H / 2) + 'px'; });
    edge = S.edgeOf(H, mqMobile.matches);
    scenesEl.style.setProperty('--edge', edge + 'px');
    scenes.forEach((sec, i) => {
      const mark = sec.querySelector('.scene-end-mark');
      if (mark) mark.remove(); // 末尾マーカーの分を除いて測る
      if (S.isLongScene(sec.offsetHeight, H, edge)) {
        long.add(i);
        sec.dataset.long = '';
        const m = document.createElement('div');
        m.className = 'scene-end-mark';
        m.setAttribute('aria-hidden', 'true');
        sec.appendChild(m);
      } else {
        long.delete(i);
        delete sec.dataset.long;
      }
    });
    goScene(act, false, false);
    update();
  }

  function render() {
    scenes.forEach((sec, i) => { sec.dataset.d = S.sceneDepth(i, act); });
    onActChange.forEach(f => f());
  }

  function updateCue() {
    cue.classList.toggle('is-on', cueReady && act === 0 && !cueSeen);
  }

  // 中央の水平線を含むシーンをアクティブに。長いシーンなら進み具合も
  function update() {
    const r = scenesEl.getBoundingClientRect();
    const next = S.activeScene(scenes.map(sec => sec.getBoundingClientRect()), r.top + r.height / 2);
    if (next !== act) {
      act = next;
      render();
    }
    if (act > 0) cueSeen = true;
    updateCue();
    const isLong = long.has(act);
    progress.classList.toggle('is-on', isLong);
    if (isLong) {
      const sec = scenes[act];
      const p = S.longProgress(scenesEl.scrollTop, sec.offsetTop, sec.offsetHeight, H, edge);
      progFill.style.height = p + '%';
      progress.classList.toggle('is-end', p >= 100);
    }
  }

  // rAF で間引く（関数ごとに別の予約）
  const schedule = fn => {
    let raf = 0;
    return () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fn);
    };
  };
  scenesEl.addEventListener('scroll', schedule(update), { passive: true });
  window.addEventListener('resize', schedule(measure));

  stageCol.hidden = false;
  html.classList.add('has-scenes');
  render();
  measure();
  if (document.fonts) document.fonts.ready.then(measure);
  setTimeout(() => { cueReady = true; updateCue(); }, 1000);
  scenesEl.focus({ preventScroll: true }); // 読み込み直後から ↑↓・Space・PageUp/Down で進める
})();
