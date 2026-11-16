/**
 * BDL-012, the data map: every spec and every word the stage draws.
 *
 * Pure data, no DOM and no imports, so tests/bdl-012-data.test.ts can check it
 * (every edge lands on a real node, every journey step rides a real edge,
 * every box has its under-the-hood line).
 *
 * The map was first drawn for the owners of Cheer and Chatter Social Club
 * (BDL-005), in their words. This is the public version. Three rules shaped
 * the rewrite, and they bind any later edit:
 *   1. Visitor-facing, studio "we". Never "you" or "your" for the owners.
 *   2. Concepts, not settings. No prices, no rate-limit numbers, no key
 *      scopes, no addresses, no IDs. "A limit on repeat tries", never the
 *      limit itself.
 *   3. Deck art is the Plant deck only (scripts/lab/extract-data-map-art.mjs).
 *      Decks built on somebody else's characters appear as text rows.
 *
 * Counts are the ones read from the live content library on 10-06-26 and are
 * labelled as October 2026 on the page. The build figures (BEHIND, the test
 * count) are the client repo's main branch at 11-11-26, counted on the same
 * basis as BDL-005's: see docs/lab-backlog.md, "what the BDL-005 page is
 * allowed to say about the client". Refresh both pages together or neither.
 * The ticket desk's numbers (SIM) are invented and must stay that way: the
 * client's real gate and capacity are not ours to publish.
 *
 * Only what is deployed goes on the map. The client repo also holds a nightly
 * sold-out reconcile and a cron Worker that are written but held back (as of
 * 11-16-26); neither is drawn or described here. The nightly rebuild that IS
 * described runs as a scheduled job outside Cloudflare. Check the running
 * system, not the repo, before adding a box.
 *
 * Strings marked "html" are authored constants set with innerHTML (they carry
 * <small> for units). Nothing here is ever user input.
 */

export type Lane = 'content' | 'tickets' | 'live' | 'mail';
export type Side = 'r' | 'l' | 't' | 'b';

export interface MapNode {
  id: string;
  x: number;
  y: number;
  w: number;
  kick?: string;
  title: string;
  /** Plain-English line. */
  sub?: string;
  /** The same box in engineering terms, shown by the Under the hood switch. */
  tech: string;
  /** html */
  big?: string;
  list?: [string, string][];
  thumbs?: 'wall' | 'strip';
  cls?: 'hub' | 'quiet';
}

export interface MapEdge {
  from: string;
  to: string;
  lane: Lane;
  /** Side the edge leaves from / enters at. Defaults r -> l. */
  fs?: Side;
  ts?: Side;
  both?: boolean;
  label?: string;
  dx?: number;
  dy?: number;
}

export interface MapSpec {
  interactive?: boolean;
  heads?: { x: number; y: number; w: number; text: string }[];
  groups?: { label: string; members: string[]; pad: number; top: number }[];
  nodes: MapNode[];
  edges: MapEdge[];
}

export const LANES: Record<Lane, { v: string; name: string }> = {
  content: { v: '--l-content', name: 'Content: words, photos, events, game decks' },
  tickets: { v: '--l-tickets', name: 'Tickets and sales' },
  live: { v: '--l-live', name: 'Game night' },
  mail: { v: '--l-mail', name: 'Forms and email' },
};

/* ======================= the whole map ======================= */
const X = { a: 0, b: 268, c: 568, d: 884 };
const W = { a: 200, b: 232, c: 232, d: 220 };

