// Demo data layer: same exports as js/api.js, but with built-in sample topics and no network.
// Used by demo/build.py to make a self-contained preview. Live-only sources throw LiveOnly.

export const DEMO = true;

let LANG = 'en';
export const setLang = (l) => { LANG = l; };
export const getLang = () => LANG;

class LiveOnly extends Error { constructor() { super('Needs the live internet'); this.name = 'LiveOnly'; } }
const live = async () => { throw new LiveOnly(); };
const wait = (v) => new Promise((r) => setTimeout(() => r(v), 120));

/** Abstract illustration (no external images allowed in the demo). */
function art(hue, shape) {
  const shapes = {
    portrait: `<circle cx="200" cy="165" r="70" fill="hsl(${hue},30%,32%)"/><path d="M70 400c10-90 60-140 130-140s120 50 130 140z" fill="hsl(${hue},30%,32%)"/>`,
    skyline: `<path d="M0 400V250h40v-60h30v90h40v-140h35v140h30v-80h45v-50h30v130h40v-90h35v110h45v100z" fill="hsl(${hue},35%,28%)"/>`,
    hole: `<circle cx="200" cy="200" r="150" fill="none" stroke="hsl(${hue},90%,60%)" stroke-width="26" opacity=".85"/><circle cx="200" cy="200" r="105" fill="#05040a"/>`,
    dome: `<path d="M120 330V230c0-70 35-110 80-130 45 20 80 60 80 130v100z" fill="hsl(${hue},20%,92%)"/><rect x="60" y="330" width="280" height="20" fill="hsl(${hue},20%,85%)"/><rect x="40" y="170" width="14" height="160" fill="hsl(${hue},20%,90%)"/><rect x="346" y="170" width="14" height="160" fill="hsl(${hue},20%,90%)"/>`,
    moon: `<circle cx="200" cy="420" r="260" fill="hsl(${hue},8%,70%)"/><circle cx="120" cy="250" r="18" fill="hsl(${hue},8%,60%)"/><circle cx="270" cy="230" r="12" fill="hsl(${hue},8%,60%)"/><path d="M190 150l20-60 20 60z" fill="#eee"/><rect x="198" y="80" width="4" height="60" fill="#ddd"/>`,
    wave: `<path d="M0 260c60-50 120 50 200 0s140-50 200 0v140H0z" fill="hsl(${hue},40%,35%)"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,78%)"/><stop offset="1" stop-color="hsl(${hue + 25},45%,90%)"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/>${shapes[shape]}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const wiki = (t) => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;

const TOPICS = [
  {
    title: 'Marie Curie', qid: 'Q7186', type: 'person', description: 'Polish-French physicist and chemist (1867–1934)', img: art(330, 'portrait'),
    extract: 'Marie Curie was a Polish and naturalised-French physicist and chemist who carried out pioneering research on radioactivity. She was the first woman to win a Nobel Prize, the first person to win a Nobel Prize twice, and the only person to win Nobel Prizes in two scientific fields.',
    facts: [['Born', '7 Nov 1867'], ['Birthplace', 'Warsaw'], ['Died', '4 Jul 1934'], ['Citizenship', 'Poland, France'], ['Occupation', 'physicist, chemist'], ['Educated at', 'University of Paris'], ['Awards', 'Nobel Prize in Physics (1903), Nobel Prize in Chemistry (1911)']],
    text: `Marie Curie, born Maria Skłodowska, was a physicist and chemist whose work on radioactivity changed physics, chemistry and medicine.

== Early life ==
She was born in Warsaw, then part of the Russian Empire, the youngest of five children of two teachers. Women could not enrol at universities there, so she studied at the clandestine "Flying University" before moving to Paris in 1891.

== Research ==
In Paris she studied physics and mathematics at the Sorbonne. Working with her husband Pierre Curie, she discovered two new elements, polonium (named after Poland) and radium, and coined the term "radioactivity".

=== Nobel Prizes ===
She shared the 1903 Nobel Prize in Physics with Pierre Curie and Henri Becquerel, and received the 1911 Nobel Prize in Chemistry alone for the discovery of polonium and radium.

== Legacy ==
During the First World War she developed mobile X-ray units that treated many wounded soldiers. The Curie Institutes in Paris and Warsaw continue her work, and the element curium is named in her honour.`,
    books: [['Madame Curie', 'Ève Curie', 1937], ['Radioactive: Marie & Pierre Curie', 'Lauren Redniss', 2010], ['Obsessive Genius', 'Barbara Goldsmith', 2005]],
  },
  {
    title: 'Albert Einstein', qid: 'Q937', type: 'person', description: 'German-born theoretical physicist (1879–1955)', img: art(30, 'portrait'),
    extract: 'Albert Einstein was a German-born theoretical physicist best known for developing the theory of relativity. His mass–energy equivalence formula, E = mc², has been called the world\'s most famous equation. He received the 1921 Nobel Prize in Physics for his explanation of the photoelectric effect.',
    facts: [['Born', '14 Mar 1879'], ['Birthplace', 'Ulm'], ['Died', '18 Apr 1955'], ['Died in', 'Princeton'], ['Occupation', 'theoretical physicist'], ['Educated at', 'ETH Zurich, University of Zurich'], ['Awards', 'Nobel Prize in Physics (1921)']],
    text: `Albert Einstein was a theoretical physicist whose ideas reshaped our understanding of space, time and energy.

== Early life ==
He was born in Ulm in the Kingdom of Württemberg and grew up in Munich. He studied physics and mathematics at the Swiss Federal Polytechnic in Zurich.

== The miracle year ==
In 1905, while working at the Swiss patent office in Bern, he published four landmark papers: on the photoelectric effect, Brownian motion, special relativity and mass–energy equivalence.

== General relativity ==
In 1915 he completed the general theory of relativity, which describes gravity as the curvature of spacetime. Its prediction that light bends around the Sun was confirmed during the solar eclipse of 1919.

== Later life ==
He emigrated to the United States in 1933 and joined the Institute for Advanced Study in Princeton, where he worked until his death in 1955.`,
    books: [['Einstein: His Life and Universe', 'Walter Isaacson', 2007], ['Relativity: The Special and the General Theory', 'Albert Einstein', 1916]],
  },
  {
    title: 'Tokyo', qid: 'Q1490', type: 'city', description: 'Capital and largest city of Japan', img: art(200, 'skyline'),
    extract: 'Tokyo is the capital and most populous city of Japan. Its metropolitan area is the most populous in the world. Formerly known as Edo, it became the imperial capital in 1868 and is today a global centre of finance, culture and technology.',
    facts: [['Country', 'Japan'], ['Population', 'about 14 million (metropolis)'], ['Area (km²)', '2,194'], ['Founded', '1457 (as Edo)'], ['Elevation (m)', '40']],
    coord: { lat: 35.6895, lon: 139.6917 }, iso2: 'JP',
    text: `Tokyo is the capital of Japan and the centre of the world's largest metropolitan area.

== History ==
The city began as Edo, a fishing village where a castle was built in 1457. It became the seat of the Tokugawa shogunate in 1603 and was renamed Tokyo, "eastern capital", when the emperor moved there in 1868.

== Rebuilding ==
Tokyo was largely destroyed by the Great Kantō earthquake of 1923 and again by air raids in the Second World War. It was rebuilt each time and hosted the Summer Olympics in 1964 and 2021.

== Today ==
The metropolis has 23 special wards plus cities, towns and islands. Its rail network is among the busiest in the world, with Shinjuku Station handling millions of passengers a day.`,
    books: [['Tokyo: A Biography', 'Stephen Mansfield', 2016], ['Low City, High City', 'Edward Seidensticker', 1983]],
  },
  {
    title: 'Taj Mahal', qid: 'Q9141', type: 'place', description: 'Mausoleum in Agra, India', img: art(25, 'dome'),
    extract: 'The Taj Mahal is an ivory-white marble mausoleum on the right bank of the Yamuna river in Agra, India. It was commissioned in 1632 by the Mughal emperor Shah Jahan to house the tomb of his wife Mumtaz Mahal, and is widely considered the finest example of Mughal architecture.',
    facts: [['Location', 'Agra, Uttar Pradesh'], ['Country', 'India'], ['Commissioned by', 'Shah Jahan'], ['Built', '1632–1653'], ['Architect', 'Ustad Ahmad Lahauri'], ['World Heritage Site', 'since 1983']],
    coord: { lat: 27.1751, lon: 78.0421 }, iso2: 'IN',
    text: `The Taj Mahal is a white marble mausoleum in Agra and one of the most recognised buildings in the world.

== Origins ==
Shah Jahan commissioned it in 1632 after the death of his wife Mumtaz Mahal. The main tomb was finished around 1643, and work on the surrounding complex continued for about another decade.

== Architecture ==
The complex combines Persian, Islamic and Indian traditions. The central dome is flanked by four minarets, and the walls are inlaid with semi-precious stones in a technique known as pietra dura.

== Gardens ==
The tomb stands at the end of a large charbagh, a Mughal garden divided into four parts by raised walkways and water channels.

== Recognition ==
It was designated a UNESCO World Heritage Site in 1983 and attracts millions of visitors every year.`,
    books: [['Taj Mahal', 'Ebba Koch', 2006]],
  },
  {
    title: 'Black hole', qid: 'Q589', type: 'space', description: 'Region of spacetime from which nothing can escape', img: art(260, 'hole'),
    extract: 'A black hole is a region of spacetime where gravity is so strong that nothing, not even light, can escape. General relativity predicts that a sufficiently compact mass can deform spacetime to form one. The boundary of no return is called the event horizon.',
    facts: [['Predicted by', 'General relativity (Schwarzschild, 1916)'], ['First strong candidate', 'Cygnus X-1 (1971)'], ['First image', 'M87* (2019, Event Horizon Telescope)'], ['At our galaxy\'s centre', 'Sagittarius A*'], ['Nearest known', 'Gaia BH1 (about 1,560 light-years)']],
    text: `A black hole is an object whose gravity is so intense that nothing that crosses its event horizon can get out again.

== Prediction ==
Karl Schwarzschild found the first exact solution of Einstein's equations describing a black hole in 1916. For decades many physicists treated it as a mathematical curiosity.

== Discovery ==
In the 1970s the X-ray source Cygnus X-1 became the first object widely accepted as a black hole. In 2015 the LIGO detectors recorded gravitational waves from two black holes merging.

== Imaging ==
In 2019 the Event Horizon Telescope published the first image of a black hole's shadow, at the centre of the galaxy M87. An image of Sagittarius A*, at the centre of the Milky Way, followed in 2022.`,
    books: [['A Brief History of Time', 'Stephen Hawking', 1988], ['Black Holes and Time Warps', 'Kip Thorne', 1994]],
  },
  {
    title: 'Apollo 11', qid: 'Q43653', type: 'event', description: 'First crewed Moon landing (1969)', img: art(220, 'moon'),
    extract: 'Apollo 11 was the American spaceflight that first landed humans on the Moon. Commander Neil Armstrong and lunar module pilot Buzz Aldrin landed on 20 July 1969, while Michael Collins orbited above in the command module Columbia.',
    facts: [['Launched', '16 Jul 1969'], ['Landed on the Moon', '20 Jul 1969'], ['Returned', '24 Jul 1969'], ['Crew', 'Neil Armstrong, Buzz Aldrin, Michael Collins'], ['Operator', 'NASA'], ['Landing site', 'Sea of Tranquility']],
    text: `Apollo 11 was the mission that achieved the goal of landing people on the Moon and returning them safely to Earth.

== The mission ==
A Saturn V rocket launched the crew from Kennedy Space Center on 16 July 1969. Four days later the lunar module Eagle landed in the Sea of Tranquility.

== On the surface ==
Armstrong stepped onto the Moon about six and a half hours after landing, followed by Aldrin. They spent around two and a half hours outside, collecting 21.5 kg of samples and setting up experiments.

== Return ==
The crew splashed down in the Pacific Ocean on 24 July 1969. An estimated 650 million people had watched the first steps on television.`,
    books: [['Carrying the Fire', 'Michael Collins', 1974], ['First Man', 'James R. Hansen', 2005]],
  },
];

