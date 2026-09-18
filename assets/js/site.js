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
        if (v && !v.getAttribute('src')) { v.src = holder.getAttribute('data-video'); v.load(); }
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
            heroVideo.src = window.matchMedia('(min-width: 900px)').matches ? heroVideo.getAttribute('data-src-lg') : heroVideo.getAttribute('data-src-sm');
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

    /* The strip (home only) */
    var strip = document.getElementById('strip');
    if (strip) {
    var frames = Array.prototype.slice.call(strip.querySelectorAll('.frame'));
    var stripSeen = false;

    if (hoverable) {
        frames.forEach(function (f) {
            f.addEventListener('pointerenter', function () { playIn(f); });
            f.addEventListener('pointerleave', function () { stopIn(f); });
            f.addEventListener('focus', function () { playIn(f); });
            f.addEventListener('blur', function () { stopIn(f); });
        });
    } else if (canAuto && 'IntersectionObserver' in window) {
        // Touch: the frames mostly in view play by themselves; the rest rest
        var inStrip = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                e.target.inView = e.isIntersecting;
                if (e.isIntersecting && stripSeen) playIn(e.target); else stopIn(e.target);
            });
        }, { root: strip, threshold: 0.6 });
        frames.forEach(function (f) { inStrip.observe(f); });
    }
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            stripSeen = entries[0].isIntersecting;
            frames.forEach(function (f) {
                if (stripSeen && f.inView && !hoverable) playIn(f);
                else if (!stripSeen) stopIn(f);
            });
        }, { threshold: 0.1 }).observe(strip);
    }

    var stripFill = document.getElementById('stripFill');
    var stripIdx = document.getElementById('stripIdx');
    var stripRaf = null;
    function stripFrame() {
        stripRaf = null;
        var max = strip.scrollWidth - strip.clientWidth;
        var frac = max > 0 ? Math.min(1, Math.abs(strip.scrollLeft) / max) : 0;
        stripFill.style.transform = 'scaleX(' + frac + ')';
        var n = Math.round(frac * (frames.length - 1)) + 1;
        stripIdx.textContent = n < 10 ? '0' + n : '' + n;
    }
    strip.addEventListener('scroll', function () { if (stripRaf === null) stripRaf = requestAnimationFrame(stripFrame); }, { passive: true });
    stripFrame();

    function stripStep(sign) {
        var dirSign = root.getAttribute('dir') === 'rtl' ? -1 : 1;
        strip.scrollBy({ left: sign * dirSign * strip.clientWidth * 0.7, behavior: reduce ? 'auto' : 'smooth' });
    }
    document.getElementById('stripPrev').addEventListener('click', function () { stripStep(-1); });
    document.getElementById('stripNext').addEventListener('click', function () { stripStep(1); });
    } // strip

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
   Works page: hash routing for the category filter, and hover /
   in-view playback for any slot that has media.
   ═════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var filter = document.getElementById('filter');
    var cats = document.getElementById('cats');
    if (!filter || !cats) return;

    var chips = Array.prototype.slice.call(filter.querySelectorAll('.chip'));
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

    /* Playback: same rules as the home strip — hover on a desktop,
       mostly-in-view on touch. Slots without data-video are inert. */
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canAuto = !reduce && !(navigator.connection && navigator.connection.saveData);
    var hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var slots = Array.prototype.slice.call(cats.querySelectorAll('.slot[data-video]'));
    // A filled slot previews on focus too, so it must be reachable by keyboard
    slots.forEach(function (s) { if (!s.hasAttribute('tabindex') && s.tagName !== 'A') s.tabIndex = 0; });

    function playIn(holder) {
        if (!canAuto) return;
        var v = holder.querySelector('video'); if (!v) return;
        if (!v.getAttribute('src')) { v.src = holder.getAttribute('data-video'); v.load(); }
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        holder.classList.add('playing');
    }
    function stopIn(holder) {
        var v = holder.querySelector('video');
        if (v && v.getAttribute('src')) v.pause();
        holder.classList.remove('playing');
    }

    if (hoverable) {
        slots.forEach(function (s) {
            s.addEventListener('pointerenter', function () { playIn(s); });
            s.addEventListener('pointerleave', function () { stopIn(s); });
            s.addEventListener('focus', function () { playIn(s); });
            s.addEventListener('blur', function () { stopIn(s); });
        });
    } else if (canAuto && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { e.isIntersecting ? playIn(e.target) : stopIn(e.target); });
        }, { threshold: 0.6 });
        slots.forEach(function (s) { io.observe(s); });
    }
})();
