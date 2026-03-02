import type {
  GroupPanelPartInitParameters,
  ITabRenderer,
  PanelUpdateEvent,
  Parameters,
} from 'dockview-core';
import { mount, unmount } from 'svelte';
import Header from '../tab/Header.svelte';
import HeaderProps from '../tab/Header.svelte';

export class Tab implements ITabRenderer {
  private readonly _element: HTMLElement;
  private mountHandle: Record<string, any>;
  private currentProps: HeaderProps;

  get element(): HTMLElement {
    return this._element;
  }

  constructor() {
    this.mountHandle = {};
    this.currentProps = {};
    this._element = document.createElement('div');
  }

  init(parameters: GroupPanelPartInitParameters): void {
    this.element.setAttribute('data-test-id', `${parameters.params.panelType}-btn`);
    this.currentProps = { api: parameters.api, panelType: parameters.params.panelType };

    this.mountHandle = mount(Header, {
      target: this.element,
      props: this.currentProps,
    });
  }

  update(event: PanelUpdateEvent<Parameters>): void {
    this.currentProps = { ...this.currentProps, ...event.params };

    // Manually remount component
    unmount(this.mountHandle).then(() => {
      this.mountHandle = mount(Header, {
        target: this.element,
        props: this.currentProps,
      });
    });
  }

  dispose(): void {
    unmount(this.mountHandle);
  }
}