export const MAIN: MapSpec = {
  interactive: true,
  heads: [
    { x: X.a, y: 0, w: W.a, text: 'Where it starts' },
    { x: X.b, y: 0, w: W.b, text: 'Where it’s kept' },
    { x: X.c - 16, y: 0, w: W.c + 32, text: 'Where the work happens' },
    { x: X.d, y: 0, w: W.d, text: 'Where it shows up' },
  ],
  groups: [{ label: 'Cloudflare', members: ['builder', 'watcher', 'relay', 'desk'], pad: 16, top: 44 }],
  nodes: [
    { id: 'studio', x: X.a, y: 64, w: W.a, kick: 'The owners', title: 'Sanity Studio',
      sub: 'Events, venues, pages, photos and game decks. Hit Publish and it flows everywhere.',
      tech: 'Sanity Studio with two workspaces, the live site and a practice sandbox. Validation rules on every document type.' },
    { id: 'files', x: X.a, y: 222, w: W.a, kick: 'The owners', title: 'Their game decks',
      sub: 'Their own documents and catalog PDFs, turned into caller cards, trivia and photos.',
      tech: 'Import scripts that parse documents and PDFs into typed content. They write to the practice dataset unless told otherwise.' },
    { id: 'ttyou', x: X.a, y: 392, w: W.a, kick: 'The owners', title: 'Ticket Tailor',
      sub: 'Nights, ticket types, capacity and on-sale times.',
      tech: 'Ticket Tailor event series. One series ID links each night to its Sanity event.' },
    { id: 'guests', x: X.a, y: 560, w: W.a, kick: 'Their guests', title: 'Buyers and fans',
      sub: 'Buy tickets, join the lists and ask about private events.',
      tech: 'Browsers and phones. Checkout is Ticket Tailor’s widget on a custom domain, so Safari keeps the session.' },
    { id: 'nodb', x: X.a, y: 760, w: W.a + 68 + W.b, cls: 'quiet', kick: 'What isn’t on this map', title: 'No customer database, anywhere',
      sub: 'Card numbers and payments never leave Ticket Tailor. Form leads live only in the owners’ inbox and mailing lists. The website itself holds no customer records at all.',
      tech: 'Static pages and two small Workers. There is no application database to run, patch or breach.' },

    { id: 'sanity', x: X.b, y: 64, w: W.b, cls: 'hub', kick: 'Content library', title: 'Sanity', big: '2,738 <small>records</small>',
      list: [['Events', '42'], ['Venues', '9'], ['Caller cards', '673'], ['Trivia questions', '1,192'], ['Photos', '813'], ['Page records', '6']],
      thumbs: 'wall',
      tech: 'Sanity Content Lake. Twelve document types, read with GROQ at build time and by the live app.' },
    { id: 'tt', x: X.b, y: 392, w: W.b, cls: 'hub', kick: 'Box office', title: 'Ticket Tailor',
      sub: 'Checkout on the club’s own web address, payments, ticket emails and waitlists.',
      tech: 'Ticket Tailor’s REST API and webhooks. The site reads checkout links and ticket counts, never buyers.' },

    { id: 'builder', x: X.c, y: 80, w: W.c, kick: 'Website', title: 'Site builder',
      sub: 'Rebuilds all 50 pages whenever the owners publish, and again every night.',
      tech: 'Astro on Cloudflare Workers. Pages prerender to static HTML. A publish webhook and a nightly scheduled job start the build.' },
    { id: 'watcher', x: X.c, y: 228, w: W.c, kick: 'Tickets', title: 'Sold-out watcher',
      sub: 'Hears about every order and flips Sold Out by itself.',
      tech: 'A Worker route. It checks each webhook’s signature, asks the Ticket Tailor API for the real count, then patches Sanity.' },
    { id: 'relay', x: X.c, y: 368, w: W.c, kick: 'Game night', title: 'Game relay',
      sub: 'Hands tonight’s game to the host’s phone, then mirrors the phone onto the TV.',
      tech: 'One Durable Object per room, holding hibernating WebSockets. It costs nothing while idle and clears itself after the night.' },
    { id: 'desk', x: X.c, y: 520, w: W.c, kick: 'Forms', title: 'Forms desk',
      sub: 'Screens every form for spam before anything is sent.',
      tech: 'One POST endpoint. Schema validation, spam screening and a rate limit, then the Resend API.' },
    { id: 'resend', x: X.c, y: 830, w: W.c, cls: 'hub', kick: 'Mail service', title: 'Resend',
      sub: 'Sends the mail and keeps the Newsletter and Waitlist lists.',
      tech: 'Resend for transactional email and contact lists, called straight from the Worker.' },

    { id: 'site', x: X.d, y: 64, w: W.d, kick: 'Website', title: 'cheerandchatter.com',
      sub: 'Home, Events, 42 event pages, Private Events, Venue Partners, About, FAQ.',
      tech: 'Static HTML at Cloudflare’s edge, with React islands only where a page needs one.' },
    { id: 'google', x: X.d, y: 208, w: W.d, kick: 'Search and social', title: 'Google and Facebook',
      sub: 'Event listings, sitemap and share cards.',
      tech: 'JSON-LD for Event, Offer, Place, Organization, FAQPage and BreadcrumbList, a filtered sitemap and Open Graph tags.' },
    { id: 'host', x: X.d, y: 340, w: W.d, kick: 'Game night', title: 'Host console',
      sub: 'The host’s phone. Keeps going if the wifi drops.',
      tech: 'A React island behind a signed session. A service worker caches the app and tonight’s art, and local state lets a dead phone resume.' },
    { id: 'tv', x: X.d, y: 466, w: W.d, kick: 'Game night', title: 'Venue TV',
      sub: 'Bingo, trivia, winners and the slideshow.',
      tech: 'A React island that joins the room as a viewer over a WebSocket. It can only watch.' },
    { id: 'inbox', x: X.d, y: 620, w: W.d, kick: 'Email', title: 'The owners’ inbox',
      sub: 'Every quote request, venue inquiry and signup.',
      tech: 'Delivered through Resend with reply-to set to the sender.' },
    { id: 'guestmail', x: X.d, y: 742, w: W.d, kick: 'Email', title: 'Guests’ inboxes',
      sub: 'An instant thank-you for every form.',
      tech: 'A confirmation email sent in the same request as the lead.' },
    { id: 'lists', x: X.d, y: 862, w: W.d, kick: 'Email', title: 'The mailing lists',
      sub: 'Newsletter and Waitlist, ready for announcements.',
      tech: 'Resend contacts. Waitlist entries carry the nights each person asked about.' },
  ],
  edges: [
    { from: 'studio', to: 'sanity', lane: 'content' },
    { from: 'files', to: 'sanity', lane: 'content' },
    { from: 'sanity', to: 'builder', lane: 'content' },
    { from: 'sanity', to: 'relay', lane: 'content' },
    { from: 'builder', to: 'site', lane: 'content' },
    { from: 'builder', to: 'google', lane: 'content' },
    { from: 'ttyou', to: 'tt', lane: 'tickets' },
    { from: 'guests', to: 'tt', lane: 'tickets' },
    { from: 'tt', to: 'builder', lane: 'tickets' },
    { from: 'tt', to: 'watcher', lane: 'tickets' },
    { from: 'watcher', to: 'sanity', lane: 'tickets', fs: 'l', ts: 'r' },
    { from: 'relay', to: 'host', lane: 'live', both: true },
    { from: 'relay', to: 'tv', lane: 'live' },
    { from: 'guests', to: 'desk', lane: 'mail' },
    { from: 'desk', to: 'resend', lane: 'mail', fs: 'b', ts: 't' },
    { from: 'resend', to: 'inbox', lane: 'mail' },
    { from: 'resend', to: 'guestmail', lane: 'mail' },
    { from: 'resend', to: 'lists', lane: 'mail' },
  ],
};

