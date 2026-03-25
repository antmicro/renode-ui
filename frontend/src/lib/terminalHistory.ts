import type { PanelType } from './store.svelte';

// TODO: make this limit configurable by the end-user
const TERMINAL_HISTORY_MAX_CHARS = 1_000_000;

export class TerminalHistory {
  private chunks: string[] = [];
  private totalChars = 0;

  public append(chunk: string): void {
    this.chunks.push(chunk);
    this.totalChars += chunk.length;

    while (this.totalChars > TERMINAL_HISTORY_MAX_CHARS) {
      const removed = this.chunks.shift();
      if (removed === undefined) {
        break;
      }
      this.totalChars -= removed.length;
    }
  }

  public async replayInto(stream: WritableStream<string>): Promise<void> {
    const writer = stream.getWriter();

    for (const chunk of this.chunks) {
      await writer.write(chunk);
    }

    await writer.close();
  }

  public clear(): void {
    this.chunks = [];
    this.totalChars = 0;
  }
}

class TerminalHistoryRegistry {
  private histories = new Map<string, TerminalHistory>();

  public getOrCreate(panelType: PanelType, port?: number, uart?: string): TerminalHistory {
    const key = `${panelType}::${port ?? 'none'}::${uart ?? 'none'}`;
    const existing = this.histories.get(key);
    if (existing) {
      return existing;
    }

    const created = new TerminalHistory();
    this.histories.set(key, created);
    return created;
  }

  public clear(panelType: PanelType): void {
    const panelPrefix = `${panelType}::`;
    for (const [key, history] of this.histories.entries()) {
      if (!key.startsWith(panelPrefix)) {
        continue;
      }

      history.clear();
      this.histories.delete(key);
    }
  }
}

export const terminalHistories = new TerminalHistoryRegistry();
