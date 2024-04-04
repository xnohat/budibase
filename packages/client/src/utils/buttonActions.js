import { get } from "svelte/store"
import download from "downloadjs"
import {
  routeStore,
  builderStore,
  confirmationStore,
  authStore,
  stateStore,
  notificationStore,
  dataSourceStore,
  uploadStore,
  rowSelectionStore,
} from "stores"
import { API } from "api"
import { ActionTypes } from "constants"
import { enrichDataBindings } from "./enrichDataBinding"
import { Helpers } from "@budibase/bbui"

let debug = false

const saveRowHandler = async (action, context) => {
  const { fields, providerId, tableId } = action.parameters
  let payload
  if (providerId) {
    payload = { ...context[providerId] }
  } else {
    payload = {}
  }
  if (fields) {
    for (let [field, value] of Object.entries(fields)) {
      Helpers.deepSet(payload, field, value)
    }
  }
  if (tableId) {
    payload.tableId = tableId
  }
  try {
    const row = await API.saveRow(payload)
    notificationStore.actions.success("Row saved")

    // Refresh related datasources
    await dataSourceStore.actions.invalidateDataSource(row.tableId, {
      invalidateRelationships: true,
    })

    return { row }
  } catch (error) {
    // Abort next actions
    return false
  }
}

const duplicateRowHandler = async (action, context) => {
  const { fields, providerId, tableId } = action.parameters
  if (providerId) {
    let payload = { ...context[providerId] }
    if (fields) {
      for (let [field, value] of Object.entries(fields)) {
        Helpers.deepSet(payload, field, value)
      }
    }
    if (tableId) {
      payload.tableId = tableId
    }
    delete payload._id
    delete payload._rev
    try {
      const row = await API.saveRow(payload)
      notificationStore.actions.success("Row saved")

      // Refresh related datasources
      await dataSourceStore.actions.invalidateDataSource(row.tableId, {
        invalidateRelationships: true,
      })

      return { row }
    } catch (error) {
      // Abort next actions
      return false
    }
  }
}

const deleteRowHandler = async action => {
  const { tableId, revId, rowId } = action.parameters
  if (tableId && rowId) {
    try {
      await API.deleteRow({ tableId, rowId, revId })
      notificationStore.actions.success("Row deleted")

      // Refresh related datasources
      await dataSourceStore.actions.invalidateDataSource(tableId, {
        invalidateRelationships: true,
      })
    } catch (error) {
      // Abort next actions
      return false
    }
  }
}

const triggerAutomationHandler = async action => {
  const { fields } = action.parameters
  if (fields) {
    try {
      const result = await API.triggerAutomation({
        automationId: action.parameters.automationId,
        fields,
      })
      notificationStore.actions.success("Automation triggered")
      return { result }
    } catch (error) {
      // Abort next actions
      return false
    }
  }
}

const navigationHandler = action => {
  const { url, peek } = action.parameters
  routeStore.actions.navigate(url, peek)
}

const queryExecutionHandler = async action => {
  const { datasourceId, queryId, queryParams } = action.parameters
  try {
    const query = await API.fetchQueryDefinition(queryId)
    if (query?.datasourceId == null) {
      notificationStore.actions.error("That query couldn't be found")
      return false
    }
    const result = await API.executeQuery({
      datasourceId,
      queryId,
      parameters: queryParams,
    })

    // Trigger a notification and invalidate the datasource as long as this
    // was not a readable query
    if (!query.readable) {
      notificationStore.actions.success("Query executed successfully")
      await dataSourceStore.actions.invalidateDataSource(query.datasourceId)
    }

    return { result }
  } catch (error) {
    notificationStore.actions.error(
      "An error occurred while executing the query"
    )

    // Abort next actions
    return false
  }
}

const executeActionHandler = async (
  context,
  componentId,
  actionType,
  params
) => {
  const fn = context[`${componentId}_${actionType}`]
  if (fn) {
    return await fn(params)
  }
}

const updateFieldValueHandler = async (action, context) => {
  return await executeActionHandler(
    context,
    action.parameters.componentId,
    ActionTypes.UpdateFieldValue,
    {
      type: action.parameters.type,
      field: action.parameters.field,
      value: action.parameters.value,
    }
  )
}

const validateFormHandler = async (action, context) => {
  return await executeActionHandler(
    context,
    action.parameters.componentId,
    ActionTypes.ValidateForm
  )
}

const refreshDataProviderHandler = async (action, context) => {
  return await executeActionHandler(
    context,
    action.parameters.componentId,
    ActionTypes.RefreshDatasource
  )
}

