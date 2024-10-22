import { writable, get } from "svelte/store"
import { tables, datasources, queries } from "./"
import { API } from "api"

export function createViewsStore() {
  const { subscribe, update } = writable({
    list: [],
    selected: null,
  })

  return {
    subscribe,
    update,
    select: view => {
      update(state => ({
        ...state,
        selected: view,
      }))
      tables.unselect()
      queries.unselect()
      datasources.unselect()
    },
    unselect: () => {
      update(state => ({
        ...state,
        selected: null,
      }))
    },
    delete: async view => {
      await API.deleteView(view)
      //await tables.fetch()
      // Update tables
      tables.update(state => {
        const table = state.list.find(table => table._id === view.tableId)
        if (table) {
          delete table.views[view.name]
        }
        return { ...state }
    })
    },
    save: async view => {
      const savedView = await API.saveView(view)

      // Update tables
      tables.update(state => {
        const table = state.list.find(table => table._id === view.tableId)
        if (table) {
          if (view.originalName) {
            delete table.views[view.originalName]
          }
          table.views[view.name] = savedView
        }
        return { ...state }
      })      
    },
  }
}

export const views = createViewsStore()
