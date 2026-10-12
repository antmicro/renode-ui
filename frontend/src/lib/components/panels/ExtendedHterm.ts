import { hterm, lib } from '../../thirdparty/hterm';
import type { PanelType, Socket, SocketInitializerFn, SocketMessageData } from '$lib/store.svelte';

interface ConstructorArgs {
  profileId: string;
  interactible: boolean;
  metadata: { panelType: PanelType; port?: number; uart?: string };
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

type SocketConsoleListener = (chunk: string) => void;

const SOCKET_CONSOLE_SCROLLBACK = 5000;

export class SocketConsole {
  private ws?: Socket;
  private decoder: UTF8StreamDecoder;
  private lines: string[];
  private incompleteLine: string;
  private callbacks: Record<string, SocketConsoleListener>;

  constructor(url: string, name: string, initializer: SocketInitializerFn) {
    this.decoder = new UTF8StreamDecoder();

    this.incompleteLine = '';
    this.lines = [];
    this.callbacks = {};

    initializer(url, name).then((ws) => {
      this.ws = ws as WebSocket;
      this.ws!.addEventListener('message', this.onMessage.bind(this));
    });
  }

  public get isValid(): boolean {
    return this.ws?.readyState == WebSocket.OPEN;
  }

  public send(message: string): void {
    this.ws?.send(message);
  }

  public get scrollbackBuffer(): string[] {
    return [...this.lines, this.incompleteLine];
  }

  public register(listener: SocketConsoleListener): string {
    let uuid = crypto.randomUUID();
    this.callbacks[uuid] = listener;
    return uuid;
  }

  public unregister(uuid: string) {
    console.assert(uuid in this.callbacks, 'tried to unregister non-existing callback');
    delete this.callbacks[uuid];
  }

  private onMessage(event: { data: SocketMessageData }) {
    let chunk;

    if (typeof event.data == 'string') {
      chunk = event.data;
    } else if (event.data instanceof ArrayBuffer) {
      chunk = this.decoder.decode(event.data);
    } else {
      throw new Error(
        `Unexpected type of message. Expected string or ArrayBuffer. Got ${(event.data as object).constructor?.name}`,
      );
    }

    let lines = chunk.split('\n');
    this.incompleteLine += lines[0];
    if (lines.length > 1) {
      this.ingestLine(this.incompleteLine);
      this.incompleteLine = lines.pop() as string;
    }

    for (let i = 1; i < lines.length - 1; ++i) {
      this.ingestLine(lines[i]);
    }

    Object.values(this.callbacks).forEach((callback) => {
      callback.call(null, chunk);
    });
  }

  private ingestLine(line: string) {
    this.lines.push(line + '\n');
    if (this.lines.length > SOCKET_CONSOLE_SCROLLBACK) {
      this.lines.shift();
    }
  }
}

export class ExtendedHterm extends hterm.Terminal {
  private interactible: boolean;
  private onReady?: () => void;
  private onResize?: (width: number, height: number) => void;
  private onFocus?: () => void;
  private currentResize?: number;
  private console?: SocketConsole;
  private identifier?: string;

  public metadata: { panelType: PanelType; port?: number; uart?: string };

  constructor({ profileId, interactible, metadata, onReady, onResize, onFocus }: ConstructorArgs) {
    hterm.messageManager?.disable();
    super({ profileId, storage: new lib.Storage.Local(), opts: { autofocus: false } });
    this.interactible = interactible;
    this.onReady = onReady;
    this.onResize = onResize;
    this.onFocus = onFocus;
    this.metadata = metadata;
  }

  public async install(node: HTMLElement, con: SocketConsole): Promise<void> {
    this.console = con;

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

    this.rewriteScrollback();
    this.identifier = this.console?.register(this.interpret.bind(this));

    console.assert(this.console !== undefined, 'console is not initialized');

    this.installKeyboard();

    this.scrollEnd();
    this.onReady?.();
    this.scrollPort_.loadingBar?.remove();
  }

  private sendToWebsocket(message: string): void {
    if (!this.interactible) {
      return;
    }

    this.console?.send(message);
    this.scrollEnd();
  }

  public rewriteScrollback(): void {
    this.wipeContents();
    this.setAbsoluteCursorPosition(0, 0);

    this.console?.scrollbackBuffer.forEach(this.interpret.bind(this));

    this.io.flush();
    this.scrollPort_.resize();
  }

  public async horizontalResize(width: number, height: number): Promise<void> {
    if (this.currentResize) {
      clearTimeout(this.currentResize);
    }

    this.currentResize = window.setTimeout(async () => {
      try {
        this.onResize?.(width, height);
        this.rewriteScrollback();
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

  public close(): void {
    if (this.identifier !== null) {
      this.console!.unregister(this.identifier!);
      this.console = this.identifier = undefined;
    }
  }

  public onFocusChange_(focused: boolean): void {
    super.onFocusChange_(focused);
    if (focused) {
      this.onFocus?.();
    }
  }

  public onKeyboardActivity_(event: KeyboardEvent): void {
    let newEvent = new CustomEvent('hterm-keydown', {
      detail: event,
      cancelable: true,
    });

    if (!document.dispatchEvent(newEvent)) {
      event.preventDefault();
    }
  }

  metadataMatches(panelType: PanelType, port?: number, uart?: string) {
    return (
      this.metadata.panelType == panelType &&
      this.metadata.port == port &&
      this.metadata.uart == uart
    );
  }
}
