
document.documentElement.classList.add('js');
/* Multi-page hosting: scripts/build_standalone.py sets window.JEIN_MULTIPAGE = {base:'/', route:'about'} on each generated page
   (/about/, /projects/<slug>/ …). The claude.ai artifact never sets it and keeps plain hash routes. */
const MP = window.JEIN_MULTIPAGE || null;
const currentHash = () => location.hash.slice(1) || (MP ? MP.route : '');

/* ======================================================================================
   CONTENT — everything a person edits lives in this block. Layout code starts after it.

   To add an entry: copy one {…} entry in the right array, paste it below the last one,
   change the values, and keep the comma between entries. Then rebuild (see README.md).

   Honesty rules for every field:
   • Leave a field out (or '') when it isn't known. Empty fields are hidden.
   • To show a known gap, list the field name in `pending:[…]`; it appears as "To confirm".
   • Facts or figures waiting for approval go in `unconfirmed:[…]`; each shows labelled "To confirm".
   • Never fill a field with a guess, a placeholder that reads as real, or an invented URL.
   ====================================================================================== */

const APPROPEDIA = 'https://www.appropedia.org/User:Joshua_Elekwa';
const SRC_APPROPEDIA = [{ label:'Source: Joshua’s Appropedia profile', href: APPROPEDIA }];

const CATEGORIES = [
  {id:'all', label:'All'},
  {id:'business', label:'Business and Transformation'},
  {id:'ecommerce', label:'E-commerce and Commercial Ventures'},
  {id:'it', label:'Product, IT and Systems'},
  {id:'web', label:'Web, Design and Digital Marketing'},
  {id:'entrepreneurship', label:'Competitions and Business Case Studies'},
  {id:'community', label:'Community and Social Impact'}
];
const STATUS_LABEL = {active:'Active',completed:'Completed',prototype:'Prototype',concept:'Concept',volunteer:'Volunteer contribution',pending:'Details pending'};

/* PROJECTS — one record per project, used by the grid, case studies, the journey cards, search and related links.
   Required: slug (used in the address #p-<slug>), name, category (an id above), status (a key of STATUS_LABEL),
             summary, cover:{bg,fg} (colours from the palette).
   Optional:
     statusNote:'to confirm'    shown beside the status        tentative:true   category still to confirm
     sub:'…'                    sub-category line              tags:[…]         focus areas (mono tags)
     tech:[…]                   confirmed tools only           team:'Individual' | 'Team'
     dates:{start:'2020', end:''}                              parent:'slug'    shows "Part of …" and a breadcrumb
     template:'standard' | 'competition' | 'automation' | 'collection'   (which sections the case study has)
     section text: overview, problem, objectives, constraints, role, approach, deliverables, results, lessons,
                   context, research, options, recommendation, previous, design, components, adoption
                   (a string, or an array of paragraphs)
     planned:[…]   planned case-study areas      readme:[['Heading','Text'], …]     checklist:{title, items:[…]}
     children:[{name, slug, note}]   entries of a collection (name '' shows "Name to confirm")
     childrenTitle, childrenEmpty, entryKinds:[…], entryFields:[…]
     image:{src, alt}   card + case-study cover (16:9)        images:[{src, alt, caption}] screenshots
     github:'https://…'  live:'https://…'  githubSlot:true (uses the GitHub profile once added)
     links:[{label, href}]  sources and external links       related:[{label, href}]
     caution:'…'   a visible note (e.g. concept, not a finished product)
     confidential:['results', …]  sections hidden from the public page   confidentialNote:'…'
     unconfirmed:[…]  pending:[…]  (see the honesty rules above) */
