import http from "http"
import Koa from "koa"
import ClientAppSocket from "./client"
import BuilderSocket from "./builder"

let clientAppSocket: ClientAppSocket
let builderSocket: BuilderSocket

export const initialise = (app: Koa, server: http.Server) => {
  clientAppSocket = new ClientAppSocket(app, server)
  builderSocket = new BuilderSocket(app, server)
}

export { clientAppSocket, builderSocket }
