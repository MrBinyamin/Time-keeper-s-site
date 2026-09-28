/* A data-video / data-src may be a Google Drive share link
   (https://drive.google.com/file/d/ID/view). A <video> cannot play that page,
   so it becomes the file's direct stream URL. The file must be shared as
   "Anyone with the link". Local paths and other URLs pass through untouched. */
function mediaSrc(url) {
    var m = /drive\.google\.com\/file\/d\/([^/?#]+)/.exec(url || '');
    return m ? 'https://drive.google.com/uc?export=download&id=' + m[1] : url;
}

(function () {
    'use strict';

    var root = document.documentElement;
    var langHooks = [];
    var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var reduce = reduceQuery.matches;

    /* ─────────────────────────────────────────────
       Display type: wrap each word in a mask so it
       can rise. Rebuilt after every language switch.
       ───────────────────────────────────────────── */
    var HAS_RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
    var HAS_LTR = /[A-Za-z\u00C0-\u024F\u0370-\u052F]/;

    function typeset(el) {
        var text = el.textContent.trim();
        if (!text) return;
        var rtl = root.getAttribute('dir') === 'rtl';
        var frag = document.createDocumentFragment();
        var run = null;
        text.split(/\s+/).forEach(function (word, i) {
            var mask = document.createElement('span');
            mask.className = 'w';
            mask.style.setProperty('--wi', i);
            var inner = document.createElement('i');
            inner.textContent = word;
            mask.appendChild(inner);

            /* On an RTL line every word box is an atomic neutral, so a run of
               Latin words — the brand name — would be laid out right to left,
               one word at a time. Keep such a run inside one dir="ltr" span
               (the UA isolates it) so it reads left to right as a unit. */
            if (rtl && HAS_LTR.test(word) && !HAS_RTL.test(word)) {
                if (run) {
                    run.appendChild(document.createTextNode(' '));
                } else {
                    run = document.createElement('span');
                    run.setAttribute('dir', 'ltr');
                    if (i) frag.appendChild(document.createTextNode(' '));
                    frag.appendChild(run);
                }
                run.appendChild(mask);
            } else {
                run = null;
                if (i) frag.appendChild(document.createTextNode(' '));
                frag.appendChild(mask);
            }
        });
        el.textContent = '';
        el.appendChild(frag);
    }

    function typesetAll() {
        document.querySelectorAll('[data-split]').forEach(typeset);
    }

    /* ─────────────────────────────────────────────
       Language
       ───────────────────────────────────────────── */
    window.changeLanguage = function (lang) {
        root.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
        root.setAttribute('lang', lang);

        document.querySelectorAll('.lang').forEach(function (el) {
            var v = el.getAttribute('data-' + lang);
            if (v !== null) el.innerText = v;
        });
        document.querySelectorAll('.lang-placeholder').forEach(function (el) {
            var v = el.getAttribute('data-' + lang);
            if (v !== null) el.placeholder = v;
        });
        document.querySelectorAll('.lang-aria').forEach(function (el) {
            var v = el.getAttribute('data-' + lang);
            if (v !== null) el.setAttribute('aria-label', v);
        });

        // .lang replaced innerText, so the word masks need rebuilding.
        typesetAll();

        langHooks.forEach(function (fn) { fn(lang); });

        try { localStorage.setItem('tk-lang', lang); } catch (e) {}
    };

    var saved = null;
    try { saved = localStorage.getItem('tk-lang'); } catch (e) {}
    if (saved && saved !== 'en') {
        var sel = document.getElementById('langSwitch');
        if (sel) sel.value = saved;
        changeLanguage(saved);
    } else {
        typesetAll();
    }

    /* ─────────────────────────────────────────────
       Menu: the same markup on every page, so the
       current page is marked here rather than by hand.
       ───────────────────────────────────────────── */
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');

    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    links.querySelectorAll('a[href]').forEach(function (a) {
        var href = a.getAttribute('href');
        if (href.indexOf('#') !== -1) return;            // anchors are never "the page"
        var file = (href.split('/').pop() || 'index.html').toLowerCase();
        if (file === here) a.setAttribute('aria-current', 'page');
    });

    function closeMenu() {
        if (!links.classList.contains('open')) return;
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && links.classList.contains('open')) { closeMenu(); toggle.focus(); }
    });
    document.addEventListener('click', function (e) {
        if (!links.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });

    /* ─────────────────────────────────────────────
       Choreographed reveals: one trigger per group,
       children sequence off it in CSS.
       ───────────────────────────────────────────── */
    var groups = document.querySelectorAll('[data-reveal]');

    if (reduce || !('IntersectionObserver' in window)) {
        groups.forEach(function (g) { g.classList.add('in'); });
    } else {
        // The page opener (the hero, or a sub-page's header) plays on load
        // rather than waiting to be scrolled into view.
        var opener = document.querySelector('main [data-reveal]');
        if (opener) requestAnimationFrame(function () { opener.classList.add('in'); });

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('in');
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });

        groups.forEach(function (g) { if (g !== opener) io.observe(g); });
    }

    /* ─────────────────────────────────────────────
       The showcase: wedding collections as a reel
       ───────────────────────────────────────────── */
    var reel = document.getElementById('reel');
    if (reel) {
    var tabs = Array.prototype.slice.call(reel.querySelectorAll('[role="tab"]'));

    function play(panel) {
        panel.classList.remove('playing');
        if (reduce) { panel.classList.add('playing'); return; }
        void panel.offsetWidth;           // restart the stage transition
        panel.classList.add('playing');
    }

    function select(tab, focus) {
        tabs.forEach(function (t) {
            var on = t === tab;
            var panel = document.getElementById(t.getAttribute('aria-controls'));
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.tabIndex = on ? 0 : -1;
            panel.hidden = !on;
            if (on) { play(panel); panelPlay(panel); } else panelStop(panel);
        });
        if (focus) tab.focus();
    }

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () { select(tab, false); });
    });

    reel.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next, true);
    });

    // Stage the initially open panel once its section arrives
    var firstPanel = document.getElementById('panel-essential');
    if (reduce || !('IntersectionObserver' in window)) {
        firstPanel.classList.add('playing');
    } else {
        var pio = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return;
            play(firstPanel); panelPlay(firstPanel);
            pio.disconnect();
        }, { threshold: 0.15 });
        pio.observe(firstPanel);
    }
    } // reel

    /* ─────────────────────────────────────────────
       Timecode: 24fps since the page loaded (hero only)
       ───────────────────────────────────────────── */
    var tc = document.getElementById('tc');
    var FPS = 24;
    var start = performance.now();
    var lastFrame = -1;
    var tcRaf = null;

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function tick(now) {
        var f = Math.floor((now - start) / 1000 * FPS);
        if (f !== lastFrame) {
            lastFrame = f;
            tc.textContent = pad(Math.floor(f / (FPS * 3600)) % 24) + ':' +
                             pad(Math.floor(f / (FPS * 60)) % 60) + ':' +
                             pad(Math.floor(f / FPS) % 60) + ':' +
                             pad(f % FPS);
        }
        tcRaf = requestAnimationFrame(tick);
    }
    function playTc() { if (tcRaf === null && !reduce) tcRaf = requestAnimationFrame(tick); }
    function pauseTc() { if (tcRaf !== null) { cancelAnimationFrame(tcRaf); tcRaf = null; } }

    if (tc && !reduce) {
        playTc();
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                entries[0].isIntersecting ? playTc() : pauseTc();
            }).observe(document.querySelector('.hero'));
        }
        document.addEventListener('visibilitychange', function () {
            document.hidden ? pauseTc() : playTc();
        });
    }

    /* ─────────────────────────────────────────────
       One scroll frame: nav state, rail, film-edge drift
       ───────────────────────────────────────────── */
    var nav = document.getElementById('nav');
    var railFill = document.getElementById('railFill');
    var filmedge = document.getElementById('filmedge');
    var scrollRaf = null;

    function onFrame() {
        scrollRaf = null;
        var y = window.scrollY || 0;

        nav.classList.toggle('stuck', y > 24);

        if (railFill) {
            var max = document.documentElement.scrollHeight - window.innerHeight;
            railFill.style.transform = 'scaleY(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
        }
        // Depth: the film edge trails the page slightly
        if (filmedge && !reduce && y < window.innerHeight) {
            filmedge.style.transform = 'translate3d(0,' + (y * 0.14) + 'px,0)';
        }
    }

    /* The end card: size the wordmark to span the frame exactly */
    var endmark = document.querySelector('.endmark');
    function fitEndmark() {
        if (!endmark) return;
        var span = endmark.firstElementChild;   // inline: reports true text width
        if (!span) return;
        endmark.style.fontSize = '100px';
        var natural = span.getBoundingClientRect().width;
        if (!natural) return;
        endmark.style.fontSize = (100 * document.documentElement.clientWidth / natural) + 'px';
    }
    fitEndmark();

    // Word positions and the wordmark both change when the frame resizes
    var reflowTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(reflowTimer);
        reflowTimer = setTimeout(fitEndmark, 120);
    }, { passive: true });
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(fitEndmark);
    }

    function onScroll() { if (scrollRaf === null) scrollRaf = requestAnimationFrame(onFrame); }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onFrame();


    /* ─────────────────────────────────────────────
       Footage. Nothing downloads until it is wanted:
       hover or focus on a desktop, mostly-in-view on
       touch, the chosen collection in the showcase.
       ───────────────────────────────────────────── */
    var canAuto = !reduce && !(navigator.connection && navigator.connection.saveData);
    var hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function attach(holder) {
        var v = holder.querySelector('video');
        if (v && !v.getAttribute('src')) { v.src = mediaSrc(holder.getAttribute('data-video')); v.load(); }
        return v;
    }
    function playIn(holder) {
        if (!canAuto) return;
        var v = attach(holder); if (!v) return;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        holder.classList.add('playing');
    }
    function stopIn(holder) {
        var v = holder.querySelector('video');
        if (v && v.getAttribute('src')) v.pause();
        holder.classList.remove('playing');
    }

    /* Hero loop */
    var heroVideo = document.getElementById('heroVideo');
    var heroCtl = document.getElementById('heroCtl');
    var heroWanted = canAuto, heroSeen = true;
    var CTL = { en: ['Pause background video', 'Play background video'],
                he: ['השהיית וידאו הרקע', 'הפעלת וידאו הרקע'],
                ru: ['Остановить фоновое видео', 'Запустить фоновое видео'] };
    function ctlLabel() {
        var l = CTL[root.getAttribute('lang')] || CTL.en;
        heroCtl.setAttribute('aria-label', heroWanted ? l[0] : l[1]);
        heroCtl.setAttribute('aria-pressed', heroWanted ? 'false' : 'true');
    }
    function heroPlay() {
        if (!heroWanted || !heroSeen || document.hidden) return;
        if (!heroVideo.getAttribute('src')) {
            heroVideo.src = mediaSrc(window.matchMedia('(min-width: 900px)').matches ? heroVideo.getAttribute('data-src-lg') : heroVideo.getAttribute('data-src-sm'));
            heroVideo.preload = 'auto';
        }
        var p = heroVideo.play(); if (p && p.catch) p.catch(function () {});
    }
    if (canAuto && heroVideo && heroCtl) {
        var heroStart = function () { setTimeout(function () { heroPlay(); heroCtl.hidden = false; ctlLabel(); }, 250); };
        if (document.readyState === 'complete') heroStart(); else window.addEventListener('load', heroStart);
        heroCtl.addEventListener('click', function () {
            heroWanted = !heroWanted; ctlLabel();
            if (heroWanted) heroPlay(); else heroVideo.pause();
        });
        langHooks.push(ctlLabel);
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                heroSeen = entries[0].isIntersecting;
                if (heroSeen) heroPlay(); else heroVideo.pause();
            }, { threshold: 0.05 }).observe(document.querySelector('.hero'));
        }
        document.addEventListener('visibilitychange', function () { if (document.hidden) heroVideo.pause(); else heroPlay(); });
    }

    /* Strips: the Selected Work run on the home page and one per category on
       the Works page. Each .strip-shell owns its own bar, counter and buttons.
       Every strip is an endless loop: the real frames sit in the middle of
       copies of themselves (aria-hidden, out of the tab order), and once the
       scroll comes to rest it is moved by whole copies back to the middle,
       which looks identical, so the run never reaches an end either way. */
    function setupStrip(strip) {
    var shell = strip.parentNode;
    var originals = Array.prototype.slice.call(strip.querySelectorAll('.frame'));
    var count = originals.length;
    if (!count) return;
    var stripSeen = false, inStrip = null;
    var clones = [], fillers = [], k = 0, setW = 0, rel = [], built = false, looping = false;
    // Works categories: a row too short to fill the screen is padded with
    // "Coming soon" frames, so the loop never shows the same video twice at once.
    var canPad = !!strip.closest('.cat');

    // A frame that is not a link still previews on focus, so it must be reachable by keyboard
    originals.forEach(function (f) {
        if (f.hasAttribute('data-video') && f.tagName !== 'A' && !f.hasAttribute('tabindex')) f.tabIndex = 0;
    });

    /* Playback, delegated so the loop's copies behave exactly like the originals */
    function frameOf(el) {
        var f = el && el.closest ? el.closest('.frame[data-video]') : null;
        return f && strip.contains(f) ? f : null;
    }
    if (hoverable) {
        strip.addEventListener('pointerover', function (e) { var f = frameOf(e.target); if (f && !f.contains(e.relatedTarget)) playIn(f); });
        strip.addEventListener('pointerout', function (e) { var f = frameOf(e.target); if (f && !f.contains(e.relatedTarget)) stopIn(f); });
        strip.addEventListener('focusin', function (e) { var f = frameOf(e.target); if (f) playIn(f); });
        strip.addEventListener('focusout', function (e) { var f = frameOf(e.target); if (f) stopIn(f); });
    } else if (canAuto && 'IntersectionObserver' in window) {
        // Touch: the frames mostly in view play by themselves; the rest rest
        inStrip = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                e.target.inView = e.isIntersecting;
                if (e.isIntersecting && stripSeen) playIn(e.target); else stopIn(e.target);
            });
        }, { root: strip, threshold: 0.6 });
    }
    // A stream that cannot load keeps its poster instead of a blank frame
    strip.addEventListener('error', function (e) { var f = frameOf(e.target); if (f) f.classList.remove('playing'); }, true);
    function watch(f) { if (inStrip && f.hasAttribute('data-video')) inStrip.observe(f); }
    originals.forEach(watch);

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            stripSeen = entries[0].isIntersecting;
            strip.querySelectorAll('.frame[data-video]').forEach(function (f) {
                if (stripSeen && f.inView && !hoverable) playIn(f);
                else if (!stripSeen) stopIn(f);
            });
        }, { threshold: 0.1 }).observe(strip);
    }

    /* The loop */
    function rtl() { return root.getAttribute('dir') === 'rtl'; }
    function pos() { return Math.abs(strip.scrollLeft); }
    function setPos(p) { strip.scrollLeft = rtl() ? -p : p; }
    // Where the view is within one copy, 0 .. setW. A hair short of a full copy
    // (sub-pixel scroll positions) counts as the start, not the end.
    function phase() {
        if (!looping) return 0;
        if (!setW) return 0;
        var q = (((pos() - k * setW) % setW) + setW) % setW;
        return setW - q < 2 ? 0 : q;
    }

    function cloneSet() {
        var frag = document.createDocumentFragment();
        originals.concat(fillers).forEach(function (f) {
            var c = f.cloneNode(true);
            c.classList.remove('playing');
            c.classList.add('frame--clone');
            c.setAttribute('aria-hidden', 'true');
            c.setAttribute('tabindex', '-1');
            var v = c.querySelector('video');
            if (v) v.removeAttribute('src');
            frag.appendChild(c);
            clones.push(c);
            watch(c);
        });
        return frag;
    }

    function makeFiller() {
        var lang = root.getAttribute('lang') || 'en';
        var f = document.createElement('article');
        f.className = 'frame frame--empty frame--filler';
        f.style.setProperty('--ar', '720/1280');
        f.setAttribute('aria-hidden', 'true');
        var t = document.createElement('span');
        t.className = 'frame-empty lang';
        t.setAttribute('data-en', 'Coming soon');
        t.setAttribute('data-he', 'בקרוב');
        t.setAttribute('data-ru', 'Скоро');
        t.textContent = t.getAttribute('data-' + lang) || 'Coming soon';
        f.appendChild(t);
        return f;
    }

    function build() {
        var cw = strip.clientWidth;
        if (!cw) return;                       // hidden (a filtered-out category): try again when shown
        var was = looping && setW ? phase() / setW : 0;
        looping = false;
        clones.forEach(function (c) { if (inStrip) inStrip.unobserve(c); c.remove(); });
        fillers.forEach(function (f) { f.remove(); });
        clones = []; fillers = [];
        var gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
        // offsetWidth is the layout width, so a frame enlarged on hover does not skew it
        setW = 0; rel = [];
        originals.forEach(function (f) { rel.push(setW); setW += f.offsetWidth + gap; });
        if (!setW) return;
        built = true;

        // Pad a short row with "Coming soon" frames until one pass of it is wider
        // than the screen (plus half a frame), so no video can meet its own copy.
        if (canPad) {
            var last = originals[count - 1];
            while (setW < cw + 120 && fillers.length < 40) {
                var f = makeFiller();
                strip.insertBefore(f, last.nextSibling);
                last = f;
                fillers.push(f);
                setW += f.offsetWidth + gap;
            }
        }

        looping = true;
        // Enough copies on each side to cover the view plus a button step either way
        k = Math.ceil((cw * 1.8) / setW) + 1;
        for (var i = 0; i < k; i++) strip.insertBefore(cloneSet(), originals[0]);
        for (i = 0; i < k; i++) strip.appendChild(cloneSet());
        setPos(k * setW + was * setW);
        stripFrame();
    }

    function normalize() {
        if (!looping || !setW) { stripFrame(); return; }
        var want = k * setW + phase();
        if (Math.abs(want - pos()) > 1) setPos(want);
        stripFrame();
    }

    var stripFill = shell.querySelector('.strip-bar i');
    var stripIdx = shell.querySelector('.strip-count span');
    var stripRaf = null, idle = null;
    function stripFrame() {
        stripRaf = null;
        if (!setW) return;
        var q = phase(), n = 0, best = Infinity;
        rel.forEach(function (r, i) {
            var d = Math.min(Math.abs(q - r), Math.abs(q - r - setW));
            if (d < best) { best = d; n = i; }
        });
        if (stripFill) stripFill.style.transform = 'scaleX(' + ((n + 1) / count) + ')';
        if (stripIdx) stripIdx.textContent = n + 1 < 10 ? '0' + (n + 1) : '' + (n + 1);
    }
    strip.addEventListener('scroll', function () {
        if (stripRaf === null) stripRaf = requestAnimationFrame(stripFrame);
        clearTimeout(idle);
        idle = setTimeout(normalize, 180);
    }, { passive: true });

    if ('ResizeObserver' in window) {
        var lastW = 0;
        new ResizeObserver(function () {
            // Only a change of width matters; the first sighting builds the row
            if (strip.clientWidth !== lastW || !built) { lastW = strip.clientWidth; build(); }
        }).observe(strip);
    } else {
        window.addEventListener('resize', build, { passive: true });
        build();
    }
    langHooks.push(function () { setW = 0; built = false; build(); });   // a direction change mirrors the strip

    function stripStep(sign) {
        normalize();
        var dirSign = rtl() ? -1 : 1;
        strip.scrollBy({ left: sign * dirSign * strip.clientWidth * 0.7, behavior: reduce ? 'auto' : 'smooth' });
    }
    var prev = shell.querySelector('.strip-btn--prev'), next = shell.querySelector('.strip-btn:not(.strip-btn--prev)');
    if (prev) prev.addEventListener('click', function () { stripStep(-1); });
    if (next) next.addEventListener('click', function () { stripStep(1); });
    } // setupStrip
    Array.prototype.slice.call(document.querySelectorAll('.strip')).forEach(setupStrip);

    /* Showcase panels (weddings page only) */
    var panelsSeen = true;
    var weddings = document.getElementById('weddings');
    function panelPlay(panel) { var m = panel.querySelector('.panel-media'); if (m) playIn(m); }
    function panelStop(panel) { var m = panel.querySelector('.panel-media'); if (m) stopIn(m); }
    if (weddings && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            panelsSeen = entries[0].isIntersecting;
            document.querySelectorAll('.reel-panel').forEach(function (p) {
                if (panelsSeen && !p.hidden) panelPlay(p); else panelStop(p);
            });
        }, { threshold: 0.1 }).observe(weddings);
    }

    /* Honour a mid-session reduced-motion change */
    var onMotionChange = function () {
        reduce = reduceQuery.matches;
        if (!tc) return;
        if (reduce) { pauseTc(); tc.textContent = '00:00:00:00'; }
        else playTc();
    };
    if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onMotionChange);
    else if (reduceQuery.addListener) reduceQuery.addListener(onMotionChange);
})();