const PROJECTS = [
  {slug:'hallyu-radiance', name:'Hallyu Radiance', category:'business', status:'active', statusNote:'to confirm',
   tags:['Commercial Development','Emerging Brands','Business Operations'],
   summary:'Hallyu Radiance is a Canadian commercial-development venture focused on working with emerging Korean beauty brands. The project explores market opportunities, commercial relationships, brand development, and routes to growth.',
   planned:['Market research and positioning','Brand and partner development','Commercial operations','Business process design','Digital channel strategy','Performance tracking and decision-making'],
   caution:'Brand partnerships, sales, distribution agreements and growth outcomes are listed only once confirmed.',
   cover:{bg:'#D5A0A4',fg:'#171717'}},
  {slug:'farafeet', name:'Farafeet', category:'it', status:'concept', statusNote:'concept or prototype · to confirm',
   tags:['Product Concept','Business Systems','Prototyping'],
   summary:'Farafeet explores a spatial visualization concept for retail, furniture, and home-decor sales professionals. The concept aims to help salespeople communicate how products might fit within customers’ homes or commercial environments.',
   planned:['User research','Problem definition','Requirements gathering','Workflow mapping','Prototype development','Testing and validation'],
   caution:'Farafeet is a concept. Features described here are planned or assumed unless they are marked as built. It is not a finished commercial product.',
   cover:{bg:'#D77A50',fg:'#171717'}},
  {slug:'last-mile-wholesale', name:'Last Mile Wholesale', category:'ecommerce', status:'concept', statusNote:'concept or development · to confirm',
   tags:['B2B Commerce','Group Buying','Business Model Experimentation'],
   summary:'Last Mile Wholesale explores a group-buying and wholesale coordination model designed to help buyers or sellers coordinate demand around larger minimum order quantities.',
   planned:['Business model development','Buyer and supplier workflows','Demand coordination','Market validation','Operational feasibility'],
   caution:'Research and concept work are shown separately from any pilot or commercial activity, which will be listed only once confirmed.',
   cover:{bg:'#683A73',fg:'#F8F5EF'}},
  {slug:'inventory-automation', name:'Inventory and workflow automation', category:'business', sub:'Business Systems and Process Improvement',
   status:'completed', template:'automation', tech:['Excel','VBA'],
   summary:'Improving inventory visibility and reducing manual work across a large product catalog using Excel/VBA and automation.',
   unconfirmed:['Catalog size: a catalog of more than 4,000 SKUs.','Improvement figures, such as time saved or errors reduced, will be added once approved.'],
   confidentialNote:'The employer is not named and no inventory data is shown, to respect confidentiality.',
   pending:['dates'], cover:{bg:'#F4E9D8',fg:'#171717'}},
  {slug:'next-health-global', name:'Next Health Global', category:'ecommerce', sub:'Amazon Marketplace and E-commerce Portfolio',
   status:'pending', template:'collection',
   summary:'The umbrella brand for Joshua’s Amazon selling activities across three principal accounts or brands.',
   overview:'Next Health Global is the umbrella brand for Joshua’s Amazon selling activities, which run across three principal accounts or brands. Each will get its own page once its details are confirmed.',
   childrenTitle:'Accounts and brands', children:[{name:''},{name:''},{name:''}],
   caution:'Product, revenue and marketplace-performance details are shown only once confirmed.',
   cover:{bg:'#F4EAD6',fg:'#171717'}},
  {slug:'the-hint-group', name:'The Hint Group', category:'ecommerce', sub:'E-commerce Portfolio and Business Partnership',
   status:'pending', template:'collection', team:'Team · with a business partner',
   summary:'A collection of small online storefronts managed collaboratively with a business partner.',
   overview:'The Hint Group is a collection of small online storefronts that Joshua manages collaboratively with a business partner.',
   childrenTitle:'Storefronts',
   children:[{name:'Flower Hint', note:'Storefront link and screenshots to confirm'},{name:'Drone Hint', note:'Storefront link and screenshots to confirm'},
             {name:'ModelHint.com', note:'Link will be added once the site is confirmed live'}],
   cover:{bg:'#EFE6F0',fg:'#683A73'}},
  {slug:'furniture-h', name:'Furniture H', category:'ecommerce', sub:'Shopify, E-commerce, Dropshipping', status:'pending', tech:['Shopify'],
   summary:'A Shopify-based storefront and e-commerce project using a dropshipping business model.',
   pending:['images'], cover:{bg:'#8C9B70',fg:'#171717'}},
  {slug:'ecommerce-projects', name:'E-commerce projects', category:'ecommerce', status:'pending', template:'collection',
   summary:'A collection of Joshua’s online-store work: Next Health Global, The Hint Group and Furniture H.',
   overview:'An overview of Joshua’s online-store work. Each venture has its own case study.',
   childrenTitle:'Ventures in this collection',
   children:[{name:'Next Health Global', slug:'next-health-global'},{name:'The Hint Group', slug:'the-hint-group'},{name:'Furniture H', slug:'furniture-h'}],
   cover:{bg:'#B88A36',fg:'#171717'}},
  {slug:'website-development', name:'Web and Digital Portfolio', category:'web', status:'pending', template:'collection',
   summary:'Websites and digital work: WordPress and Shopify sites, local business and nonprofit websites, storefronts, marketing and search, site maintenance, and design.',
   overview:'A collection of Joshua’s website and digital work. Client names appear only where disclosure is allowed.',
   entryKinds:['WordPress sites','Shopify sites','Local business websites','Nonprofit website projects','E-commerce storefronts','Digital marketing and search','Website administration and maintenance','Design and content implementation'],
   entryFields:['Client or project name (where disclosure is allowed)','Objective','My role','Platform and technologies','Screenshots or mockups','Features','Verified results','Live link'],
   childrenTitle:'Websites', children:[], childrenEmpty:'Website entries will be added as each one is confirmed.',
   designSlot:true, cover:{bg:'#171717',fg:'#F8F5EF'}},
  {slug:'home-lab', name:'Home lab', category:'it', status:'pending', template:'lab',
   summary:'A personal environment for IT experiments, networking and automation.',
   readme:[['What it is','A personal environment for IT experiments, networking and automation, where ideas get tried before they reach anyone else.'],
           ['What will be documented','Specs, services and lessons learned, published here as a case study once confirmed.']],
   checklist:{title:'Possible topics', items:['Custom PC','Virtual machines','Virtualization tools','Docker','Networking fundamentals','Servers and self-hosted projects','Troubleshooting','Technical documentation']},
   githubSlot:true, cover:{bg:'#8C9B70',fg:'#171717'}},
  {slug:'technical-experiments', name:'Technical experiments', category:'it', status:'pending', template:'collection',
   summary:'Scripts, database projects, web apps, networking labs, infrastructure, automation, testing exercises and shareable coursework.',
   overview:'A collection of hands-on technical work. Each entry says what kind of work it was, so a tutorial is never presented as production experience.',
   entryKinds:['Tutorial','Lab exercise','Prototype','Production experience'],
   childrenTitle:'Experiments', children:[], childrenEmpty:'Entries will be added as they are documented. Coursework appears only where sharing it is allowed under academic-integrity rules.',
   githubSlot:true, cover:{bg:'#201D1B',fg:'#F8F5EF'}},
  {slug:'enactus', name:'Enactus', category:'entrepreneurship', status:'volunteer', statusNote:'to confirm', template:'collection',
   summary:'Projects, business case studies, competition participation and entrepreneurship initiatives with Enactus Mount Royal.',
   overview:'This entry gathers Joshua’s work with Enactus Mount Royal: projects, business case studies, competition participation, entrepreneurship initiatives and verified awards. Project Stoke is documented; other Enactus work will be added as it is confirmed.',
   childrenTitle:'Enactus projects', children:[{name:'Project Stoke', slug:'project-stoke'},{name:'', note:'Other Enactus projects to confirm'}],
   related:[{label:'Awards and Recognition', href:'#awards'}], links: SRC_APPROPEDIA, cover:{bg:'#B88A36',fg:'#171717'}},
  {slug:'startup-calgary', name:'Startup Calgary', category:'entrepreneurship', tentative:true, status:'pending',
   summary:'Joshua’s involvement with Startup Calgary. Role, dates and deliverables are being confirmed.',
   pending:['dates','team'], cover:{bg:'#F7E3D9',fg:'#171717'}},

  /* Documented on Joshua's Appropedia profile */
  {slug:'project-stoke', name:'Project Stoke', category:'community', status:'volunteer', parent:'enactus', team:'Team', cover:{bg:'#D77A50',fg:'#171717'},
   summary:'An Enactus Mount Royal initiative on smokeless, high-efficiency stoves for communities in Kenya and Nepal.',
   overview:'Project Stoke was an Enactus Mount Royal initiative that worked on smokeless, high-efficiency stoves for households in Kenya and Nepal.',
   results:'The Project Stoke team won the 2016 TD Entrepreneurship Regional Challenge.', links: SRC_APPROPEDIA},
  {slug:'vivacity-challenge', name:'Vivacity Challenge', category:'entrepreneurship', status:'completed', template:'competition', team:'Team', cover:{bg:'#683A73',fg:'#F8F5EF'},
   summary:'A 24-hour challenge to redesign under-used parks in Calgary.',
   context:'The Vivacity Challenge asked teams to redesign under-used Calgary parks within 24 hours.',
   results:'Joshua’s team earned a gold medal.',
   detailsNote:'The name, place and date of this project are being checked against Joshua’s records.', links: SRC_APPROPEDIA},
  {slug:'x-culture-2020', name:'X-Culture 2020', category:'entrepreneurship', status:'completed', template:'competition', team:'Team', dates:{start:'2020'},
   cover:{bg:'#171717',fg:'#F8F5EF'},
   summary:'An international business case competition, entered with globally distributed teammates.',
   context:'X-Culture is an international, team-based business competition in which globally distributed teams solve real business challenges.',
   results:'Joshua was part of an X-Culture 2020 winning team.', links: SRC_APPROPEDIA},
  {slug:'seed', name:'SEED', category:'community', status:'pending', cover:{bg:'#8C9B70',fg:'#171717'},
   summary:'A food-security project focused on sustainable agriculture and permaculture.',
   overview:'SEED is a food-security project focused on sustainable agriculture and permaculture.', role:'Co-founder.', links: SRC_APPROPEDIA},
  {slug:'ace-family-services', name:'Ace Family Services', category:'community', status:'pending', cover:{bg:'#D5A0A4',fg:'#171717'},
   summary:'A social enterprise working on homelessness.',
   overview:'Ace Family Services is a social enterprise that works on homelessness.', role:'Co-founder.', links: SRC_APPROPEDIA},
  {slug:'dvbags', name:'DVBags', category:'community', status:'pending', cover:{bg:'#B88A36',fg:'#171717'},
   summary:'Sustainable products for new mothers, with proceeds supporting women’s inclusion and livelihoods.',
   overview:'DVBags is a collection of sustainable products for new mothers. Proceeds support women’s inclusion and livelihoods.', links: SRC_APPROPEDIA},
  {slug:'salad-bar', name:'Salad Bar', category:'community', status:'pending', cover:{bg:'#E9EDE2',fg:'#171717'},
   summary:'Healthier snack options for university students during exam periods.',
   overview:'Salad Bar offered university students healthier snack options during exam periods.', links: SRC_APPROPEDIA},
  {slug:'unac-green-corps', name:'UNAC Green Corps', category:'community', status:'pending', cover:{bg:'#4E5C36',fg:'#F8F5EF'},
   summary:'A green project delivered with DeepWaterFarms.',
   overview:'UNAC Green Corps was a project carried out with DeepWaterFarms.',
   related:[{label:'UNAC internship (Experience)', href:'#experience'}], links: SRC_APPROPEDIA},
  {slug:'wash-tech-platform', name:'WASH technology platform', category:'community', status:'pending', cover:{bg:'#F4E9D8',fg:'#171717'},
   summary:'A platform that curates appropriate technology for water, sanitation and hygiene (WASH) NGOs.',
   overview:'A platform that curates appropriate technology for NGOs working on water, sanitation and hygiene (WASH), as part of Joshua’s sustainable-cities work.', links: SRC_APPROPEDIA}
];

/* AWARDS — verified recognition only. Fields: title, result (e.g. 'Winning team'), org, date, desc, project (slug), link:{label, href}, image:{src, alt},
   pending:['org','date'], note:'…' (shown as "To confirm"). */
