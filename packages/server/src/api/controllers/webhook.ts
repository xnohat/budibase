import { getWebhookParams } from "../../db/utils"
import triggers from "../../automations/triggers"
import { db as dbCore, context } from "@budibase/backend-core"
import {
  Webhook,
  WebhookActionType,
  BBContext,
  Automation,
} from "@budibase/types"
import sdk from "../../sdk"
const toJsonSchema = require("to-json-schema")
const validate = require("jsonschema").validate

const AUTOMATION_DESCRIPTION = "Generated from Webhook Schema"

export async function fetch(ctx: BBContext) {
  const db = context.getAppDB()
  const response = await db.allDocs(
    getWebhookParams(null, {
      include_docs: true,
    })
  )
  ctx.body = response.rows.map((row: any) => row.doc)
}

export async function save(ctx: BBContext) {
  const webhook = await sdk.automations.webhook.save(ctx.request.body)
  ctx.body = {
    message: "Webhook created successfully",
    webhook,
  }
}

export async function destroy(ctx: BBContext) {
  ctx.body = await sdk.automations.webhook.destroy(
    ctx.params.id,
    ctx.params.rev
  )
}

export async function buildSchema(ctx: BBContext) {
  await context.updateAppId(ctx.params.instance)
  const db = context.getAppDB()
  const webhook = (await db.get(ctx.params.id)) as Webhook
  webhook.bodySchema = toJsonSchema(ctx.request.body)
  // update the automation outputs
  if (webhook.action.type === WebhookActionType.AUTOMATION) {
    let automation = (await db.get(webhook.action.target)) as Automation
    const autoOutputs = automation.definition.trigger.schema.outputs
    let properties = webhook.bodySchema.properties
    // reset webhook outputs
    autoOutputs.properties = {
      body: autoOutputs.properties.body,
    }
    for (let prop of Object.keys(properties)) {
      autoOutputs.properties[prop] = {
        type: properties[prop].type,
        description: AUTOMATION_DESCRIPTION,
      }
    }
    await db.put(automation)
  }
  ctx.body = await db.put(webhook)
}

export async function trigger(ctx: BBContext) {
  const isApi = ctx.query && ctx.query.api === 'true'
  const prodAppId = dbCore.getProdAppID(ctx.params.instance)
  await context.updateAppId(prodAppId)
  try {
    const db = context.getAppDB()
    const webhook = (await db.get(ctx.params.id)) as Webhook
    // validate against the schema
    if (webhook.bodySchema) {
      validate(ctx.request.body, webhook.bodySchema)
    }
    const target = await db.get(webhook.action.target)
    if(isApi) { //Webhook used as an automation API, response result from automation
      if (webhook.action.type === WebhookActionType.AUTOMATION) {
        // trigger with both the pure request and then expand it
        // incase the user has produced a schema to bind to
        const response = await triggers.externalTrigger(
          target,
          {
            api: true,
            body: ctx.request.body,
            ...ctx.request.body,
            appId: prodAppId,
          },
          { getResponses: true }
        )
        ctx.status = 200
        //return the last automation step executed output as api return
        ctx.body = response.steps.filter((step: any) => step.outputs.status !== "stopped").slice(-1)[0].outputs
      }
    }else{  //Webhook used as a normal automation trigger, just trigger automation and response 200
      if (webhook.action.type === WebhookActionType.AUTOMATION) {
        // trigger with both the pure request and then expand it
        // incase the user has produced a schema to bind to
        await triggers.externalTrigger(target, {
          api: false,
          body: ctx.request.body,
          ...ctx.request.body,
          appId: prodAppId,
        })
      }
      ctx.status = 200
      ctx.body = {
        message: "Webhook trigger fired successfully",
      }
    }
  } catch (err: any) {
    if (err.status === 404) {
      ctx.status = 200
      ctx.body = {
        message: "Application not deployed yet.",
      }
    }
  }
}
