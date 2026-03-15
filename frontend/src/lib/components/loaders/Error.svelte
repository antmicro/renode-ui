<script lang="ts">
  import './shared.css';
  import RenodeIcon from './RenodeIcon.svelte';

  interface Props {
    error: string;
    onRetry: () => Promise<void>;
  }

  const { error, onRetry }: Props = $props();
</script>

<div class="loader">
  <div class="logo-container">
    <RenodeIcon />
  </div>
  <div>
    <div class="loading-text">Startup error</div>
    <div class="loading-err-text">{error}</div>
  </div>
  <button class="reload-btn" onclick={onRetry}>Retry</button>
</div>

<style>
  .loading-err-text {
    font-size: 0.9rem;
    margin-bottom: 1rem;
    text-align: center;
  }

  .reload-btn:hover {
    background-color: var(--borderGray-default);
    color: var(--textPrimary);
    border-color: #3f3f46;
  }

  .reload-btn {
    background-color: rgba(39, 39, 42, 0.4);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    border: 1px solid var(--borderGray-default);
    overflow: hidden;
    color: var(--textMuted);
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;
  }
</style>
