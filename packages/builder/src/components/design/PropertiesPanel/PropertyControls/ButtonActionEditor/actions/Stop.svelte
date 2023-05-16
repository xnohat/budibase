<script>
  import { Select, Body } from "@budibase/bbui"
  import { onMount } from "svelte"

  onMount(() => {
  })
</script>

<div class="root">
  <Body size="S">
    Stop actions from being executed from here.
  </Body>
</div>

<style>
  .root {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-l);
    justify-content: flex-start;
    align-items: stretch;
    max-width: 400px;
    margin: 0 auto;
  }
</style>
