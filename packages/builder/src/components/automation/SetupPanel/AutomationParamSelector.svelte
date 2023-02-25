<script>
  import { createEventDispatcher } from "svelte"
  import { queries } from "stores/backend"
  import { automationStore } from "builderStore"
  import { Select } from "@budibase/bbui"
  import DrawerBindableInput from "../../common/bindings/DrawerBindableInput.svelte"
  import AutomationBindingPanel from "../../common/bindings/ServerBindingPanel.svelte"

  const dispatch = createEventDispatcher()

  export let value
  export let bindings

  const onChangeQuery = e => {
    value.automationId = e.detail
    dispatch("change", value)
  }

  const onChange = (e, field) => {
    value[field.name] = e.detail
    dispatch("change", value)
  }

  $: automations = $automationStore.automations
    .filter(a => a.definition.trigger?.stepId === "APP")
    .map(automation => {
      const parameters = Object.entries(
        automation.definition.trigger.inputs.fields || {}
      ).map(([name, type]) => ({ name, default:"" }))

      return {
        name: automation.name,
        _id: automation._id,
        parameters,
      }
    })

  $: automation = automations.find(automation => automation._id === value?.automationId)
  $: parameters = automation?.parameters ?? []
  // Ensure any nullish queryId values get set to empty string so
  // that the select works
  $: if (value?.automationId == null) value = { automationId: "" }
</script>

<div class="block-field">
  <Select
    label="Query"
    on:change={onChangeQuery}
    value={value.automationId}
    options={automations}
    getOptionValue={automationId => automationId._id}
    getOptionLabel={automationId => automationId.name}
  />
</div>

{#if parameters.length}
  <div class="schema-fields">
    {#each parameters as field}
      <DrawerBindableInput
        panel={AutomationBindingPanel}
        extraThin
        value={value[field.name]}
        on:change={e => onChange(e, field)}
        label={field.name}
        type="string"
        {bindings}
        fillWidth={true}
      />
    {/each}
  </div>
{/if}

<style>
  .schema-fields {
    display: grid;
    grid-gap: var(--spacing-xl);
    margin-top: var(--spacing-xl);
  }
  .schema-fields :global(label) {
    text-transform: capitalize;
  }
</style>
