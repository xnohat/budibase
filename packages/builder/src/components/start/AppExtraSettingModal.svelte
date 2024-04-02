<script>
  import { ModalContent, Toggle, Body } from "@budibase/bbui"
  import { apps } from "stores/portal"

  export let app
  let disable_automation_logs = app.disable_automation_logs || false

  $: title = "App Extra Settings"
  $: confirmText = "Save"

  const save = async () => {
    try {
      await apps.update(app.instance._id, {
        disable_automation_logs: disable_automation_logs,
      })
    } catch (error) {
      notifications.error("Error updating extra settings to app_metadata")
    }
  }
</script>

<ModalContent {title} {confirmText} onConfirm={() => save()}>
  <Body
    >App Extra Settings.</Body
  >
  <Toggle text="Disable Automation Logs" bind:value={disable_automation_logs} />
</ModalContent>
