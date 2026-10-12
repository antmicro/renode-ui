export interface Keybinding {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
  context?: string;
}

type KeybindingCanonical = string & { readonly _keybinding_canonical_: never };

class KeyboardManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyboardManagerError';
  }
}

export function parseKeybinding(binding: string, context?: string): Keybinding | undefined {
  const components = binding.toLowerCase().split('-');
  if (components.length === 0) {
    return;
  }

  const keybinding: Keybinding = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: components.pop()!,
    context,
  };

  for (let part of components) {
    switch (part) {
      case 'ctrl':
        keybinding.ctrl = true;
        break;
      case 'alt':
        keybinding.alt = true;
        break;
      case 'shift':
        keybinding.shift = true;
        break;
      case 'meta':
        keybinding.meta = true;
        break;
      default:
        return;
    }
  }

  return keybinding;
}

export function getCanonicalKeybinding(keybinding: Keybinding): KeybindingCanonical {
  const parts = [];
  if (keybinding.ctrl) {
    parts.push('ctrl');
  }
  if (keybinding.shift) {
    parts.push('shift');
  }
  if (keybinding.alt) {
    parts.push('alt');
  }
  if (keybinding.meta) {
    parts.push('meta');
  }
  if (keybinding.key) {
    parts.push(keybinding.key);
  }

  let binding = parts.join('-');
  if (keybinding.context !== undefined) {
    binding = `${binding}#${keybinding.context}`;
  }

  return binding as KeybindingCanonical;
}

export class KeyboardManager {
  public currentKey: Keybinding = $state({
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: '',
  });
  public currentContext: string | undefined = $state();
  private actionHandler: (data: any) => void;
  private bindings: Record<KeybindingCanonical, any> = {};

  constructor(actionHandler: (data: any) => void) {
    this.actionHandler = actionHandler;

    document.addEventListener('keydown', (event) => this.onKeyDown(event), true);
    document.addEventListener(
      'hterm-keydown',
      (event: CustomEventInit<KeyboardEvent>) => this.onKeyDown(event.detail!),
      true,
    );

    this.registerKeybinding('ctrl-enter', 'node.split');
    this.registerKeybinding('ctrl-backspace', 'node.close');

    this.registerKeybinding('ctrl-arrowup', 'node.focus direction:above');
    this.registerKeybinding('ctrl-arrowdown', 'node.focus direction:below');
    this.registerKeybinding('ctrl-arrowleft', 'node.focus direction:left');
    this.registerKeybinding('ctrl-arrowright', 'node.focus direction:right');

    this.registerKeybinding('ctrl-shift-arrowup', 'node.swap direction:above');
    this.registerKeybinding('ctrl-shift-arrowdown', 'node.swap direction:below');
    this.registerKeybinding('ctrl-shift-arrowleft', 'node.swap direction:left');
    this.registerKeybinding('ctrl-shift-arrowright', 'node.swap direction:right');
  }

  public registerKeybinding(binding: string, data: any, context?: string) {
    const keybinding = parseKeybinding(binding, context);
    if (keybinding === undefined) {
      throw new KeyboardManagerError(`'${binding}' is an invalid keybinding`);
    }

    let canonical = getCanonicalKeybinding(keybinding);
    if (this.bindings[canonical] !== undefined) {
      throw new KeyboardManagerError(`Keybinding for '${binding}' is already registered`);
    }

    this.bindings[canonical] = data;
  }

  public unregisterKeybinding(binding: string, context: string | undefined) {
    const keybinding = parseKeybinding(binding, context);
    if (keybinding === undefined) {
      throw new KeyboardManagerError(`'${binding}' is an invalid keybinding`);
    }

    let canonical = getCanonicalKeybinding(keybinding);
    if (this.bindings[canonical] === undefined) {
      throw new KeyboardManagerError(`Keybinding for '${binding}' doesn't exist`);
    }

    delete this.bindings[canonical];
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }

    this.currentKey = {
      ...this.currentKey,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
      key: event.key.toLowerCase(),
    };

    let withContext = getCanonicalKeybinding({ ...this.currentKey, context: this.currentContext });
    if (this.bindings[withContext] !== undefined) {
      this.actionHandler?.(this.bindings[withContext]);
      event.preventDefault();
    }

    let withoutContext = getCanonicalKeybinding({ ...this.currentKey, context: undefined });
    if (this.bindings[withoutContext] !== undefined) {
      this.actionHandler?.(this.bindings[withoutContext]);
      event.preventDefault();
    }
  }
}