/* ═════════════════════════════════════════════════════════════
   Works page: hash routing for the category filter. The strips
   themselves are wired by setupStrip above, like the home page.
   ═════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var filter = document.getElementById('filter');
    var cats = document.getElementById('cats');
    if (!filter || !cats) return;

    var chips = Array.prototype.slice.call(filter.querySelectorAll('.chip'));

    /* Arrows for the category bar: shown only when there is more in their direction */
    var bar = filter.querySelector('.chips'), scroller = filter.querySelector('.chips-scroller');
    var chipPrev = filter.querySelector('.chips-btn--prev'), chipNext = filter.querySelector('.chips-btn--next');
    if (bar && scroller && chipPrev && chipNext) {
        var chipRaf = null;
        var chipState = function () {
            chipRaf = null;
            var max = bar.scrollWidth - bar.clientWidth;
            var at = Math.abs(bar.scrollLeft);          // RTL scrolls in negatives
            var hasPrev = max > 1 && at > 1, hasNext = max > 1 && at < max - 1;
            chipPrev.hidden = !hasPrev; chipNext.hidden = !hasNext;
            scroller.classList.toggle('has-prev', hasPrev);
            scroller.classList.toggle('has-next', hasNext);
        };
        var chipQueue = function () { if (chipRaf === null) chipRaf = requestAnimationFrame(chipState); };
        var chipStep = function (sign) {
            var dir = document.documentElement.getAttribute('dir') === 'rtl' ? -1 : 1;
            var reduceNow = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            bar.scrollBy({ left: sign * dir * bar.clientWidth * 0.7, behavior: reduceNow ? 'auto' : 'smooth' });
        };
        chipPrev.addEventListener('click', function () { chipStep(-1); });
        chipNext.addEventListener('click', function () { chipStep(1); });
        bar.addEventListener('scroll', chipQueue, { passive: true });
        window.addEventListener('resize', chipQueue, { passive: true });
        if ('ResizeObserver' in window) new ResizeObserver(chipQueue).observe(bar);
        chipState();
    }
    var sections = Array.prototype.slice.call(cats.querySelectorAll('.cat'));
    var known = sections.map(function (s) { return s.getAttribute('data-cat'); });

    function route() {
        var want = (location.hash || '#all').slice(1).toLowerCase();
        if (known.indexOf(want) === -1) want = 'all';
        sections.forEach(function (s) { s.hidden = want !== 'all' && s.getAttribute('data-cat') !== want; });
        chips.forEach(function (c) {
            var on = c.getAttribute('data-cat') === want;
            if (on) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
            if (on && c.scrollIntoView) c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    }

    route();
    window.addEventListener('hashchange', function () {
        // Plain anchors on this page (#contact, #main) are not filters: let them be.
        var h = (location.hash || '#all').slice(1).toLowerCase();
        if (h !== 'all' && known.indexOf(h) === -1) return;
        route();
        // Keep the reader at the top of the (now shorter or longer) list
        var navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
        var top = filter.getBoundingClientRect().top + window.scrollY - navH;
        if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'auto' });
    });

})();

