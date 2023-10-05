const fetch = require("node-fetch")
const { getFetchResponse } = require("./utils")
import { AutomationStepType, AutomationIOType } from "@budibase/types"

const DEFAULT_USERNAME = "Budibase Automate"
const DEFAULT_AVATAR_URL = "https://i.imgur.com/a1cmTKM.png"

exports.definition = {
  name: "Discord Message",
  tagline: "Send a message to a Discord server",
  description: "Send a message to a Discord server",
  icon: "ri-discord-line",
  stepId: "discord",
  type: AutomationStepType.ACTION,
  internal: false,
  inputs: {},
  schema: {
    inputs: {
      properties: {
        url: {
          type: AutomationIOType.STRING,
          title: "Discord Webhook URL",
        },
        username: {
          type: AutomationIOType.STRING,
          title: "Bot Name",
        },
        avatar_url: {
          type: AutomationIOType.STRING,
          title: "Bot Avatar URL",
        },
        content: {
          type: AutomationIOType.STRING,
          title: "Message",
        },
      },
      required: ["url", "content"],
    },
    outputs: {
      properties: {
        httpStatus: {
          type: "number",
          description: "The HTTP status code of the request",
        },
        response: {
          type: AutomationIOType.STRING,
          description: "The response from the Discord Webhook",
        },
        success: {
          type: "boolean",
          description: "Whether the message sent successfully",
        },
      },
    },
  },
}

exports.run = async function ({ inputs }) {
  let { url, username, avatar_url, content } = inputs
  if (!username) {
    username = DEFAULT_USERNAME
  }
  if (!avatar_url) {
    avatar_url = DEFAULT_AVATAR_URL
  }
  const response = await fetch(url, {
    method: "post",
    body: JSON.stringify({
      username,
      avatar_url,
      content,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })

  const { status, message } = await getFetchResponse(response)
  return {
    httpStatus: status,
    success: status === 200 || status === 204,
    response: message,
  }
}
