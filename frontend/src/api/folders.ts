import client from './client'
import type { Folder, FolderContents, File } from '@/types'

export const foldersApi = {
  list: async (owned: boolean = false): Promise<{ folders: Folder[]; files: File[] }> => {
    const response = await client.get('/folders', { params: { owned } })
    return { folders: response.data.folders, files: response.data.files }
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
