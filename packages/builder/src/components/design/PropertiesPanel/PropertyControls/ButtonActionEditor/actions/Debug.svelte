<script>
  import { Select, Body } from "@budibase/bbui"
  import { onMount } from "svelte"
  export let parameters

  const debugOptions = [
    {
      label: "true",
      value: "true",
    },
    {
      label: "false",
      value: "false",
    },
  ]

  onMount(() => {
    if (!parameters.debug) {
      parameters.debug = "false"
    }
  })
</script>

<div class="root">
  <Body size="S">
    Debug mode, print actions executions debug information 
    to browser console. This action must place at top of actions list.
  </Body>
  <Select
    bind:value={parameters.debug}
    options={debugOptions}
    placeholder={null}
  />
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
