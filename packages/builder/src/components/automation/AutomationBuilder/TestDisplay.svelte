<script>
  import { Icon, Divider, Tabs, Tab, TextArea, Label } from "@budibase/bbui"
  import FlowItemHeader from "./FlowChart/FlowItemHeader.svelte"
  import { ActionStepID } from "constants/backend/automations"

  export let automation
  export let testResults
  export let width = "400px"

  let showParameters
  let blocks

  function prepTestResults(results) {
    return results?.steps.filter(x => x.stepId !== ActionStepID.LOOP || [])
  }

  function textArea(results, message) {
    if (!results) {
      return message
    }
    return JSON.stringify(results, null, 2)
  }

  $: filteredResults = prepTestResults(testResults)

  $: {
    blocks = []
    if (automation) {
      // add trigger block to the blocks
      if(testResults && testResults.trigger){
        blocks.push({
          icon: automation.definition.trigger.icon,
          id: 0,
          inputs: testResults.trigger.inputs,
          name: automation.definition.trigger.name,
          outputs: testResults.trigger.outputs,
          stepId: testResults.trigger.stepId
        })
      }

      // add steps block to blocks
      if(filteredResults){
        let mapped_steps = filteredResults.map((step, index) => {
          if(index > 0){ //skip trigger block
            let matched_definition_step = automation.definition.steps.find(r => r.id == step.id)
            return {
              icon: matched_definition_step?.icon,
              id: index + 1,
              inputs: step.inputs,
              name: matched_definition_step?.name,
              outputs: step.outputs,
              stepId: step.stepId
            }
          }
        })
        mapped_steps.shift() // remove trigger block from mapped_steps
        blocks = blocks.concat(mapped_steps)
      }
    } else if (filteredResults) {
      blocks = filteredResults || []
      // make sure there is an ID for each block being displayed
      let count = 0
      for (let block of blocks) {
        block.id = count++
      }
    }
  }
</script>

<div class="container">
  {#each blocks as block, idx}
    <div class="block" style={width ? `width: ${width}` : ""}>
      {#if block.stepId !== ActionStepID.LOOP}
        <FlowItemHeader
          showTestStatus={true}
          bind:showParameters
          {block}
          isTrigger={idx === 0}
          testResult={filteredResults?.[idx]}
        />
        {#if showParameters && showParameters[block.id]}
          <Divider noMargin />
          {#if filteredResults?.[idx]?.outputs.iterations}
            <div style="display: flex; padding: 10px 10px 0px 12px;">
              <Icon name="Reuse" />
              <div style="margin-left: 10px;">
                <Label>
                  This loop ran {filteredResults?.[idx]?.outputs.iterations} times.</Label
                >
              </div>
            </div>
          {/if}

          <div class="tabs">
            <Tabs noHorizPadding selected="Input">
              <Tab title="Input">
                <TextArea
                  minHeight="80px"
                  disabled
                  value={textArea(filteredResults?.[idx]?.inputs, "No input")}
                />
              </Tab>
              <Tab title="Output">
                <TextArea
                  minHeight="100px"
                  disabled
                  value={textArea(filteredResults?.[idx]?.outputs, "No output")}
                />
              </Tab>
            </Tabs>
          </div>
        {/if}
      {/if}
    </div>
    {#if blocks.length - 1 !== idx}
      <div class="separator" />
    {/if}
  {/each}
</div>

<style>
  .container {
    padding: 0 30px 0 30px;
    height: 100%;
  }

  .tabs {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    position: relative;
    flex: 1 1 auto;
    padding: 0 var(--spacing-xl) var(--spacing-xl) var(--spacing-xl);
  }

  .block {
    display: inline-block;
    width: 400px;
    height: auto;
    font-size: 16px;
    background-color: var(--background);
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 4px 4px 4px 4px;
  }

  .separator {
    width: 1px;
    height: 40px;
    border-left: 1px dashed var(--grey-4);
    color: var(--grey-4);
    /* center horizontally */
    text-align: center;
    margin-left: 50%;
  }
</style>
