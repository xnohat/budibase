<script>
    import { goto } from "@roxi/routify"
    import { datasources, queries, tables } from "stores/backend"
    import { database } from "stores/backend"
    import { notifications } from "@budibase/bbui"
    import { Input, ModalContent, Modal, Body } from "@budibase/bbui"

    const BYTES_IN_MB = 1000000
    const FILE_SIZE_LIMIT = BYTES_IN_MB * 5

    let modal
    let queryFromFileString = undefined
    let hasValidated = false

    export let name
    export let datasource
    export let error = ""
    export let files = []
    export let dataImport = {}
    export let onCancel = undefined

    export const show = () => {
      name = ""
      modal.show()
    }
    export const hide = () => {
      name = ""
      files = []
      modal.hide()
    }

    async function importQuery() {
        try {
            dataImport.datasourceId = datasource._id
            dataImport.name = name
            const newQuery = await queries.import(dataImport)
            notifications.success(`File ${files[0].name} imported to query ${name} successfully`)
            hide()
            $goto(`./datasource/${datasource._id}/${newQuery._id}`)
            //location.reload()

        } catch (error) {
        notifications.error("Failed to import query")
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
            queryFromFileString = e.target.result
            files = fileArray
            JSONValidate(queryFromFileString)
        })
        reader.readAsText(fileArray[0])
    }

    function JSONValidate(str) {
        try {
            dataImport = JSON.parse(str);
        } catch (e) {
            notifications.error("Invalid JSON format of Query file, please check the file and try again.")
        }
        hasValidated = true
    }

    function checkValid(evt) {
    name = evt.target.value
    if (!name) {
      error = "Name is required"
      return
    }
    error = ""
  }

</script>

<Modal bind:this={modal} on:hide={onCancel}>
    <ModalContent
    title="Import Query"
    confirmText="Import Query"
    onConfirm={importQuery}
    disabled={!files[0]}
    >
        <Body>
            Please upload the query file that was exported to get
            started
        </Body>
        <Input bind:value={name} label="Name" on:input={checkValid} {error} />
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
</style>