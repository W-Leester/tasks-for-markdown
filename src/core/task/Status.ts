import { StatusType } from './StatusType';

export interface StatusConfig {
  /** The single character between `[` and `]`. */
  symbol: string;
  name: string;
  /** Symbol the task moves to when toggled. */
  nextSymbol: string;
  type: StatusType;
}

export class Status {
  readonly symbol: string;
  readonly name: string;
  readonly nextSymbol: string;
  readonly type: StatusType;

  constructor(config: StatusConfig) {
    if (config.symbol.length !== 1) {
      throw new Error(`Status symbol must be exactly one character, got "${config.symbol}"`);
    }
    this.symbol = config.symbol;
    this.name = config.name;
    this.nextSymbol = config.nextSymbol;
    this.type = config.type;
  }

  /** DONE or CANCELLED — the task no longer needs attention. */
  isCompleted(): boolean {
    return this.type === StatusType.DONE || this.type === StatusType.CANCELLED;
  }

  /** A status for a symbol that is not registered: behaves like TODO and toggles to `x`. */
  static unknown(symbol: string): Status {
    return new Status({ symbol, name: 'Unknown', nextSymbol: 'x', type: StatusType.TODO });
  }
}

export const DEFAULT_STATUSES: readonly StatusConfig[] = [
  { symbol: ' ', name: 'Todo', nextSymbol: 'x', type: StatusType.TODO },
  { symbol: 'x', name: 'Done', nextSymbol: ' ', type: StatusType.DONE },
  { symbol: '/', name: 'In Progress', nextSymbol: 'x', type: StatusType.IN_PROGRESS },
  { symbol: '-', name: 'Cancelled', nextSymbol: ' ', type: StatusType.CANCELLED },
];

/**
 * Lookup table from symbol to Status. The extension keeps one registry, rebuilt from settings;
 * core code receives it as a parameter so it never reads settings itself.
 */
export class StatusRegistry {
  private readonly bySymbolMap = new Map<string, Status>();

  constructor(configs: readonly StatusConfig[] = DEFAULT_STATUSES) {
    for (const c of configs) this.register(c);
  }

  register(config: StatusConfig): Status {
    const status = new Status(config);
    this.bySymbolMap.set(status.symbol, status);
    return status;
  }

  /** Always returns a Status; unregistered symbols get a TODO-typed placeholder. */
  bySymbol(symbol: string): Status {
    return this.bySymbolMap.get(symbol) ?? Status.unknown(symbol);
  }

  has(symbol: string): boolean {
    return this.bySymbolMap.has(symbol);
  }

  next(status: Status): Status {
    return this.bySymbol(status.nextSymbol);
  }

  all(): Status[] {
    return [...this.bySymbolMap.values()];
  }

  static default(): StatusRegistry {
    return new StatusRegistry(DEFAULT_STATUSES);
  }
}
