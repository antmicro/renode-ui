<script lang="ts">
  import { type PointerEventHandler } from 'svelte/elements';

  interface Props {
    headerLeft: string;
    subHeaderLeft: string;
    headerRight: string;
    value: number;
    minimumValue: number;
    maximumValue: number;
    forceDisplayMode?: DisplayMode;
    format?: (currentValue: number) => string;
    valueChanged?: (currentValue: number) => void | Promise<void>;
  }

  type DisplayMode = 'absolute' | 'percentage';

  const {
    headerLeft,
    subHeaderLeft,
    headerRight,
    value,
    minimumValue,
    maximumValue,
    forceDisplayMode,
    format,
    valueChanged,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let displayMode: DisplayMode = $state(forceDisplayMode ?? 'absolute');
  let draft: number | null = $state(null);
  let leftLabelWidth: number = $state(0);
  let rightLabelWidth: number = $state(0);
  let gesture = 0;

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const currentValue = $derived(draft ?? clamp(value, minimumValue, maximumValue));
  const percentage = $derived(
    (100 * (currentValue - minimumValue)) / (maximumValue - minimumValue),
  );

  const display = (v: number, percent: number, fallback = `${v}`) =>
    displayMode === 'percentage' ? `${percent.toFixed(0)} %` : (format?.(v) ?? fallback);

  const moveTo = (elem: HTMLElement, pointerX: number) => {
    const { left, width } = elem.getBoundingClientRect();
    const fraction = clamp((pointerX - left) / width, 0, 1);
    draft = minimumValue + fraction * (maximumValue - minimumValue);
  };

  const onpointerdown: PointerEventHandler<HTMLElement> = (event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture++;
    moveTo(event.currentTarget, event.clientX);
  };

  const onpointermove: PointerEventHandler<HTMLElement> = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      moveTo(event.currentTarget, event.clientX);
    }
  };

  const onlostpointercapture = async () => {
    if (draft === null) return;

    const id = gesture;
    try {
      await valueChanged?.(draft);
    } finally {
      if (id === gesture) {
        draft = null;
      }
    }
  };

  const toggleDisplay = () => {
    if (forceDisplayMode) return;
    displayMode = displayMode == 'absolute' ? 'percentage' : 'absolute';
  };
</script>

<div class="slider-container">
  <div class="slider-header">
    <div class="slider-header-left">{headerLeft} <span class="muted">• {subHeaderLeft}</span></div>
    <div class="slider-header-right">{headerRight}</div>
  </div>
  <div class="slider-content" style:--progress="{percentage}%">
    <div
      class="slider-value"
      style:--left-boundary={`${leftLabelWidth / 2}px`}
      style:--right-boundary={`${rightLabelWidth / 2}px`}
    >
      {display(currentValue, percentage, currentValue.toFixed(2))}
    </div>
    <div class="slider-element" role="none" {onpointerdown} {onpointermove} {onlostpointercapture}>
      <div
        class="slider-knob"
        role="slider"
        aria-valuemin={minimumValue}
        aria-valuemax={maximumValue}
        aria-valuenow={currentValue}
        tabindex="0"
      ></div>
    </div>
    <div class="slider-labels">
      <button onclick={toggleDisplay} bind:clientWidth={leftLabelWidth}>
        {display(minimumValue, 0)}
      </button>
      <button onclick={toggleDisplay} bind:clientWidth={rightLabelWidth}>
        {display(maximumValue, 100)}
      </button>
    </div>
  </div>
</div>

<style>
  button {
    all: unset;
  }

  .muted {
    color: var(--ds-border-active);
  }

  .slider-container {
    font-family: var(--ds-font-family-sans);
    font-weight: 400;
    display: flex;
    flex-direction: column;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 400;
    width: 100%;
  }

  .slider-header-left {
    color: var(--ds-foreground-muted);
  }

  .slider-header-right {
    color: var(--ds-foreground-muted-green);
    font-family: var(--ds-font-family-mono);
    font-weight: 400;
  }

  .slider-content {
    color: var(--ds-foreground-muted-green);
    font-family: var(--ds-font-family-mono);
    font-size: 40px;
    font-weight: 400;
  }

  .slider-value {
    position: relative;
    width: fit-content;
    pointer-events: none;
    left: clamp(var(--left-boundary), var(--progress), 100% - var(--right-boundary));
    transform: translateX(-50%) translateY(50%);
    white-space: nowrap;
    text-align: center;
    font-size: 12px;
    color: var(--ds-emphasis-blue);
  }

  .slider-element {
    touch-action: none;
    margin: 18px 0;
    height: 8px;
    width: 100%;
    border: 1px solid var(--ds-background-secondary);
    border-radius: 10px;
    background: linear-gradient(
      to right,
      var(--ds-emphasis-blue) var(--progress),
      var(--ds-surface-active) var(--progress)
    );
  }

  .slider-knob {
    position: relative;

    top: -8px;
    left: var(--progress);
    border: 3px solid var(--ds-emphasis-blue);
    border-radius: 50%;
    transform: translateX(-50%);

    width: 22px;
    height: 22px;
    background: radial-gradient(
      circle,
      var(--ds-emphasis-blue) 0,
      var(--ds-emphasis-blue) 4px,
      var(--ds-background-secondary) 5px,
      var(--ds-background-secondary) 100%
    );
    cursor: grab;
  }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    color: var(--ds-emphasis);
    font-size: 12px;
    margin-top: 12px;
  }
</style>
