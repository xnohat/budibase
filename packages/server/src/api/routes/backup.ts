import Router from "@koa/router"
import * as controller from "../controllers/backup"
import authorized from "../../middleware/authorized"
import { BUILDER } from "@budibase/backend-core/permissions"

const router = new Router()

router.get("/api/backups/export", authorized(BUILDER), controller.exportAppDump)

router.get("/api/backups/exportdb", authorized(BUILDER), controller.exportAppDbDump)

export default router
