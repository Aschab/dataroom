import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { useToast } from '@/components/common/Toast'
import { foldersApi } from '@/api/folders'
import { filesApi } from '@/api/files'
import { searchApi } from '@/api/search'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { DropdownMenu, DropdownItem } from '@/components/common/DropdownMenu'
import { PDFPreview } from '@/components/file/PDFPreview'
import { formatFileSize, formatDate, debounce, cn } from '@/lib/utils'
import type { Folder, File } from '@/types'

export function Dashboard() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const { folderId } = useParams<{ folderId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([])

  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [showOwnedOnly, setShowOwnedOnly] = useState(false)

  const urlSearchQuery = searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery)
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

  // PDF Preview
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: { type: 'folder' | 'file'; id: number; name: string; ownerId: number } } | null>(null)

  const currentFolderId = folderId ? parseInt(folderId) : null

  const loadData = async () => {
    setLoading(true)
    try {
      if (currentFolderId) {
        const data = await foldersApi.get(currentFolderId)
        setCurrentFolder(data.folder)
        setFolders(data.subfolders)
        setFiles(data.files)
        await buildBreadcrumbs(data.folder)
      } else {
        const data = await foldersApi.list(showOwnedOnly)
        setCurrentFolder(null)
        setFolders(data.folders)
        setFiles(data.files)
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
    setSearchQuery(urlSearchQuery)
  }, [urlSearchQuery])

  useEffect(() => {
    if (location.pathname.startsWith('/search')) {
      setLoading(false)
    } else {
      loadData()
    }
  }, [folderId, showOwnedOnly, location.pathname])

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
    if (urlSearchQuery && urlSearchQuery.length >= 2) {
      handleSearch(urlSearchQuery)
    } else {
      setSearchResults(null)
    }
  }, [urlSearchQuery, handleSearch])

  const handleSearchInputChange = (query: string) => {
    setSearchQuery(query)
    if (query.length >= 2) {
      navigate(`/search?q=${encodeURIComponent(query)}`)
    } else if (query.length === 0) {
      navigate('/')
    }
  }

  const handleFolderClick = (folderId: number) => {
    navigate(`/folder/${folderId}`)
  }

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      navigate('/')
    } else {
      navigate(`/folder/${breadcrumbs[index].id}`)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      await foldersApi.create(newFolderName, currentFolderId || undefined)
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
      await filesApi.upload(selectedFile, fileName, currentFolderId || undefined)
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

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return
    setRenaming(true)
    try {
      if (renameTarget.type === 'folder') {
        await foldersApi.update(renameTarget.id, renameName)
        showToast('Folder renamed successfully', 'success')
      } else {
        await filesApi.update(renameTarget.id, renameName)
        showToast('File renamed successfully', 'success')
      }
      setShowRename(false)
      setRenameTarget(null)
      setRenameName('')
      loadData()
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
      loadData()
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

  const handleFileClick = (file: File) => {
    setPreviewFile(file)
    setShowPreview(true)
  }

  const handleContextMenu = (e: React.MouseEvent, type: 'folder' | 'file', id: number, name: string, ownerId: number) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, item: { type, id, name, ownerId } })
  }

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

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

    loadData()
  }

  const canCreateInCurrentFolder = !currentFolder || currentFolder.owner_id === user?.id
  const displayFolders = searchResults?.folders || folders
  const displayFiles = searchResults?.files || files

  // Truncate breadcrumbs to show first + last 3 folders with ellipsis
  const truncatedBreadcrumbs = useMemo(() => {
    if (breadcrumbs.length <= 4) {
      return breadcrumbs
    }
    return [
      breadcrumbs[0],
      { id: -1, name: '...', parent_id: null, owner_id: -1, owner_name: '', created_at: '', updated_at: '' } as Folder,
      ...breadcrumbs.slice(-3)
    ]
  }, [breadcrumbs])

  // Truncate folder/file name to 20 characters + ellipsis
  const truncateName = (name: string) => {
    if (name.length <= 20) return name
    return name.substring(0, 20) + '...'
  }

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
            <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dataroom</h1>
            </button>

            <div className="flex-1 w-full sm:max-w-md lg:max-w-2xl">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
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
            {truncatedBreadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center gap-2 flex-shrink-0">
                <span className="text-gray-400">/</span>
                {crumb.id === -1 ? (
                  <span className="text-gray-400 cursor-default" title="Additional folders in path">
                    ...
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      // Find the actual index in the original breadcrumbs array
                      const actualIndex = breadcrumbs.findIndex(b => b.id === crumb.id)
                      handleBreadcrumbClick(actualIndex)
                    }}
                    className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    title={crumb.name}
                  >
                    {truncateName(crumb.name)}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {searchResults ? `Search results for "${searchQuery}"` : currentFolder ? currentFolder.name : 'All Files'}
            </h2>
            {!searchResults && !currentFolder && (
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
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full divide-y divide-gray-200 table-fixed">
              <colgroup>
                <col className="w-[40%] sm:w-[40%]" />
                <col className="hidden sm:table-column sm:w-[15%]" />
                <col className="w-[35%] sm:w-[15%]" />
                <col className="hidden sm:table-column sm:w-[15%]" />
                <col className="w-[25%] sm:w-[15%]" />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">File Size</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <svg className="w-5 h-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayFolders.map((folder) => (
                  <tr
                    key={`folder-${folder.id}`}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id, folder.name, folder.owner_id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => handleFolderClick(folder.id)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">{folder.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{folder.owner_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(folder.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {user && folder.owner_id === user.id && (
                        <DropdownMenu
                          trigger={
                            <button className="hover:bg-gray-100 rounded transition-colors">
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
                      )}
                    </td>
                  </tr>
                ))}

                {displayFiles.map((file) => (
                  <tr
                    key={`file-${file.id}`}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onContextMenu={(e) => handleContextMenu(e, 'file', file.id, file.name, file.owner_id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => handleFileClick(file)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{file.owner_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(file.uploaded_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{formatFileSize(file.size_bytes)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {user && file.owner_id === user.id && (
                        <DropdownMenu
                          trigger={
                            <button className="hover:bg-gray-100 rounded transition-colors">
                              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                          }
                        >
                          <DropdownItem onClick={() => openRenameModal('file', file.id, file.name)}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Rename
                          </DropdownItem>
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* PDF Preview */}
      <PDFPreview
        file={previewFile}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />

      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {user && contextMenu.item.ownerId === user.id && (
            <>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                onClick={() => {
                  openRenameModal(contextMenu.item.type, contextMenu.item.id, contextMenu.item.name)
                  setContextMenu(null)
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
              {contextMenu.item.type === 'file' && (
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => {
                    window.open(filesApi.getDownloadUrl(contextMenu.item.id), '_blank')
                    setContextMenu(null)
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              )}
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                onClick={() => {
                  openDeleteModal(contextMenu.item.type, contextMenu.item.id, contextMenu.item.name)
                  setContextMenu(null)
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </>
          )}
          {(!user || contextMenu.item.ownerId !== user.id) && contextMenu.item.type === 'file' && (
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                window.open(filesApi.getDownloadUrl(contextMenu.item.id), '_blank')
                setContextMenu(null)
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
        </div>
      )}
    </div>
  )
}
