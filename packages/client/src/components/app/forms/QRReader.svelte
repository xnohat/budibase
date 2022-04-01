<script>
  import { ModalContent, Modal, StatusLight, Body } from "@budibase/bbui"
  import { getContext } from "svelte"
  import { get } from "svelte/store"
  import Field from "./Field.svelte"
  import Button from "../Button.svelte"
  import { onMount } from "svelte"
  import QrScanner from "qr-scanner"
  import Placeholder from "../Placeholder.svelte"
  //components

  export let field
  export let label
  export let disabled = false
  export let validation

  const { builderStore } = getContext("sdk")

  let modal

  let fieldState
  let fieldApi
  let fieldSchema

  let video
  let qrScanner
  let WxH = 250
  let output = ""
  $: {
    if (video) {
      qrScanner = new QrScanner(
        //document.getElementById("videoElem"),
        video,
        result => setState(result),
        error => {
          console.log("qr-scanner encountered an error", error)
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      )
    }
  }
  $: console.log(qrScanner)

  function setState(val) {
    console.log(val)
    output = val
  }
  function startCamera() {}
  function stopCamera() {}
  const openVideoPreview = () => {
    if (get(builderStore).inBuilder) {
      return
    }
    modal.show()

    //Core
    window.navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      video.srcObject = stream
      video.play()
      qrScanner.start()
    })
  }
  //Selector for your <video> element
</script>

<Field
  {field}
  {label}
  {disabled}
  {validation}
  type="string"
  bind:fieldState
  bind:fieldApi
  bind:fieldSchema
>
  {#if fieldState}
    <Modal bind:this={modal}>
      <ModalContent
        onCancel={() => qrScanner.stop()}
        onConfirm={() => fieldApi.setValue(output)}
      >
        <div id="video-container" class="video_holder scan-region-highlight">
          <video
            id="videoElem"
            class="video"
            bind:this={video}
            height={WxH}
            width={WxH}><track kind="captions" /></video
          >
        </div>

        {#if output}
          <StatusLight positive={!!output}
            ><Body size="XS">QR Code Scanned!</Body></StatusLight
          >
        {/if}
      </ModalContent>
    </Modal>

    <Button
      onClick={openVideoPreview}
      icon="Camera"
      text="Take Photo"
      type="secondary"
      quiet
    />
  {/if}
</Field>

<style>
  video {
    height: auto;
    min-height: 100%;
    width: 100%;
    min-width: 100%;
  }
  .video_holder {
    height: 100%;
    min-height: 100%;
    width: 100%;
    min-width: 100%;
  }

  .scan-region-highlight {
    border-radius: 30px;
    outline: rgba(0, 0, 0, 0.25) solid 50vmax;
  }
</style>
