import { FileType, Plugin, PluginSource, PluginType } from "@budibase/types"
import {
  db as dbCore,
  objectStore,
  plugins as pluginCore,
  tenancy,
} from "@budibase/backend-core"
import { fileUpload } from "../../api/controllers/plugin/file"
import env from "../../environment"
import { clientAppSocket } from "../../websockets"
import { plugins as pluginsPro } from "@budibase/pro"

export async function fetch(type?: PluginType, isInvokeObjectStore = false) {
  const db = tenancy.getGlobalDB()
  const response = await db.allDocs(
    dbCore.getPluginParams(null, {
      include_docs: true,
    })
  )
  let plugins = response.rows.map((row: any) => row.doc) as Plugin[]
  /**
   * This ref:
   * https://github.com/Budibase/budibase/pull/10276/files#diff-09bb1722181e704de1e681b46fcc71cc8d9b9b9c948bf15c74445ab465422924R21
   * 
   * This is a workaround for the fact that the our plugins will be stored in the object store
   * 
   * Not recommend with custom system
   */
  if (isInvokeObjectStore) {
    //! This will got the SignatureDoesNotMatch error, use at your own risk
    plugins = objectStore.enrichPluginURLs(plugins)
  }

  if (type) {
    return plugins.filter((plugin: Plugin) => plugin.schema?.type === type)
  } else {
    return plugins
  }
}

export async function processUploaded(plugin: FileType, source?: PluginSource) {
  const { metadata, directory } = await fileUpload(plugin)
  pluginCore.validate(metadata?.schema)

  // Only allow components in cloud
  if (!env.SELF_HOSTED && metadata?.schema?.type !== PluginType.COMPONENT) {
    throw new Error("Only component plugins are supported outside of self-host")
  }
  const doc = await pluginsPro.storePlugin(metadata, directory, source)
  clientAppSocket.emit("plugin-update", { name: doc.name, hash: doc.hash })
  return doc
}
