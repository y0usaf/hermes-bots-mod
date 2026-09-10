"""Guard current-pin CSS and execution paths independently of mocked hosts."""
from pathlib import Path
import hashlib
import json
import sys

patched, pinned = (Path(p).read_text() for p in sys.argv[1:3])
assert patched.splitlines()[0] == pinned.splitlines()[0], "Current pinned compact shelf CSS changed"
segments = {
    "manual_mention_resolution": ("function xs(", "function Y("),
    "subagent_relay": ("async function Cl(", "function Ml("),
    "new_chat_routing": ("function ur(", "function xs("),
    "canonical_open_no_kickoff": ("async function xi(", "function gp("),
    "legacy_setup_no_greeting": ("function Bc(", "function Dc("),
    "group_session_execution": ("async function Sm(", "var $l="),
    "legacy_hidden_semantics": ("function fo(", "function sc("),
}
results = {}
for label, (start, end) in segments.items():
    def extract(text):
        begin = text.index(start)
        return text[begin:text.index(end, begin)]
    actual, original = extract(patched), extract(pinned)
    assert actual == original, f"Unrelated execution path changed: {label}"
    results[label] = hashlib.sha256(actual.encode()).hexdigest()
print(json.dumps({"pinned_css_identical": True, "unchanged_execution_sha256": results}, indent=2))
