const sendSmtpEmail = require("./steps/sendSmtpEmail")
const createRow = require("./steps/createRow")
const updateRow = require("./steps/updateRow")
const deleteRow = require("./steps/deleteRow")
const executeScript = require("./steps/executeScript")
const executeQuery = require("./steps/executeQuery")
const executeAutomation = require("./steps/executeAutomation")
const outgoingWebhook = require("./steps/outgoingWebhook")
const serverLog = require("./steps/serverLog")
const discord = require("./steps/discord")
const slack = require("./steps/slack")
const zapier = require("./steps/zapier")
const integromat = require("./steps/integromat")
let filter = require("./steps/filter")
let filtergoto = require("./steps/filterGoto")
let delay = require("./steps/delay")
let stop = require("./steps/stop")
let queryRow = require("./steps/queryRows")
let loop = require("./steps/loop")
const env = require("../environment")
const { PluginType } = require("@budibase/types")
const sdk = require("../sdk")
const { getAutomationPlugin } = require("../utilities/fileSystem")

const ACTION_IMPLS = {
  SEND_EMAIL_SMTP: sendSmtpEmail.run,
  CREATE_ROW: createRow.run,
  UPDATE_ROW: updateRow.run,
  DELETE_ROW: deleteRow.run,
  OUTGOING_WEBHOOK: outgoingWebhook.run,
  EXECUTE_SCRIPT: executeScript.run,
  EXECUTE_QUERY: executeQuery.run,
  EXECUTE_AUTOMATION: executeAutomation.run,
  SERVER_LOG: serverLog.run,
  DELAY: delay.run,
  STOP: stop.run,
  FILTER: filter.run,
  FILTERGOTO: filtergoto.run,
  QUERY_ROWS: queryRow.run,
  LOOP: loop.run,
  // these used to be lowercase step IDs, maintain for backwards compat
  discord: discord.run,
  slack: slack.run,
  zapier: zapier.run,
  integromat: integromat.run,
}
const BUILTIN_ACTION_DEFINITIONS = {
  SEND_EMAIL_SMTP: sendSmtpEmail.definition,
  CREATE_ROW: createRow.definition,
  UPDATE_ROW: updateRow.definition,
  DELETE_ROW: deleteRow.definition,
  OUTGOING_WEBHOOK: outgoingWebhook.definition,
  EXECUTE_SCRIPT: executeScript.definition,
  EXECUTE_QUERY: executeQuery.definition,
  EXECUTE_AUTOMATION: executeAutomation.definition,
  SERVER_LOG: serverLog.definition,
  DELAY: delay.definition,
  STOP: stop.definition,
  FILTER: filter.definition,
  FILTERGOTO: filtergoto.definition,
  QUERY_ROWS: queryRow.definition,
  LOOP: loop.definition,
  // these used to be lowercase step IDs, maintain for backwards compat
  discord: discord.definition,
  slack: slack.definition,
  zapier: zapier.definition,
  integromat: integromat.definition,
}

// don't add the bash script/definitions unless in self host
// the fact this isn't included in any definitions means it cannot be
// ran at all
if (env.SELF_HOSTED) {
  const bash = require("./steps/bash")
  ACTION_IMPLS["EXECUTE_BASH"] = bash.run
  // @ts-ignore
  BUILTIN_ACTION_DEFINITIONS["EXECUTE_BASH"] = bash.definition
}

exports.getActionDefinitions = async function () {
  const actionDefinitions = BUILTIN_ACTION_DEFINITIONS
  if (env.SELF_HOSTED) {
    const plugins = await sdk.plugins.fetch(PluginType.AUTOMATION)
    for (let plugin of plugins) {
      const schema = plugin.schema.schema
      actionDefinitions[schema.stepId] = {
        ...schema,
        custom: true,
      }
    }
  }
  return actionDefinitions
}

/* istanbul ignore next */
exports.getAction = async function (stepId) {
  if (ACTION_IMPLS[stepId] != null) {
    return ACTION_IMPLS[stepId]
  }
  // must be a plugin
  if (env.SELF_HOSTED) {
    const plugins = await sdk.plugins.fetch(PluginType.AUTOMATION)
    /**
     * @type {import('@budibase/types').Plugin}
     */
    const found = plugins.find(plugin => plugin.schema.schema.stepId === stepId)
    if (!found) {
      throw new Error(`Unable to find action implementation for "${stepId}"`)
    }
    //! Based on old code, this should be the correct way to get the action
    //! don't pass `found` (Plugin) object, passing 3 args instead
    return (
      await getAutomationPlugin(
        found.name,
        found.jsUrl,
        found.schema?.hash
      )
    ).action
  }
}

exports.BUILTIN_ACTION_DEFINITIONS = BUILTIN_ACTION_DEFINITIONS