/* ═════════════════════════════════════════════════════════════
   Contact form: posts to Formspree in the background and reports
   back in the visitor's language. Until a real form ID is set in
   the form's action, and whenever the request fails, the visitor's
   own mail client takes over instead, so a message is never lost.
   ═════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var form = document.querySelector('.contact-form');
    if (!form) return;

    var root = document.documentElement;
    var status = form.querySelector('.form-status');
    var TO = 'timekeepersproduction@gmail.com';
    var configured = form.action.indexOf('YOUR_FORM_ID') === -1;
    var canPost = configured && 'fetch' in window && 'FormData' in window;

    var MSG = {
        en: {
            sending: 'Sending…',
            sent: 'Thank you — your message is on its way. We reply within one working day.',
            error: 'The message could not be sent. Please email us directly at ',
            mailto: 'Your mail app should open with the message ready to send. If it did not, email us at '
        },
        he: {
            sending: 'שולח…',
            sent: 'תודה — ההודעה בדרך. אנחנו עונים תוך יום עסקים אחד.',
            error: 'ההודעה לא נשלחה. אפשר לכתוב לנו ישירות לכתובת ',
            mailto: 'אפליקציית המייל שלכם אמורה להיפתח עם ההודעה מוכנה לשליחה. אם לא, כתבו לנו לכתובת '
        },
        ru: {
            sending: 'Отправляем…',
            sent: 'Спасибо — сообщение отправлено. Отвечаем в течение одного рабочего дня.',
            error: 'Не удалось отправить сообщение. Напишите нам напрямую: ',
            mailto: 'Должна открыться ваша почтовая программа с готовым письмом. Если нет, напишите нам: '
        }
    };
    var SUBJECT = { en: 'Project enquiry — ', he: 'פנייה לגבי פרויקט — ', ru: 'Запрос по проекту — ' };

    function lang() { return MSG[root.getAttribute('lang')] ? root.getAttribute('lang') : 'en'; }

    /* The last message shown, so a language switch can restate it */
    var shown = null;
    function say(key, isError) {
        shown = key;
        status.textContent = MSG[lang()][key];
        status.classList.toggle('is-error', !!isError);
        if (key === 'error' || key === 'mailto') {
            var a = document.createElement('a');
            a.href = 'mailto:' + TO; a.textContent = TO; a.setAttribute('dir', 'ltr');
            status.appendChild(a);
            status.appendChild(document.createTextNode('.'));
        }
        status.hidden = false;
    }
    var prevChange = window.changeLanguage;
    if (typeof prevChange === 'function') {
        window.changeLanguage = function (l) {
            prevChange(l);
            if (shown) say(shown, status.classList.contains('is-error'));
        };
    }

    function field(name) { var el = form.elements[name]; return el ? el.value.trim() : ''; }

    /* Hand the message to the visitor's own mail client */
    function viaMailClient() {
        var name = field('name'), email = field('email'), message = field('message');
        var body = message + '\n\n— ' + name + (email ? ' <' + email + '>' : '');
        location.href = 'mailto:' + TO +
            '?subject=' + encodeURIComponent(SUBJECT[lang()] + name) +
            '&body=' + encodeURIComponent(body);
        say('mailto');
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (form.checkValidity && !form.checkValidity()) {
            if (form.reportValidity) form.reportValidity();
            return;
        }
        if (!canPost) { viaMailClient(); return; }

        form.classList.add('is-sending');
        say('sending');
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: { Accept: 'application/json' }
        }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            form.reset();
            say('sent');
        }).catch(function () {
            say('error', true);
        }).then(function () {
            form.classList.remove('is-sending');
        });
    });
})();
