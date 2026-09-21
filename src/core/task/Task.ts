import { DateField } from './DateField';
import { Priority } from './Priority';
import { Status } from './Status';
import { StatusType } from './StatusType';
import { extractTags } from './tags';
import { type TaskLocation, unknownLocation } from './TaskLocation';

export type DateFieldName = 'created' | 'start' | 'scheduled' | 'due' | 'done' | 'cancelled';

export interface TaskFields {
  description: string;
  status: Status;
  priority: Priority;
  created: DateField | null;
  start: DateField | null;
  scheduled: DateField | null;
  due: DateField | null;
  done: DateField | null;
  cancelled: DateField | null;
  /** Text after 🔁 / `repeat::`, kept verbatim until the recurrence engine (M3) interprets it. */
  recurrenceText: string | null;
  /** Text after 🏁 / `onCompletion::` (`keep` | `delete`), kept verbatim. */
  onCompletion: string | null;
  id: string | null;
  dependsOn: readonly string[];
  /** Leading whitespace of the line. */
  indentation: string;
  /** `-`, `*`, `+`, `1.`, `1)` … */
  listMarker: string;
  /** Trailing `^block-id`, without the caret, or null. */
  blockLink: string | null;
  /** The exact source line; used to detect stale edits before writing. */
  originalMarkdown: string;
  location: TaskLocation;
}

/**
 * Immutable snapshot of one task line. Changes produce a new Task via `with()`; the file is the
 * source of truth, so a modified Task only becomes real once it is serialized and written.
 */
export class Task implements TaskFields {
  readonly description: string;
  readonly status: Status;
  readonly priority: Priority;
  readonly created: DateField | null;
  readonly start: DateField | null;
  readonly scheduled: DateField | null;
  readonly due: DateField | null;
  readonly done: DateField | null;
  readonly cancelled: DateField | null;
  readonly recurrenceText: string | null;
  readonly onCompletion: string | null;
  readonly id: string | null;
  readonly dependsOn: readonly string[];
  readonly indentation: string;
  readonly listMarker: string;
  readonly blockLink: string | null;
  readonly originalMarkdown: string;
  readonly location: TaskLocation;
  /** Derived from `description`. */
  readonly tags: readonly string[];

  constructor(fields: TaskFields) {
    this.description = fields.description;
    this.status = fields.status;
    this.priority = fields.priority;
    this.created = fields.created;
    this.start = fields.start;
    this.scheduled = fields.scheduled;
    this.due = fields.due;
    this.done = fields.done;
    this.cancelled = fields.cancelled;
    this.recurrenceText = fields.recurrenceText;
    this.onCompletion = fields.onCompletion;
    this.id = fields.id;
    this.dependsOn = [...fields.dependsOn];
    this.indentation = fields.indentation;
    this.listMarker = fields.listMarker;
    this.blockLink = fields.blockLink;
    this.originalMarkdown = fields.originalMarkdown;
    this.location = fields.location;
    this.tags = extractTags(fields.description);
    Object.freeze(this);
  }

  /** A blank task with the given description — handy for tests and for "create task" flows. */
  static blank(description = '', status: Status = Status.unknown(' ')): Task {
    return new Task({
      description,
      status,
      priority: Priority.None,
      created: null,
      start: null,
      scheduled: null,
      due: null,
      done: null,
      cancelled: null,
      recurrenceText: null,
      onCompletion: null,
      id: null,
      dependsOn: [],
      indentation: '',
      listMarker: '-',
      blockLink: null,
      originalMarkdown: '',
      location: unknownLocation(),
    });
  }

  with(changes: Partial<TaskFields>): Task {
    return new Task({ ...this.toFields(), ...changes });
  }

  toFields(): TaskFields {
    return {
      description: this.description,
      status: this.status,
      priority: this.priority,
      created: this.created,
      start: this.start,
      scheduled: this.scheduled,
      due: this.due,
      done: this.done,
      cancelled: this.cancelled,
      recurrenceText: this.recurrenceText,
      onCompletion: this.onCompletion,
      id: this.id,
      dependsOn: this.dependsOn,
      indentation: this.indentation,
      listMarker: this.listMarker,
      blockLink: this.blockLink,
      originalMarkdown: this.originalMarkdown,
      location: this.location,
    };
  }

  get isDone(): boolean {
    return this.status.type === StatusType.DONE;
  }

  get isCancelled(): boolean {
    return this.status.type === StatusType.CANCELLED;
  }

  /** DONE or CANCELLED. */
  get isCompleted(): boolean {
    return this.status.isCompleted();
  }

  get isRecurring(): boolean {
    return this.recurrenceText !== null;
  }

  dateField(name: DateFieldName): DateField | null {
    return this[name];
  }

  /**
   * The earliest of start / scheduled / due — the date on which the task "happens".
   * Invalid dates are ignored.
   */
  happens(): DateField | null {
    let best: DateField | null = null;
    for (const f of [this.start, this.scheduled, this.due]) {
      if (!f || !f.date) continue;
      if (!best || f.date.isBefore(best.date!)) best = f;
    }
    return best;
  }
}
