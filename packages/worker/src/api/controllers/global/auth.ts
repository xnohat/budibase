const core = require("@budibase/backend-core")
const { Configs, EmailTemplatePurpose } = require("../../../constants")
const { sendEmail, isEmailConfigured } = require("../../../utilities/email")
const { setCookie, getCookie, clearCookie, hash, platformLogout } = core.utils
const { Cookies, Headers } = core.constants
const { passport, ssoCallbackUrl, google, oidc } = core.auth
const { checkResetPasswordCode } = require("../../../utilities/redis")
const { getGlobalDB } = require("@budibase/backend-core/tenancy")
const env = require("../../../environment")
import { events, users as usersCore, context } from "@budibase/backend-core"
import sdk from "../../../sdk"
import { User } from "@budibase/types"

const fetch = require('node-fetch');
const { newid, compare } = require("@budibase/backend-core/utils")
const { createASession } = require("@budibase/backend-core/sessions")
const { openJwt, signJwt } = require("@budibase/backend-core/utils")
const { users, UserStatus } = require("@budibase/backend-core")
const { getTenantId } = require("@budibase/backend-core/tenancy")

export const googleCallbackUrl = async (config: any) => {
  return ssoCallbackUrl(getGlobalDB(), config, "google")
}

export const oidcCallbackUrl = async (config: any) => {
  return ssoCallbackUrl(getGlobalDB(), config, "oidc")
}

async function authInternal(ctx: any, user: any, err = null, info = null) {
  if (err) {
    console.error("Authentication error", err)
    return ctx.throw(403, info ? info : "Unauthorized")
  }

  if (!user) {
    return ctx.throw(403, info ? info : "Unauthorized")
  }

  // set a cookie for browser access
  setCookie(ctx, user.token, Cookies.Auth, { sign: false })
  // set the token in a header as well for APIs
  ctx.set(Headers.TOKEN, user.token)
  // get rid of any app cookies on login
  // have to check test because this breaks cypress
  if (!env.isTest()) {
    clearCookie(ctx, Cookies.CurrentApp)
  }
}

export const authenticate = async (ctx: any, next: any) => {
  return passport.authenticate(
    "local",
    async (err: any, user: User, info: any) => {
      await authInternal(ctx, user, err, info)
      await context.identity.doInUserContext(user, async () => {
        await events.auth.login("local")
      })
      ctx.status = 200
    }
  )(ctx, next)
}

/** 
 * /api/global/auth/default/loginbytoken?redirect=%2Furlencoded%2F&token=xxx
 */
export const authenticateByToken = async (ctx: any, next: any) => {

  const token = decodeURI(ctx.request.query.token)

  const redirectURL = decodeURI(ctx.request.query.redirect)

  const resp_token_check = await fetch(env.FRT_SSO_TOKEN_VERIFY_URL, {
    method: 'GET',
    headers: {
        'Content-type': 'application/json',
        'Authorization': `Bearer ${token}`, // notice the Bearer before your token
    }
  });

  if(resp_token_check.status !== 200) {
    //ctx.body = '{ error: "Token invalid" }'
    ctx.body = '<h1 style="text-align: center;">Bạn chưa được phân quyền truy cập</h1>'
    ctx.status = 401
    return next
  }

  const tokenDataDecoded = await resp_token_check.json()

  if(tokenDataDecoded?.error !== undefined) {
    //ctx.body = '{ error: "Token invalid by SSO reject" }'
    ctx.body = '<h1 style="text-align: center;">Bạn chưa được phân quyền truy cập do đăng nhập thất bại</h1>'
    ctx.status = 401
    return next
  }

  if(tokenDataDecoded?.data.email == null) {
    //ctx.body = '{ error: "Token invalid by no email" }'
    ctx.body = '<h1 style="text-align: center;">Bạn chưa được phân quyền truy cập do tài khoản chưa có email FPT</h1>'
    ctx.status = 401
    return next
  }

  const dbUser = await users.getGlobalUserByEmail(tokenDataDecoded?.data.email)
  if (dbUser == null) {
    //ctx.body = `{ error: "User ${tokenDataDecoded.data.email} not found" }`
    ctx.body = `<h1 style="text-align: center;">Email ${tokenDataDecoded.data.email} của bạn chưa được phân quyền truy cập</h1>`
    ctx.status = 401
    return next
  }
  // check that the user is currently inactive, if this is the case throw invalid
  if (dbUser.status === UserStatus.INACTIVE) {
    //ctx.body = `{ error: "User ${tokenDataDecoded.data.email} Inactive" }`
    ctx.body = `<h1 style="text-align: center;">Email ${tokenDataDecoded.data.email} của bạn chưa được phân quyền truy cập</h1>`
    ctx.status = 401
    return next
  }

  // authenticate
  const sessionId = newid()
  const tenantId = getTenantId()

  await createASession(dbUser._id, { sessionId, tenantId })

  dbUser.token = signJwt(
    {
      userId: dbUser._id,
      sessionId,
      tenantId,
    }
  )

  await authInternal(ctx, dbUser)
  await context.identity.doInUserContext(dbUser, async () => {
    await events.auth.login("local")
  })

  //ctx.body = JSON.stringify(tokenDataDecoded?.data)
  //ctx.status = 200
  ctx.redirect(redirectURL)
}

