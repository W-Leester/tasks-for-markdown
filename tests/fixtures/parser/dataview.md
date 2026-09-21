# Dataview format fixture

Canonical dataview lines: `serialize(parse(line), 'dataview') === line`.

- [ ] created only [created:: 2026-09-15]
- [ ] start only [start:: 2026-09-20]
- [ ] scheduled only [scheduled:: 2026-09-22]
- [ ] due only [due:: 2026-09-25]
- [x] done only [completion:: 2026-09-26]
- [-] cancelled only [cancelled:: 2026-09-27]
- [ ] highest [priority:: highest]
- [ ] lowest [priority:: lowest]
- [ ] daily [repeat:: every day] [due:: 2026-09-25]
- [ ] delete [onCompletion:: delete]
- [ ] id [id:: abc123]
- [ ] depends [dependsOn:: abc123,def456]
- [ ] tags #work #proj/alpha [due:: 2026-09-25]
- [ ] everything [id:: a1b2c3] [dependsOn:: x1,y2] [priority:: high] [repeat:: every week when done] [onCompletion:: delete] [created:: 2026-09-15] [start:: 2026-09-20] [scheduled:: 2026-09-22] [due:: 2026-09-25] [cancelled:: 2026-09-27] [completion:: 2026-09-26] ^blk1
