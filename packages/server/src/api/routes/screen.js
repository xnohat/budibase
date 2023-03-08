const Router = require("@koa/router")
const controller = require("../controllers/screen")
const authorized = require("../../middleware/authorized")
const { BUILDER } = require("@budibase/backend-core/permissions")
const { screenValidator } = require("./utils/validators")

const router = new Router()

router
  .get("/api/screens", authorized(BUILDER), controller.fetch)
  .post("/api/screens", authorized(BUILDER), screenValidator(), controller.save)
  .delete(
    "/api/screens/:screenId/:screenRev",
    authorized(BUILDER),
    controller.destroy
  )
  .get("/api/screens/export/:id", authorized(BUILDER), controller.exportScreen)

module.exports = router