const AWARDS = [
  {title:'TD Entrepreneurship Regional Challenge', result:'Winning team · Project Stoke', org:'', date:'2016', project:'project-stoke',
   desc:'The Project Stoke team (Enactus Mount Royal) won the 2016 TD Entrepreneurship Regional Challenge.', link:SRC_APPROPEDIA[0], pending:['org']},
  {title:'Vivacity Challenge', result:'Gold medal', org:'', date:'', project:'vivacity-challenge',
   desc:'Joshua’s team earned a gold medal in the Vivacity Challenge, a 24-hour redesign of under-used Calgary parks.', link:SRC_APPROPEDIA[0],
   pending:['org','date'], note:'The name, place and date are being checked against Joshua’s records.'},
  {title:'X-Culture 2020', result:'Winning team', org:'X-Culture', date:'2020', project:'x-culture-2020',
   desc:'Joshua was part of an X-Culture 2020 winning team.', link:SRC_APPROPEDIA[0]}
];
/* Kinds of recognition still to be added; each shows as an empty, labelled slot. */
const AWARD_SLOTS = ['Academic honor roll awards','Enactus recognition','Other competition placements','Other verified recognition'];

/* EXPERIENCE — internships, employment and professional projects. Fields: title, org, program, dates, responsibilities,
   outputs, kind, related:[{label, href}], pending:[…]. */
const EXPERIENCE = [
  {title:'Internship', org:'United Nations Association in Canada (UNAC)', kind:'Internship',
   pending:['program','dates','responsibilities','outputs'], related:[{label:'UNAC Green Corps project', href:'#p-unac-green-corps'}]},
  {title:'Inventory and workflow automation', org:'Employer not named (confidential)', kind:'Professional project',
   responsibilities:'Improving inventory visibility and reducing manual work across a large product catalog using Excel/VBA and automation.',
   pending:['dates'], related:[{label:'Read the case study', href:'#p-inventory-automation'}]}
];
const EXPERIENCE_SLOTS = ['Previous employment and professional projects','Business operations and process improvement work','Customer support, fulfillment and systems-related projects'];

/* COMMUNITY_WORK — kind is one of 'Volunteer', 'Participation', 'Project leadership', 'Interest' ('' = to confirm).
   outcome: a verified, measurable outcome only. */
const COMMUNITY_WORK = [
  {title:'Enactus social innovation initiatives', kind:'Participation', href:'#p-enactus',
   desc:'Social-innovation projects with Enactus Mount Royal, including Project Stoke.', outcome:'The Project Stoke team won the 2016 TD Entrepreneurship Regional Challenge.'},
  {title:'Sustainable community initiatives', kind:'',
   desc:'Local sustainability work, including a youth campaign in Alberta to cut single-use plastic waste.'},
  {title:'Reuse and circular-economy interests', kind:'Interest',
   desc:'An interest in reuse and the circular economy.'},
  {title:'Nonprofit website development', kind:'', href:'#p-website-development',
   desc:'Website work for nonprofit organizations.'},
  {title:'Church audiovisual volunteering', kind:'Volunteer',
   desc:'Audiovisual volunteering at church.'},
  {title:'Nigerian community programs', kind:'',
   desc:'Involvement in programs serving the Nigerian community.'}
];

/* O2O PLAYBOOK — episodes appear in the archive, get a page at #ep-<slug>, and feed guest profiles and search.
   Example entry (copy, then fill in real details):
   {slug:'ep-01-…', number:1, title:'…', date:'2026-11-01', topics:['E-commerce','Logistics'], summary:'…',
    notes:['Show notes paragraph', '…'], guests:[{name:'…', role:'…', bio:'…', link:'https://…'}],
    links:[{label:'Listen on Spotify', href:'https://…'}], projects:['last-mile-wholesale']} */
const EPISODES = [];

/* ARTICLES — published automatically from the Google Drive "Ready to publish" folder (see README "Publishing
   articles from Google Drive"). The GitHub Action writes content/articles/*.json and the build hands them to the
   page as window.JEIN_ARTICLES, so don't edit articles here. Fields: slug, title, date ('YYYY-MM-DD'), summary,
   topics:[…], projects:[slug…], cover:{src, alt}, readMinutes. The body is loaded only on the article's own page. */