const logoutHandler = async action => {
  await authStore.actions.logOut()
  let redirectUrl = "/builder/auth/login"
  let internal = false
  if (action.parameters.redirectUrl) {
    internal = action.parameters.redirectUrl?.startsWith("/")
    redirectUrl = routeStore.actions.createFullURL(
      action.parameters.redirectUrl
    )
  }
  window.location.href = redirectUrl
  if (internal) {
    window.location.reload()
  }
}

const clearFormHandler = async (action, context) => {
  return await executeActionHandler(
    context,
    action.parameters.componentId,
    ActionTypes.ClearForm
  )
}

const changeFormStepHandler = async (action, context) => {
  return await executeActionHandler(
    context,
    action.parameters.componentId,
    ActionTypes.ChangeFormStep,
    action.parameters
  )
}

const closeScreenModalHandler = action => {
  let url
  if (action?.parameters) {
    url = action.parameters.url
  }
  // Emit this as a window event, so parent screens which are iframing us in
  // can close the modal
  window.parent.postMessage({ type: "close-screen-modal", url })
}

const updateStateHandler = action => {
  const { type, key, value, persist } = action.parameters
  if (type === "set") {
    stateStore.actions.setValue(key, value, persist)
  } else if (type === "delete") {
    stateStore.actions.deleteValue(key)
  }

  // Emit this as an event so that parent windows which are iframing us in
  // can also update their state
  if (get(routeStore).queryParams?.peek) {
    window.parent.postMessage({
      type: "update-state",
      detail: { type, key, value, persist },
    })
  }
}

const s3UploadHandler = async action => {
  const { componentId } = action.parameters
  if (!componentId) {
    return
  }
  const res = await uploadStore.actions.processFileUpload(componentId)
  return {
    publicUrl: res?.publicUrl,
  }
}

const exportDataHandler = async action => {
  let selection = rowSelectionStore.actions.getSelection(
    action.parameters.tableComponentId
  )
  if (selection.selectedRows && selection.selectedRows.length > 0) {
    try {
      const data = await API.exportRows({
        tableId: selection.tableId,
        rows: selection.selectedRows,
        format: action.parameters.type,
        columns: action.parameters.columns,
      })
      download(data, `${selection.tableId}.${action.parameters.type}`)
    } catch (error) {
      notificationStore.actions.error("There was an error exporting the data")
    }
  } else {
    notificationStore.actions.error("Please select at least one row")
  }
}

const continueIfHandler = action => {
  const { type, value, operator, referenceValue } = action.parameters
  if (!type || !operator) {
    return
  }
  let match = false
  if (value == null && referenceValue == null) {
    match = true
  } else if (value === referenceValue) {
    match = true
  } else {
    match = JSON.stringify(value) === JSON.stringify(referenceValue)
  }
  if (type === "continue") {
    return operator === "equal" ? match : !match
  } else {
    return operator === "equal" ? !match : match
  }
}

const gotoIfHandler = action => {
  let { value, operator, referenceValue } = action.parameters
  if (!operator) {
    return
  }

  // coerce types so that we can use them
  if (!isNaN(value) && !isNaN(referenceValue)) {
    value = parseFloat(value)
    referenceValue = parseFloat(referenceValue)
  } else if (!isNaN(Date.parse(value)) && !isNaN(Date.parse(referenceValue))) {
    value = Date.parse(value)
    referenceValue = Date.parse(referenceValue)
  }

  if (typeof referenceValue !== "object" && typeof value !== "object") {
    switch (operator) {
      case "equal":
        return value === referenceValue
      case "notEqual":
        return value !== referenceValue
      case "greaterThan":
        return value > referenceValue
      case "lessThan":
        return value < referenceValue
      case "greaterThanOrEqual":
        return value >= referenceValue
      case "lessThanOrEqual":
        return value <= referenceValue
      default:
        return false
    }
  } else {
    return false
  }
}

const stopHandler = action => {
  return false
}

const debugHandler = action => {
  debug = JSON.parse(action.parameters.debug.toLowerCase()) //set global to true/false
  console.log("Step: 1")
  console.log("Debug:", action.parameters.debug)
  return true
}

const showNotificationHandler = action => {
  const { message, type, autoDismiss } = action.parameters
  if (!message || !type) {
    return
  }
  notificationStore.actions[type]?.(message, autoDismiss)
}

