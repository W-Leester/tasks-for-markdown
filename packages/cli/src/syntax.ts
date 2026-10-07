/** Compact reference an AI agent can read before writing task lines or queries (MCP resource + tool). */
export const SYNTAX_REFERENCE = `# Tasks for Markdown — syntax reference

## Task line
A task is a Markdown list item with a checkbox: \`- [ ] description ...fields\`.
Status symbols: \`[ ]\` todo, \`[x]\` done, \`[/]\` in progress, \`[-]\` cancelled (custom statuses may exist).
Fields go after the description, in this order (emoji format):
  🆔 id · ⛔ dependsOn(ids, comma separated) · priority (🔺 highest ⏫ high 🔼 medium 🔽 low ⏬ lowest) · 🔁 recurrence · 🏁 keep|delete
  ➕ created · 🛫 start · ⏳ scheduled · 📅 due · ❌ cancelled · ✅ done   (all dates YYYY-MM-DD)
Tags are #words inside the description. Example:
  - [ ] Write report #work ⏫ 🔁 every week 📅 2026-10-01
Recurrence text examples: every day · every week · every 2 weeks on friday · every month on the 1st · every year · every week when done.

## Notes
Notes are plain bullets (no checkbox) indented one level directly under the task. They are not a field: never put them on the task line.
  - [ ] Review contract #work 📅 2026-09-26
    - Clause 3 penalty: check with legal      ← note
    - [ ] Email legal                         ← sub-task, not a note
Use tasks_add_note (one note) or the \`notes\` argument of tasks_create/tasks_update (replace all). Returned tasks carry \`notes: [{ line, text }]\`.

## Rules the workspace may enforce
- A due date is required by default (setting tasksmd.requireDueDate): tasks_create without \`due\` fails with INVALID_ARGUMENT. Call tasks_info to see the current settings.
- Tasks that depend on others: \`isBlocked\` = waits for an unfinished task (⛔); \`isBlocking\` = an unfinished task waits for this one (finishing it unblocks something).

## Query language (one instruction per line, all lines ANDed)
Status: done · not done · status.type is TODO|IN_PROGRESS|DONE|CANCELLED|NON_TASK · status.name includes X · status.symbol includes X
Dates (due|scheduled|start|created|done|cancelled|happens): \`due today\`, \`due before tomorrow\`, \`due after 2026-10-01\`, \`due on or before next friday\`, \`due this week\`, \`due 2026-10\`, \`due 2026-Q4\`, \`due 2026-W40\`, \`has due date\`, \`no due date\`, \`due date is invalid\`. Natural dates: today, tomorrow, yesterday, next monday, last week, in 3 days, 2 weeks ago.
Priority: priority is high · priority is above none · priority is below medium · priority is not lowest
Text: description includes X · description does not include X · description regex matches /x/i
Tags: has tags · no tags · tags include #home · tag does not include work · tags regex matches /#t$/
Location: path includes notes/ · folder includes projects · filename includes todo · heading includes Ideas · root includes work
Other: is recurring · is not recurring · is blocked · is not blocked · is blocking · has id · no id · has depends on · exclude sub-items
Boolean: (not done) AND (due before today) · (priority is high) OR (tags include #urgent) · NOT (is recurring) · XOR
Sort: sort by due|scheduled|start|created|done|priority|urgency|description|path|status|tag [reverse]
Group: group by due|folder|filename|heading|priority|status|tag|path|happens|urgency
Limit/layout: limit 20 · limit groups 5 · short mode · hide backlink · hide priority · show tree · explain
The extension's sidebar views are these queries (use them to match what the user sees):
  Today: not done + happens on or before today · Upcoming 7 days: not done + happens after today + happens on or before in 7 days
  Overdue: not done + due before today · In progress: status.type is IN_PROGRESS · Blocked: not done + is blocked
  All open: not done · Done (30 days): done + (done on or after 30 days ago) OR (cancelled on or after 30 days ago)
Placeholders inside a note: {{query.file.folder}} {{query.file.path}} {{query.file.filename}}

Lines in tool arguments are 0-based (line 0 = first line of the file); the CLI shows 1-based numbers.

## Query results
tasks_query returns { matched, shown, tasks[, groups] }. Each task appears once in tasks; fields without a value are left out (no due date → no "due"). With group by, groups is [{ name, count, tasks: [indexes into tasks], groups? }]. Sub-tasks: parentLine and depth.
`;
