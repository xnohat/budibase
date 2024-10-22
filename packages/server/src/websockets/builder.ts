import authorized from "../middleware/authorized"
import Socket from "./websocket"
import { permissions } from "@budibase/backend-core"
import http from "http"
import Koa from "koa"
import { Datasource, Table } from "@budibase/types"
const { clearLock } = require("../utilities/redis")
export default class BuilderSocket extends Socket {
  constructor(app: Koa, server: http.Server) {
    super(app, server, "/socket/builder", [authorized(permissions.BUILDER)])

    this.io.on("connection", (socket: any) => {
      // Join a room for this app
      const user = socket.data.user
      const appId = socket.data.appId
      socket.join(appId)
      socket.to(appId).emit("user-update", user)

      // Initial identification of connected spreadsheet
      socket.on("get-users", async (payload: any, callback: any) => {
        const sockets = await this.io.in(appId).fetchSockets()
        callback({
          users: sockets.map((socket: any) => socket.data.user),
        })
      })

      // Disconnection cleanup
      socket.on("disconnect", async () => {
        socket.to(appId).emit("user-disconnect", user)

        // Remove app lock from this user if they have no other connections
        try {
          const sockets = await this.io.in(appId).fetchSockets()
          const hasOtherConnection = sockets.some((socket: any) => {
            const { _id, sessionId } = socket.data.user
            return _id === user._id && sessionId !== user.sessionId
          })
          if (!hasOtherConnection) {
            await clearLock(appId, user)
          }
        } catch (e) {
          // This is fine, just means this user didn't hold the lock
        }
      })
    })
  }

  emitTableUpdate(ctx: any, table: Table) {
    this.io.in(ctx.appId).emit("table-change", { id: table._id, table })
  }

  emitTableDeletion(ctx: any, id: string) {
    this.io.in(ctx.appId).emit("table-change", { id, table: null })
  }

  emitDatasourceUpdate(ctx: any, datasource: Datasource) {
    this.io
      .in(ctx.appId)
      .emit("datasource-change", { id: datasource._id, datasource })
  }

  emitDatasourceDeletion(ctx: any, id: string) {
    this.io.in(ctx.appId).emit("datasource-change", { id, datasource: null })
  }
}
