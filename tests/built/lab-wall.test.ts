import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, doc, listRoutes, meta, readPage, visibleText } from './helpers';
import { LAMP_ATTR, LAMP_KEY } from '../../src/lib/lab-wall/lamp';

/**
 * /lab ships the catalog list in its HTML and the wall on top of it. Without
 * script (and before the script runs) the page is the list: every listed
 * entry has its link there. The wall's own data lists the same entries in the
 * same order. The category pages carry none of it.
 */
interface Listed { slug: string; designation: string; href: string | null; kind: 'experiment' | 'study' }

/** The listed entries as the content files say, in the order the page sorts them (designation, newest first). */
function listedEntries(): Listed[] {
  const dir = join(REPO, 'src', 'content', 'lab');
  const out: Listed[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const head = readFileSync(join(dir, file), 'utf8').split(/\r?\n---\r?\n?/)[0] ?? '';
    const field = (key: string): string | undefined => {
      const m = new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm').exec(head);
      return m?.[1]?.replace(/^['"]|['"]$/g, '');
    };
    if (field('noindex') === 'true') continue;
    const slug = file.replace(/\.md$/, '');
    const type = field('type') as 'experiment' | 'study';
    const own = type === 'experiment' ? field('href') : undefined;
    // A genre study is catalogued with the experiments (src/lib/lab-sets.ts).
    const kind = type === 'study' && field('genreStudy') !== 'true' ? 'study' : 'experiment';
    out.push({ slug, designation: field('designation')!, href: field('status') === 'forthcoming' ? null : own ?? `/lab/${slug}`, kind });
  }
  return out.sort((a, b) => b.designation.localeCompare(a.designation));
}

const LISTED = listedEntries();

interface WallRow { id: string; designation: string; title: string; kind: string; kindLabel: string; month: string; summary: string; href: string | null; live: boolean; thumb: string | null }

function wallData(html: string): WallRow[] {
  const el = doc(html).querySelector('script[type="application/json"][data-lw="data"]');
  expect(el, 'the wall data block').not.toBeNull();
  return JSON.parse(el!.text) as WallRow[];
}

describe('/lab without script', () => {
  const html = readPage('/lab/');
  const d = doc(html);

  it('finds the listed entries', () => {
    expect(LISTED.length).toBeGreaterThan(5);
  });

  it('is the list: every listed entry that has a page is linked in the HTML', () => {
    const hrefs = new Set(d.querySelectorAll('.catalog a[href]').map((a) => a.getAttribute('href')));
    for (const e of LISTED.filter((x) => x.href)) expect(hrefs.has(e.href!), `${e.designation} ${e.href}`).toBe(true);
    expect(d.querySelectorAll('.catalog article').length).toBe(LISTED.length);
  });

  it('has not chosen a view before script runs: no data-lab-view on <html>', () => {
    const tag = /<html[^>]*>/.exec(html)![0];
    expect(tag).not.toContain('data-lab-view');
  });

  it('keeps the filter as real links to the category pages', () => {
    const hrefs = d.querySelectorAll('nav.filter a').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/lab/', '/lab/experiments/', '/lab/studies/']);
  });

  it('keeps the page heading and the one-sentence intro', () => {
    expect(d.querySelectorAll('h1').map((h) => h.text.trim())).toEqual(['The Lab']);
    expect(d.querySelector('.intro p')?.text.trim()).toBe('Websites and software, designed and built on the Mississippi Gulf Coast.');
  });
});

describe('the wall data on /lab', () => {
  const rows = wallData(readPage('/lab/'));

  it('lists the same entries in the same order as the list', () => {
    expect(rows.map((r) => r.designation)).toEqual(LISTED.map((e) => e.designation));
    expect(rows.map((r) => r.id)).toEqual(LISTED.map((e) => e.slug));
  });

  it('takes each page link from the entry, and has none for an entry that is not live', () => {
    for (const e of LISTED) {
      const row = rows.find((r) => r.id === e.slug)!;
      expect(row.href, e.designation).toBe(e.href);
      expect(row.live, e.designation).toBe(e.href !== null);
    }
  });

  it('names the set the list uses, Experiment or Study and nothing else', () => {
    for (const e of LISTED) {
      const row = rows.find((r) => r.id === e.slug)!;
      expect(row.kind, e.designation).toBe(e.kind);
      expect(row.kindLabel, e.designation).toBe(e.kind === 'study' ? 'Study' : 'Experiment');
    }
  });

  it('gives each entry a month and a picture or none', () => {
    for (const r of rows) {
      expect(r.month, r.id).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
      if (r.thumb !== null) expect(r.thumb, r.id).toMatch(/^\/_astro\/.+\.(webp|png|jpe?g|avif)$/);
    }
  });
});

describe('the words the wall adds', () => {
  const d = doc(readPage('/lab/'));
  const words = [
    d.querySelector('[data-lw="hint"]')?.text ?? '',
    d.querySelector('.lw-toggle')?.text ?? '',
    d.querySelector('[data-lw="door"]')?.text ?? '',
  ].join(' ');

  it('exist', () => {
    expect(words).toContain('Move across it. Click one to open it.');
    expect(words).toContain('Scroll the wall. Tap one to open it.');
    expect(words).toContain('Back to the wall');
  });

  it('keep to the copy rules: no em dash, no birch, bark or specimen, and no count of pieces', () => {
    expect(words).not.toContain(String.fromCharCode(0x2014));
    expect(words).not.toMatch(/birch|bark|specimen/i);
    expect(d.querySelector('[data-lw="hint"]')?.text ?? '').not.toMatch(/\d/);
  });
});

describe('the category pages carry no wall', () => {
  for (const route of ['/lab/experiments/', '/lab/studies/']) {
    it(route, () => {
      const html = readPage(route);
      expect(html).not.toContain('data-lw=');
      expect(html).not.toContain('data-lab-view');
      expect(html).not.toMatch(/\blw-[a-z]/);
      expect(html).not.toContain('lab-page');
    });
  }
});

describe('the first paint of /lab', () => {
  const html = readPage('/lab/');

  it('shows the wall for a link to a piece, whatever view was remembered', () => {
    const inline = /<script[^>]*>([^<]*data-lab-view[^<]*)<\/script>/.exec(html)?.[1] ?? '';
    expect(inline).toMatch(/\^#bdl-/);
  });

  it('hangs the framed, captioned tiles in the HTML itself: the data, the wall, then the script that frames them', () => {
    const data = html.indexOf('data-lw="data"');
    const wall = html.indexOf('data-lw="wall"');
    const hang = html.indexOf('data-lw-id');
    expect(data).toBeGreaterThan(-1);
    expect(wall).toBeGreaterThan(data);
    expect(hang).toBeGreaterThan(wall);
    // one script, straight after the wall: no frame is painted with the box empty
    const between = html.slice(wall, hang);
    expect(between.split('<script').length - 1).toBe(1);
    expect(between.indexOf('</div>')).toBeGreaterThan(-1);
    expect(between.indexOf('</div>')).toBeLessThan(between.indexOf('<script'));
  });

  it('brings the engine with the first script: two module scripts from the wall, both in the HTML', () => {
    const own = [...html.matchAll(/<script type="module" src="(\/_astro\/LabWall\.astro_astro_type_script_index_\d+_lang\.[^"]+\.js)"/g)].map((m) => m[1]);
    expect(own.length).toBe(2);
  });
});

describe('the lamp bulb in the site header', () => {
  const html = readPage('/lab/');
  const d = doc(html);
  const bulb = d.querySelector('[data-lw="bulb"]');

  it('is one real button, on, named Lamp', () => {
    expect(d.querySelectorAll('[data-lw="bulb"]').length).toBe(1);
    expect(bulb?.tagName.toLowerCase()).toBe('button');
    expect(bulb?.getAttribute('type')).toBe('button');
    expect(bulb?.getAttribute('aria-pressed')).toBe('true');
    expect(bulb?.getAttribute('aria-label')).toBe('Lamp');
    expect(bulb?.closest('header')).not.toBeNull();
  });

  it('sits immediately before the light/dark switch, so it is the last stop before it', () => {
    const toggle = d.querySelector('#theme-toggle');
    expect(toggle).not.toBeNull();
    const siblings = toggle!.parentNode!.childNodes.filter((n) => n.nodeType === 1);
    expect(siblings.indexOf(toggle!) - 1).toBe(siblings.indexOf(bulb!));
  });

  it('has its words free of em dashes', () => {
    expect(bulb?.outerHTML ?? '').not.toContain(String.fromCharCode(0x2014));
  });

  it('is decided before first paint from the key the module repeats', () => {
    const inline = /<script[^>]*>([^<]*data-lab-view[^<]*)<\/script>/.exec(html)?.[1] ?? '';
    expect(inline).toContain(`localStorage.getItem('${LAMP_KEY}')`);
    expect(inline).toContain(`setAttribute('${LAMP_ATTR}'`);
  });

  it('is on no other page: no bulb and no lamp choice', () => {
    for (const route of listRoutes().filter((r) => r !== '/lab/')) {
      const page = readPage(route);
      expect(page, route).not.toContain('data-lw="bulb"');
      expect(page, route).not.toContain('lw-bulb');
      expect(page, route).not.toContain(LAMP_ATTR);
    }
  });
});

describe('the words on /lab', () => {
  const html = readPage('/lab/');
  const d = doc(html);
  const text = visibleText(html).join(' ');
  const emDash = String.fromCharCode(0x2014);

  it('describes what a visitor gets, in the meta title and description', () => {
    const title = d.querySelector('title')?.text ?? '';
    const description = meta(html, 'description') ?? '';
    expect(title).toBe('The Lab · Birch Design Lab');
    expect(description).toMatch(/live, playable work/i);
    expect(`${title} ${description}`).not.toMatch(/specimen|catalog/i);
  });

  it('has no specimen, no forthcoming and no em dash in anything a visitor reads', () => {
    expect(text).not.toMatch(/specimen|forthcoming/i);
    expect(text).not.toContain(emDash);
    for (const row of wallData(html)) {
      expect(`${row.title} ${row.summary} ${row.kindLabel}`, row.designation).not.toMatch(/specimen|forthcoming|genre study/i);
      expect(row.summary, row.designation).not.toContain(emDash);
    }
  });

  it('counts the pieces with the words the cards use', () => {
    const live = LISTED.filter((e) => e.href !== null).length;
    const soon = LISTED.length - live;
    const expected = soon === 0
      ? `${LISTED.length} pieces. All open today.`
      : `${LISTED.length} pieces. ${live} open today, ${soon === 1 ? 'one' : soon} still in the workshop.`;
    expect(d.querySelector('.count')?.text.trim()).toBe(expected);
  });

  it('names a state only on a card that is not live, in the one word, and never anything else', () => {
    const states = new Set(d.querySelectorAll('.catalog article').map((a) => a.getAttribute('data-status')));
    expect([...states].every((x) => x === 'live' || x === 'forthcoming')).toBe(true);
    for (const a of d.querySelectorAll('.catalog article')) {
      const shown = a.querySelectorAll('.meta .soon').map((n) => n.text.trim());
      expect(shown, a.getAttribute('data-status') ?? '').toEqual(a.getAttribute('data-status') === 'live' ? [] : ['Coming soon']);
    }
  });

  it('ends on one sentence and one link to /contact/, after the section that holds the wall', () => {
    const band = d.querySelector('.lab-contact');
    expect(band, 'the closing band').not.toBeNull();
    expect(band!.closest('.lab-page')).toBeNull();
    expect(d.querySelector('.lab-page')?.querySelector('.lab-contact')).toBeNull();
    const links = band!.querySelectorAll('a');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/contact/']);
    expect(links[0].text.trim()).toBe('Talk to us');
    expect(band!.querySelectorAll('p').map((p) => p.text.trim())).toEqual(['Want something like this for your business?']);
    expect(band!.querySelector('svg')).toBeNull();
    // Directly after .lab-page in the document, so it falls under the wall and under the List alike.
    const page = d.querySelector('.lab-page')!;
    expect(page.nextElementSibling?.getAttribute('class')).toContain('lab-contact');
  });
});

describe('one word for each kind', () => {
  const listHtml = readPage('/lab/');
  const rows = wallData(listHtml);
  const cards = doc(listHtml).querySelectorAll('.catalog article');

  it('is the same on the wall tile, the List card and the case page', () => {
    expect(cards.length).toBe(LISTED.length);
    LISTED.forEach((e, i) => {
      const wall = rows.find((r) => r.id === e.slug)!.kindLabel;
      const card = cards[i].querySelector('.meta .kind')?.text.trim();
      expect(card, `${e.designation} list`).toBe(wall);
      if (e.href !== null && e.href.startsWith(`/lab/${e.slug}`)) {
        const page = doc(readPage(`/lab/${e.slug}/`));
        const onPage = page.querySelector('details.plate summary .smallcaps')?.text.trim()
          ?? page.querySelector('.hero-text .designation')?.text.replace(/\s+/g, ' ').trim();
        expect(onPage, `${e.designation} case page`).toContain(wall);
        // A study page names itself with the one word and no other, so an invented business never reads as client work.
        if (wall === 'Experiment') expect(onPage, e.designation).not.toMatch(/\bstudy\b/i);
      }
    });
  });
});
