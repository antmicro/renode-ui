<script lang="ts">
  import './shared.css';
  import { fade } from 'svelte/transition';
  import RenodeIcon from './RenodeIcon.svelte';

  const { loadingMessage = 'Starting Renode' } = $props();
</script>

<div class="loader" in:fade>
  <div class="logo-container">
    <svg class="progress-ring">
      <circle class="progress-ring__circle" cx="80" cy="80" r="70"></circle>
    </svg>
    <RenodeIcon />
  </div>
  <div>
    <div class="loading-text">Renode is loading...</div>
  </div>
  <div class="status-container">
    <div class="status-dot"></div>
    <div class="status-text">
      {loadingMessage}<span class="animated-dots"></span>
    </div>
  </div>
</div>

<style>
  .progress-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    animation: spin 3s linear infinite;
  }

  .progress-ring__circle {
    cx: 80;
    cy: 80;
    r: 70;
    stroke: var(--fill-default);
    fill: transparent;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 440;
    transform-origin: 50% 50%;
    animation: progress-stroke 3s ease-in-out infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes progress-stroke {
    0% {
      stroke-dashoffset: 440;
      stroke: var(--fill-default);
    }
    50% {
      stroke-dashoffset: 0;
      stroke: #00bfa5;
    }
    100% {
      stroke-dashoffset: -440;
      stroke: var(--fill-default);
    }
  }

  .status-container {
    display: flex;
    align-items: center;
    background-color: rgba(39, 39, 42, 0.4);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    border: 1px solid var(--borderGray-default);
    overflow: hidden;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--fill-default);
    margin-right: 12px;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.5;
    }
  }

  .status-text {
    font-size: 0.875rem;
    color: #a1a1a1;
    white-space: nowrap;
  }

  .animated-dots {
    display: inline-block;
    width: 20px;
    text-align: left;
  }

  .animated-dots::after {
    content: '';
    animation: dots 2s infinite;
  }

  @keyframes dots {
    0%,
    25% {
      content: '.';
    }
    50% {
      content: '..';
    }
    75%,
    100% {
      content: '...';
    }
  }
</style>
