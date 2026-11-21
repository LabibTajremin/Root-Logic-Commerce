# Figma agent notes (Phase 10 handoff)

File key `1NGfJz6PU8rxZ5pHgIcrsr`. Pages: Cover `0:1` · Foundation `2:2` · Core design `81:2` · Theme · Minimal `2:3` · Organic `2:4` · Attar `2:5` · Ankito `2:6` · Attar Aloy `21:2` · Docs `81:3`.
Theme variable collection `VariableCollectionId:2:7` (modes `<Theme> · Light|Dark`). Old v1 screens still sit on the 5 theme pages — replace them with clones of Core major screens (§9 Phase 10, 10.3).

## Component ids (Foundation)
Buttons: Primary `44:10`, Order now `44:15`, Order now বাংলা `44:18`, Secondary `44:21`, WhatsApp `44:27`, Call `44:32` · Badges `44:38/41/44/47/50` · Urgency `44:58` · Rating `44:72` · Status chips `44:79…44:135` · Fraud `44:143/150/157` · Courier `44:165/173/181` · Payment `44:185/189/193/197` · Lock `44:203`
Product card `45:43` · Variant picker `45:98` · FBT `45:127` · Sticky bar `45:138` · Trust strip `45:164` · Help bubble open/closed `45:196/45:201` · Mini cart `45:209` · Announcement `45:220` · Coupon `45:234` · District/thana `45:253` · Location `45:261` · Social toast `45:270` · Bottom nav `45:295` · Reel card `45:304`
AI chat `49:84` · Chat confirm `49:107` · Try-on states `49:141` · Popup `49:156` · ⌘K `49:194` · Bulk bar `49:224` · AI confirm card `49:249` · Order row `49:313` · Order drawer `49:362` · Usage meter `49:389` · Admin sidebar `62:100` · Admin topbar `62:128`

## Assets (Foundation › Assets section) image hashes
```json
{"attar":"30bbe5b4bafa5515d9e61be2153e500e011d8093","panjabi":"77c48713067be0f138513a6c05078c61afaa8471","grocery":"33300a439503212a019401d7a212435e839790cf","earbuds":"e8eaafa5cea6b57363de620a653bdc42a447e556","skincare":"45505e598cfb2bb0a4e985c28fede84ae2f3b896","cookware":"5118796f339d387a940e6b10df17bf35387470e1","watch":"cf963ab56d71f3f4755e817f6ba5d3d8908c42b1","baby":"b94fd5cc6e881530f21e545cdf419d197eeeabce","saree":"9268210f7c814b0fb5f82038a67ba0d771ef072f","speaker":"94d0053e19daf4ffaa0a9b02d15938a29b3a444d","hero-lifestyle":"e275f24c99c30ab6bcbffe1f265e2179066612eb","selfie":"de49434bf52a74f13cdad32d2d9e97d7f9451403","sneaker":"6a3adef2cc61c24793ee2dbff9f03f51ca6f276c","tea":"edad46d895acfadef801cf35e57dd58b97a492f1"}
```
New photos (owner, packing, hands-attar, shop-interior, parcel-tag, rider-doorstep, tex-kantha, tex-kraft-leaf) are rects named `photo/<key>` in the Assets section; read their `imageHash` at runtime. Textures `tex-handloom/smoke-gold/florals/paper` filled. Per-theme photos `photo/<theme>-hero` (720×400, 16:9 source) + `photo/<theme>-mood` (400²) for minimal, organic, attar, ankito, attar-aloy (ids 83:61–83:70).

## Gotchas (cost hours — read before scripting)
- Paint opacity on variable-bound fills is unreliable: set the fill, then read `fills[0]`, JSON-clone it, set `opacity`, assign again — **at the end of the script** (later property sets reset it). The helper's `TQ`/`FLUSH` does this.
- Changing/clearing a frame's explicit variable mode, cloning, or moving a frame to another page **resets** tint opacity → re-apply afterwards (instances: copy opacity from the source node `figma.getNodeByIdAsync(id.split(';').pop())`, see `NEST`).
- Text with `৳`/Bangla falls back to Noto Sans Bengali; `⌘` to Noto Sans Symbols2 — load them first.
- Instance children can't be moved (`x/y`); use constraints on the main component.
- In a VERTICAL auto-layout parent use `layoutSizingHorizontal='FILL'`, never `layoutGrow` (collapses width).
- Inline `node.screenshot()` may show cached/wrong images; `get_screenshot` may show stale fills — verify with data reads.
- Every `use_figma` call is stateless: paste the prelude below at the top.

