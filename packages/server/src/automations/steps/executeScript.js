const scriptController = require("../../api/controllers/script")
const { buildCtx } = require("./utils")
const automationUtils = require("../automationUtils")
import {
  AutomationCustomIOType,
  AutomationIOType,
  AutomationStepType,
} from "@budibase/types"

exports.definition = {
  name: "JS Scripting",
  tagline: "Execute JavaScript Code",
  icon: "Code",
  description: "Run a piece of JavaScript code in your automation",
  type: AutomationStepType.ACTION,
  internal: true,
  stepId: "EXECUTE_SCRIPT",
  inputs: {},
  schema: {
    inputs: {
      properties: {
        code: {
          type: AutomationIOType.STRING,
          customType: AutomationCustomIOType.CODE,
          title: "Code",
        },
      },
      required: ["code"],
    },
    outputs: {
      properties: {
        value: {
          type: AutomationIOType.STRING,
          description: "The result of the return statement",
        },
        success: {
          type: AutomationIOType.BOOLEAN,
          description: "Whether the action was successful",
        },
      },
      required: ["success"],
    },
  },
}

exports.run = async function ({ inputs, appId, context, emitter }) {
  if (inputs.code == null) {
    return {
      success: false,
      response: {
        message: "Invalid inputs",
      },
    }
  }

  const ctx = buildCtx(appId, emitter, {
    body: {
      script: inputs.code,
      context,
    },
  })

  try {
    await scriptController.execute(ctx)
    return {
      success: true,
      value: ctx.body,
    }
  } catch (err) {
    return {
      success: false,
      response: automationUtils.getError(err),
    }
  }
}
