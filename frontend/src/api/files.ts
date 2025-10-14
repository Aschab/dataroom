import client from './client'
import type { File } from '@/types'

export const filesApi = {
  upload: async (file: globalThis.File, name: string, folder_id?: number): Promise<File> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    if (folder_id) {
      formData.append('folder_id', folder_id.toString())
    }

    const response = await client.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.file
  },

  get: async (id: number): Promise<File> => {
    const response = await client.get(`/files/${id}`)
    return response.data.file
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/files/${id}`)
  },

  getDownloadUrl: (id: number): string => {
    return `${client.defaults.baseURL}/files/${id}/download`
  },

  getPreviewUrl: (id: number): string => {
    return `${client.defaults.baseURL}/files/${id}/preview`
  },
}
