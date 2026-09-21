# Emoji format fixture

Every task line in this file is written in canonical order, so `serialize(parse(line)) === line`.

## Dates
- [ ] created only ➕ 2026-09-15
- [ ] start only 🛫 2026-09-20
- [ ] scheduled only ⏳ 2026-09-22
- [ ] due only 📅 2026-09-25
- [x] done only ✅ 2026-09-26
- [-] cancelled only ❌ 2026-09-27
- [ ] all dates ➕ 2026-09-15 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25

## Priorities
- [ ] highest 🔺
- [ ] high ⏫
- [ ] medium 🔼
- [ ] none
- [ ] low 🔽
- [ ] lowest ⏬

## Recurrence, completion, dependencies
- [ ] daily 🔁 every day 📅 2026-09-25
- [ ] weekly when done 🔁 every week when done 📅 2026-09-25
- [ ] last of month 🔁 every month on the last 📅 2026-09-30
- [ ] delete on completion 🏁 delete
- [ ] keep on completion 🏁 keep
- [ ] has id 🆔 abc123
- [ ] depends on one ⛔ abc123
- [ ] depends on two ⛔ abc123,def456
- [ ] chain 🆔 zz9 ⛔ abc123

## Tags and markdown
- [ ] tags inside #work #proj/alpha 📅 2026-09-25
- [ ] #task global filter first 📅 2026-09-25
- [ ] link [[Note]] and [ext](https://x.io/#a) **bold** `code` 📅 2026-09-25
- [ ] 한국어 설명 #업무 📅 2026-09-25

## Structure
  - [ ] indented two spaces
	- [ ] indented tab
* [ ] star marker
+ [ ] plus marker
1. [ ] numbered dot
2) [ ] numbered paren
- [/] in progress
- [?] unknown symbol
- [ ]
- [ ] block link ^abc-1
- [ ] everything 🆔 a1b2c3 ⛔ x1,y2 ⏫ 🔁 every week when done 🏁 delete ➕ 2026-09-15 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25 ❌ 2026-09-27 ✅ 2026-09-26 ^blk1
