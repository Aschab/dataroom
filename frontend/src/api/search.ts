import client from './client'
import type { SearchResults } from '@/types'

export const searchApi = {
  search: async (query: string): Promise<SearchResults> => {
    const response = await client.get('/search', { params: { q: query } })
    return response.data
  },
}