/* ======================= the journeys ======================= */
export interface Journey {
  /** Deep-link key: /lab/bdl-012/?play=<key> */
  key: string;
  name: string;
  lane: Lane;
  /** [from, to, caption] */
  steps: [string, string, string][];
}

export const JOURNEYS: Journey[] = [
  { key: 'publish', name: 'The owners hit Publish', lane: 'content', steps: [
    ['studio', 'sanity', 'The owners change something in the Studio and hit Publish.'],
    ['sanity', 'builder', 'Sanity tells Cloudflare, and the site builder reads the whole library.'],
    ['builder', 'site', 'All 50 pages are rebuilt and go live.'],
    ['builder', 'google', 'Google and Facebook get fresh listings, a fresh sitemap and new share cards.'],
    ['sanity', 'relay', 'The game app reads the same library, so the next game night is up to date too.'],
  ] },
  { key: 'ticket', name: 'A ticket sells', lane: 'tickets', steps: [
    ['guests', 'tt', 'A guest buys a ticket right on the event page.'],
    ['tt', 'watcher', 'Ticket Tailor tells the sold-out watcher about the order.'],
    ['watcher', 'sanity', 'The watcher double-checks with Ticket Tailor. If that was the last seat, it ticks Sold Out.'],
    ['sanity', 'builder', 'That one change starts a rebuild.'],
    ['builder', 'site', 'The event page now says Sold out and offers the waitlist.'],
    ['builder', 'google', 'Google’s copy of the event switches to Sold out too.'],
  ] },
  { key: 'game', name: 'Game night', lane: 'live', steps: [
    ['sanity', 'relay', 'Before doors, on wifi, the game app gathers tonight’s cards, questions and photos.'],
    ['relay', 'host', 'It all lands on the host’s phone and is saved there, so the night runs even if the venue wifi doesn’t.'],
    ['relay', 'tv', 'Every tap on the phone shows up on the venue TV in an instant.'],
  ] },
  { key: 'form', name: 'Someone fills a form', lane: 'mail', steps: [
    ['guests', 'desk', 'Someone asks about a private party on the website.'],
    ['desk', 'resend', 'The forms desk makes sure it’s a real person, not a bot.'],
    ['resend', 'inbox', 'The owners get the full request. They hit reply and it goes straight to the sender.'],
    ['resend', 'guestmail', 'The sender gets a thank-you right away.'],
    ['resend', 'lists', 'Newsletter and waitlist signups join the mailing lists.'],
  ] },
];

