# Timekeepers — site

Static, multi-page site. No build step: Render serves the files as they are.

```
index.html          Home: hero, What We Do, Selected Work, Rate Card, Packages link, Weddings link, Contact
packages.html       Content Packages
weddings.html       Wedding Collections
works.html          Our Work: 12 project categories, hash-filtered (works.html#sports)
assets/css/site.css One stylesheet, shared by every page
assets/js/site.js   One script, shared by every page (language switch, menu, motion, video)
assets/…            Hero loop, work reels, wedding loops (mp4 + webp poster)
docs/               Source PDFs the copy and prices come from
```

## Contact form

The form on every page posts to [Formspree](https://formspree.io). Create a form there, then
replace `YOUR_FORM_ID` in the `<form action="https://formspree.io/f/YOUR_FORM_ID">` of all four
pages with the ID Formspree gives you. `site.js` sends the message in the background and shows a
status line in the visitor's language; until the ID is set, and if a send ever fails, it opens the
visitor's own mail client addressed to the studio instead.

## Languages

Every user-facing string carries its three translations on the element itself:

```html
<h2 class="lang" data-en="What We Do" data-he="מה אנחנו עושים" data-ru="Что мы делаем">What We Do</h2>
```

`class="lang"` swaps the text, `lang-placeholder` swaps a form placeholder, `lang-aria` swaps an
`aria-label`. The chosen language is remembered in `localStorage` and applies on every page.
The brand name stays in Latin script in all languages.

## Adding a page

1. Copy `packages.html` to `new-page.html`.
2. Change `<title>` and `<meta name="description">`.
3. Replace the `<section class="band band--page" id="…">` block with the new content. Keep the
   `.head` block at the top with an `<h1 class="lang" data-split …>` and a `.lede`: that is the
   page header, and `band--page` gives the first band room under the fixed menu.
   Wrap groups you want to animate in with `data-reveal`, and give children `class="fade"`
   (optionally `style="--i:N"` to stagger them). Copy an existing section as a starting point;
   the styles for rows, ledgers, steps and notes are all in `site.css` and work on any page.
4. Leave the `#contact` section and the footer in place so every page closes the same way.
5. Add the page to the menu, on **every** page (the `<div class="nav-links">` block is identical
   across pages; keep it that way):

   ```html
   <a href="new-page.html" class="lang" data-en="New Page" data-he="עמוד חדש" data-ru="Новая страница">New Page</a>
   ```

   The script marks the link for the current page with `aria-current="page"` automatically.

## Filling the Works page

`works.html` has one `<section class="cat" data-cat="…">` per category: a title line, then a film
strip built exactly like the home page's Selected Work run (`.strip-shell` > `.strip` > `.frame`),
with its own progress bar, counter and prev / next buttons. A frame is a piece of work:

```html
<article class="frame" style="--ar:720/1280;--blur:url('data:image/webp;base64,…')" data-video="assets/works/podcasts/podcasts-04.mp4">
    <img src="assets/works/podcasts/podcasts-04.webp" width="720" height="1280" alt="" loading="lazy" decoding="async">
    <video muted playsinline loop preload="none" aria-hidden="true" tabindex="-1"></video>
    <span class="frame-cap"><span class="frame-idx" aria-hidden="true">POD 04</span><span class="lang" data-en="Episode 4" data-he="פרק 4" data-ru="Эпизод 4">Episode 4</span></span>
</article>
```

- `--ar` is the frame's aspect (width/height of the poster); frames share one height, so a landscape
  piece is simply wider. `--blur` is a tiny webp of the poster shown while the real one loads
  (`ffmpeg -i poster.webp -vf scale=24:-2 -c:v libwebp -q:v 30 -f webp - | base64 -w0`); it is optional.
- The video plays muted on hover (desktop) or when mostly in view (touch), exactly like the home strip.
  A frame without `data-video` and with `class="frame frame--empty"` draws itself as a "Coming soon" viewfinder.
- Update the `NN` in `<span class="strip-count">01 / NN</span>` when you add or remove frames.
- On the Works page each category's row is scaled so its frames fill the width exactly (bigger when
  there are few, smaller when there are many); no video is ever repeated. Where that would make the
  frames too small (phones), the row scrolls sideways instead, with the arrows and counter.
- The home page's Selected Work strip is an endless loop: `site.js` copies its frames to both sides and
  quietly re-centres the scroll when it comes to rest. Write each frame once; the copies are hidden
  from screen readers and the tab order.
- To link a piece out (Instagram, YouTube), change `<article>` to `<a href="…" target="_blank" rel="noopener">`.
- The previews live in `assets/works/<category>/<category>-NN.mp4` with a `.webp` poster beside each
  (about 0.5–1.3 MB per clip). They were cut from the masters with ffmpeg (`winget install Gyan.FFmpeg`);
  to add one, run the same recipe and drop the two files in place:

  ```
  ffmpeg -i master.mp4 -t 20 -an -vf "scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)',fps=30,format=yuv420p" -c:v libx264 -preset slow -crf 27 -movflags +faststart food-05.mp4
  ffmpeg -ss 1 -i master.mp4 -frames:v 1 -vf "scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)'" -c:v libwebp -q:v 72 food-05.webp
  ```

  The hero uses the same recipe at 1280 and 640 px wide (`assets/hero/loop-1280.mp4`, `loop-640.mp4`, `poster.webp`).
- `data-video` (and the hero's `data-src-lg` / `data-src-sm`) may also be a Google Drive share link
  (`https://drive.google.com/file/d/ID/view`), but Google refuses to stream a Drive file to a `<video>`
  on another site (403/503 on any cross-site request), so such a frame shows its poster only.
- New category: copy a whole `<section class="cat">`, give it a new `id="cat-…"` and `data-cat="…"`,
  and add a matching `<a class="chip" href="#…" data-cat="…">` to the filter bar. The filter reads
  the URL hash, so `works.html#food` opens straight on that category.

## Adding a section to an existing page

Sections are `<section class="band" id="…">` blocks inside `<main>`. Give each a unique `id`; a menu
entry can then point at it with `index.html#id` (from another page) or `#id` (same page).

## Local preview

Any static server works, for example:

```
python -m http.server 8000
```

then open <http://localhost:8000/>.