const COUNTRIES = {
  JP: { name: { official: 'Japan' }, capital: ['Tokyo'], subregion: 'Eastern Asia', population: 124000000, languages: { jpn: 'Japanese' }, currencies: { JPY: { name: 'Japanese yen', symbol: '¥' } },
    flags: { svg: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#fff"/><circle cx="450" cy="300" r="180" fill="#bc002d"/></svg>')}`, alt: 'Flag of Japan' } },
  IN: { name: { official: 'Republic of India' }, capital: ['New Delhi'], subregion: 'Southern Asia', population: 1430000000, languages: { hin: 'Hindi', eng: 'English' }, currencies: { INR: { name: 'Indian rupee', symbol: '₹' } },
    flags: { svg: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="200" fill="#f93"/><rect y="200" width="900" height="200" fill="#fff"/><rect y="400" width="900" height="200" fill="#128807"/><circle cx="450" cy="300" r="80" fill="none" stroke="#008" stroke-width="12"/><circle cx="450" cy="300" r="14" fill="#008"/></svg>')}`, alt: 'Flag of India' } },
};

const find = (q) => {
  const k = String(q).trim().toLowerCase().replace(/_/g, ' ');
  return TOPICS.find((t) => t.title.toLowerCase() === k)
    || TOPICS.find((t) => t.title.toLowerCase().includes(k) || k.includes(t.title.toLowerCase()));
};

const summary = (t) => ({
  type: 'standard', title: t.title, titles: { normalized: t.title }, description: t.description, extract: t.extract,
  wikibase_item: t.qid, thumbnail: { source: t.img }, originalimage: { source: t.img },
  coordinates: t.coord, content_urls: { desktop: { page: wiki(t.title) } },
});

/* Knowledge */
export async function wikiSuggest(q) {
  const k = q.toLowerCase();
  return TOPICS.filter((t) => (t.title + ' ' + t.description).toLowerCase().includes(k)).map((t) => ({ title: t.title, desc: t.description }));
}
export async function wikiSearch(q, limit = 8) {
  const k = q.toLowerCase();
  const hits = TOPICS.filter((t) => (t.title + ' ' + t.description + ' ' + t.text).toLowerCase().includes(k));
  const rest = TOPICS.filter((t) => !hits.includes(t));
  // A single-result search is "find this topic", so it must not be padded. Lists (the Related card)
  // are padded with other sample topics so they are never empty.
  const list = limit === 1 ? hits : [...hits, ...rest];
  return wait(list.slice(0, limit).map((t) => ({ title: t.title, snippet: t.description })));
}
export async function wikiSummary(title) {
  const t = find(title);
  if (!t) throw new Error(`No sample topic for "${title}"`);
  return wait(summary(t));
}
export async function wikiRandom() { return summary(TOPICS[Math.floor(Math.random() * TOPICS.length)]); }
export async function wikiFullText(title) { return find(title)?.text || ''; }

export async function wikiFeed() {
  const featured = find('Apollo 11');
  return wait({
    tfa: summary(featured),
    news: [],
    mostread: { articles: TOPICS.map((t) => ({ title: t.title, titles: { normalized: t.title }, description: t.description, thumbnail: { source: t.img } })) },
    onthisday: [
      { year: 1963, text: 'U.S. President John F. Kennedy is assassinated in Dallas, Texas.', pages: [] },
      { year: 1990, text: 'Margaret Thatcher withdraws from the Conservative Party leadership election, ending her time as British Prime Minister.', pages: [] },
      { year: 1995, text: 'Toy Story, the first feature film made entirely with computer animation, is released.', pages: [] },
      { year: 2005, text: 'Angela Merkel becomes the first female Chancellor of Germany.', pages: [] },
    ],
    image: { title: 'Sample illustration', thumbnail: { source: art(150, 'wave') }, description: { text: 'Illustration used in this demo. The full app shows Wikimedia Commons\' picture of the day.' } },
  });
}

/* Facts */
export async function wikidataEntity(qid) {
  const t = TOPICS.find((x) => x.qid === qid);
  if (!t) return null;
  return wait({
    qid, type: t.type, iso2: t.iso2 || null, socials: [],
    facts: t.facts.map(([label, v]) => ({ pid: label, label, vals: [v] })),
    coord: t.coord || null,
  });
}

/* Places */
export const weather = live;
export async function country(iso2) { if (!COUNTRIES[iso2]) throw new Error('none'); return wait(COUNTRIES[iso2]); }
export const WMO = { 0: ['☀️', 'Clear'] };

/* Live sources: need the internet */
export const earthquakes = live;
export const issPosition = live;
export const gdeltNews = live;
export const hackerNews = live;
export const blueskySearch = live;
export const mastodonTag = live;
export const mastodonTrends = live;

/* Books */
export async function books(q) {
  const t = find(q);
  if (!t) return [];
  return wait(t.books.map(([title, author, year]) => ({
    title, author, year, cover: null,
    url: `https://openlibrary.org/search?q=${encodeURIComponent(title)}`,
  })));
}