/* ======================= one night ======================= */
export const NIGHT: MapSpec = {
  nodes: [
    { id: 'venue', x: 0, y: 20, w: 250, kick: 'Venue', title: 'The venue',
      sub: 'Picked from a list. Its address and map link feed the event page and Google.',
      tech: 'A reference to a venue document. The only hand-made link on a night.' },
    { id: 'settings', x: 0, y: 214, w: 250, kick: 'Site settings', title: 'Every event page',
      sub: 'The club’s email, its socials, and the note shown on every night.',
      tech: 'A singleton document, joined into every event page at build time.' },
    { id: 'event', x: 372, y: 0, w: 300, cls: 'hub', kick: 'Event', title: 'Plant Bingo',
      list: [['Date and time', '✓'], ['Theme', 'Plant'], ['Series ID', '✓'], ['Pitch, details, FAQs', '✓'], ['Photo and gallery', '✓'], ['Board layout', 'Grid']],
      tech: 'One event document. Its theme and series ID are plain fields, and everything else joins on them.' },
    { id: 'callers', x: 812, y: 0, w: 292, kick: 'Game night', title: 'Plant caller cards', big: '120 <small>cards, each with a photo</small>', thumbs: 'strip',
      tech: 'Caller card documents, matched to the night by a query on theme. No references to keep in step.' },
    { id: 'trivia', x: 812, y: 150, w: 292, kick: 'Game night', title: 'Plant trivia', big: '300 <small>questions, Easy to Hard</small>',
      tech: 'Trivia documents with a difficulty tier, matched by the same theme query.' },
    { id: 'ttnight', x: 812, y: 280, w: 292, kick: 'Ticket Tailor', title: 'The night’s box office',
      sub: 'Sales and Sold Out find the right page through the series ID.',
      tech: 'The Ticket Tailor series, matched by ID in both directions: checkout links in, sold-out state back.' },
  ],
  edges: [
    { from: 'event', to: 'venue', lane: 'content', fs: 'l', ts: 'r', label: 'picked from a list', dy: -16 },
    { from: 'settings', to: 'event', lane: 'content', label: 'added to every night', dy: 14 },
    { from: 'event', to: 'callers', lane: 'live', label: 'same theme' },
    { from: 'event', to: 'trivia', lane: 'live', label: 'same theme' },
    { from: 'event', to: 'ttnight', lane: 'tickets', both: true, label: 'same series ID' },
  ],
};

/* ======================= game night ======================= */
export const LIVE: MapSpec = {
  nodes: [
    { id: 'lib', x: 0, y: 34, w: 220, cls: 'hub', kick: 'Sanity', title: 'Tonight’s content',
      sub: 'The event, its theme’s caller cards and trivia, the venue and the sponsors.',
      tech: 'One GROQ read of the night and everything that matches its theme.' },
    { id: 'phone', x: 306, y: 0, w: 258, kick: 'The host’s phone', title: 'Host console',
      sub: 'The host signs in and loads the night once on wifi. It saves every photo, so the game runs offline.',
      tech: 'Signed session, service worker and a dedicated art cache. Board, winners and asked questions persist locally.' },
    { id: 'room', x: 652, y: 34, w: 196, kick: 'Cloudflare', title: 'Game relay',
      sub: 'A private room named by a short code. It erases itself after the night.',
      tech: 'A Durable Object addressed by room code. Host and viewer roles, hibernating sockets, an idle alarm that clears the room.' },
    { id: 'screen', x: 920, y: 0, w: 184, kick: 'Venue TV', title: 'The big screen',
      sub: 'Open the TV page and type the code. It saves the photos too.',
      tech: 'A viewer socket and the same art cache. Installs as a standalone app with no browser chrome.' },
  ],
  edges: [
    { from: 'lib', to: 'phone', lane: 'live', label: 'load once', dy: -22 },
    { from: 'phone', to: 'room', lane: 'live', both: true, label: 'every tap', dy: -22 },
    { from: 'room', to: 'screen', lane: 'live', label: 'instantly', dy: -22 },
  ],
};

