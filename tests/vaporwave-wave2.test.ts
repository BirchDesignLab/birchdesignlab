import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/** Stage 6 wave 2, task 13: vaporwave V1 to V14, pinned in source. The
    measured results (the sizes each finding names, both schemes) are in the
    task report; these keep the decisions from drifting. */
const read = (p: string) => readFileSync(`src/themes/vaporwave/${p}`, 'utf8');
const services = read('pages/Services.astro');
const home = read('pages/Home.astro');
const about = read('pages/About.astro');
const contact = read('pages/Contact.astro');
const lobby = read('parts/Lobby.astro');
const still = read('parts/Still.astro');
const horizon = read('parts/Horizon.astro');
const footer = read('Footer.astro');
const header = read('Header.astro');
const fx = read('fx.ts');
const css = read('theme.css');

describe('V1 services kana', () => {
  it('never wraps, and is capped near 4.5rem from 761 to 1100', () => {
    expect(services).toMatch(/\.intro-kana \{[^}]*white-space: nowrap;/s);
    expect(services).toMatch(/@media \(min-width: 761px\) and \(max-width: 1100px\) \{\s*\.intro \{ --kana-size: min\(4\.5rem, clamp\(3rem, 9vw, 7\.5rem\)\); \}/);
  });
  it('stops the sublines short of the kana by its width plus a gap, and keeps 60rem where there is room', () => {
    expect(services).toContain('max-width: min(60rem, calc(100% - var(--kana-size) - var(--kana-gap)))');
  });
});

describe('V2 home hero palms on a tablet', () => {
  it('has a 761 to 1100 band with palms at 50% and 58%, offset -14% and -18%', () => {
    expect(home).toMatch(/@media \(min-width: 761px\) and \(max-width: 1100px\) \{\s*\.hero :global\(\.palm\) \{ height: 50%; \}\s*\.hero :global\(\.palm-l\) \{ left: -14%; \}\s*\.hero :global\(\.palm-r\) \{ right: -18%; height: 58%; \}/);
  });
});

describe('V3 the phone plaza', () => {
  it('seats the kiosk pair in front of the stand corners below 900px instead of hiding it', () => {
    const block = home.slice(home.indexOf('@media (max-width: 900px)'));
    expect(block).toContain('--prop-w: clamp(64px, 14vw, 96px);');
    expect(block).not.toMatch(/display: none/);
  });
  it('keeps the lobby planter at 64px on the left with the column on the right below 620px', () => {
    const phone = lobby.slice(lobby.indexOf('@media (max-width: 620px)'));
    expect(phone).toContain('.lobby-planter { width: 64px; }');
    expect(phone).not.toMatch(/\.lobby-planter \{ display: none; \}/);
    expect(phone).not.toContain('right: 50%');
  });
});

describe('V4 the lobby skylight', () => {
  it('is centred above the top edge with the top 12% masked, in both schemes', () => {
    expect(lobby).toContain('radial-gradient(ellipse 60% 70% at 50% -10%, var(--lobby-glow), transparent 72%)');
    expect(lobby).toContain('mask-image: linear-gradient(180deg, transparent 0, #000 12%);');
  });
  it('mixes light from white and the sun highlight, not near-black', () => {
    expect(lobby).toMatch(/\[data-scheme='light'\]\) \.vw-lobby \{\s*--lobby-glow: color-mix\(in srgb, color-mix\(in srgb, #ffffff 65%, var\(--hz-sun-a\)\)/);
    expect(lobby).not.toMatch(/--lobby-glow:[^;]*--bb-plain[^;]*;\s*\}\s*\n\s*\n\s*\/\* A skylight/);
  });
});

describe('V5 About bust and V6 eager swap', () => {
  it('sizes the centrepiece at clamp(200px, 32vw, 380px), 262px at 820', () => {
    expect(about).toContain('--cp-w: clamp(200px, 32vw, 380px);');
    expect(about).toContain('width: var(--cp-w);');
  });
  it('takes the vh floor off the tablet header so the bust sets the height', () => {
    expect(about).toMatch(/@media \(min-width: 761px\) and \(max-width: 1100px\) \{\s*\.temple \{ min-height: max\(460px, var\(--temple-need\)\); \}/);
  });
  it('gives Still an eager prop and passes it for the centrepiece only', () => {
    expect(still).toContain("loading={eager ? 'eager' : 'lazy'}");
    expect(still).toContain("fetchpriority={eager ? 'high' : undefined}");
    expect(still).toContain("decoding={eager ? 'sync' : 'async'}");
    expect(about).toMatch(/<Still class="centerpiece-prop"[^>]* eager \/>/);
    for (const page of [home, services, contact]) expect(page).not.toMatch(/<Still[^>]* eager/);
    expect(lobby).not.toMatch(/<Still[^>]* eager/);
  });
});

describe('V7 footer nav', () => {
  it('is two rows: the site links, then the socials', () => {
    expect(footer.match(/<div class="nav-row">/g)?.length).toBe(2);
    expect(footer.indexOf('chrome.nav.map')).toBeLessThan(footer.indexOf('SOCIAL_PROFILES.map'));
  });
});

describe('V8 phone header', () => {
  it('tracks 0.06em at 0.68rem with 0.35rem padding below 621px', () => {
    const phone = header.slice(header.indexOf('@media (max-width: 620px)'));
    expect(phone).toContain('padding-inline: 0.35rem; letter-spacing: 0.06em; font-size: 0.68rem;');
  });
});

describe('V9 inactive captions', () => {
  it('draws mail.txt and screensaver.scr inactive, the compose window active', () => {
    expect(contact).toMatch(/<Win title="mail\.txt" class="mail" inactive>/);
    expect(contact).toMatch(/<Win title="screensaver\.scr" class="screensaver" inactive>/);
    expect(contact).not.toMatch(/new_message\.eml"[^>]*inactive/);
  });
  it('leaves one active caption on About and Services', () => {
    expect(about).toMatch(/<Win title="beorc\.txt" class="etym-win" inactive>/);
    expect(about).not.toMatch(/<Win title="founder\.txt"[^>]*inactive/);
    expect(services).toMatch(/class="wizard-win" inactive>/);
    expect(services).toContain('inactive={i === 0}');
  });
});

describe('V10 contact screensaver', () => {
  it('has a lavender top in light and a sun sunk 8%', () => {
    expect(contact).toContain('--hz-sun-sink: 8%;');
    expect(contact).toMatch(/\[data-scheme='light'\]\) \.screensaver-preview \{\s*background: linear-gradient\(180deg, var\(--hz-sky-top\) 0/);
    expect(horizon).toContain('translate: -50% calc(32% + var(--hz-sun-sink, 0%));');
    expect(horizon).toContain('clip-path: inset(-50% -50% calc(32% + var(--hz-sun-sink, 0%)) -50%);');
  });
});

describe('V11 phone hero', () => {
  it('lifts the horizon and the sun, caps the haze, and darkens the gaps on a dark phone only', () => {
    expect(fx).toContain('const PHONE_SUN_RISE = 0.34;');
    expect(fx).toContain('const PHONE_HORIZON = 0.36;');
    expect(fx).toContain('const PHONE_HAZE = 0.04;');
    expect(fx).toContain('vec2 sc = vec2(0.0, uSunR * uSunRise);');
    expect(fx).toContain('phone = canvas.clientWidth < COARSE_BREAKPOINT;');
    expect(css).toMatch(/--hz-gap-dark: 0\.5;/);
    expect(css).toMatch(/--hz-gap-dark: 0;/);
  });
  it('leaves the other portrait and landscape horizons as they were', () => {
    expect(fx).toContain('phone ? PHONE_HORIZON : aspect < 1 ? 0.3 : 0.32');
    expect(fx).toContain('phone ? PHONE_SUN_RISE : 0.12');
  });
});

describe('V12 services lobby props', () => {
  it('gives Services the mall room and Home the plaza', () => {
    expect(services).toContain('<Lobby class="ask-lobby" variant="mall" />');
    expect(home).toContain('<Lobby class="closer-lobby" />');
    expect(lobby).toContain("variant = 'plaza'");
    expect(lobby).toContain("variant === 'mall'");
  });
  it('draws a fountain basin, a Venus on a drum and an escalator rail, aria-hidden, no words', () => {
    expect(lobby).toContain('class="mall-fountain"');
    expect(lobby).toContain('class="mall-rail"');
    expect(lobby).toContain('venus-kiosk-512');
    expect(lobby).toMatch(/class:list=\{\['vw-lobby', `lobby-\$\{variant\}`, className\]\} aria-hidden="true"/);
    // The mall block has no palm, column or skylight in it.
    const mall = lobby.slice(lobby.indexOf("{variant === 'mall' && ("), lobby.indexOf('</div>\n\n<style>'));
    expect(mall).not.toMatch(/<Palm|lobby-column|lobby-sky/);
  });
});

describe('V13 About plaque', () => {
  it('is one block span per sentence, and the copy is the same string', () => {
    expect(about).toContain('copy.manifesto.split(/(?<=[.!?])\\s+/)');
    expect(about).toContain('<span class="manifesto-s">{sentence}</span>');
    expect(about).toMatch(/\.manifesto-s \{ display: block; text-wrap: balance; \}/);
    const copy = readFileSync('src/content/copy/about.yaml', 'utf8');
    const manifesto = copy.slice(copy.indexOf('manifesto: >-')).split('\ncta:')[0].replace('manifesto: >-', '').replace(/\s+/g, ' ').trim();
    const sentences = manifesto.split(/(?<=[.!?])\s+/);
    expect(sentences.join(' ')).toBe(manifesto);
    expect(sentences.length).toBe(2);
  });
});

describe('V14 light clouds', () => {
  it('is a hard-edged tiled bitmap, not blurred blobs, and is the generator output', () => {
    const light = css.slice(css.indexOf("[data-scheme='light'] {"), css.indexOf(":where([data-theme='vaporwave']) *,"));
    const decl = light.match(/--field-atmo: (url\("data:image\/svg\+xml,[^"]*"\));/)?.[1];
    expect(decl).toBeTruthy();
    expect(decl).toContain('crispEdges');
    expect(light).not.toMatch(/radial-gradient\(1[0-9]0px/);
    const printed = execFileSync(process.execPath, ['scripts/themes/vaporwave/clouds-bitmap.mjs'], { encoding: 'utf8' }).trim();
    expect(printed).toBe(decl);
  });
  it('leaves dark on its stars', () => {
    expect(css).toMatch(/--field-atmo:\s*radial-gradient\(1\.4px 1\.4px at 18% 22%/);
  });
});
