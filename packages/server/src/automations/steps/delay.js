let { wait } = require("../../utilities")
import { AutomationIOType, AutomationStepType } from "@budibase/types"

exports.definition = {
  name: "Delay",
  icon: "Clock",
  tagline: "Delay for {{inputs.time}} milliseconds",
  description: "Delay the automation until an amount of time has passed",
  stepId: "DELAY",
  internal: true,
  inputs: {},
  schema: {
    inputs: {
      properties: {
        time: {
          type: AutomationIOType.NUMBER,
          title: "Delay in milliseconds",
        },
      },
      required: ["time"],
    },
    outputs: {
      properties: {
        success: {
          type: AutomationIOType.BOOLEAN,
          description: "Whether the delay was successful",
        },
      },
      required: ["success"],
    },
  },
  type: AutomationStepType.LOGIC,
}

exports.run = async function delay({ inputs }) {
  await wait(inputs.time)
  return {
    success: true,
  }
}