export const setInitInfo = (ctx: any) => {
  const initInfo = ctx.request.body
  setCookie(ctx, initInfo, Cookies.Init)
  ctx.status = 200
}

export const getInitInfo = (ctx: any) => {
  try {
    ctx.body = getCookie(ctx, Cookies.Init) || {}
  } catch (err) {
    clearCookie(ctx, Cookies.Init)
    ctx.body = {}
  }
}

/**
 * Reset the user password, used as part of a forgotten password flow.
 */
export const reset = async (ctx: any) => {
  const { email } = ctx.request.body
  const configured = await isEmailConfigured()
  if (!configured) {
    ctx.throw(
      400,
      "Please contact your platform administrator, SMTP is not configured."
    )
  }
  try {
    const user = (await usersCore.getGlobalUserByEmail(email)) as User
    // only if user exists, don't error though if they don't
    if (user) {
      await sendEmail(email, EmailTemplatePurpose.PASSWORD_RECOVERY, {
        user,
        subject: "{{ company }} platform password reset",
      })
      await events.user.passwordResetRequested(user)
    }
  } catch (err) {
    console.log(err)
    // don't throw any kind of error to the user, this might give away something
  }
  ctx.body = {
    message: "Please check your email for a reset link.",
  }
}

/**
 * Perform the user password update if the provided reset code is valid.
 */
export const resetUpdate = async (ctx: any) => {
  const { resetCode, password } = ctx.request.body
  try {
    const { userId } = await checkResetPasswordCode(resetCode)
    const db = getGlobalDB()
    const user = await db.get(userId)
    user.password = await hash(password)
    await db.put(user)
    ctx.body = {
      message: "password reset successfully.",
    }
    // remove password from the user before sending events
    delete user.password
    await events.user.passwordReset(user)
  } catch (err) {
    console.error(err)
    ctx.throw(400, "Cannot reset password.")
  }
}

export const logout = async (ctx: any) => {
  if (ctx.user && ctx.user._id) {
    await platformLogout({ ctx, userId: ctx.user._id })
  }
  ctx.body = { message: "User logged out." }
}

export const datasourcePreAuth = async (ctx: any, next: any) => {
  const provider = ctx.params.provider
  const middleware = require(`@budibase/backend-core/middleware`)
  const handler = middleware.datasource[provider]

  setCookie(
    ctx,
    {
      provider,
      appId: ctx.query.appId,
      datasourceId: ctx.query.datasourceId,
    },
    Cookies.DatasourceAuth
  )

  return handler.preAuth(passport, ctx, next)
}

