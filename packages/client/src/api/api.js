import { createAPIClient } from "@budibase/frontend-core"
import { notificationStore } from "../stores"

export const API = createAPIClient({
  // Enable caching of cacheable endpoints to speed things up,
  enableCaching: true,

  // Attach client specific headers
  attachHeaders: headers => {
    // Attach app ID header
    headers["x-budibase-app-id"] = window["##BUDIBASE_APP_ID##"]

    // Attach client header if not inside the builder preview
    if (!window["##BUDIBASE_IN_BUILDER##"]) {
      headers["x-budibase-type"] = "client"
    }
  },

  // Show an error notification for all API failures.
  // We could also log these to sentry.
  // Or we could check error.status and redirect to login on a 403 etc.
  onError: error => {
    const { status, method, url, message, handled } = error || {}

    // Log any errors that we haven't manually handled
    if (!handled) {
      console.error("Unhandled error from API client", error)
      return
    }

    // Notify all errors
    if (message) {
      // Don't notify if the URL contains the word analytics as it may be
      // blocked by browser extensions
      if (!url?.includes("analytics")) {
        notificationStore.actions.error(message)
      }
    }

    // Log all errors to console
    console.warn(`[Client] HTTP ${status} on ${method}:${url}\n\t${message}`)
  },
})