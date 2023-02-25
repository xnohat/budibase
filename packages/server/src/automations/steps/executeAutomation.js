const automationUtils = require("../automationUtils")
const { definitions } = require("../triggerInfo")
const { coerce } = require("../../utilities/rowProcessor")
const { checkTestFlag } = require("../../utilities/redis")
const utils = require("../utils")
const { queue } = require("@budibase/backend-core")
const threads_automation = require("../../threads/automation")
const { getAppDB } = require("@budibase/backend-core/context")

exports.definition = {
  name: "Trigger An Automation",
  tagline: "Trigger An Automation",
  icon: "Data",
  description: "Trigger another automation in the same app",
  type: "ACTION",
  stepId: "EXECUTE_AUTOMATION",
  internal: true,
  inputs: {
    getresult: false,
  },
  schema: {
    inputs: {
      properties: {
        getresult: {
          type: "boolean",
          customType: "getresulttoggle",
          title: "Get Automation Results (this trigger automation by Sync and impact performance)",
        },
        automation: {
          type: "object",
          properties: {
            automationId: {
              type: "string",
              customType: "automation",
            },
          },
          customType: "automationParams",
          title: "Parameters",
          required: ["automationId"],
        },
      },
      required: ["automation","apikey","getresult"],
    },
    outputs: {
      properties: {
        response: {
          type: "object",
          description: "The response from the automation execution",
        },
        info: {
          type: "object",
          description:
            "Some automation may return extra data",
        },
        success: {
          type: "boolean",
          description: "Whether the action was successful",
        },
      },
    },
    required: ["response", "success"],
  },
}

const JOB_OPTS = {
  removeOnComplete: true,
  removeOnFail: true,
}

let automationQueue = queue.createQueue(
  queue.JobQueue.AUTOMATION,
  threads_automation.removeStalled
)

const externalTrigger = async function (
  automation,
  params,
  { getResponses } = {}
) {
  if (
    automation.definition != null &&
    automation.definition.trigger != null &&
    automation.definition.trigger.stepId === definitions.APP.stepId &&
    automation.definition.trigger.stepId === "APP" &&
    !(await checkTestFlag(automation._id))
  ) {
    // values are likely to be submitted as strings, so we shall convert to correct type
    const coercedFields = {}
    const fields = automation.definition.trigger.inputs.fields
    for (let key of Object.keys(fields || {})) {
      coercedFields[key] = coerce(params.fields[key], fields[key])
    }
    params.fields = coercedFields
  }
  const data = { automation, event: params }
  if (getResponses) {
    return utils.processEvent({ data })
  } else {
    return automationQueue.add(data, JOB_OPTS)
  }
}

exports.run = async function ({ inputs, appId, emitter }) {
  if (inputs.automation == null) {
    return {
      success: false,
      response: {
        message: "Invalid inputs",
      },
    }
  }

  const { automationId, ...params } = inputs.automation

  const db = getAppDB()
  let automation = await db.get(automationId)

  try {
    if(inputs.getresult){ //trigger by sync
      let response = await externalTrigger(
        automation,
        {
          fields: params,
          appId: appId,
        },
        { getResponses: true }
      )
      return {
        response: response,
        info: params,
        success: true,
      }
    } else { //trigger by async
      await externalTrigger(
        automation,
        {
          fields: params,
          appId: appId,
        }
      )
      return {
        info: params,
        success: true,
      }
    }

  } catch (err) {
    return {
      success: false,
      info: {},
      response: automationUtils.getError(err),
    }
  }
}
