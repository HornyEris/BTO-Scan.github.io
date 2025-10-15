// site.js — handles index listing and reader loading
const API = {
  works: 'works.json'
};

// --- Index page logic ---
async function loadWorks() {
  try {
    const res = await fetch(API.works);
    const list = await res.json();
    return list;
  } catch (e) {
    console.error('loadWorks', e);
    return [];
  }
}

function makeCard(w){
  const a = document.createElement('a');
  a.href = `reader.html?slug=${encodeURIComponent(w.slug)}`;
  a.className = 'card-link';
  const card = document.createElement('div'); card.className='card';
  const img = document.createElement('img'); img.className='thumb';
  img.src = w.cover || `works/${w.slug}/cover.jpg`;
  img.alt = w.title || w.slug;
  card.appendChild(img);
  const body = document.createElement('div'); body.className='card-body';
  const h = document.createElement('h3'); h.textContent = w.title;
  const m = document.createElement('div'); m.className='meta'; m.textContent = (w.artist? w.artist+' • ':'') + (w.tags? w.tags.join(', '):'');
  const read = document.createElement('a'); read.href = `reader.html?slug=${encodeURIComponent(w.slug)}`; read.textContent='Read';
  body.appendChild(h); body.appendChild(m); body.appendChild(read);
  card.appendChild(body);
  a.appendChild(card);
  return a;
}

async function renderIndex() {
  const grid = document.getElementById('grid');
  const search = document.getElementById('search');
  const empty = document.getElementById('empty');
  const works = await loadWorks();
  function filterAndRender(q){
    grid.innerHTML='';
    const ql = (q||'').toLowerCase().trim();
    const filtered = works.filter(w=>{
      if(!ql) return true;
      return (w.title||'').toLowerCase().includes(ql) ||
             (w.artist||'').toLowerCase().includes(ql) ||
             (w.tags||[]).join(' ').toLowerCase().includes(ql);
    });
    if(!filtered.length){ empty.hidden=false; } else { empty.hidden=true; }
    filtered.forEach(w=> grid.appendChild(makeCard(w)));
  }
  filterAndRender('');
  search.addEventListener('input', ()=> filterAndRender(search.value));
}

if(document.getElementById('grid')) {
  renderIndex();
}

// --- Reader logic ---
const Reader = {
  meta: null,
  images: [],
  slug: null,
  container: () => document.getElementById('reader'),
  async initFromQuery(){
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    if(!slug) { alert('No slug specified'); location.href='index.html'; return; }
    this.slug = slug;
    await this.loadMeta();
    this.renderMeta();
    this.loadImages();
    this.setupNav();
  },
  async loadMeta(){
    try {
      const res = await fetch(`works/${this.slug}/meta.json`);
      this.meta = await res.json();
    } catch (e){
      console.error('meta load', e);
      // fallback minimal meta
      this.meta = { title:this.slug, pages: [] };
    }
  },
  renderMeta(){
    const el = document.getElementById('title');
    if(el) el.textContent = `${this.meta.title || this.slug}`;
    const metaBox = document.getElementById('meta');
    if(metaBox){
      metaBox.innerHTML = `<strong>${this.meta.title||this.slug}</strong>
        <div class="meta">${this.meta.artist ? 'Artist: '+this.meta.artist : ''} ${this.meta.tags? (' • '+this.meta.tags.join(', ')) : ''}</div>`;
    }
  },
  loadImages(){
    const container = this.container();
    container.innerHTML='';
    // if meta.pages exist, use them; otherwise attempt to load 001..n until 404
    if(this.meta.pages && this.meta.pages.length){
      this.meta.pages.forEach(p=>{
        const img = document.createElement('img');
        img.loading='lazy';
        img.src = `works/${this.slug}/${p}`;
        container.appendChild(img);
      });
      this.images = this.meta.pages;
    } else if(this.meta.count){
      for(let i=1;i<=this.meta.count;i++){
        const name = String(i).padStart(3,'0') + '.jpg';
        const img = document.createElement('img');
        img.loading='lazy';
        img.src = `works/${this.slug}/${name}`;
        container.appendChild(img);
        this.images.push(name);
      }
    } else {
      // try sequential until 404 (best-effort)
      let i=1;
      const tryNext = async ()=>{
        const name = String(i).padStart(3,'0') + '.jpg';
        const url = `works/${this.slug}/${name}`;
        try {
          const r = await fetch(url, { method:'HEAD' });
          if(r.ok){
            const img = document.createElement('img'); img.loading='lazy'; img.src=url;
            container.appendChild(img);
            this.images.push(name);
            i++; await tryNext();
          } // stop when not ok
        } catch(e){}
      };
      tryNext();
    }
  },
  setupNav(){
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    if(prev) prev.onclick = ()=> window.scrollBy({ top:-window.innerHeight, behavior:'smooth' });
    if(next) next.onclick = ()=> window.scrollBy({ top:window.innerHeight, behavior:'smooth' });
    // download link points to the folder — GitHub doesn't allow folder direct download; instruct user in UI
    const dl = document.getElementById('downloadAll');
    if(dl){
      dl.href = `https://github.com/${location.pathname.split('/')[1]}/${location.pathname.split('/')[2]}/raw/main/works/${this.slug}/`; // informative only
      dl.onclick = (e)=>{ e.preventDefault(); alert('To download images: open the works folder in the repo and use "Download" on GitHub or download single images.'); };
    }
  }
};