/* ======================= forms ======================= */
export const FORMS: MapSpec = {
  nodes: [
    { id: 'four', x: 0, y: 70, w: 232, kick: 'On the website', title: 'Four forms',
      sub: 'Newsletter on the home page, Waitlist on nights not on sale yet, a quote request on Private Events, and an inquiry on Venue Partners.',
      tech: 'Four forms, one endpoint. The server names the exact field to fix, in a plain sentence.' },
    { id: 'fdesk', x: 312, y: 70, w: 240, kick: 'Cloudflare', title: 'Forms desk',
      sub: 'Spam screening and a limit on repeat tries, before anything is sent.',
      tech: 'A single Worker endpoint: validate, screen, rate-limit, then send. Nothing is written to storage.' },
    { id: 'rs', x: 632, y: 82, w: 214, cls: 'hub', kick: 'Mail service', title: 'Resend',
      sub: 'Sends from the club’s own address.',
      tech: 'Resend’s send and contacts APIs on the club’s verified domain.' },
    { id: 'oin', x: 916, y: 0, w: 188, kick: 'The owners', title: 'Their inbox',
      sub: 'The full lead. Hit reply and it goes straight to the sender.',
      tech: 'Reply-to is the sender, so the thread never passes through the site again.' },
    { id: 'gin', x: 916, y: 126, w: 188, kick: 'The sender', title: 'Their inbox',
      sub: 'A thank-you, right away.',
      tech: 'A confirmation sent alongside the lead.' },
    { id: 'lst', x: 916, y: 228, w: 188, kick: 'Lists', title: 'Newsletter and Waitlist',
      sub: 'The Waitlist remembers which nights each person wants.',
      tech: 'Contacts are created or updated in place, so a repeat signup never duplicates.' },
  ],
  edges: [
    { from: 'four', to: 'fdesk', lane: 'mail' },
    { from: 'fdesk', to: 'rs', lane: 'mail', label: 'only real people', dy: -22 },
    { from: 'rs', to: 'oin', lane: 'mail' },
    { from: 'rs', to: 'gin', lane: 'mail' },
    { from: 'rs', to: 'lst', lane: 'mail' },
  ],
};

/* ======================= content library ======================= */
export type Feed = 'site' | 'live' | 'g';
/** [name, count ('' = no count shown), what it holds, where it feeds] */
export const DRAWERS: [string, string, string, Feed[]][] = [
  ['Event', '42', 'One per night or showing: date, venue, theme, tickets, photos, FAQs.', ['site', 'live']],
  ['Venue', '9', 'Name, address, city and map link. Six cities along the coast.', ['site', 'live']],
  ['Caller card', '673', 'A bingo call: name, photo, column and an optional fun fact.', ['live']],
  ['Trivia question', '1,192', 'Clue, answer and difficulty, from Easy to Final Boss.', ['live']],
  ['Sponsor', '', 'Name, logo and QR link for the break and closing slideshow.', ['live']],
  ['Private event type', '3', 'The cards on the Private Events page.', ['site']],
  ['Home page', '1', 'Headline, intro, teaser photos and the newsletter line.', ['site']],
  ['Private Events page', '1', 'Packages, add-ons and gallery.', ['site']],
  ['About page', '1', 'The club’s story and photos.', ['site']],
  ['FAQ page', '1', 'Questions in groups, also handed to Google.', ['site', 'g']],
  ['Venue Partners page', '1', 'The pitch and what venues get.', ['site']],
  ['Site settings', '1', 'Email, socials and the note on every event page.', ['site', 'g']],
];
export const FEEDS: Record<Feed, string> = { site: 'Website', live: 'Game night', g: 'Google' };

