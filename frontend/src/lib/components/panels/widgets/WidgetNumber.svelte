<script lang="ts">
  interface Props {
    headerLeft: string;
    subHeaderLeft: string;
    headerRight: string;
    value: number;
    unit: string;
    precision?: number;
  }

  const {
    headerLeft,
    subHeaderLeft,
    headerRight,
    value,
    unit = '',
    precision = 2,
  }: Props = $props();
</script>

<div class="number-container">
  <div class="number-header">
    <div class="number-header-left">{headerLeft} <span class="muted">• {subHeaderLeft}</span></div>
    <div class="number-header-right">{headerRight}</div>
  </div>
  <div class="number-content">
    {value.toFixed(precision)}{unit}
  </div>
</div>

<style>
  .muted {
    color: var(--ds-border-active);
  }

  .number-container {
    font-family: var(--ds-font-family-sans);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .number-header {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 400;
    width: 100%;
  }

  .number-header-left {
    color: var(--ds-foreground-muted);
  }

  .number-header-right {
    color: var(--ds-foreground-muted-green);
    font-family: var(--ds-font-family-mono);
  }

  .number-content {
    color: var(--ds-foreground-muted-green);
    font-family: var(--ds-font-family-mono);
    font-size: 60px;
    font-weight: 400;
    height: min-content;
    line-height: 1;
  }
</style>