## Prelude (paste at top of each `use_figma` script)
```js
const TQ=[];const FLUSH=()=>{for(const [n,op] of TQ){const c=JSON.parse(JSON.stringify(n.fills[0]));c.opacity=op;n.fills=[c];}};
const VV={}; for (const v of await figma.variables.getLocalVariablesAsync()) VV[v.name]=v;
const COL=await figma.variables.getVariableCollectionByIdAsync('VariableCollectionId:2:7');
const MODE=Object.fromEntries(COL.modes.map(m=>[m.name,m.modeId]));
{const fs=new Set(['Inter|Regular','Inter|Semi Bold','Anek Bangla|Regular','Anek Bangla|SemiBold','Anek Bangla|Bold','Noto Sans Bengali|Regular','Noto Sans Bengali|SemiBold','Noto Sans Bengali|Light','Noto Sans Bengali|Medium','Noto Sans Bengali|Bold','Noto Sans Symbols2|Regular','Noto Sans Symbols|Regular']);
for(const m of COL.modes)for(const [f,s] of [['font/heading','font/heading-style'],['font/body','font/body-style'],['font/body','font/body-strong']])fs.add(VV[f].valuesByMode[m.modeId]+'|'+VV[s].valuesByMode[m.modeId]);
await Promise.all([...fs].map(x=>{const [family,style]=x.split('|');return figma.loadFontAsync({family,style}).catch(()=>0)}));}
const P=(n,o)=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0},opacity:o!=null?o:1},'color',VV['color/'+n]);
const F=(dir,o={})=>{const f=figma.createAutoLayout(dir==='h'?'HORIZONTAL':'VERTICAL');f.fills=o.fill?[P(o.fill)]:[];if(o.name)f.name=o.name;
 if(o.stroke){f.strokes=[P(o.stroke)];f.strokeWeight=o.sw||1;}
 if(o.r!=null){if(typeof o.r==='string'){for(const k of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])f.setBoundVariable(k,VV['radius/'+o.r]);}else f.cornerRadius=o.r;}
 if(o.pad!=null){const p=Array.isArray(o.pad)?(o.pad.length===2?[o.pad[0],o.pad[1],o.pad[0],o.pad[1]]:o.pad):[o.pad,o.pad,o.pad,o.pad];[f.paddingTop,f.paddingRight,f.paddingBottom,f.paddingLeft]=p;}
 if(o.gap!=null)f.itemSpacing=o.gap;if(o.ai)f.counterAxisAlignItems=o.ai;if(o.jc)f.primaryAxisAlignItems=o.jc;if(o.wrap){f.layoutWrap='WRAP';f.counterAxisSpacing=o.gap||0;}
 if(o.w||o.h){f.resize(o.w||Math.max(f.width,1),o.h||Math.max(f.height,1));if(o.w)f.layoutSizingHorizontal='FIXED';if(o.h)f.layoutSizingVertical='FIXED';}
 if(o.clip)f.clipsContent=true;if(o.shadow)f.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:0.12},offset:{x:0,y:8},radius:24,spread:0,visible:true,blendMode:'NORMAL'}];if(o.fill&&o.op!=null)TQ.push([f,o.op]);return f};
const A=(p,c,o={})=>{p.appendChild(c);if(o.fw)c.layoutSizingHorizontal='FILL';if(o.fh)c.layoutSizingVertical='FILL';if(o.grow)c.layoutGrow=1;return c};
const AA=(p,...cs)=>{for(const c of cs)p.appendChild(c);return p};
const T=(s,o={})=>{const t=figma.createText();const k=o.k||'b';
 if(k==='bn'||k==='bnb'){t.fontName={family:'Anek Bangla',style:k==='bnb'?'SemiBold':'Regular'};t.characters=s;t.lineHeight={unit:'PERCENT',value:150};}
 else{t.fontName={family:'Inter',style:'Regular'};t.characters=s;t.setBoundVariable('fontFamily',VV[k==='h'?'font/heading':'font/body']);t.setBoundVariable('fontStyle',VV[k==='h'?'font/heading-style':k==='s'?'font/body-strong':'font/body-style']);}
 t.fontSize=o.sz||14;t.fills=[P(o.c||'text')];if(o.w){t.resize(o.w,t.height);t.textAutoResize='HEIGHT';}if(o.lh)t.lineHeight={unit:'PERCENT',value:o.lh};if(o.up){t.textCase='UPPER';t.letterSpacing={unit:'PERCENT',value:8};}if(o.strike)t.textDecoration='STRIKETHROUGH';if(o.al)t.textAlignHorizontal=o.al;if(o.name)t.name=o.name;return t};
const IC={search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',bag:'<path d="M6 7h12l1 13H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>',heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',check:'<path d="m5 12 5 5 9-10"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',chev:'<path d="m9 6 6 6-6 6"/>',chevd:'<path d="m6 9 6 6 6-6"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',chat:'<path d="M4 5h16v11H9l-5 4z"/>',shield:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',truck:'<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',home:'<path d="M4 11 12 4l8 7v9H4z"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',pin:'<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="8" cy="8" r="1.5"/>',bolt:'<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',play:'<path d="M8 5v14l11-7z"/>',sparkle:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',cmd:'<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',scan:'<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8 11 8-4M8 13l8 4"/>',gift:'<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"/>',moon:'<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',upload:'<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',grid:'<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',alert:'<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',print:'<path d="M6 9V3h12v6M6 17H3v-8h18v8h-3M6 14h12v7H6z"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',wa:'<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>',fb:'<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'};
const I=(n,sz=20,c='text',sw=1.8)=>{const s=figma.createNodeFromSvg(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${IC[n]||IC.star}</svg>`);s.name='icon/'+n;s.resize(sz,sz);for(const v of s.findAll(x=>'strokes' in x)){if(v.strokes.length)v.strokes=[P(c)];}s.fills=[];return s};
const R=(w,h,o={})=>{const r=figma.createRectangle();r.resize(w,h);r.fills=o.hash?[{type:'IMAGE',imageHash:o.hash,scaleMode:'FILL'}]:[P(o.fill||'soft')];if(o.r!=null){if(typeof o.r==='string'){for(const k of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])r.setBoundVariable(k,VV['radius/'+o.r]);}else r.cornerRadius=o.r;}r.name=o.name||'img';return r};
const pageOf=async(name)=>{let p=figma.root.children.find(x=>x.name===name);if(!p){p=figma.createPage();p.name=name;}await figma.setCurrentPageAsync(p);return p};
const rightmost=(p)=>p.children.reduce((m,c)=>Math.max(m,c.x+c.width),0);
const setMode=(n,m)=>n.setExplicitVariableModeForCollection(COL,MODE[m]);