/** [theme, caller cards, trivia questions by tier]. Only Plant shows its art. */
export const THEMES: [string, number, [number, number, number, number]][] = [
  ['Plant', 120, [133, 105, 62, 0]],
  ['Book', 120, [87, 88, 74, 36]],
  ['Taylor Swift', 60, [48, 47, 22, 25]],
  ['Pokémon', 151, [55, 51, 44, 0]],
  ['Star Wars', 102, [29, 30, 28, 28]],
  ['Coffee Lover', 0, [41, 38, 21, 0]],
  ['Thrifted Treasure', 0, [37, 35, 28, 0]],
  ['Harry Potter', 120, [0, 0, 0, 0]],
];
export const ART_THEME = 'Plant';
export const TIERS = ['Easy', 'Medium', 'Hard', 'Final Boss'];

/* ======================= tickets ======================= */
export const STEPS: [string, string][] = [
  ['The owners set up the night, twice', 'Once in Ticket Tailor (tickets and capacity) and once in Sanity (the page). One number, the series ID, ties them together. The Studio won’t save a ticketed night without it.'],
  ['The site picks up the checkout', 'Every rebuild asks Ticket Tailor for each night’s checkout link and builds it right into the event page.'],
  ['A guest buys on the event page', 'Checkout runs on the club’s own web address, so phones never kick buyers out to another site halfway through paying.'],
  ['Ticket Tailor reports the order', 'Every order sends a message to the sold-out watcher. It ignores any message it can’t verify.'],
  ['The watcher double-checks', 'It doesn’t trust the message. It asks Ticket Tailor directly how many tickets are out against the night’s capacity.'],
  ['Sold out flips by itself', 'Only when a night truly sells out does it tick Sold Out in Sanity. That rebuilds the site: the page says Sold out and the button becomes the waitlist.'],
];
export const CALLOUTS: [string, string][] = [
  ['Quiet on purpose', 'An ordinary order changes nothing on the site, so it costs no rebuild. Only a real change does.'],
  ['And back again', 'If a refund frees a seat, Sold Out clears itself and the Buy button returns.'],
  ['Every night', 'The site rebuilds itself overnight, so finished nights move to Past, stop selling, and leave the sitemap Google reads.'],
];
/** The ticket desk you can drive. Illustrative numbers, not a real night. */
export const SIM = { capacity: 40, sold: 38 };

/* ======================= website and search ======================= */
/** [page, small note under the name, what it is built from, highlight] */
export const PAGES: [string, string, string, boolean][] = [
  ['Home', '', 'Home page record, the next upcoming nights, newsletter signup', false],
  ['Events', '', 'Every event, with theme and Tickets live filters that update by themselves as nights pass', false],
  ['42 event pages', 'one per night', 'The event, its venue, its Ticket Tailor checkout, the note on every event, its own FAQ', true],
  ['Private Events', '', 'Private Events page record, event types, packages, add-ons, gallery, quote form', false],
  ['Venue Partners', '', 'Venue Partners record, partner inquiry form', false],
  ['About', '', 'About page record and photos', false],
  ['FAQ', '', 'FAQ record, questions in groups', false],
  ['Privacy', '', 'The contact email from Site settings', false],
  ['Every page', '', 'Site settings: email and socials in the footer', false],
];
/** [label, value, quiet aside]. The Available row is driven by the ticket desk. */
export const GOOGLE: [string, string, string][] = [
  ['Kind', 'Event, in person', ''],
  ['Starts', 'A Wednesday, 6:00 p.m. Central', ''],
  ['Ends', '8:00 p.m. Central', 'daylight time worked out automatically'],
  ['Where', 'The venue’s name and full address', ''],
  ['Price', 'The ticket price, with the link to buy', ''],
  ['Available', 'In stock', 'switches to Sold out by itself'],
  ['Picture', 'The night’s photo, cropped to 1200×630', ''],
  ['Description', 'The one-line pitch from the Studio', ''],
  ['Organizer', 'Cheer and Chatter Social Club', ''],
];
export const SEO: [string, string][] = [
  ['Titles and descriptions', 'Every page has its own. Event pages use the pitch, so what the owners write in the Studio is what shows in search results.'],
  ['Share cards', 'Paste a link into Facebook or a text and a picture appears: the night’s photo, or the house card for everything else.'],
  ['The business profile', 'Every page tells Google who the club is: its name, the Mississippi Gulf Coast as its area, its email and its social accounts.'],
  ['Questions Google can show', 'The FAQ page, and any event with its own questions, are marked up so Google can show them as expandable answers.'],
  ['A sitemap that keeps itself', 'Upcoming nights go in, past nights come out, and the game screens are never listed. Google is pointed straight at it.'],
  ['Old links keep working', 'Rename a night and its old web address forwards to the new one, so shared links and old posts never break.'],
];

