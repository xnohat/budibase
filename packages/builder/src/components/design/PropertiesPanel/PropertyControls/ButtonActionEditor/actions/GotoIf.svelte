<script>
  import { Select, Body, Label } from "@budibase/bbui"
  import { onMount } from "svelte"
  import DrawerBindableInput from "components/common/bindings/DrawerBindableInput.svelte"
  export let parameters
  export let bindings

  const operatorOptions = [
    {
      label: "Equals",
      value: "equal",
    },
    {
      label: "Not equals",
      value: "notEqual",
    },
    {
      label: "Greater than",
      value: "greaterThan",
    },
    {
      label: "Less than",
      value: "lessThan",
    },
    {
      label: "Greater than or equal to",
      value: "greaterThanOrEqual",
    },
    {
      label: "Less than or equal to",
      value: "lessThanOrEqual",
    }
  ]

  onMount(() => {
    if (!parameters.operator) {
      parameters.operator = "equal"
    }
    if (!parameters.maxloop) {
      parameters.maxloop = 100
    }
  })
</script>

<div class="root">
  <Body size="S">
    Configure a condition to be evaluated which can goto other actions step.
  </Body>
  <Label small>Value</Label>
  <DrawerBindableInput
    placeholder="Value"
    value={parameters.value}
    on:change={e => (parameters.value = e.detail)}
    {bindings}
  />
  <Label small>Operator</Label>
  <Select
    bind:value={parameters.operator}
    options={operatorOptions}
    placeholder={null}
  />
  <Label small>Reference value</Label>
  <DrawerBindableInput
    placeholder="Reference value"
    bind:value={parameters.referenceValue}
    on:change={e => (parameters.referenceValue = e.detail)}
    {bindings}
  />
  <Label small>Goto Step Number</Label>
  <DrawerBindableInput
    placeholder="Goto Step Number"
    bind:value={parameters.gotostep}
    on:change={e => (parameters.gotostep = e.detail)}
    {bindings}
  />
  <Label small>Max Loop</Label>
  <DrawerBindableInput
    placeholder="Max Loop iterations to prevent infinite goto loop"
    bind:value={parameters.maxloop}
    on:change={e => (parameters.maxloop = e.detail)}
    {bindings}
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
