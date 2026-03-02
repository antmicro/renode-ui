import type {
  GroupPanelPartInitParameters,
  IContentRenderer,
  PanelUpdateEvent,
  Parameters,
} from 'dockview-core';
import { mount, unmount } from 'svelte';
import PanelSwitcher from './PanelSwitcher.svelte';

export class Panel implements IContentRenderer {
  private readonly _element: HTMLElement;
  private mountHandle: Record<string, any>;
  private currentProps: Record<string, any>;

  get element(): HTMLElement {
    return this._element;
  }

  constructor() {
    this.mountHandle = {};
    this.currentProps = {};
    this._element = document.createElement('div');
    this._element.style.height = '100%';
    this._element.style.width = '100%';
  }

  init(parameters: GroupPanelPartInitParameters): void {
    const { panelType, port, predefinedMachine, predefinedUart } = parameters.params;

    this.currentProps = {
      panelType,
      port,
      api: parameters.api,
      predefinedMachine,
      predefinedUart,
    };

    this.mountHandle = mount(PanelSwitcher, {
      target: this._element,
      props: this.currentProps,
      panelType: undefined,
    });
  }

  update(event: PanelUpdateEvent<Parameters>): void {
    this.currentProps = { ...this.currentProps, ...event.params };

    // Manually remount component
    unmount(this.mountHandle).then(() => {
      this.mountHandle = mount(PanelSwitcher, {
        target: this.element,
        props: this.currentProps,
      });
    });
  }

  dispose(): void {
    unmount(this.mountHandle);
    this.element.remove();
  }
}
