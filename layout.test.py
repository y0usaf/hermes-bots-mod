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
assert(rows[1].offsetWidth===60,'Tiles must have fixed compact width');
assert(rows[1].firstElementChild.offsetHeight===60,'Tiles must be square');
assert(rows[1].offsetTop===rows[6].offsetTop,'Six tiles fit at 440px');
assert(rows[2].offsetLeft-rows[1].offsetLeft===63,'Tiles keep a small gap');
assert(Math.abs((rows[1].getBoundingClientRect().left-roster.getBoundingClientRect().left)-(roster.getBoundingClientRect().right-rows[6].getBoundingClientRect().right))<1,'Shelf must be centered');
assert(rows[6].offsetTop<rows[0].offsetTop,'Entire shelf must precede conversations');
roster.parentElement.style.width='240px';
assert(rows[1].offsetWidth===60,'Narrow sidebar must preserve tile size');
assert(rows[3].offsetTop===rows[1].offsetTop,'Three tiles fit at 240px');
assert(rows[4].offsetTop>rows[1].offsetTop,'Fourth narrow tile must wrap');
roster.parentElement.style.width='440px';rows[1].dataset.botsCompact='false';
assert(rows[1].offsetWidth===440,'New visible chat expands to full width');
document.querySelector('#result').textContent='PASS: fixed square tiles center, wrap at narrow widths, remain above full-width conversations, and expand when needed.';
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
