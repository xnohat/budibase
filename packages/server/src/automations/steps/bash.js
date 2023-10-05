const { execSync } = require("child_process")
const { processStringSync } = require("@budibase/string-templates")
const automationUtils = require("../automationUtils")
const environment = require("../../environment")
import {
  AutomationCustomIOType,
  AutomationIOType,
  AutomationStepType,
} from "@budibase/types"


exports.definition = {
  name: "Bash Scripting",
  tagline: "Execute a bash command",
  icon: "JourneyEvent",
  description: "Run a bash script",
  type: "ACTION",
  type: AutomationStepType.ACTION,
  internal: true,
  stepId: "EXECUTE_BASH",
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
        stdout: {
          type: AutomationIOType.STRING,
          description: "Standard output of your bash command or script",
        },
        success: {
          type: AutomationIOType.BOOLEAN,
          description: "Whether the command was successful",
        },
      },
      required: ["stdout"],
    },
  },
}

exports.run = async function ({ inputs, context }) {
  if (inputs.code == null) {
    return {
      stdout: "Budibase bash automation failed: Invalid inputs",
    }
  }

  try {
    const command = processStringSync(inputs.code, context)

    let stdout,
      success = true
    try {
      stdout = execSync(command, {
        timeout: environment.QUERY_THREAD_TIMEOUT || 500,
      }).toString()
    } catch (err) {
      stdout = err.message
      success = false
    }

    return {
      stdout,
      success,
    }
  } catch (err) {
    return {
      success: false,
      response: automationUtils.getError(err),
    }
  }
}