const TINT=(node,n,op)=>{node.fills=[P(n)];const c=JSON.parse(JSON.stringify(node.fills[0]));c.opacity=op;node.fills=[c];};
const FIXI=(i)=>{const mf=i.mainComponent&&i.mainComponent.fills[0];if(mf&&mf.opacity<1&&mf.boundVariables){const c=JSON.parse(JSON.stringify(i.fills[0]));c.opacity=mf.opacity;i.fills=[c];}return i};
const NEST=async(root)=>{for(const i of root.findAllWithCriteria({types:['INSTANCE']})){for(const n of [i,...i.findAll(x=>'fills' in x)]){if(!Array.isArray(n.fills)||n.fills.length!==1||n.fills[0].type!=='SOLID'||n.fills[0].opacity!==1)continue;const src=n===i?i.mainComponent:await figma.getNodeByIdAsync(n.id.split(';').pop());if(src&&src.fills&&src.fills[0]&&src.fills[0].opacity<1){const c=JSON.parse(JSON.stringify(n.fills[0]));c.opacity=src.fills[0].opacity;n.fills=[c];}}}};
// end of script: FLUSH(); await NEST(frame);
```

## Screen builder (Phase 10)
`design/figma-screen-builder.js.txt` (plain text so lint/prettier skip it) = prelude + data-driven admin/public screen builder used for Core design screens. Paste it at the top of a `use_figma` call, then define `S=[{n,t,s,a,b:[blocks]}]` and call `adminWeb(spec, section)` / `adminMob(spec, section)`; finish with `await FINAL(frames)` (re-applies chip tints + nested instance tints). Blocks: stats, filter, table [cols,rows], cards, form, list, chart, note, empty, steps, kv, photo, title, two [[left],[right],ratio]. Cell syntax: `!ok:text` chip, `@img:key|text`, `*bold`, `$accent`.
Sections: Core web public `81:4742`, web admin `81:4743`, mobile public `81:4744`, mobile admin `81:4745`. Illustrations: `illus/<key>` rects in Assets.

## Navigation, order, dark mode (latest pass)
- Admin sidebar v3 = component `111:200` (full grouped menu, same as the app). Per screen: `items/<Group>` visible only for the current group; current item `nav/<Group>/<Item>` gets accent-tint fill (var 2:15) + accent Semi Bold text (var 2:14). Brand text `<Shop> admin`. Used on Core + all theme web admin screens.
- Public header menus = the shop's real categories + "Flash sale" (Core/Ankito: Attar, Panjabi, Sarees, Organic food, Gadgets, Beauty; Minimal "Gadget Ghor"; Organic "Shobuj Bazar"; Attar "Al-Noor Attar"; Attar Aloy). No placeholder "Dokan" names left.
- Frames in every section are ordered by user flow: public Home → Category → Search → Product → … → Cart → Checkout → OTP → Thank-you → Track → Landing/Blog/CMS → Offline → 404; admin Login → checklist → Dashboard → then sidebar menu order. Labels sit 60px above each frame.
- Each design page ends with a `Dark mode › Web + Mobile` section (Attar is dark-first, so it gets `Light mode ›`): web Home, Product, Checkout, admin Dashboard, Orders; mobile Home, Product, Cart, Checkout, admin Dashboard, Orders. Mode is set on the section AND every clone (clones carry their own explicit mode).
- Chip gotcha again: fills bound to a variable reset opacity → chips whose fill equals their text colour were set to 0.14 (Core 115, each theme 32).