const handlerMap = {
  ["Save Row"]: saveRowHandler,
  ["Duplicate Row"]: duplicateRowHandler,
  ["Delete Row"]: deleteRowHandler,
  ["Navigate To"]: navigationHandler,
  ["Execute Query"]: queryExecutionHandler,
  ["Trigger Automation"]: triggerAutomationHandler,
  ["Validate Form"]: validateFormHandler,
  ["Update Field Value"]: updateFieldValueHandler,
  ["Refresh Data Provider"]: refreshDataProviderHandler,
  ["Log Out"]: logoutHandler,
  ["Clear Form"]: clearFormHandler,
  ["Close Screen Modal"]: closeScreenModalHandler,
  ["Change Form Step"]: changeFormStepHandler,
  ["Update State"]: updateStateHandler,
  ["Upload File to S3"]: s3UploadHandler,
  ["Export Data"]: exportDataHandler,
  ["Continue if / Stop if"]: continueIfHandler,
  ["Goto if"]: gotoIfHandler,
  ["Stop"]: stopHandler,
  ["Debug"]: debugHandler,
  ["Show Notification"]: showNotificationHandler,
}

const confirmTextMap = {
  ["Delete Row"]: "Are you sure you want to delete this row?",
  ["Save Row"]: "Are you sure you want to save this row?",
  ["Execute Query"]: "Are you sure you want to execute this query?",
  ["Trigger Automation"]: "Are you sure you want to trigger this automation?",
}

/**
 * Parses an array of actions and returns a function which will execute the
 * actions in the current context.
 * init_index is used to skip the first few actions in the array, default is 0
 * A handler returning `false` is a flag to stop execution of handlers
 */
export const enrichButtonActions = (actions, context, init_index=0) => {
  // Prevent button actions in the builder preview
  if (!actions?.length || get(builderStore).inBuilder) {
    return null
  }

  // If this is a function then it has already been enriched
  if (typeof actions === "function") {
    return actions
  }

  const handlers = actions.map(def => handlerMap[def["##eventHandlerType"]])
  return async eventContext => {
    // Button context is built up as actions are executed.
    // Inherit any previous button context which may have come from actions
    // before a confirmable action since this breaks the chain.
    let buttonContext = context.actions || []
    let stepnumber = 0
    let infinitiveGotoLoopProtectCounter = 0
    for (let i = init_index; i < handlers.length; i++) {
      try {
        // Skip any non-existent action definitions
        if (!handlers[i]) {
          continue
        }

        // Built total context for this action
        const totalContext = {
          ...context,
          state: get(stateStore),
          actions: buttonContext,
          eventContext,
        }

        // Get and enrich this button action with the total context
        let action = actions[i]
        action = enrichDataBindings(action, totalContext)
        const callback = async () => handlers[i](action, totalContext)

        // If this action is confirmable, show confirmation and await a
        // callback to execute further actions
        if (action.parameters?.confirm) {
          debug && console.log("Step:", i+1)
          debug && console.log("Running action:", action)
          return new Promise(resolve => {
            const defaultText = confirmTextMap[action["##eventHandlerType"]]
            const confirmText = action.parameters?.confirmText || defaultText
            confirmationStore.actions.showConfirmation(
              action["##eventHandlerType"],
              confirmText,
              async () => {
                // When confirmed, execute this action immediately,
                // then execute the rest of the actions in the chain
                const result = await callback()
                if (result !== false) {
                  // Generate a new total context to pass into the next enrichment
                  buttonContext.push(result)
                  const newContext = { ...context, actions: buttonContext }

                  // Enrich and call the next button action
                  const next = enrichButtonActions(
                    actions,//actions.slice(i + 1),
                    newContext,
                    i + 1
                  )
                  resolve(await next())
                } else {
                  resolve(false)
                }
              },
              () => {
                resolve(false)
              }
            )
          })
        }

        // For non-confirmable actions, execute the handler immediately
        else {
          debug && console.log("Step:", i+1)
          debug && console.log("Running action:", action)
          const result = await callback()
          debug && console.log("result:", result)

          //Goto step if result is true
          if(action["##eventHandlerType"] === "Goto if" && result === true) {
            let maxGotoLoop = action.parameters.maxloop ? parseInt(action.parameters.maxloop) : 100
            // if infinitive goto loop detected, stop the goto loop immediately
            if(infinitiveGotoLoopProtectCounter >= maxGotoLoop) {
              buttonContext.push(result)
              continue
            }
            infinitiveGotoLoopProtectCounter++

            stepnumber = parseInt(action.parameters.gotostep)
            i = stepnumber - 1 - 1 // -1 for i++ and -1 for goto step
            buttonContext.push(result)
            continue //jump now by skip current iteration
          }

          // Stop executing further actions on false
          if (result === false && action["##eventHandlerType"] !== "Goto if") {
            return
          } else {
            buttonContext.push(result)
          }
        }
      } catch (error) {
        console.error("Error while executing button handler")
        console.error(error)
        // Stop executing further actions on error
        return
      }
    }
  }
}
