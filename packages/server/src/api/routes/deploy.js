const Router = require("@koa/router")
const controller = require("../controllers/deploy")
const authorized = require("../../middleware/authorized")
const { BUILDER } = require("@budibase/backend-core/permissions")

const router = new Router()

router
  .get("/api/deployments", authorized(BUILDER), controller.fetchDeployments)
  .get(
    "/api/deploy/:deploymentId",
    authorized(BUILDER),
    controller.deploymentProgress
  )
  .post("/api/deploy", authorized(BUILDER), controller.deployApp)
  .get("/api/deploy/cache/clear/:applicationId", authorized(BUILDER), controller.forceClearAppCache)
  .post("/api/deploy/compact", authorized(BUILDER), controller.compactAppDB)

module.exports = router
