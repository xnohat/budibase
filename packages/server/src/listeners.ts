import eventEmitter from "./events"
import { cache } from "@budibase/backend-core/cache" //generic cache
import { buildCtx } from "./automations/steps/utils"
import { context } from "@budibase/backend-core"
const rowController = require("./api/controllers/row")

export function init() {
    console.log('Event listeners initialized.')
}

/***********
Events
**********/
eventEmitter.on("row:save", async function (event) {
    /* istanbul ignore next */
    if (!event || !event.row || !event.row.tableId) {
      return
    }
    if (event.appId == null) {
      console.log(`No appId specified for row:save - check event emitters.`)
      return
    }

    purge_cache_rows_api_search(event.appId, event.row.tableId)
})

eventEmitter.on("row:update", async function (event) {
    /* istanbul ignore next */
    if (!event || !event.row || !event.row.tableId) {
      return
    }
    if (event.appId == null) {
      console.log(`No appId specified for row:update - check event emitters.`)
      return
    }

    purge_cache_rows_api_search(event.appId, event.row.tableId)
})

eventEmitter.on("row:delete", async function (event) {
    /* istanbul ignore next */
    if (!event || !event.row || !event.row.tableId) {
      return
    }
    if (event.appId == null) {
      console.log(`No appId specified for row:delete - check event emitters.`)
      return
    }

    purge_cache_rows_api_search(event.appId, event.row.tableId)
})

eventEmitter.on("table:save", async function (event) {
    /* istanbul ignore next */
    if (!event || !event.table || !event.table.tableId) {
      return
    }
    if (event.appId == null) {
      console.log(`No appId specified for table:save - check event emitters.`)
      return
    }

    purge_cache_rows_api_search(event.appId, event.table.tableId)
})

eventEmitter.on("table:delete", async function (event) {
    /* istanbul ignore next */
    if (!event || !event.table || !event.table.tableId) {
      return
    }
    if (event.appId == null) {
      console.log(`No appId specified for table:delete - check event emitters.`)
      return
    }

    purge_cache_rows_api_search(event.appId, event.table.tableId)
})

/*********
Actions
**********/
async function purge_cache_rows_api_search (appId: any, tableId: any){
    let keys = await cache.keys("row_api_search_:app_"+appId+":table_"+tableId+":payload_*")
    //console.log('purge_cache_rows_api_search', keys)
    //Purge cache
    keys.forEach(async (key: any) => {
        await cache.delete(key.replace('data_cache-','').replace(':default',''))
    })
    //await rebuild_cache_rows_api_search(appId, tableId, keys)
}

//This function is not currently used, because performance impact, but could be used to rebuild the cache after a purge.
async function rebuild_cache_rows_api_search(appId: any, tableId: any, keys: any){
    //This function need keys to be passed in, as the cache has already been purged.
    //Rebuild cache
    keys.forEach(async (key: any) => {
        let base64_encoded_payload = key.split(':')[3].replace('payload_','')
        let payload = Buffer.from(base64_encoded_payload, 'base64').toString('utf8')
        console.log('Rebuilding cache for:',payload)

        const ctx: any = buildCtx(appId, null,
                    {
                        params: {
                            tableId: tableId,
                        },
                        body: JSON.parse(payload),
                        version: "1",
                    }
                )

        try {
            await context.doInContext(appId, async () => {
                await rowController.search(ctx)
            })
        } catch (err) {
            const errJson = JSON.stringify(err)
            console.error(`Error on Rebuilding Cache - ${errJson}`)
            console.trace(err)
        }
    })
}