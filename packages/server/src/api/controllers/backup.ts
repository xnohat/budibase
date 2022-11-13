import sdk from "../../sdk"
import { events, context } from "@budibase/backend-core"
import { DocumentType } from "../../db/utils"
import { isQsTrue } from "../../utilities"
const { streamBackup } = require("../../utilities/fileSystem")

export async function exportAppDump(ctx: any) {
  let { appId, excludeRows, excludeAttachments } = ctx.query
  const appName = decodeURI(ctx.query.appname)
  excludeRows = isQsTrue(excludeRows)
  excludeAttachments = isQsTrue(excludeAttachments)
  const backupIdentifier = `${appName}-export-${new Date().getTime()}.tar.gz`
  ctx.attachment(backupIdentifier)
  ctx.body = await sdk.backups.streamExportApp(appId, excludeRows, excludeAttachments)

  await context.doInAppContext(appId, async () => {
    const appDb = context.getAppDB()
    const app = await appDb.get(DocumentType.APP_METADATA)
    await events.app.exported(app)
  })
}

export async function exportAppDbDump(ctx: any) {
  const { appId } = ctx.query
  const appName = decodeURI(ctx.query.appname)
  const backupIdentifier = `${appName}-export-${new Date().getTime()}.txt`
  ctx.attachment(backupIdentifier)
  ctx.body = await streamBackup(appId)

  await context.doInAppContext(appId, async () => {
    const appDb = context.getAppDB()
    const app = await appDb.get(DocumentType.APP_METADATA)
    await events.app.exported(app)
  })
}