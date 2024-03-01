<script>
  import {
    Button,
    Modal,
    notifications,
    ModalContent,
    Layout,
  } from "@budibase/bbui"
  import { API } from "api"
  import analytics, { Events, EventSource } from "analytics"
  import { store } from "builderStore"
  import { ProgressCircle } from "@budibase/bbui"

  let feedbackModal
  let compactModal
  let asyncModal
  let compactCompleteModal

  let timeElapsed

  let compacted

  export let onOk

  async function compactDBs() {
    try {
      //In Progress
      asyncModal.show()
      compactModal.hide()

      //Set time elapsed
      timeElapsed = new Date().getTime()

      //Compact DBs
      compacted = await API.compactAppDB()

      if (typeof onOk === "function") {
        await onOk()
      }

      //Time taken in minutes (rounded off)
      timeElapsed = Math.round((new Date().getTime() - timeElapsed) / 60000)

      //Request completed
      asyncModal.hide()
      compactCompleteModal.show()
    } catch (error) {
      analytics.captureException(error)
      notifications.error("Error when compacting app, maybe it take too long time. But it is still running in background of CouchDB, please check it later.")
      asyncModal.hide()
    }
  }
</script>

<Button cta on:click={compactModal.show}>Compact DBs</Button>
<Modal bind:this={feedbackModal}>
  <ModalContent
    title="Enjoying Budibase?"
    size="L"
    showConfirmButton={false}
    showCancelButton={false}
  />
</Modal>

<Modal bind:this={compactModal}>
  <ModalContent
    title="Compact Databases"
    confirmText="Compact"
    onConfirm={compactDBs}
    dataCy={"compact-db-modal"}
  >
    <span
      >The compaction operation is a way to reduce disk space usage by removing unused and old data from databases or view index files. This task was be moved from Deployment to separate task to reduce deployment time, so we need doing this task manually and regularly to keep databases clean and lightweight, this task may take up to an hour.</span
    >
  </ModalContent>
</Modal>

<!-- Compact in progress -->
<Modal bind:this={asyncModal}>
  <ModalContent
    showCancelButton={false}
    showConfirmButton={false}
    showCloseIcon={false}
  >
    <Layout justifyItems="center">
      <ProgressCircle size="XL" />
    </Layout>
  </ModalContent>
</Modal>

<!-- Compact complete -->
<Modal bind:this={compactCompleteModal}>
  <ModalContent
    confirmText="Done"
    dataCy="deploy-app-success-modal"
  >
    <div slot="header" class="app-compacted-header">
      <svg
        width="26px"
        height="26px"
        class="spectrum-Icon success-icon"
        focusable="false"
      >
        <use xlink:href="#spectrum-icon-18-GlobeCheck" />
      </svg>
      <span class="app-compacted-header-text">Databases Compacted!</span>
    </div>
    <span
      >Time taken for compact DBs: {timeElapsed} minutes</span
    >
  </ModalContent>
</Modal>

<style>
  .app-compacted-header {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .success-icon {
    color: var(--spectrum-global-color-green-600);
  }
  .app-compacted-header .app-compacted-header-text {
    padding-left: var(--spacing-l);
  }
</style>
