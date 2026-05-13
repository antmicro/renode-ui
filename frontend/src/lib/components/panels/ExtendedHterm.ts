import { hterm, lib } from '../../thirdparty/hterm';
import type { PanelType, Socket } from '$lib/store.svelte';
import type { TerminalHistory } from '$lib/terminalHistory';

interface ConstructorArgs {
  profileId: string;
  interactible: boolean;
  metadata: { panelType: PanelType; port?: number; uart?: string };
  history: TerminalHistory;
  onReady?: () => void;
  onFocus?: () => void;
  onResize?: (width: number, height: number) => void;
}

class UTF8StreamDecoder {
  private buffer: Uint8Array;

  constructor() {
    this.buffer = new Uint8Array(0); // leftover bytes from previous chunk
  }

  decode(init: ArrayBuffer) {
    let chunk = new Uint8Array(init);

    const merged = new Uint8Array(this.buffer.length + chunk.length);
    merged.set(this.buffer, 0);
    merged.set(chunk, this.buffer.length);

    let result = '';
    let i = 0;

    while (i < merged.length) {
      const byte1 = merged[i];

      let codePoint = null;
      let bytesNeeded = 0;

      if (byte1 <= 0x7f) {
        // 1-byte ASCII
        codePoint = byte1;
        bytesNeeded = 0;
      } else if (byte1 >> 5 === 0b110) {
        // 2-byte sequence
        codePoint = byte1 & 0x1f;
        bytesNeeded = 1;
      } else if (byte1 >> 4 === 0b1110) {
        // 3-byte sequence
        codePoint = byte1 & 0x0f;
        bytesNeeded = 2;
      } else if (byte1 >> 3 === 0b11110) {
        // 4-byte sequence
        codePoint = byte1 & 0x07;
        bytesNeeded = 3;
      } else {
        i += 1;
        continue;
      }

      if (i + bytesNeeded >= merged.length) break;

      let valid = true;
      for (let j = 1; j <= bytesNeeded; j++) {
        const cont = merged[i + j];
        if ((cont & 0xc0) !== 0x80) {
          valid = false;
          break;
        }
        codePoint = (codePoint << 6) | (cont & 0x3f);
      }

      if (!valid || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        i += 1; // invalid UTF-8 sequence
      } else {
        result += String.fromCodePoint(codePoint);
        i += bytesNeeded + 1;
      }
    }

    this.buffer = merged.slice(i);

    return result;
  }
}

export class ExtendedHterm extends hterm.Terminal {
  private interactible: boolean;
  private onReady?: () => void;
  private onResize?: (width: number, height: number) => void;
  private currentResize?: number;
  private history: TerminalHistory;
  private socket?: Socket;

  public metadata: { panelType: PanelType; port?: number; uart?: string };

  constructor({ profileId, interactible, metadata, history, onReady, onResize }: ConstructorArgs) {
    hterm.messageManager?.disable();
    super({ profileId, storage: new lib.Storage.Local(), opts: { autofocus: false } });
    this.interactible = interactible;
    this.onReady = onReady;
    this.onResize = onResize;
    this.history = history;
    this.metadata = metadata;
  }

  public async install(node: HTMLElement, socket: Socket): Promise<void> {
    this.socket = socket;

    const decoder = new UTF8StreamDecoder();
    this.socket?.addEventListener('message', async (e) => {
      if (typeof e.data == 'string') {
        this.interpret(e.data);
      } else if (e.data instanceof Blob) {
        this.interpret(decoder.decode(await e.data.arrayBuffer()));
      } else if (e.data instanceof ArrayBuffer) {
        this.interpret(decoder.decode(e.data));
      } else {
        throw new Error(
          `Unexpected type of message. Expected string, Blob, or ArrayBuffer. Got ${(e.data as object).constructor?.name}`,
        );
      }
    });

    this.decorate(node);
    await this.screenReady();
    await this.setStyle();

    this.io.onTerminalResize = (width, height) => {
      this.horizontalResize(width, height);
    };

    this.onVTKeystroke = (msg) => {
      this.sendToWebsocket(msg);
    };
    this.io.sendString = (msg) => {
      this.sendToWebsocket(msg);
    };

    console.assert(this.socket !== undefined, 'ws is not initialized');

    this.installKeyboard();

    await this.history.replayInto(this.createHistoryStream());

    this.scrollEnd();
    this.onReady?.();
  }

  private sendToWebsocket(message: string): void {
    if (!this.interactible) {
      return;
    }

    this.socket?.send(message);
    this.scrollEnd();
  }

  public interpret(str: string): void {
    this.history.append(str);
    super.interpret(str);
  }

  public async horizontalResize(width: number, height: number): Promise<void> {
    if (this.currentResize) {
      clearTimeout(this.currentResize);
    }

    this.currentResize = window.setTimeout(async () => {
      try {
        this.onResize?.(width, height);
        await this.history.replayInto(this.createHistoryStream());
      } finally {
        this.currentResize = undefined;
      }
    }, 500);
  }

  private async setStyle(): Promise<void> {
    await Promise.all([
      this.prefs_?.set('allow-images-inline', true),
      this.prefs_?.set('screen-padding-size', 17),
      this.prefs_?.set('scrollbar-visible', true),
      this.prefs_?.set(
        'user-css-text',
        `
        /* This is a fallback for the firefox, as it does not support -webkit-scrollbar-\* */
        body {
          scrollbar-color: #8f8f8f #1f1f1f;
          scrollbar-gutter: stable;
        }
        
        x-screen {
          overflow-y: auto !important;
        }

        *::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        *::-webkit-scrollbar-track {
          background-color: #1f1f1f;
          border-radius: 8px;
        }
      
        *::-webkit-scrollbar-thumb {
          background-color: #8f8f8f;
          border: 3px solid #1f1f1f;
          border-radius: 100%;
        }

        *::-webkit-scrollbar-thumb:hover {
          background-color: #3f3f46;
        }
        
        *::-webkit-scrollbar-corner {
          background-color: #1f1f1f;
        }
      `,
      ),
    ]);
  }

  private createHistoryStream(): WritableStream<string> {
    this.wipeContents();
    this.setAbsoluteCursorPosition(0, 0);
    return new WritableStream<string>({
      write: (data: string) => super.interpret(data),
      close: () => {
        this.io.flush();
        this.scrollPort_.resize();
      },
    });
  }

  public close(): void {
    this.socket?.close();
  }

  metadataMatches(panelType: PanelType, port?: number, uart?: string) {
    return (
      this.metadata.panelType == panelType &&
      this.metadata.port == port &&
      this.metadata.uart == uart
    );
  }
}
