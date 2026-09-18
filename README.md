# Timekeepers — site

Static, multi-page site. No build step: Render serves the files as they are.

```
index.html          Home: hero, What We Do, Selected Work, Rate Card, Contact
packages.html       Content Packages
weddings.html       Wedding Collections
works.html          Our Work: 12 project categories, hash-filtered (works.html#podcasts)
assets/css/site.css One stylesheet, shared by every page
assets/js/site.js   One script, shared by every page (language switch, menu, motion, video)
assets/…            Hero loop, work reels, wedding loops (mp4 + webp poster)
docs/               Source PDFs the copy and prices come from
```

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

`works.html` has one `<section class="cat" data-cat="…">` per category, each holding `.slot`
placeholders (two 9:16 reels and one 16:9 film to start). A slot is empty until it has an image:

```html
<article class="slot slot--v fade" style="--i:0" data-video="assets/works/podcasts/ep1.mp4">
    <div class="slot-media">
        <img src="assets/works/podcasts/ep1.webp" width="540" height="960" alt="" loading="lazy" decoding="async">
        <video muted playsinline loop preload="none" aria-hidden="true" tabindex="-1"></video>
    </div>
    <div class="slot-cap"><span class="slot-idx" aria-hidden="true">POD 01</span><span class="slot-title lang" data-en="Episode 1" data-he="פרק 1" data-ru="Эпизод 1">Episode 1</span></div>
</article>
```

- `data-video` on the article plus the `<img>` poster turn the frame on; the corner brackets and
  the "Coming soon" readout disappear by themselves. The video plays muted on hover (desktop) or
  when mostly in view (touch), exactly like the home strip.
- `slot--v` is a vertical reel, `slot--c` a cinematic 16:9 film (it spans three grid columns, full width on phones).
- To link a slot out (Instagram, YouTube), change `<article>` to `<a href="…" target="_blank" rel="noopener">`.
- Add or remove slots freely; the grid packs itself. Renumber `--i` for the stagger if you care.
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
