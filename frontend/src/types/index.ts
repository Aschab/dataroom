export interface User {
  id: number
  email: string
  name: string
  role: 'user' | 'admin'
  created_at: string
  last_login: string | null
}

export interface Folder {
  id: number
  name: string
  parent_id: number | null
  owner_id: number
  owner_name: string
  created_at: string
  updated_at: string
}

export interface File {
  id: number
  name: string
  original_filename: string
  size_bytes: number
  mime_type: string
  folder_id: number | null
  owner_id: number
  owner_name: string
  uploaded_at: string
  updated_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface FolderContents {
  folder: Folder
  subfolders: Folder[]
  files: File[]
}

export interface SearchResults {
  query: string
  folders: Folder[]
  files: File[]
  limit: number
  offset: number
}
