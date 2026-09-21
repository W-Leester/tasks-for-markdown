#!/usr/bin/env python3
"""Extract every ```mermaid block from ../design.md and render it to SVG here.

Usage:  python3 docs/imgs/render-mermaid.py
Needs:  npx @mermaid-js/mermaid-cli@11  (downloads a headless Chromium on first run)

Output file names follow the order of the blocks in design.md (see NAMES).
03-1-layers.svg is intentionally NOT written here: it is hand-drawn by gen_mockups.py
because Mermaid ignores `direction LR` inside linked subgraphs and renders it too tall.
"""
import re, subprocess, sys, tempfile, os

HERE = os.path.dirname(os.path.abspath(__file__))
DOC = os.path.join(HERE, '..', 'design.md')
NAMES = ['02-system-context', '03-1-layers', '04-domain-model', '05-1-index-pipeline', '05-2-toggle-sequence',
         '05-3-recurrence-flow', '05-4-query-pipeline', '05-5-preview-bridge', '05-6-webview-protocol',
         '06-1-status-machine', '06-2-index-lifecycle', '07-2-editor-interaction', '08-storage',
         '12-test-strategy', '13-build-pipeline']
HAND_DRAWN = {'03-1-layers'}

src = open(DOC, encoding='utf-8').read()
blocks = re.findall(r'```mermaid\n(.*?)```', src, re.S)
if len(blocks) != len(NAMES):
    sys.exit(f'expected {len(NAMES)} mermaid blocks, found {len(blocks)} — update NAMES')
with tempfile.TemporaryDirectory() as tmp:
    for name, body in zip(NAMES, blocks):
        if name in HAND_DRAWN:
            continue
        mmd = os.path.join(tmp, name + '.mmd')
        open(mmd, 'w', encoding='utf-8').write(body)
        subprocess.run(['npx', '@mermaid-js/mermaid-cli@11', '-i', mmd, '-o', os.path.join(HERE, name + '.svg'),
                        '-c', os.path.join(HERE, 'mermaid.config.json'), '-b', 'transparent', '-q'], check=True)
        print('rendered', name)
