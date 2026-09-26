import { DateField, type Task } from '../core/task';
import type { TaskFieldName } from '../webviews/shared/protocol';

export type FieldValues = Partial<Record<TaskFieldName, string | string[] | null>>;

/**
 * Apply loosely-typed field values (webview forms, the public API, commands) to a task. Strings
 * are parsed per field; unknown priorities fall back to none; `status` is skipped because a
 * status change needs date side effects (TaskEditService.setStatus).
 */
export function applyFieldValues(task: Task, fields: FieldValues): Task {
  const date = (v: string | string[] | null | undefined) => (typeof v === 'string' && v ? DateField.parse(v) : null);
  let t = task;
  for (const [field, value] of Object.entries(fields) as [TaskFieldName, string | string[] | null][]) {
    switch (field) {
      case 'description': t = t.with({ description: typeof value === 'string' ? value : '' }); break;
      case 'priority': t = t.with({ priority: (typeof value === 'string' && /^[0-5]$/.test(value) ? value : '3') as Task['priority'] }); break;
      case 'due': case 'scheduled': case 'start': case 'created': case 'done': case 'cancelled': t = t.with({ [field]: date(value) }); break;
      case 'recurrence': t = t.with({ recurrenceText: typeof value === 'string' && value ? value : null }); break;
      case 'onCompletion': t = t.with({ onCompletion: typeof value === 'string' && value ? value : null }); break;
      case 'id': t = t.with({ id: typeof value === 'string' && value ? value : null }); break;
      case 'dependsOn': t = t.with({ dependsOn: Array.isArray(value) ? value : typeof value === 'string' && value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [] }); break;
      case 'status': break;
    }
  }
  return t;
}
