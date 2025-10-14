import client from './client'
import type { AuthResponse, User } from '@/types'

export const authApi = {
  register: async (email: string, name: string, password: string): Promise<AuthResponse> => {
    const response = await client.post('/auth/register', { email, name, password })
    return response.data
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await client.post('/auth/login', { email, password })
    return response.data
  },

  getMe: async (): Promise<User> => {
    const response = await client.get('/auth/me')
    return response.data.user
  },
}