/* ======================= game night demo ======================= */
/** Labels match the tv-*.webp files. The fun facts are ours, kept short. */
export const TV_CARDS: { label: string; file: string; fact: string }[] = [
  { label: 'Monstera', file: 'tv-monstera.webp', fact: 'Its ripe fruit is edible, and is said to taste like banana crossed with pineapple.' },
  { label: 'Coleus', file: 'tv-coleus.webp', fact: 'Bred since Victorian times into nearly every leaf color except true blue.' },
  { label: 'Maidenhair Fern', file: 'tv-maidenhair-fern.webp', fact: 'Its fronds shed water so well that raindrops bead up and roll right off.' },
  { label: 'Aloe Vera', file: 'tv-aloe-vera.webp', fact: 'People have been putting it on their skin for thousands of years.' },
  { label: 'Jade Vine', file: 'tv-jade-vine.webp', fact: 'In the wild, its turquoise flowers are pollinated by bats.' },
  { label: 'English Ivy', file: 'tv-english-ivy.webp', fact: 'NASA tested it in a 1989 study of houseplants that clean indoor air.' },
];
export const TV_DECK = { name: 'Plant Bingo', size: 120, called: 23, history: ['Echeveria', 'Croton', 'Boston Fern'] };
export const FEATS: [string, string][] = [
  ['No repeats all night', 'Trivia keeps a list of every question asked, across every round and level, so nobody hears one twice.'],
  ['Name and photo together', 'The TV waits for each card’s photo before showing the call, then offers its fun fact when the host taps.'],
  ['Winners, with a drumroll', 'Small gift, big winner or grand prize, each with its own screen. Names stay on the host’s phone and the TV, nowhere else.'],
  ['The board', 'Everything called so far, packed tighter as the night goes on so it always fits the screen.'],
  ['Picks only playable nights', 'The night list shows only events whose theme has cards or questions, and says when a night is bingo only or trivia only.'],
  ['Photos ready before doors', 'The TV shows “Photos ready” on the welcome screen once every picture is saved, so the host knows before the crowd arrives.'],
];

/* ======================= safety ======================= */
export const LOCKS: [string, string][] = [
  ['Keys stay locked', 'Every key the system uses is stored as a locked secret in Cloudflare. Each build scans its own output to prove none leaked into the pages.'],
  ['Buyers stay private', 'The website only ever asks the box office how many tickets are left. It never sees who bought them.'],
  ['Only real order messages', 'The sold-out watcher acts only on messages it can verify came from Ticket Tailor, then confirms the count with Ticket Tailor itself.'],
  ['Only the host runs the game', 'The host signs in to run a night. The TV can only watch.'],
  ['Guessing gets locked out', 'The host login and every form limit repeat tries. After that, the device has to wait.'],
  ['Checks before every change', '701 automated checks run before anything goes live, from ticket math to Central time on daylight-saving nights.'],
  ['The Studio catches mistakes', 'It won’t save two nights with one checkout link, a ticketed night without its series ID, or an end time before the start.'],
  ['Security headers on every page', 'The site tells browsers to use a secure connection and refuses to be framed by other sites.'],
];

/* ======================= headline numbers and the close ======================= */
/** [number, suffix, what it counts] */
export const STATS: [number, string, string][] = [
  [2738, '', 'records in the content library'],
  [813, '', 'photos stored and served'],
  [1192, '', 'trivia questions across 7 themes and 4 difficulty levels'],
  [673, '', 'bingo caller cards in 6 decks, 286 with fun facts'],
  [50, '', 'web pages rebuilt every time the owners publish'],
  [42, '', 'event nights and showings, at 9 venues in 6 cities'],
  [4, '', 'outside services working as one: Sanity, Ticket Tailor, Cloudflare, Resend'],
  [701, '', 'automated checks run before any change goes live'],
];
/** [number (0 = show the label as written), display, what it counts] */
export const BEHIND: [number, string, string][] = [
  [0, '2 months', 'of building, then small refinements since'],
  [815, '815', 'saved changes'],
  [245, '245', 'reviewed updates shipped'],
  [33000, '33,000', 'lines written for this system'],
];
