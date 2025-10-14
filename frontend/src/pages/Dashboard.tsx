import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useToast } from '@/components/common/Toast'
import { foldersApi } from '@/api/folders'
import { filesApi } from '@/api/files'
import { searchApi } from '@/api/search'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { DropdownMenu, DropdownItem } from '@/components/common/DropdownMenu'
import { formatFileSize, formatDate, debounce, cn } from '@/lib/utils'
import type { Folder, File } from '@/types'

export function Dashboard() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()

  // Navigation state
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null)
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([])

  // Data state
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [showOwnedOnly, setShowOwnedOnly] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ folders: Folder[]; files: File[] } | null>(null)

  // Create folder modal
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Upload file modal
  const [showUploadFile, setShowUploadFile] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null)
  const [fileName, setFileName] = useState('')

  // Rename modal
  const [showRename, setShowRename] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{ type: 'folder' | 'file'; id: number; name: string } | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renaming, setRenaming] = useState(false)

  // Delete modal
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'file'; id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Drag and drop
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const loadData = async (folderId: number | null = null) => {
    setLoading(true)
    try {
      if (folderId) {
        const data = await foldersApi.get(folderId)
        setCurrentFolder(data.folder)
        setFolders(data.subfolders)
        setFiles(data.files)
        await buildBreadcrumbs(data.folder)
      } else {
        const folderData = await foldersApi.list(showOwnedOnly)
        setCurrentFolder(null)
        setFolders(folderData)
        setFiles([])
        setBreadcrumbs([])
      }
      setLoading(false)
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to load data', 'error')
      setLoading(false)
    }
  }

  const buildBreadcrumbs = async (folder: Folder) => {
    const crumbs: Folder[] = [folder]
    let currentParentId = folder.parent_id

    while (currentParentId) {
      try {
        const parentData = await foldersApi.get(currentParentId)
        crumbs.unshift(parentData.folder)
        currentParentId = parentData.folder.parent_id
      } catch {
        break
      }
    }

    setBreadcrumbs(crumbs)
  }

  useEffect(() => {
    loadData(currentFolderId)
  }, [currentFolderId, showOwnedOnly])

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

  const handleFolderClick = (folderId: number) => {
    setCurrentFolderId(folderId)
    setSearchQuery('')
    setSearchResults(null)
  }

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentFolderId(null)
    } else {
      setCurrentFolderId(breadcrumbs[index].id)
    }
    setSearchQuery('')
    setSearchResults(null)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      await foldersApi.create(newFolderName, currentFolderId || undefined)
      showToast('Folder created successfully', 'success')
      setShowCreateFolder(false)
      setNewFolderName('')
      loadData(currentFolderId)
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
      await filesApi.upload(selectedFile, fileName, currentFolderId || undefined)
      showToast('File uploaded successfully', 'success')
      setShowUploadFile(false)
      setSelectedFile(null)
      setFileName('')
      loadData(currentFolderId)
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to upload file', 'error')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return
    setRenaming(true)
    try {
      if (renameTarget.type === 'folder') {
        await foldersApi.update(renameTarget.id, renameName)
        showToast('Folder renamed successfully', 'success')
      } else {
        // File rename would need a new API endpoint - for now just show message
        showToast('File rename not yet implemented', 'info')
      }
      setShowRename(false)
      setRenameTarget(null)
      setRenameName('')
      loadData(currentFolderId)
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to rename', 'error')
    } finally {
      setRenaming(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'folder') {
        await foldersApi.delete(deleteTarget.id)
        showToast('Folder deleted successfully', 'success')
      } else {
        await filesApi.delete(deleteTarget.id)
        showToast('File deleted successfully', 'success')
      }
      setShowDelete(false)
      setDeleteTarget(null)
      loadData(currentFolderId)
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const openRenameModal = (type: 'folder' | 'file', id: number, name: string) => {
    setRenameTarget({ type, id, name })
    setRenameName(name)
    setShowRename(true)
  }

  const openDeleteModal = (type: 'folder' | 'file', id: number, name: string) => {
    setDeleteTarget({ type, id, name })
    setShowDelete(true)
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    const droppedFiles = Array.from(e.dataTransfer.files)
    const pdfFiles = droppedFiles.filter(file => file.name.toLowerCase().endsWith('.pdf'))

    if (pdfFiles.length === 0) {
      showToast('Only PDF files are allowed', 'error')
      return
    }

    if (!user) {
      showToast('Please login to upload files', 'error')
      return
    }

    if (currentFolder && currentFolder.owner_id !== user.id) {
      showToast('You can only upload files to your own folders', 'error')
      return
    }

    for (const file of pdfFiles) {
      try {
        const name = file.name.replace('.pdf', '')
        await filesApi.upload(file, name, currentFolderId || undefined)
        showToast(`${file.name} uploaded successfully`, 'success')
      } catch (error: any) {
        showToast(error.response?.data?.error || `Failed to upload ${file.name}`, 'error')
      }
    }

    loadData(currentFolderId)
  }

  const canCreateInCurrentFolder = !currentFolder || currentFolder.owner_id === user?.id
  const displayFolders = searchResults?.folders || folders
  const displayFiles = searchResults?.files || files

  return (
    <div
      className="min-h-screen bg-gray-50"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl p-12 shadow-2xl border-4 border-blue-500 border-dashed">
            <svg className="w-20 h-20 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-2xl font-bold text-gray-900">Drop PDF files here</p>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dataroom</h1>
            </div>

            <div className="flex-1 w-full sm:max-w-md lg:max-w-2xl">
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

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm text-gray-700 hidden sm:inline">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <span className="hidden sm:inline">Logout</span>
                <svg className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Breadcrumbs */}
        {!searchResults && (
          <div className="flex items-center gap-2 text-sm mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className="text-blue-600 hover:text-blue-700 hover:underline flex-shrink-0 transition-colors"
            >
              Home
            </button>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center gap-2 flex-shrink-0">
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {searchResults ? `Search results for "${searchQuery}"` : currentFolder ? currentFolder.name : 'All Files'}
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
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setShowCreateFolder(true)}
                disabled={!canCreateInCurrentFolder}
                className="flex-1 sm:flex-initial"
                size="sm"
              >
                <svg className="w-5 h-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New Folder</span>
              </Button>
              <Button
                onClick={() => setShowUploadFile(true)}
                disabled={!canCreateInCurrentFolder}
                className="flex-1 sm:flex-initial"
                size="sm"
              >
                <svg className="w-5 h-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </div>
          )}
        </div>

        {!canCreateInCurrentFolder && currentFolder && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            You can view this folder but cannot create files or subfolders (owned by {currentFolder.owner_name})
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayFolders.map((folder) => (
              <div
                key={folder.id}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 group relative"
              >
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => handleFolderClick(folder.id)}
                >
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
                {user && folder.owner_id === user.id && (
                  <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu
                      trigger={
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      }
                    >
                      <DropdownItem onClick={() => openRenameModal('folder', folder.id, folder.name)}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Rename
                      </DropdownItem>
                      <DropdownItem onClick={() => openDeleteModal('folder', folder.id, folder.name)} danger>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}

            {displayFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all duration-200 group relative"
              >
                <a
                  href={filesApi.getPreviewUrl(file.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3"
                >
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
                </a>
                {user && file.owner_id === user.id && (
                  <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu
                      trigger={
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      }
                    >
                      <DropdownItem onClick={() => window.open(filesApi.getDownloadUrl(file.id), '_blank')}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </DropdownItem>
                      <DropdownItem onClick={() => openDeleteModal('file', file.id, file.name)} danger>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </div>
                )}
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
            <p className="mt-1 text-sm text-gray-500">
              {searchResults ? 'Try a different search query' : 'Get started by creating a folder or uploading a file.'}
            </p>
          </div>
        )}
      </main>

      {/* Create Folder Modal */}
      <Modal isOpen={showCreateFolder} onClose={() => setShowCreateFolder(false)} title="Create New Folder">
        <div className="space-y-4">
          <Input
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
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

      {/* Upload File Modal */}
      <Modal isOpen={showUploadFile} onClose={() => setShowUploadFile(false)} title="Upload File">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select PDF File</label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer transition-colors"
            />
          </div>
          {selectedFile && (
            <Input
              label="Display Name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              onKeyDown={(e) => e.key === 'Enter' && handleUploadFile()}
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

      {/* Rename Modal */}
      <Modal isOpen={showRename} onClose={() => setShowRename(false)} title={`Rename ${renameTarget?.type}`}>
        <div className="space-y-4">
          <Input
            label="New Name"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="Enter new name"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowRename(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} loading={renaming}>
              Rename
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title={`Delete ${deleteTarget?.type}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            {deleteTarget?.type === 'folder' && ' This will also delete all contents inside this folder.'}
            {' '}This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
