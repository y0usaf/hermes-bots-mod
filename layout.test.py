from pathlib import Path
import subprocess,tempfile
import json
root=Path(__file__).resolve().parent
source=(root/'plugin.js').read_text()
css=json.loads(source.splitlines()[0].removeprefix('const botsModCompactCss=').removesuffix(';'))
html='<style>html{font-size:29px}'+css+'</style><div id="frame" style="width:440px"><div id="roster" style="flex-direction:column;justify-content:flex-end"><section class="bots-mod-bot-section" data-bots-compact="false">Hermes conversations</section>'+''.join('<section class="bots-mod-bot-section" data-bots-compact="true"><div>'+name+'</div></section>' for name in ['Clipper','Scout','Worker','Reviewer','Ops','Librarian'])+'</div></div>'
html+='''<pre id="result"></pre><script>
const roster=document.querySelector('#roster'), rows=[...roster.children];
const assert=(v,m)=>{if(!v)throw Error(m)};
try {
assert(rows[0].offsetWidth===440,'Chat section must span full width');
assert(rows[1].offsetTop===rows[2].offsetTop,'Compact bots must share a row');
assert(rows[1].offsetWidth===56,'Tiles must have fixed compact width');
assert(rows[1].firstElementChild.offsetHeight===56,'Tiles must be square');
assert(rows[1].offsetTop===rows[6].offsetTop,'Six tiles fit at 440px');
assert(rows[2].offsetLeft-rows[1].offsetLeft===59,'Tiles keep a small gap');
assert(rows[1].getBoundingClientRect().left-roster.getBoundingClientRect().left<1,'Shelf must be left-aligned');
assert(rows[6].offsetTop<rows[0].offsetTop,'Entire shelf must precede conversations');
roster.parentElement.style.width='240px';
assert(rows[1].offsetWidth===56,'Narrow sidebar must preserve tile size');
assert(rows[4].offsetTop===rows[1].offsetTop,'Four tiles fit at 240px');
assert(rows[5].offsetTop>rows[1].offsetTop,'Fifth narrow tile must wrap');
assert(rows[5].offsetLeft===rows[1].offsetLeft,'Wrapped tiles return to left edge');
roster.parentElement.style.width='440px';rows[1].dataset.botsCompact='false';
assert(rows[1].offsetWidth===440,'New visible chat expands to full width');
rows[1].dataset.botsCompact='true';
const tile=rows[1].firstElementChild;
document.documentElement.style.setProperty('--chrome-action-hover','rgb(255, 0, 0)');
assert(getComputedStyle(tile).backgroundColor==='rgba(0, 0, 0, 0)','Compact tiles must be transparent at rest');
/* Options button: hidden placeholder is the only focusable element inside the tile. */
const btn=document.createElement('button');
btn.setAttribute('aria-label','Options for Clipper');
btn.style.width='10px';btn.style.height='10px';btn.style.opacity='1';
rows[1].appendChild(btn);
btn.focus();
assert(rows[1].matches(':focus-within'),'Tile must be focus-within after focusing options button');
assert(getComputedStyle(tile).backgroundColor==='rgb(255, 0, 0)','Tile must show themed highlight on focus-within');
btn.blur();
assert(getComputedStyle(tile).backgroundColor==='rgba(0, 0, 0, 0)','Highlight must clear when focus leaves');
/* This --dump-dom fixture only verifies the hover rule exists in the stylesheet; hover itself is not exercised here (CDP could drive it). */
const cssText=[...document.styleSheets].flatMap(s=>{try{return[...s.cssRules].map(r=>r.cssText)}catch(e){return[]}}).join('\\n');
assert(/data-bots-compact="true"\\] > div:first-of-type:hover/.test(cssText),'Hover highlight rule must exist');
assert(/data-bots-compact="true"\\]:focus-within > div:first-of-type/.test(cssText),'Focus highlight rule must exist');
document.querySelector('#result').textContent='PASS: fixed square tiles left-align, wrap at narrow widths, remain above full-width conversations, expand when needed, and are transparent at rest with themed hover/focus highlight.';
}catch(e){document.querySelector('#result').textContent='FAIL: '+e.message}
</script>'''
p=root/'layout-test.html';p.write_text(html)
with tempfile.TemporaryDirectory(prefix='bots-layout-browser-') as profile:
 r=subprocess.run(['chromium','--headless','--no-sandbox','--disable-gpu','--no-first-run','--user-data-dir='+profile,'--dump-dom',p.as_uri()],capture_output=True,text=True,timeout=40)
 import re
 result=re.search(r'<pre id="result">(.*?)</pre>',r.stdout)
 assert result, r.stderr[-1000:]
 print(result.group(1))
 assert result.group(1).startswith('PASS:'),result.group(1)
