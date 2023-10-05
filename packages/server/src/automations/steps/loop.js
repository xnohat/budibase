import {
  AutomationCustomIOType,
  AutomationIOType,
  AutomationStepType,
} from "@budibase/types"

exports.definition = {
  name: "Looping",
  icon: "Reuse",
  tagline: "Loop the block",
  description: "Loop",
  stepId: "LOOP",
  internal: true,
  inputs: {},
  schema: {
    inputs: {
      properties: {
        option: {
          customType: AutomationCustomIOType.LOOP_OPTION,
          title: "Input type",
        },
        binding: {
          type: AutomationIOType.STRING,
          title: "Binding / Value",
        },
        iterations: {
          type: AutomationIOType.NUMBER,
          title: "Max loop iterations",
        },
        failure: {
          type: AutomationIOType.STRING,
          title: "Failure Condition",
        },
      },
      required: ["type", "value", "iterations", "failure"],
    },
    outputs: {
      properties: {
        items: {
          customType: AutomationCustomIOType.ITEM,
          description: "The item currently being executed",
        },
        success: {
          type: AutomationIOType.BOOLEAN,
          description: "Whether the message loop was successfully",
        },
        iterations: {
          type: AutomationIOType.NUMBER,
          descriptions: "The amount of times the block ran",
        },
      },
      required: ["success", "items", "iterations"],
    },
  },
  type: AutomationStepType.LOGIC,
}
