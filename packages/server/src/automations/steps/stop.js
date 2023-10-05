let { wait } = require("../../utilities")
import { AutomationStepType, AutomationIOType } from "@budibase/types"

exports.definition = {
  name: "Stop",
  icon: "StopCircle",
  tagline: "Stop the automation flow",
  description: "Stop the automation flow",
  stepId: "STOP",
  internal: true,
  inputs: {
    time: 1,
  },
  schema: {
    inputs: {
      properties: {
        time: {
          type: AutomationIOType.NUMBER,
          title: "Delay in milliseconds before stopping",
        },
      },
      required: ["time"],
    },
    outputs: {
      properties: {
        success: {
          type: AutomationIOType.BOOLEAN,
          description: "Whether the stop was successful",
        },
      },
      required: ["success"],
    },
  },
  type: AutomationStepType.LOGIC,
}

exports.run = async function stop({ inputs }) {
  await wait(inputs.time)
  return {
    success: true,
  }
}
