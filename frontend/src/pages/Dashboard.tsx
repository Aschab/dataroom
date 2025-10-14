import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useToast } from '@/components/common/Toast'
import { foldersApi } from '@/api/folders'
import { filesApi } from '@/api/files'
import { searchApi } from '@/api/search'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { formatFileSize, formatDate, debounce } from '@/lib/utils'
import type { Folder, File } from '@/types'

export function Dashboard() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [showOwnedOnly, setShowOwnedOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ folders: Folder[]; files: File[] } | null>(null)

  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  const [showUploadFile, setShowUploadFile] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null)
  const [fileName, setFileName] = useState('')

  const loadData = async () => {
    try {
      const folderData = await foldersApi.list(showOwnedOnly)
      setFolders(folderData)
      setLoading(false)
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to load data', 'error')
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [showOwnedOnly])

  const handleSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (query.length < 2) {
          setSearchResults(null)
          return
        }
        try {
          const results = await searchApi.search(query)
          setSearchResults({ folders: results.folders, files: results.files })
        } catch (error) {
          console.error('Search failed:', error)
        }
      }, 300),
    []
  )

  useEffect(() => {
    handleSearch(searchQuery)
  }, [searchQuery, handleSearch])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      await foldersApi.create(newFolderName)
      showToast('Folder created successfully', 'success')
      setShowCreateFolder(false)
      setNewFolderName('')
      loadData()
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to create folder', 'error')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Only PDF files are allowed', 'error')
        return
      }
      setSelectedFile(file)
      setFileName(file.name.replace('.pdf', ''))
    }
  }

  const handleUploadFile = async () => {
    if (!selectedFile || !fileName.trim()) return
    setUploadingFile(true)
    try {
      await filesApi.upload(selectedFile, fileName)
      showToast('File uploaded successfully', 'success')
      setShowUploadFile(false)
      setSelectedFile(null)
      setFileName('')
      loadData()
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to upload file', 'error')
    } finally {
      setUploadingFile(false)
    }
  }

  const displayFolders = searchResults?.folders || folders
  const displayFiles = searchResults?.files || []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Dataroom</h1>
            </div>

            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {searchResults ? `Search results for "${searchQuery}"` : 'All Files'}
            </h2>
            {!searchResults && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOwnedOnly}
                  onChange={(e) => setShowOwnedOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">My files only</span>
              </label>
            )}
          </div>

          {user && !searchResults && (
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateFolder(true)}>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Folder
              </Button>
              <Button onClick={() => setShowUploadFile(true)}>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload File
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayFolders.map((folder) => (
              <div
                key={folder.id}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{folder.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">by {folder.owner_name}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(folder.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}

            {displayFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{formatFileSize(file.size_bytes)}</p>
                    <p className="text-xs text-gray-400">by {file.owner_name}</p>
                    <p className="text-xs text-gray-400">{formatDate(file.uploaded_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && displayFolders.length === 0 && displayFiles.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a folder or uploading a file.</p>
          </div>
        )}
      </main>

      <Modal isOpen={showCreateFolder} onClose={() => setShowCreateFolder(false)} title="Create New Folder">
        <div className="space-y-4">
          <Input
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowCreateFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} loading={creatingFolder}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showUploadFile} onClose={() => setShowUploadFile(false)} title="Upload File">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select PDF File</label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
          {selectedFile && (
            <Input
              label="Display Name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
            />
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowUploadFile(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadFile} loading={uploadingFile} disabled={!selectedFile || !fileName.trim()}>
              Upload
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
