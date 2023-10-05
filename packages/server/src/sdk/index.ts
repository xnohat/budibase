import { default as backups } from "./app/backups"
import { default as tables } from "./app/tables"
import { default as automations } from "./app/automations"
import { default as plugins } from "./plugins"

const sdk = {
  backups,
  tables,
  automations,
  plugins,
}

// default export for TS
export default sdk

// default export for JS
module.exports = sdk