export const datasourceAuth = async (ctx: any, next: any) => {
  const authStateCookie = getCookie(ctx, Cookies.DatasourceAuth)
  const provider = authStateCookie.provider
  const middleware = require(`@budibase/backend-core/middleware`)
  const handler = middleware.datasource[provider]
  return handler.postAuth(passport, ctx, next)
}

/**
 * The initial call that google authentication makes to take you to the google login screen.
 * On a successful login, you will be redirected to the googleAuth callback route.
 */
export const googlePreAuth = async (ctx: any, next: any) => {
  const db = getGlobalDB()

  const config = await core.db.getScopedConfig(db, {
    type: Configs.GOOGLE,
    workspace: ctx.query.workspace,
  })
  let callbackUrl = await exports.googleCallbackUrl(config)
  const strategy = await google.strategyFactory(
    config,
    callbackUrl,
    sdk.users.save
  )

  return passport.authenticate(strategy, {
    scope: ["profile", "email"],
    accessType: "offline",
    prompt: "consent",
  })(ctx, next)
}

export const googleAuth = async (ctx: any, next: any) => {
  const db = getGlobalDB()

  const config = await core.db.getScopedConfig(db, {
    type: Configs.GOOGLE,
    workspace: ctx.query.workspace,
  })
  const callbackUrl = await exports.googleCallbackUrl(config)
  const strategy = await google.strategyFactory(
    config,
    callbackUrl,
    sdk.users.save
  )

  return passport.authenticate(
    strategy,
    { successRedirect: "/", failureRedirect: "/error" },
    async (err: any, user: User, info: any) => {
      await authInternal(ctx, user, err, info)
      await context.identity.doInUserContext(user, async () => {
        await events.auth.login("google-internal")
      })
      ctx.redirect("/")
    }
  )(ctx, next)
}

export const oidcStrategyFactory = async (ctx: any, configId: any) => {
  const db = getGlobalDB()
  const config = await core.db.getScopedConfig(db, {
    type: Configs.OIDC,
    group: ctx.query.group,
  })

  const chosenConfig = config.configs.filter((c: any) => c.uuid === configId)[0]
  let callbackUrl = await exports.oidcCallbackUrl(chosenConfig)

  //Remote Config
  const enrichedConfig = await oidc.fetchStrategyConfig(
    chosenConfig,
    callbackUrl
  )
  return oidc.strategyFactory(enrichedConfig, sdk.users.save)
}

/**
 * The initial call that OIDC authentication makes to take you to the configured OIDC login screen.
 * On a successful login, you will be redirected to the oidcAuth callback route.
 */
export const oidcPreAuth = async (ctx: any, next: any) => {
  const { configId } = ctx.params
  const strategy = await oidcStrategyFactory(ctx, configId)

  setCookie(ctx, configId, Cookies.OIDC_CONFIG)

  const db = getGlobalDB()
  const config = await core.db.getScopedConfig(db, {
    type: Configs.OIDC,
    group: ctx.query.group,
  })

  const chosenConfig = config.configs.filter((c: any) => c.uuid === configId)[0]

  let authScopes =
    chosenConfig.scopes?.length > 0
      ? chosenConfig.scopes
      : ["profile", "email", "offline_access"]

  return passport.authenticate(strategy, {
    // required 'openid' scope is added by oidc strategy factory
    scope: authScopes,
  })(ctx, next)
}

export const oidcAuth = async (ctx: any, next: any) => {
  const configId = getCookie(ctx, Cookies.OIDC_CONFIG)
  const strategy = await oidcStrategyFactory(ctx, configId)

  return passport.authenticate(
    strategy,
    { successRedirect: "/", failureRedirect: "/error" },
    async (err: any, user: any, info: any) => {
      await authInternal(ctx, user, err, info)
      await context.identity.doInUserContext(user, async () => {
        await events.auth.login("oidc")
      })
      ctx.redirect("/")
    }
  )(ctx, next)
}
