<script>
  import { Select } from "@budibase/bbui"
  import { automationStore } from "builderStore"
  export let value
</script>

<div class="block-field">
  <Select on:change bind:value secondary extraThin>
    <option value="">Choose an option</option>
    {#each $automationStore.automations as automation}
      <option value={automation._id}>{automation.name}</option>
    {/each}
  </Select>
</div>
