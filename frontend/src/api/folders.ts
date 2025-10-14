import client from './client'
import type { Folder, FolderContents } from '@/types'

export const foldersApi = {
  list: async (owned: boolean = false): Promise<Folder[]> => {
    const response = await client.get('/folders', { params: { owned } })
    return response.data.folders
  },

  get: async (id: number): Promise<FolderContents> => {
    const response = await client.get(`/folders/${id}`)
    return response.data
  },

  create: async (name: string, parent_id?: number): Promise<Folder> => {
    const response = await client.post('/folders', { name, parent_id })
    return response.data.folder
  },

  update: async (id: number, name: string): Promise<Folder> => {
    const response = await client.put(`/folders/${id}`, { name })
    return response.data.folder
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/folders/${id}`)
  },
}
