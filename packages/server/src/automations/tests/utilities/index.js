const TestConfig = require("../../../tests/utilities/TestConfiguration")
const { TENANT_ID } = require("../../../tests/utilities/structures")
const { doInTenant } = require("@budibase/backend-core/tenancy")
const actions = require("../../actions")
const emitter = require("../../../events/index")
const env = require("../../../environment")

let config

exports.getConfig = () => {
  if (!config) {
    config = new TestConfig(false)
  }
  return config
}

exports.afterAll = () => {
  config.end()
}

exports.runInProd = async fn => {
  env._set("NODE_ENV", "production")
  let error
  try {
    await fn()
  } catch (err) {
    error = err
  }
  env._set("NODE_ENV", "jest")
  if (error) {
    throw error
  }
}

exports.runStep = async function runStep(stepId, inputs) {
  return doInTenant(TENANT_ID, async () => {
    let step = await actions.getAction(stepId)
    expect(step).toBeDefined()
    return step({
      inputs,
      appId: config ? config.getAppId() : null,
      // don't really need an API key, mocked out usage quota, not being tested here
      apiKey: exports.apiKey,
      emitter,
    })
  })
}

exports.apiKey = "test"

exports.actions = actions.BUILTIN_ACTION_DEFINITIONS
