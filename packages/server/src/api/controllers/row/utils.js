const validateJs = require("validate.js")
const { cloneDeep } = require("lodash/fp")
const { InternalTables } = require("../../../db/utils")
const userController = require("../user")
const { FieldTypes } = require("../../../constants")
const { getAppDB } = require("@budibase/backend-core/context")
const { makeExternalQuery } = require("../../../integrations/base/query")
const { removeKeyNumbering } = require("../../../integrations/base/utils")

validateJs.extend(validateJs.validators.datetime, {
  parse: function (value) {
    return new Date(value).getTime()
  },
  // Input is a unix timestamp
  format: function (value) {
    return new Date(value).toISOString()
  },
})

exports.removeKeyNumbering = removeKeyNumbering

exports.getDatasourceAndQuery = async json => {
  const datasourceId = json.endpoint.datasourceId
  const db = getAppDB()
  const datasource = await db.get(datasourceId)
  return makeExternalQuery(datasource, json)
}

exports.findRow = async (ctx, tableId, rowId) => {
  const db = getAppDB()
  let row
  // TODO remove special user case in future
  if (tableId === InternalTables.USER_METADATA) {
    ctx.params = {
      id: rowId,
    }
    await userController.findMetadata(ctx)
    row = ctx.body
  } else {
    row = await db.get(rowId)
  }
  if (row.tableId !== tableId) {
    throw "Supplied tableId does not match the rows tableId"
  }
  return row
}

exports.validate = async ({ tableId, row, table }) => {
  if (!table) {
    const db = getAppDB()
    table = await db.get(tableId)
  }
  const errors = {}
  for (let fieldName of Object.keys(table.schema)) {
    const constraints = cloneDeep(table.schema[fieldName].constraints)
    const type = table.schema[fieldName].type
    // formulas shouldn't validated, data will be deleted anyway
    if (type === FieldTypes.FORMULA) {
      continue
    }
    // special case for options, need to always allow unselected (null)
    if (type === FieldTypes.OPTIONS && constraints.inclusion) {
      constraints.inclusion.push(null)
    }
    let res

    // Validate.js doesn't seem to handle array
    if (type === FieldTypes.ARRAY && row[fieldName]) {
      if (row[fieldName].length) {
        if (!Array.isArray(row[fieldName])) {
          row[fieldName] = row[fieldName].split(",")
        }
        row[fieldName].map(val => {
          if (
            !constraints.inclusion.includes(val) &&
            constraints.inclusion.length !== 0
          ) {
            errors[fieldName] = "Field not in list"
          }
        })
      } else if (constraints.presence && row[fieldName].length === 0) {
        // non required MultiSelect creates an empty array, which should not throw errors
        errors[fieldName] = [`${fieldName} is required`]
      }
    } else if (
      (type === FieldTypes.ATTACHMENT || type === FieldTypes.JSON) &&
      typeof row[fieldName] === "string"
    ) {
      // this should only happen if there is an error
      try {
        const json = JSON.parse(row[fieldName])
        if (type === FieldTypes.ATTACHMENT) {
          if (Array.isArray(json)) {
            row[fieldName] = json
          } else {
            errors[fieldName] = [`Must be an array`]
          }
        }
      } catch (err) {
        errors[fieldName] = [`Contains invalid JSON`]
      }
    } else {
      res = validateJs.single(row[fieldName], constraints)
    }
    if (res) errors[fieldName] = res
  }
  return { valid: Object.keys(errors).length === 0, errors }
}

exports.getTableId = async (ctx) => {
  if (ctx.request.body && ctx.request.body.tableId) {
    return ctx.request.body.tableId
  }
  if (ctx.params && ctx.params.tableId) {
    return ctx.params.tableId
  }
  if (ctx.params && ctx.params.viewName) {
    return ctx.params.viewName
  }
}