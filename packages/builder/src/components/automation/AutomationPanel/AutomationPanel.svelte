<script>
  import AutomationList from "./AutomationList.svelte"
  import CreateAutomationModal from "./CreateAutomationModal.svelte"
  import { Icon, Modal, Tabs, Tab } from "@budibase/bbui"
  import ImportAutomationModal from "components/automation/AutomationPanel/ImportAutomationModal.svelte"

  export let modal
  export let webhookModal

  let importAutomationDialog
</script>

<div class="nav">
  <Tabs selected="Automations">
    <Tab title="Automations">
      <AutomationList />
      <Modal bind:this={modal}>
        <CreateAutomationModal {webhookModal} />
      </Modal>
    </Tab>
  </Tabs>
  <div class="import-button">
    <Icon hoverable name="BoxImport" on:click={importAutomationDialog.show} />
  </div>
  <div class="add-button">
    <Icon hoverable name="AddCircle" on:click={modal.show} />
  </div>
</div>

<ImportAutomationModal bind:this={importAutomationDialog} />

<style>
  .add-button {
    position: absolute;
    top: var(--spacing-l);
    right: var(--spacing-xl);
  }
  .import-button {
    position: absolute;
    top: var(--spacing-l);
    right: 3.5rem;
  }
  .nav {
    overflow-y: auto;
    background: var(--background);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    position: relative;
    border-right: var(--border-light);
    padding-bottom: 60px;
  }
</style>
