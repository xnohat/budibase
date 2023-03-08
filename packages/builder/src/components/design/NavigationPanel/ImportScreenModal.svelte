<script>
    import { goto } from "@roxi/routify"
    import { get } from "svelte/store"
    import { store, allScreens, selectedAccessRole } from "builderStore"
    import { database } from "stores/backend"
    import { notifications, Helpers } from "@budibase/bbui"
    import { Input, ModalContent, Modal, Body } from "@budibase/bbui"
    import sanitizeUrl from "builderStore/store/screenTemplates/utils/sanitizeUrl"
    import { makeComponentUnique } from "builderStore/componentUtils"

    const BYTES_IN_MB = 1000000
    const FILE_SIZE_LIMIT = BYTES_IN_MB * 5

    let modal
    let screenFromFileString = undefined
    let hasValidated = false
    let routeError
    let touched = false

    export let screenUrl
    //export let automation
    export let files = []
    export let dataImport = {}
    export let onCancel = undefined

    const appPrefix = "/app"

    $: appUrl = screenUrl
    ? `${window.location.origin}${appPrefix}${screenUrl}`
    : `${window.location.origin}${appPrefix}`

    export const show = () => {
      screenUrl = ""
      modal.show()
    }
    export const hide = () => {
      screenUrl = ""
      files = []
      modal.hide()
    }

    async function importScreen() {
        // Create a dupe and ensure it is unique
        delete dataImport._id
        delete dataImport._rev
        makeComponentUnique(dataImport.props)

        // Attach the new name and URL
        dataImport.routing.route = sanitizeUrl(screenUrl)

        try {
            // Create the screen
            await store.actions.screens.save(dataImport)
            notifications.success(`File ${files[0].name} imported to screen ${screenUrl} successfully`)
            hide()
        } catch (error) {
            notifications.error("Error importing screen")
            console.log(error)
        }
    }

    async function handleFile(evt) {
        const fileArray = Array.from(evt.target.files)
        if (fileArray.some(file => file.size >= FILE_SIZE_LIMIT)) {
            notifications.error(
                `Files cannot exceed ${
                FILE_SIZE_LIMIT / BYTES_IN_MB
                }MB. Please try again with smaller files.`
            )
            return
        }

        // Read uploaded JSON file as plain text
        let reader = new FileReader()
        reader.addEventListener("load", function (e) {
            screenFromFileString = e.target.result
            files = fileArray
            JSONValidate(screenFromFileString)
        })
        reader.readAsText(fileArray[0])
    }

    function JSONValidate(str) {
        try {
            dataImport = JSON.parse(str);
        } catch (e) {
            notifications.error("Invalid JSON format of Screen file, please check the file and try again.")
        }
        hasValidated = true
    }

    const routeChanged = event => {
        if (!event.detail.startsWith("/")) {
        screenUrl = "/" + event.detail
        }
        touched = true
        screenUrl = sanitizeUrl(screenUrl)
        if (routeExists(screenUrl)) {
        routeError = "This URL is already taken for this access role"
        } else {
        routeError = null
        }
    }

    const routeExists = url => {
        const roleId = get(selectedAccessRole) || "BASIC"
        return get(allScreens).some(
        screen =>
            screen.routing.route.toLowerCase() === url.toLowerCase() &&
            screen.routing.roleId === roleId
        )
    }

</script>

<Modal bind:this={modal} on:hide={onCancel}>
    <ModalContent
    title="Import Screen"
    confirmText="Import Screen"
    onConfirm={importScreen}
    disabled={!files[0]}
    >
        <Body>
            Please upload the screen file that was exported to get
            started
        </Body>
        <Input
            label="Enter a URL for the new screen"
            error={routeError}
            bind:value={screenUrl}
            on:change={routeChanged}
        />
        <div class="app-server" title={appUrl}>
            {appUrl}
        </div>
        <div class="dropzone">
            <input id="file-upload" accept=".json" type="file" on:change={handleFile} />
            <label for="file-upload" class:uploaded={files[0]}>
            {#if files[0]}{files[0].name}{:else}Upload{/if}
            </label>
        </div>
    </ModalContent>
</Modal>

<style>
    .dropzone {
        text-align: center;
        display: flex;
        align-items: center;
        flex-direction: column;
        border-radius: 10px;
        transition: all 0.3s;
    }

    input[type="file"] {
        display: none;
    }

    label {
        font-family: var(--font-sans);
        cursor: pointer;
        font-weight: 600;
        box-sizing: border-box;
        overflow: hidden;
        border-radius: var(--border-radius-s);
        color: var(--ink);
        padding: var(--spacing-m) var(--spacing-l);
        transition: all 0.2s ease 0s;
        display: inline-flex;
        text-rendering: optimizeLegibility;
        min-width: auto;
        outline: none;
        font-feature-settings: "case" 1, "rlig" 1, "calt" 0;
        -webkit-box-align: center;
        user-select: none;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 100%;
        background-color: var(--grey-2);
        font-size: var(--font-size-xs);
        line-height: normal;
        border: var(--border-transparent);
    }

    .app-server {
        color: var(--spectrum-global-color-gray-600);
        width: 320px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>