const ARTICLES = (window.JEIN_ARTICLES || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const O2O_TOPICS = ['E-commerce','Business systems','IT','Automation','Digital marketing','Logistics','Operations','Quality and process improvement','Entrepreneurship','Business transformation'];
/* Subscription links: each shows only once its href is filled in. */
const PODCAST_LINKS = [
  {name:'Apple Podcasts', href:''}, {name:'Spotify', href:''}, {name:'YouTube', href:''}, {name:'RSS feed', href:''}
];

/* SEVEN FIGURE EMPLOYEE — joinUrl: the community platform (the Join button says "Coming soon" until set).
   newsletterUrl: optional signup page. events: [{title, date, desc, href}] — the section shows only when there are events. */
const SFE = { joinUrl:'', newsletterUrl:'', events:[] };

/* RÉSUMÉ — the download button on the home page stays hidden until BOTH a file address is set and approved is true. */
const RESUME = { href:'', approved:false, label:'Download résumé (PDF)' };

/* SOCIAL PROFILES — one source for the footer, contact page and What's New.
   An empty href is a slot: it never renders as a link. For email use href:'mailto:name@example.com'. */
const SOCIALS = [
  { id:'hub', name:'J.E.I.N. hub', handle:'jeinelekwa.base44.app', href:'https://jeinelekwa.base44.app', icon:'globe', c:'#683A73',
    desc:'Joshua’s companion hub with articles and explainers.' },
  { id:'linkedin', name:'LinkedIn', handle:'linkedin.com/in/joshuaelekwa', href:'https://ca.linkedin.com/in/joshuaelekwa', icon:'linkedin', c:'#D77A50',
    desc:'Professional experience, roles and career updates.' },
  { id:'facebook', name:'Facebook', handle:'facebook.com/JoshuaJEIN', href:'https://www.facebook.com/JoshuaJEIN/', icon:'facebook', c:'#B88A36',
    desc:'Page updates, community posts and announcements.' },
  { id:'appropedia', name:'Appropedia', handle:'User:Joshua_Elekwa', href: APPROPEDIA, icon:'leaf', c:'#8C9B70',
    desc:'Sustainability and social-impact project portfolio.' },
  { id:'email', name:'Email', handle:'', href:'', icon:'mail', c:'#683A73', desc:'Direct email.' },
  { id:'github', name:'GitHub', handle:'', href:'', icon:'github', c:'#171717', desc:'Code, labs and technical experiments.' },
  { id:'design', name:'Design portfolio', handle:'', href:'', icon:'pen', c:'#D5A0A4', desc:'Web and design work.' }
];

/* WHAT'S NEW — type: 'Article' | 'Case study' | 'Profile'. href: '#p-<slug>' for a case study or an external https:// link
   (set external:true). pending:true shows a dashed "coming" card. image:'…' optional cover. */
const FEED = [
  { type:'Article', title:'Articles from the J.E.I.N. hub', pending:true, cover:{bg:'#683A73',fg:'#F8F5EF'},
    summary:'Articles and case studies from the J.E.I.N. hub are being brought over to this page. Read them on the hub in the meantime.',
    href:'https://jeinelekwa.base44.app', external:true, cta:'Visit the hub', meta:'jeinelekwa.base44.app' },
  { type:'Case study', title:'Project Stoke', href:'#p-project-stoke', cover:{bg:'#D77A50',fg:'#171717'}, meta:'Enactus · Kenya & Nepal',
    summary:'Smokeless, high-efficiency stoves. The team won the 2016 TD Entrepreneurship Regional Challenge.' },
  { type:'Case study', title:'Vivacity Challenge', href:'#p-vivacity-challenge', cover:{bg:'#B88A36',fg:'#171717'}, meta:'Calgary · 24 hours',
    summary:'Redesigning under-used Calgary parks in a day, for a gold-medal finish.' },
  { type:'Case study', title:'X-Culture 2020', href:'#p-x-culture-2020', cover:{bg:'#171717',fg:'#F8F5EF'}, meta:'International case competition',
    summary:'Part of a winning team in a global business case competition.' },
  { type:'Case study', title:'SEED', href:'#p-seed', cover:{bg:'#8C9B70',fg:'#171717'}, meta:'Food security · co-founder',
    summary:'Sustainable agriculture and permaculture for food security.' },
  { type:'Case study', title:'Ace Family Services', href:'#p-ace-family-services', cover:{bg:'#D5A0A4',fg:'#171717'}, meta:'Social enterprise · co-founder',
    summary:'A social enterprise working on homelessness.' },
  { type:'Profile', title:'Project portfolio on Appropedia', href: APPROPEDIA, external:true, cover:{bg:'#E9EDE2',fg:'#171717'}, meta:'appropedia.org',
    summary:'The full list of Joshua’s sustainability and social-impact projects, with links to partners.' }
];

FEED.unshift(...ARTICLES.map(a => ({ type:'Article', title:a.title, href:'#a-' + a.slug, cover:{bg:'#F4EAD6',fg:'#171717'},
  image: a.cover && a.cover.src, meta:[a.date, ...(a.topics || []).slice(0, 2)].filter(Boolean).join(' · '), summary:a.summary, cta:'Read the article' })));

/* ORGANIZATIONS STRIP (home page) — relationship labels say only what the site verifies.
   logo: a supplied logo file as a data: URI or 'assets/…'; until then the tile shows initials in the site's style. */
const ORGS = [
  { name:'Hallyu Radiance', rel:'Venture', href:'#p-hallyu-radiance', logo:'' },
  { name:'Farafeet', rel:'Venture · concept', href:'#p-farafeet', logo:'' },
  { name:'Last Mile Wholesale', rel:'Venture', href:'#p-last-mile-wholesale', logo:'' },
  { name:'Next Health Global', rel:'Venture', href:'#p-next-health-global', logo:'' },
  { name:'The Hint Group', rel:'Partnership', href:'#p-the-hint-group', logo:'' },
  { name:'SEED', rel:'Co-founded', href:'#p-seed', logo:'' },
  { name:'Ace Family Services', rel:'Co-founded', href:'#p-ace-family-services', logo:'' },
  { name:'DVBags', rel:'Project', href:'#p-dvbags', logo:'' },
  { name:'Enactus Mount Royal', rel:'Program · Project Stoke', href:'#p-enactus', logo:'', bg:'#B88A36', fg:'#171717' },
  { name:'Mount Royal University IIE', rel:'Ecosystem · Makers Lab', href:'#professional-background', logo:'', bg:'#171717', fg:'#F8F5EF' },
  { name:'X-Culture', rel:'Competition · 2020', href:'#p-x-culture-2020', logo:'' },
  { name:'Vivacity Challenge', rel:'Competition', href:'#p-vivacity-challenge', logo:'' },
  { name:'UNAC Green Corps', rel:'Program', href:'#p-unac-green-corps', logo:'' },
  { name:'DeepWaterFarms', rel:'Project partner', href:'#p-unac-green-corps', logo:'', bg:'#8C9B70', fg:'#171717' }
];
/* ================================== end of CONTENT ================================== */

/* ---------- case-study section sets (layout: which sections a template has; 1 = always shown) ---------- */
const SECTION_SETS = {
  standard: [['overview','Project overview',1],['problem','Problem or opportunity',1],['objectives','Objectives'],['constraints','Constraints'],
             ['role','My role and responsibilities',1],['approach','Approach',1],['deliverables','Deliverables',1],['results','Results and evidence',1],['lessons','Lessons learned',1]],
  competition: [['context','Context',1],['problem','Problem statement',1],['objectives','Objectives',1],['research','Research and analysis',1],
                ['options','Options considered',1],['recommendation','Recommendation',1],['deliverables','Implementation or deliverable',1],
                ['results','Results (if verified)',1],['role','My role',1],['lessons','Lessons learned',1]],
  automation: [['problem','Business problem',1],['previous','Previous workflow',1],['design','Solution design',1],
               ['components','Excel/VBA and automation components',1],['adoption','Testing and adoption',1],['results','Verified results',1],['lessons','Lessons learned',1]],
  collection: [['overview','Overview',1],['role','My role'],['lessons','Lessons learned']],
  lab: [['approach','How it is set up',1],['role','My role'],['lessons','Lessons learned',1]]
};
const catLabel = id => (CATEGORIES.find(c=>c.id===id)||{}).label || id;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tagList = (items, label) => (items && items.length) ? `<ul class="tech-tags" aria-label="${label}">${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
const techTags = p => tagList(p.tags, 'Focus areas') + tagList(p.tech, 'Technologies and skills');
const statusChip = p => `<span class="status" data-s="${p.status}">${STATUS_LABEL[p.status]}</span>${p.statusNote ? ` <span class="tbc">${esc(p.statusNote)}</span>` : ''}`;
const projectBySlug = slug => PROJECTS.find(p => p.slug === slug);
const todo = (text, label) => `<div class="todo"><span class="mono">${label || 'To confirm'}</span><span>${text}</span></div>`;
const paras = v => (Array.isArray(v) ? v : [v]).map(x => `<p>${esc(x)}</p>`).join('');
const isPending = (p, k) => (p.pending || []).includes(k);
const extLink = l => `<a href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ''} style="color:var(--plum);font-weight:600">${esc(l.label)}${/^https?:/.test(l.href) ? ' ↗' : ''}</a>`;
/* per-page <title> and <meta name="description"> (used by both routers) */
function setMeta(title, description){
  document.title = title;
  let m = document.querySelector('meta[name="description"]');
  if (!m){ m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
  if (description) m.setAttribute('content', description);
}
/* anonymous analytics: event names and non-identifying properties only (see the privacy notice) */
function trackSite(name, props){
  const ev = Object.assign({ event: 'jein_' + name }, props || {});
  try { (window.dataLayer = window.dataLayer || []).push(ev); } catch(e){}
  document.dispatchEvent(new CustomEvent('jein:analytics', { detail: ev }));
}

/* ---------- small helpers ---------- */
const $ = s => document.querySelector(s);
const store = {get(k){try{return localStorage.getItem(k)}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

/* notice */
/* status notice: the development "build" bar was removed for the live site; this keeps working if one is added back */
if ($('#notice')){
  if (store.get('jein-notice') === 'hidden') $('#notice').hidden = true;
  $('#notice-close').addEventListener('click', () => { $('#notice').hidden = true; store.set('jein-notice','hidden'); });
}

/* mobile menu */
const nav = $('#nav'), menuBtn = $('#menu-btn');
function setMenu(open){ nav.dataset.open = open ? 'true':'false'; menuBtn.setAttribute('aria-expanded', open); menuBtn.textContent = open ? 'Close' : 'Menu'; }
menuBtn.addEventListener('click', () => setMenu(nav.dataset.open !== 'true'));
nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.dataset.open === 'true') { setMenu(false); menuBtn.focus(); } });

/* ---------- portfolio: category filters + search ---------- */
let activeCat = store.get('jein-filter') || 'all';
if (!CATEGORIES.some(c=>c.id===activeCat)) activeCat = 'all';
let query = '';
const facet = { tech:'', status:'', year:'' };
const yearOf = p => (p.dates && /\d{4}/.exec(p.dates.start || '') || [''])[0];
const haystack = p => [p.name, p.summary, p.sub, catLabel(p.category), STATUS_LABEL[p.status], ...(p.tech||[]), ...(p.tags||[])].filter(Boolean).join(' ').toLowerCase();
const matchesQuery = (p, q) => !q || q.toLowerCase().split(/\s+/).filter(Boolean).every(w => haystack(p).includes(w));
const matches = (p, q) => matchesQuery(p, q) && (!facet.tech || (p.tech || []).includes(facet.tech)) &&
  (!facet.status || p.status === facet.status) && (!facet.year || yearOf(p) === facet.year);
const anyFilter = () => query || facet.tech || facet.status || facet.year;
function renderFacets(){
  const opts = (id, all, values, label) => { const el = $(id); el.innerHTML = `<option value="">${all}</option>` +
    values.map(v => `<option value="${esc(v)}"${facet[label] === v ? ' selected' : ''}>${esc(label === 'status' ? STATUS_LABEL[v] : v)}</option>`).join(''); };
  opts('#f-tech', 'Any technology', [...new Set(PROJECTS.flatMap(p => p.tech || []))].sort(), 'tech');
  opts('#f-status', 'Any status', Object.keys(STATUS_LABEL).filter(s => PROJECTS.some(p => p.status === s)), 'status');
  opts('#f-year', 'Any year', [...new Set(PROJECTS.map(yearOf).filter(Boolean))].sort().reverse(), 'year');
}
['tech', 'status', 'year'].forEach(k => $('#f-' + k).addEventListener('change', e => { facet[k] = e.target.value; renderFilters(); renderGrid(); }));
function renderFilters(){
  $('#filters').innerHTML = CATEGORIES.map(c => {
    const n = (c.id==='all' ? PROJECTS : PROJECTS.filter(p=>p.category===c.id)).filter(p => matches(p, query)).length;
    return `<button type="button" class="filter" data-cat="${c.id}" aria-pressed="${c.id===activeCat}">${esc(c.label)}<span class="n">${n}</span></button>`;
  }).join('');
}
function card(p){
  return `<article class="pcard">
    <div class="pcard-cover" style="--bg:${p.cover.bg};--fg:${p.cover.fg}">
      ${p.image ? `<img src="${esc(p.image.src)}" alt="${esc(p.image.alt)}" loading="lazy" width="640" height="360">` :
      `<span class="mark" aria-hidden="true">${esc(p.name)}</span>
      <span class="no-shot">Screenshot pending</span>`}
    </div>
    <div class="pcard-body">
      <div class="pcard-top"><span class="pcard-cat">${esc(catLabel(p.category))}${p.tentative?' · tbc':''}</span><span>${statusChip(p)}</span></div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.summary)}</p>
      ${techTags(p)}
      <a class="more" href="#p-${p.slug}">Open case study <span aria-hidden="true">→</span></a>
    </div>
  </article>`;
}
function renderGrid(){
  const list = (activeCat==='all' ? PROJECTS : PROJECTS.filter(p=>p.category===activeCat)).filter(p => matches(p, query));
  const extra = [facet.tech, facet.status && STATUS_LABEL[facet.status], facet.year].filter(Boolean);
  $('#result-count').textContent = `${list.length} ${list.length===1?'project':'projects'} · ${catLabel(activeCat)}${extra.length ? ' · ' + extra.join(' · ') : ''}${query ? ` · matching “${query}”` : ''}`;
  $('#grid').innerHTML = list.length ? list.map(card).join('') : anyFilter() ?
    `<div class="empty" style="grid-column:1/-1"><b>No projects match ${query ? `“${esc(query)}”` : 'these filters'}</b><span>Try another word or filter, or clear them.</span><button type="button" class="filter" data-clear-search>Clear search and filters</button></div>` :
    `<div class="empty" style="grid-column:1/-1"><b>Nothing published here yet</b><span>Projects in ${esc(catLabel(activeCat))} will appear once they are documented.</span><button type="button" class="filter" data-cat="all">Show all projects</button></div>`;
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-clear-search]')){ query = ''; $('#proj-search').value = ''; facet.tech = facet.status = facet.year = ''; renderFacets(); renderFilters(); renderGrid(); $('#proj-search').focus(); return; }
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  activeCat = b.dataset.cat; store.set('jein-filter', activeCat);
  renderFilters(); renderGrid();
});
$('#proj-search').addEventListener('input', e => { query = e.target.value.trim(); renderFilters(); renderGrid(); });
renderFacets(); renderFilters(); renderGrid();

/* ---------- case studies (#p-slug) and episodes (#ep-slug) share the detail view ---------- */
function crumbs(items){
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map((c, i) => i === items.length - 1
    ? `<li><span aria-current="page">${esc(c.label)}</span></li>`
    : `<li><a href="${c.href}"${c.attrs || ''}>${esc(c.label)}</a></li>`).join('')}</ol></nav>`;
}
const dsec = (id, label, html) => `<section class="dsec" id="d-${id}" data-toc="${esc(label)}"><h2>${esc(label)}</h2>${html}</section>`;
function relatedFor(p){
  const out = [];
  FEED.filter(f => f.href === '#p-' + p.slug).forEach(f => out.push({label: `${f.type}: ${f.title}`, href: '#whats-new'}));
  EPISODES.filter(e => (e.projects || []).includes(p.slug)).forEach(e => out.push({label: `Episode: ${e.title}`, href: '#ep-' + e.slug}));
  (p.related || []).forEach(r => out.push(r));
  return out;
}
/* closing call to action: which contact card to preselect for each category */
const CTA_PATH = { business:'collaborate', ecommerce:'business', it:'collaborate', web:'collaborate', entrepreneurship:'collaborate', community:'community' };
/* related projects: shared category, tags and technologies, plus parent/child links; best three */
function relatedProjects(p){
  const mine = new Set([...(p.tags || []), ...(p.tech || [])]);
  const kids = new Set((p.children || []).map(c => c.slug).filter(Boolean));
  return PROJECTS.filter(k => k.slug !== p.slug).map(k => {
    let s = (k.category === p.category ? 2 : 0) + [...(k.tags || []), ...(k.tech || [])].filter(t => mine.has(t)).length;
    if (k.parent === p.slug || p.parent === k.slug || kids.has(k.slug) || (p.parent && k.parent === p.parent)) s += 3;
    return { k, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.k);
}
function renderDetail(p){
  const hidden = new Set(p.confidential || []);
  const parent = p.parent && projectBySlug(p.parent);
  const parts = [];
  (SECTION_SETS[p.template] || SECTION_SETS.standard).forEach(([k, label, always]) => {
    if (hidden.has(k)) return;
    if (p[k]) parts.push(dsec(k, label, paras(p[k])));
    else if (always || isPending(p, k)) parts.push(dsec(k, label, todo(k === 'results' ? 'Results are shown only once they are verified.' : 'Details to be confirmed by Joshua.')));
  });
  if (p.readme) p.readme.forEach(([h, t], i) => parts.splice(i, 0, dsec('readme-' + i, h, paras(t))));
  if (p.planned) parts.push(dsec('planned', 'Planned case-study areas',
    `<ul class="bg-list">${p.planned.map(x => `<li><span>${esc(x)} <span class="tbc">to confirm</span></span></li>`).join('')}</ul>`));
  if (p.checklist) parts.push(dsec('checklist', p.checklist.title,
    `<p>Only the items Joshua confirms he has used will stay on this list.</p><ul class="bg-list">${p.checklist.items.map(x => `<li><span>${esc(x)} <span class="tbc">to confirm</span></span></li>`).join('')}</ul>`));
  if (p.entryKinds) parts.push(dsec('kinds', p.slug === 'technical-experiments' ? 'How each entry is labelled' : 'What this collection covers', tagList(p.entryKinds, 'Entry types')));
  if (p.entryFields) parts.push(dsec('fields', 'What each entry includes', `<ul class="bg-list">${p.entryFields.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ul>`));
  if (p.children){
    const kids = p.children.map(c => {
      const k = c.slug && projectBySlug(c.slug);
      const name = c.name || (k && k.name);
      return `<li class="child">${k ? `<a href="#p-${k.slug}"><b>${esc(name)}</b><span>${esc(k.summary)}</span></a>`
        : `<div><b>${name ? esc(name) : '<span class="tbc">Name to confirm</span>'}</b>${c.note ? `<span>${esc(c.note)}</span>` : ''}</div>`}</li>`;
    });
    parts.push(dsec('children', p.childrenTitle || 'In this collection', kids.length ? `<ul class="children">${kids.join('')}</ul>` : todo(p.childrenEmpty || 'Entries will be added as they are confirmed.', 'To add')));
  }
  if (p.unconfirmed && !hidden.has('unconfirmed')) parts.push(dsec('unconfirmed', 'Figures awaiting confirmation', p.unconfirmed.map(x => todo(esc(x))).join('')));
  if (p.tech && p.tech.length) parts.push(dsec('tools', 'Tools and technologies', tagList(p.tech, 'Technologies and skills')));
  if (p.images && p.images.length) parts.push(dsec('images', 'Images and screenshots', `<div class="shots">${p.images.map(im => `<figure class="detail-shot"><img src="${esc(im.src)}" alt="${esc(im.alt)}" loading="lazy" width="1280" height="720">${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ''}</figure>`).join('')}</div>`));
  else if (isPending(p, 'images')) parts.push(dsec('images', 'Images and screenshots', todo('Real screenshots will be added here once Joshua supplies them. No mock-ups will stand in for them.')));
  const links = [];
  const gh = p.github || (p.githubSlot && (SOCIALS.find(s => s.id === 'github') || {}).href);
  if (gh) links.push(`<li>${extLink({label:'GitHub', href: gh})}</li>`);
  if (p.live) links.push(`<li>${extLink({label:'Live project', href: p.live})}</li>`);
  const design = p.designSlot && (SOCIALS.find(s => s.id === 'design') || {}).href;
  if (design) links.push(`<li>${extLink({label:'Design portfolio', href: design})}</li>`);
  (p.links || []).forEach(l => links.push(`<li>${extLink(l)}</li>`));
  const linkTodos = [(p.githubSlot && !gh) ? todo('GitHub link to be added.', 'To add') : '', (p.designSlot && !design) ? todo('Design-portfolio link to be added.', 'To add') : ''].join('');
  if (links.length || linkTodos) parts.push(dsec('links', 'Links', (links.length ? `<ul class="bg-list">${links.join('')}</ul>` : '') + linkTodos));
  const near = relatedProjects(p);
  if (near.length) parts.push(dsec('related-projects', 'Related projects', `<ul class="children">${near.map(k => `<li class="child"><a href="#p-${k.slug}"><b>${esc(k.name)}</b><span>${esc(catLabel(k.category))}</span></a></li>`).join('')}</ul>`));
  const rel = relatedFor(p);
  if (rel.length) parts.push(dsec('related', 'Related articles and episodes', `<ul class="bg-list">${rel.map(r => `<li>${extLink(r)}</li>`).join('')}</ul>`));
  if (p.confidentialNote || hidden.size) parts.push(dsec('confidentiality', 'Confidentiality', `<p>${esc(p.confidentialNote || 'Some details of this project are not shown publicly.')}</p>`));
  parts.push(dsec('next', 'Next steps', `<div class="cs-cta">
      <a class="btn btn-primary" href="#connect-${CTA_PATH[p.category] || 'collaborate'}" data-cta="discuss">Discuss a similar project <span class="arr" aria-hidden="true">→</span></a>
      <a class="btn btn-ghost" href="#projects" data-cat="${esc(p.category)}" data-cta="more">See more in ${esc(catLabel(p.category))}</a>
    </div>`));

  const facts = [
    ['Status', statusChip(p)],
    ['Category', esc(catLabel(p.category)) + (p.sub ? ` · ${esc(p.sub)}` : '') + (p.tentative ? ' <span class="tbc">to confirm</span>' : '')],
    p.dates && p.dates.start ? ['Dates', esc(p.dates.start + (p.dates.end ? ' – ' + p.dates.end : ''))] : isPending(p, 'dates') ? ['Dates', '<span class="tbc">to confirm</span>'] : null,
    p.team ? ['Team', esc(p.team)] : isPending(p, 'team') ? ['Team', '<span class="tbc">to confirm</span>'] : null,
    parent ? ['Part of', `<a href="#p-${parent.slug}" style="color:var(--plum);font-weight:600">${esc(parent.name)}</a>`] : null
  ].filter(Boolean);
  const trail = [{label:'Home', href:'#home', attrs:' data-crumb="home"'}, {label:'Projects', href:'#projects', attrs:' data-crumb="projects" data-cat="all"'},
    {label:catLabel(p.category), href:'#projects', attrs:` data-crumb="category" data-cat="${esc(p.category)}"`}];
  if (parent) trail.push({label: parent.name, href:'#p-' + parent.slug, attrs:' data-crumb="parent"'});
  trail.push({label: p.name});
  $('#detail-root').innerHTML = `
    ${crumbs(trail)}
    <header class="detail-hero">
      <span class="mono" style="color:var(--plum)">Case study · ${esc(catLabel(p.category))}</span>
      <h1>${esc(p.name)}</h1>
      <p class="detail-lede">${esc(p.summary)}</p>
      <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${techTags(p)}
      ${p.caution ? `<div class="todo"><span class="mono">Note</span><span>${esc(p.caution)}</span></div>` : ''}
      ${p.detailsNote ? todo(esc(p.detailsNote), 'Details to confirm') : ''}
      ${p.image ? `<div class="detail-shot"><img src="${esc(p.image.src)}" alt="${esc(p.image.alt)}" width="1280" height="720"></div>` : ''}
    </header>
    <div class="detail-body">
      <nav class="detail-toc" aria-label="Case study sections"></nav>
      <div class="detail-sections">${parts.join('')}</div>
    </div>`;
  $('#detail-root .detail-toc').innerHTML = [...document.querySelectorAll('#detail-root .dsec')].map(s => `<a href="#p-${p.slug}" data-jump="${s.id}">${esc(s.dataset.toc)}</a>`).join('');
}
function renderEpisode(e){
  const projects = (e.projects || []).map(projectBySlug).filter(Boolean);
  $('#detail-root').innerHTML = `
    ${crumbs([{label:'Home', href:'#home'}, {label:'O2O Playbook', href:'#playbook'}, {label:'Episodes', href:'#episodes'}, {label: e.title}])}
    <header class="detail-hero">
      <span class="mono" style="color:var(--plum)">O2O Playbook · Episode${e.number ? ' ' + esc(e.number) : ''}${e.date ? ' · ' + esc(e.date) : ''}</span>
      <h1>${esc(e.title)}</h1>
      ${e.summary ? `<p class="detail-lede">${esc(e.summary)}</p>` : ''}
      ${tagList(e.topics, 'Topics')}
    </header>
    <div class="detail-sections">
      ${e.notes ? dsec('notes', 'Show notes', paras(e.notes)) : ''}
      ${(e.guests || []).length ? dsec('guests', e.guests.length > 1 ? 'Guests' : 'Guest', e.guests.map(g => `<div class="guest"><b>${esc(g.name)}</b>${g.role ? `<span class="mono">${esc(g.role)}</span>` : ''}${g.bio ? `<p>${esc(g.bio)}</p>` : ''}${g.link ? extLink({label:'Profile', href:g.link}) : ''}</div>`).join('')) : ''}
      ${(e.links || []).length ? dsec('listen', 'Listen', `<ul class="bg-list">${e.links.map(l => `<li>${extLink(l)}</li>`).join('')}</ul>`) : ''}
      ${projects.length ? dsec('projects', 'Related projects', `<ul class="bg-list">${projects.map(p => `<li><a href="#p-${p.slug}" style="color:var(--plum);font-weight:600">${esc(p.name)}</a></li>`).join('')}</ul>`) : ''}
    </div>`;
}
function renderArticle(a){
  const body = (window.JEIN_ARTICLE_BODY && window.JEIN_ARTICLE_BODY.slug === a.slug) ? window.JEIN_ARTICLE_BODY.html : (a.body || '');
  const projects = (a.projects || []).map(projectBySlug).filter(Boolean);
  const meta = ['Article', a.date ? new Date(a.date + 'T12:00:00').toLocaleDateString('en-CA', { year:'numeric', month:'long', day:'numeric' }) : '', a.readMinutes ? a.readMinutes + ' min read' : ''].filter(Boolean).join(' · ');
  $('#detail-root').innerHTML = `
    ${crumbs([{label:'Home', href:'#home'}, {label:'What’s New', href:'#whats-new'}, {label: a.title}])}
    <article class="article">
      <header class="detail-hero">
        <span class="mono" style="color:var(--plum)">${esc(meta)}</span>
        <h1>${esc(a.title)}</h1>
        ${a.summary ? `<p class="detail-lede">${esc(a.summary)}</p>` : ''}
        ${tagList(a.topics, 'Topics')}
        ${a.cover && a.cover.src && !body.includes(a.cover.src) ? `<div class="detail-shot"><img src="${esc(a.cover.src)}" alt="${esc(a.cover.alt || '')}" width="1280" height="720"></div>` : ''}
      </header>
      <div class="article-body">${body || todo('The full article opens on its own page on jeinelekwa.com.', 'Read online')}</div>
    </article>
    <div class="detail-sections article-after">
      ${projects.length ? dsec('related-projects', 'Related projects', `<ul class="children">${projects.map(k => `<li class="child"><a href="#p-${k.slug}"><b>${esc(k.name)}</b><span>${esc(catLabel(k.category))}</span></a></li>`).join('')}</ul>`) : ''}
      ${dsec('next', 'Keep reading', `<div class="cs-cta"><a class="btn btn-primary" href="#whats-new">More from What’s New <span class="arr" aria-hidden="true">→</span></a><a class="btn btn-ghost" href="#connect">Start a conversation</a></div>`)}
    </div>`;
}
function route(){
  const h = currentHash();
  const m = h.startsWith('p-') && projectBySlug(h.slice(2));
  const ep = !m && h.startsWith('ep-') && EPISODES.find(e => e.slug === h.slice(3));
  const art = !m && !ep && h.startsWith('a-') && ARTICLES.find(a => a.slug === h.slice(2));
  if (m || ep || art){
    if (m){
      renderDetail(m);
      setMeta(m.name + ' · J.E.I.N.', `${m.name} — case study by Joshua Elekwa (${catLabel(m.category)}). ${m.summary}`);
      trackSite('project_view', { project: m.slug, category: m.category });
    } else if (art){
      renderArticle(art);
      setMeta(art.title + ' · J.E.I.N.', art.summary || `An article by Joshua Elekwa: ${art.title}.`);
      trackSite('article_view', { article: art.slug });
    } else {
      renderEpisode(ep);
      setMeta(ep.title + ' · O2O Playbook · J.E.I.N.', ep.summary || `O2O Playbook episode: ${ep.title}.`);
      trackSite('episode_view', { episode: ep.slug });
    }
    $('#home-view').hidden = true; $('#detail-view').hidden = false;
    window.scrollTo(0,0);
    $('#detail-root h1').setAttribute('tabindex','-1'); $('#detail-root h1').focus({preventScroll:true});
  } else if (!$('#detail-view').hidden){
    $('#detail-view').hidden = true; $('#home-view').hidden = false;
    const t = h && document.getElementById(h);
    requestAnimationFrame(() => t ? t.scrollIntoView() : window.scrollTo(0,0));
  }
}
document.addEventListener('click', e => {
  const j = e.target.closest('[data-jump]');
  if (j){ e.preventDefault(); document.getElementById(j.dataset.jump).scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto':'smooth'}); }
});
window.addEventListener('hashchange', route);
route();

/* ---------- awards, experience, community work ---------- */
function renderAwards(){
  const el = $('[data-awards]'); if (!el) return;
  el.innerHTML = AWARDS.map(a => {
    const p = a.project && projectBySlug(a.project);
    const meta = [a.org || (a.pending || []).includes('org') && '<span class="tbc">organization to confirm</span>', a.date ? esc(a.date) : (a.pending || []).includes('date') && '<span class="tbc">date to confirm</span>'].filter(Boolean);
    return `<article class="award">
      <span class="award-meta mono">${meta.map(m => m.startsWith('<') ? m : esc(m)).join(' · ')}</span>
      <h3>${esc(a.title)}</h3>
      ${a.result ? `<b class="award-result">${esc(a.result)}</b>` : ''}
      <p>${esc(a.desc)}</p>
      ${a.note ? todo(esc(a.note), 'Details to confirm') : ''}
      ${a.image ? `<img src="${esc(a.image.src)}" alt="${esc(a.image.alt)}" loading="lazy">` : ''}
      <div class="award-links">${p ? `<a href="#p-${p.slug}">${esc(p.name)} case study →</a>` : ''}${a.link ? extLink(a.link) : ''}</div>
    </article>`;
  }).join('');
  const slots = $('[data-award-slots]');
  if (slots) slots.innerHTML = AWARD_SLOTS.map(s => `<li><span>${esc(s)} <span class="tbc">to add</span></span></li>`).join('');
}
function renderExperience(){
  const el = $('[data-experience]'); if (!el) return;
  const field = (x, k, label) => x[k] ? `<div><dt>${label}</dt><dd>${esc(x[k])}</dd></div>` : (x.pending || []).includes(k) ? `<div><dt>${label}</dt><dd><span class="tbc">to confirm</span></dd></div>` : '';
  el.innerHTML = EXPERIENCE.map(x => `<article class="xp">
      <span class="mono">${esc(x.kind || 'Experience')}</span>
      <h4>${esc(x.title)} · ${esc(x.org)}</h4>
      <dl class="facts">${field(x,'program','Program')}${field(x,'dates','Dates')}${field(x,'responsibilities','Responsibilities')}${field(x,'outputs','Outputs')}</dl>
      ${(x.related || []).map(r => `<a class="chap-link" href="${r.href}">${esc(r.label)} →</a>`).join('')}
    </article>`).join('') +
    `<ul class="bg-list xp-slots">${EXPERIENCE_SLOTS.map(s => `<li><span>${esc(s)} <span class="tbc">to add</span></span></li>`).join('')}</ul>`;
}
function renderCommunityWork(){
  const el = $('[data-community-work]'); if (!el) return;
  el.innerHTML = COMMUNITY_WORK.map(c => `<article class="cw-item">
      <span class="mono">${c.kind ? esc(c.kind) : '<span class="tbc">type of involvement to confirm</span>'}</span>
      <h4>${c.href ? `<a href="${c.href}">${esc(c.title)}</a>` : esc(c.title)}</h4>
      <p>${esc(c.desc)}</p>
      <p class="cw-outcome"><b>Outcome:</b> ${c.outcome ? esc(c.outcome) : '<span class="tbc">to confirm</span>'}</p>
    </article>`).join('');
}

/* ---------- O2O Playbook: topics, episode archive (filter + search), guests, subscription links ---------- */
let epTopic = 'All', epQuery = '';
function renderPlaybook(){
  const topics = $('[data-o2o-topics]');
  if (topics) topics.innerHTML = O2O_TOPICS.map(t => `<li>${esc(t)}</li>`).join('');
  const ac = $('[data-count="articles"]');
  if (ac) ac.textContent = `${ARTICLES.length} published`;
  const count = $('[data-count="episodes"]');
  if (count) count.textContent = `${EPISODES.length} published`;
  const fb = $('#ep-filters');
  if (fb) fb.innerHTML = ['All', ...O2O_TOPICS].map(t => `<button type="button" class="filter" data-ep-topic="${esc(t)}" aria-pressed="${t === epTopic}">${esc(t)}</button>`).join('');
  const list = EPISODES.filter(e => (epTopic === 'All' || (e.topics || []).includes(epTopic)) &&
    (!epQuery || [e.title, e.summary, ...(e.topics || []), ...(e.guests || []).map(g => g.name)].join(' ').toLowerCase().includes(epQuery.toLowerCase())));
  const box = $('#ep-list');
  if (box) box.innerHTML = list.length ? list.map(e => `<a class="ep-item" href="#ep-${e.slug}">
      <span class="mono">${e.number ? 'Episode ' + esc(e.number) : 'Episode'}${e.date ? ' · ' + esc(e.date) : ''}</span>
      <b>${esc(e.title)}</b>${e.summary ? `<span>${esc(e.summary)}</span>` : ''}</a>`).join('')
    : `<div class="pb-empty"><p>${EPISODES.length ? 'No episodes match this topic or search yet.' : 'No episodes have been published yet. When the first one goes live it will appear here, with show notes, guests and links to related projects.'}</p></div>`;
  const guests = [];
  EPISODES.forEach(e => (e.guests || []).forEach(g => { if (!guests.some(x => x.name === g.name)) guests.push(Object.assign({ ep: e }, g)); }));
  const gb = $('[data-guests]');
  if (gb) gb.innerHTML = guests.length ? guests.map(g => `<div class="format"><span class="mono">Guest</span><b>${esc(g.name)}</b>${g.role ? `<span class="count">${esc(g.role)}</span>` : ''}<a href="#ep-${g.ep.slug}" style="color:var(--rose);font-weight:600">${esc(g.ep.title)} →</a></div>`).join('')
    : `<p class="pb-note">Guest profiles will appear here with each published episode.</p>`;
  const sub = $('[data-podcast-links]'); const live = PODCAST_LINKS.filter(l => l.href);
  if (sub){ sub.hidden = !live.length; sub.innerHTML = live.length ? `<span class="mono">Subscribe</span>${live.map(l => `<a class="soc-pill" href="${esc(l.href)}" target="_blank" rel="noopener" data-podcast-link>${esc(l.name)}</a>`).join('')}` : ''; }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-ep-topic]'); if (b){ epTopic = b.dataset.epTopic; renderPlaybook(); } });
const epSearch = $('#ep-search');
if (epSearch) epSearch.addEventListener('input', e => { epQuery = e.target.value.trim(); renderPlaybook(); });

/* ---------- Seven Figure Employee: join button, newsletter slot, events ---------- */
function renderSFE(){
  const join = $('[data-sfe-join]');
  if (join) join.innerHTML = SFE.joinUrl
    ? `<a class="btn btn-gold" href="${esc(SFE.joinUrl)}" target="_blank" rel="noopener" data-community-join>Join the community <span class="arr" aria-hidden="true">↗</span></a>`
    : `<span class="btn btn-ghost is-soon" aria-disabled="true">Join · coming soon</span>`;
  const nl = $('[data-sfe-newsletter]');
  if (nl){ nl.hidden = !SFE.newsletterUrl; nl.innerHTML = SFE.newsletterUrl ? `<a class="chap-link" href="${esc(SFE.newsletterUrl)}" target="_blank" rel="noopener">Newsletter signup ↗</a>` : ''; }
  const ev = $('[data-sfe-events]');
  if (ev){ ev.hidden = !SFE.events.length; ev.querySelector('ul').innerHTML = SFE.events.map(x => `<li><span><b>${esc(x.title)}</b>${x.date ? ' · ' + esc(x.date) : ''}${x.desc ? ' — ' + esc(x.desc) : ''}${x.href ? ' ' + extLink({label:'Details', href:x.href}) : ''}</span></li>`).join(''); }
}
function renderResume(){
  const el = $('[data-resume]'); if (!el) return;
  el.innerHTML = (RESUME.href && RESUME.approved) ? `<a class="btn btn-ghost" href="${esc(RESUME.href)}" target="_blank" rel="noopener" data-resume-link>${esc(RESUME.label)} <span class="arr" aria-hidden="true">↗</span></a>` : '';
}
renderAwards(); renderExperience(); renderCommunityWork(); renderPlaybook(); renderSFE(); renderResume();

/* ---------- anonymous click events (no names, emails or message text; see the privacy notice) ---------- */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]'); if (!a) return;
  if (a.hasAttribute('data-podcast-link')) trackSite('podcast_click', { platform: a.textContent.trim() });
  else if (a.hasAttribute('data-community-join')) trackSite('community_join_click');
  else if (a.hasAttribute('data-resume-link')) trackSite('resume_click');
  if (a.dataset.cta) trackSite('case_study_cta', { cta: a.dataset.cta });
  let u; try { u = new URL(a.href, location.href); } catch(err){ return; }
  if (/^https?:$/.test(u.protocol) && u.host !== location.host) trackSite('outbound_click', { host: u.host });
}, true);

