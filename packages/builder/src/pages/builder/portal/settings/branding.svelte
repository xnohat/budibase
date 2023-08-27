<script>
    import {
      Layout,
      Heading,
      Body,
      Divider,
      File,
      notifications,
      Tags,
      Tag,
      Button,
      Toggle,
      Input,
      Label,
      TextArea,
      Dropzone,
    } from "@budibase/bbui"
    import { auth, organisation, admin } from "stores/portal"
    import { API } from "api"
    import { onMount } from "svelte"
    import { goto } from "@roxi/routify"
    import { writable } from "svelte/store"
 
  
    let mounted = false
    let saving = false
  
    let config = {}
    let updated = false
  
    $: onConfigUpdate(config, mounted)
    $: init = Object.keys(config).length > 0
  
    $: isCloud = $admin.cloud
    $: brandingEnabled = true
  
    const onConfigUpdate = () => {
      if (!mounted || updated || !init) {
        return
      }
      updated = true
    }

    const file_field_values = writable({
        logo: $organisation.logoUrl
        ? { url: $organisation.logoUrl, type: "image", name: "Logo" }
        : null,
        favicon: $organisation.faviconUrl
        ? { url: $organisation.faviconUrl, type: "image", name: "Favicon" }
        : null,
        metaImage: $organisation.metaImageUrl
        ? { url: $organisation.metaImageUrl, type: "image", name: "Meta Image" }
        : null
    })

    async function uploadLogo(file) {
        try {
        let data = new FormData()
        data.append("file", file)
        return (await API.uploadLogo(data)).url
        } catch (error) {
        notifications.error("Error uploading logo")
        }
    }

    async function uploadFavicon(file) {
        try {
        let data = new FormData()
        data.append("file", file)
        return (await API.uploadFavicon(data)).url
        } catch (error) {
        notifications.error("Error uploading favicon")
        }
    }

    async function uploadMetaImage(file) {
        try {
        let data = new FormData()
        data.append("file", file)
        return (await API.uploadMetaImage(data)).url
        } catch (error) {
        notifications.error("Error uploading meta image")
        }
    }
  
    async function saveConfig() {
      saving = true
      
      // Upload logo if required
      if ($file_field_values.logo && !$file_field_values.logo.url) {
        config.logoUrl = await uploadLogo($file_field_values.logo)
        await organisation.init()
      }
      // Upload favicon if required
      if ($file_field_values.favicon && !$file_field_values.favicon.url) {
        config.faviconUrl = await uploadFavicon($file_field_values.favicon)
        await organisation.init()
      }
      // Upload metaImage if required
      if ($file_field_values.metaImage && !$file_field_values.metaImage.url) {
        config.metaImageUrl = await uploadMetaImage($file_field_values.metaImage)
        await organisation.init()
      }

      // Trim
      const userStrings = [
        "metaTitle",
        "metaTitleSuffix",
        "platformTitle",
        "loginButton",
        "loginHeading",
        "metaDescription",
        "metaImageUrl",
        "faviconUrl",
        "logoUrl",
      ]
  
      const trimmed = userStrings.reduce((acc, fieldName) => {
        acc[fieldName] = config[fieldName] ? config[fieldName].trim() : undefined
        return acc
      }, {})

      config = {
        ...config,
        ...trimmed,
      }
  
      // Remove logo if required
      if (!$file_field_values.logo) {
        config.logoUrl = ""
      }
      // Remove favicon if required
      if (!$file_field_values.favicon) {
        config.faviconUrl = ""
      }
      // Remove metaImage if required
      if (!$file_field_values.metaImage) {
        config.metaImageUrl = ""
      }

      try {
        // Update settings
        await organisation.save(config)
        await organisation.init()
        notifications.success("Branding settings updated")
      } catch (e) {
        console.error("Branding updated failed", e)
        notifications.error("Branding updated failed")
      }
      updated = false
      saving = false
    }
  
    onMount(async () => {
      await organisation.init()
  
      config = {
        faviconUrl: $organisation.faviconUrl,
        logoUrl: $organisation.logoUrl,
        platformTitle: $organisation.platformTitle,
        emailBrandingEnabled: $organisation.emailBrandingEnabled,
        loginHeading: $organisation.loginHeading,
        loginButton: $organisation.loginButton,
        comboMetaTitleEnabled: $organisation.comboMetaTitleEnabled,
        metaDescription: $organisation.metaDescription,
        metaImageUrl: $organisation.metaImageUrl,
        metaTitle: $organisation.metaTitle,
        metaTitleSuffix: $organisation.metaTitleSuffix,
      }
      mounted = true
    })
  </script>
  
  {#if $auth.isAdmin && mounted}
    <Layout noPadding>
      <Layout gap="XS" noPadding>
        <div class="title">
          <Heading size="M">Branding</Heading>
          {#if !isCloud && !brandingEnabled}
            <Tags>
              <Tag icon="LockClosed">Business</Tag>
            </Tags>
          {/if}
          {#if isCloud && !brandingEnabled}
            <Tags>
              <Tag icon="LockClosed">Pro</Tag>
            </Tags>
          {/if}
        </div>
        <Body>Remove all Budibase branding and use your own.</Body>
      </Layout>
      <Divider />
      <div class="branding fields">
        <div class="field logo">
            <Label size="L">Logo</Label>
            <div class="file">
              <Dropzone
                value={[$file_field_values.logo]}
                on:change={e => {
                  let clone = { ...config }
                  if (!e.detail || e.detail.length === 0) {
                    $file_field_values.logo = null
                  } else {
                    $file_field_values.logo = e.detail[0]
                  }
                  config = clone
                }}
              />
            </div>
            <Label size="L">Favicon</Label>
            <div class="file">
              <Dropzone
                value={[$file_field_values.favicon]}
                on:change={e => {
                  let clone = { ...config }
                  if (!e.detail || e.detail.length === 0) {
                    $file_field_values.favicon = null
                  } else {
                    $file_field_values.favicon = e.detail[0]
                  }
                  config = clone
                }}
              />
            </div>
        </div>
        {#if !isCloud}
          <div class="field">
            <Label size="L">Title</Label>
            <Input
              on:change={e => {
                let clone = { ...config }
                clone.platformTitle = e.detail ? e.detail : ""
                config = clone
              }}
              value={config.platformTitle || ""}
              disabled={!brandingEnabled || saving}
            />
          </div>
        {/if}
        <div>
          <Toggle
            text={"Remove Budibase brand from emails"}
            on:change={e => {
              let clone = { ...config }
              clone.emailBrandingEnabled = !e.detail
              config = clone
            }}
            value={!config.emailBrandingEnabled}
            disabled={!brandingEnabled || saving}
          />
        </div>
      </div>
  
      {#if !isCloud}
        <Divider />
        <Layout gap="XS" noPadding>
            <Heading size="S">Login page</Heading>
            <Body />
        </Layout>
        <div class="login">
            <div class="fields">
            <div class="field">
                <Label size="L">Header</Label>
                <Input
                on:change={e => {
                    let clone = { ...config }
                    clone.loginHeading = e.detail ? e.detail : ""
                    config = clone
                }}
                value={config.loginHeading || ""}
                disabled={!brandingEnabled || saving}
                />
            </div>

            <div class="field">
                <Label size="L">Button</Label>
                <Input
                on:change={e => {
                    let clone = { ...config }
                    clone.loginButton = e.detail ? e.detail : ""
                    config = clone
                }}
                value={config.loginButton || ""}
                disabled={!brandingEnabled || saving}
                />
            </div>
            </div>
        </div>
      {/if}
      <Divider />
      <Layout gap="XS" noPadding>
        <Heading size="S">Application previews</Heading>
        <Body>Customise the meta tags on your app preview</Body>
      </Layout>
      <div class="app-previews">
        <div class="fields">
          <div class="field">
            <Label size="L">Meta Image</Label>
            <div class="file">
                <Dropzone
                  value={[$file_field_values.metaImage]}
                  on:change={e => {
                    let clone = { ...config }
                    if (!e.detail || e.detail.length === 0) {
                      $file_field_values.metaImage = null
                    } else {
                      $file_field_values.metaImage = e.detail[0]
                    }
                    config = clone
                  }}
                />
            </div>
          </div>
          <div class="field">
            <Label size="L">Title</Label>
            <Input
              on:change={e => {
                let clone = { ...config }
                clone.metaTitle = e.detail ? e.detail : ""
                config = clone
              }}
              value={config.metaTitle}
              disabled={!brandingEnabled || saving}
            />
          </div>
          <div class="field">
            <Label size="L">Title Suffix</Label>
            <Input
              on:change={e => {
                let clone = { ...config }
                clone.metaTitleSuffix = e.detail ? e.detail : ""
                config = clone
              }}
              value={config.metaTitleSuffix}
              disabled={!brandingEnabled || saving}
            />
          </div>
          <div>
            <Toggle
              text={"Title by Combine App Name with Title Suffix"}
              on:change={e => {
                let clone = { ...config }
                clone.comboMetaTitleEnabled = !e.detail
                config = clone
              }}
              value={!config.comboMetaTitleEnabled}
              disabled={!brandingEnabled || saving}
            />
          </div>
          <div class="field">
            <Label size="L">Description</Label>
            <TextArea
              on:change={e => {
                let clone = { ...config }
                clone.metaDescription = e.detail ? e.detail : ""
                config = clone
              }}
              value={config.metaDescription}
              disabled={!brandingEnabled || saving}
            />
          </div>
        </div>
      </div>
      <div class="buttons">
        {#if !brandingEnabled}
          <Button
            on:click={() => {
              if (isCloud && $auth?.user?.accountPortalAccess) {
                window.open($admin.accountPortalUrl + "/portal/upgrade", "_blank")
              } else if ($auth.isAdmin) {
                $goto("/builder/portal/account/upgrade")
              }
            }}
            secondary
            disabled={saving}
          >
            Upgrade
          </Button>
        {/if}
        <Button on:click={saveConfig} cta disabled={saving || !updated || !init}>
          Save
        </Button>
      </div>
    </Layout>
  {/if}
  
  <style>
    .buttons {
      display: flex;
      gap: var(--spacing-m);
    }
    .title {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: var(--spacing-m);
    }
  
    .branding,
    .login {
        width: 70%;
        max-width: 70%;
    }
    .fields {
      display: grid;
      grid-gap: var(--spacing-m);
    }
    .field {
      display: grid;
      grid-template-columns: 80px auto;
      grid-gap: var(--spacing-l);
      align-items: center;
    }
  </style>