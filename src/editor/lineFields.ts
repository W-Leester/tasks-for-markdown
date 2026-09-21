import { splitTaskLine, type Task } from '../core/task';

/**
 * Character offset where the metadata (fields) of a task line begins, or null when the line has
 * no fields. Used to colour the "meta" part differently from the description.
 */
export function fieldsStartOffset(lineText: string, task: Task): number | null {
  const parts = splitTaskLine(lineText);
  if (!parts) return null;
  const bodyStart = lineText.length - (lineText.endsWith('\r') ? 1 : 0) - parts.body.length;
  const body = parts.body;
  // Common case: description is a contiguous prefix of the body.
  if (task.description && body.startsWith(task.description)) {
    const rest = body.slice(task.description.length);
    if (rest.trim().length === 0) return null;
    return bodyStart + task.description.length + (rest.length - rest.trimStart().length);
  }
  // Tags interleaved with fields: fall back to the first field token.
  const m = /[➕🛫⏳⌛📅📆🗓✅❌🔁🏁🆔⛔🔺⏫🔼🔽⏬]|[[(](?:created|start|scheduled|due|completion|cancelled|priority|repeat|onCompletion|id|dependsOn)::/u.exec(body);
  if (!m) return null;
  return bodyStart + m.index;
}