/* ---------- site-wide search (#search): projects, What's New, episodes, awards ---------- */
const SEARCH_GROUPS = [
  ['Projects', () => PROJECTS.map(p => ({ title: p.name, href: '#p-' + p.slug, meta: catLabel(p.category), text: p.summary,
      hay: [p.name, p.summary, p.sub, catLabel(p.category), STATUS_LABEL[p.status], p.overview, ...(p.tags || []), ...(p.tech || []), ...(p.children || []).map(c => c.name)] }))],
  ['What’s New', () => FEED.map(f => ({ title: f.title, href: f.href, external: f.external, meta: f.type, text: f.summary, hay: [f.title, f.summary, f.meta, f.type] }))],
  ['O2O Playbook episodes', () => EPISODES.map(e => ({ title: e.title, href: '#ep-' + e.slug, meta: 'Episode' + (e.date ? ' · ' + e.date : ''), text: e.summary || '',
      hay: [e.title, e.summary, ...(e.topics || []), ...(e.guests || []).map(g => g.name)] }))],
  ['Awards and recognition', () => AWARDS.map(a => ({ title: a.title + (a.result ? ' · ' + a.result : ''), href: '#awards', meta: a.date || 'Award', text: a.desc, hay: [a.title, a.result, a.desc, a.org] }))]
];
function renderSiteSearch(q){
  q = (q || '').trim();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const out = $('#site-results'), count = $('#site-count');
  if (!words.length){ out.innerHTML = ''; count.textContent = 'Type to search'; return; }
  let total = 0;
  out.innerHTML = SEARCH_GROUPS.map(([label, get]) => {
    const hits = get().filter(x => { const h = x.hay.filter(Boolean).join(' ').toLowerCase(); return words.every(w => h.includes(w)); });
    total += hits.length;
    return hits.length ? `<section class="sr-group"><h2>${label} <span class="n">${hits.length}</span></h2><ul>${hits.map(x =>
      `<li><a href="${esc(x.href)}"${x.external ? ' target="_blank" rel="noopener"' : ''}><span class="mono">${esc(x.meta)}</span><b>${esc(x.title)}${x.external ? ' ↗' : ''}</b><span>${esc(x.text)}</span></a></li>`).join('')}</ul></section>` : '';
  }).join('') || `<div class="empty"><b>Nothing matches “${esc(q)}”</b><span>Try a shorter or different word, such as a project name, a skill or a category.</span></div>`;
  count.textContent = `${total} ${total === 1 ? 'result' : 'results'} for “${q}”`;
}
$('#site-q').addEventListener('input', e => renderSiteSearch(e.target.value));
renderSiteSearch('');
/* press "/" anywhere (outside a text field) to open search */
document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
  e.preventDefault(); if (window.JEINRouter) window.JEINRouter.go('search'); else location.hash = 'search'; setTimeout(() => $('#site-q').focus(), 60);
});

/* ---------- active nav + chapter rail ---------- */
const sectionToNav = {home:'home', about:'about', strategy:'about', technology:'about', projects:'projects', playbook:'playbook', community:'community', contact:'contact'};
const watched = Object.keys(sectionToNav).map(id => document.getElementById(id)).filter(Boolean);
if ('IntersectionObserver' in window){
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const id = en.target.id;
    });
  }, {rootMargin:'-45% 0px -50% 0px'});
  watched.forEach(s => io.observe(s));

  /* gentle reveal: content is visible at rest; only a small translate animates */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const rv = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting){ en.target.classList.remove('pre'); rv.unobserve(en.target); } }), {rootMargin:'0px 0px -10% 0px'});
    document.querySelectorAll('.reveal').forEach(el => { const r = el.getBoundingClientRect(); if (r.top > innerHeight){ el.classList.add('pre'); rv.observe(el); } });
  }
}

