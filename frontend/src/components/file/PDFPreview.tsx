import { useEffect } from 'react'
import { Button } from '@/components/common/Button'
import { filesApi } from '@/api/files'
import type { File } from '@/types'

interface PDFPreviewProps {
  file: File | null
  isOpen: boolean
  onClose: () => void
}

export function PDFPreview({ file, isOpen, onClose }: PDFPreviewProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !file) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-xl">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{file.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {file.original_filename} • {(file.size_bytes / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(filesApi.getDownloadUrl(file.id), '_blank')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          <iframe
            src={filesApi.getPreviewUrl(file.id)}
            className="w-full h-full border-0"
            title={file.name}
          />
        </div>

        {/* Footer - Mobile hint */}
        <div className="px-6 py-3 border-t bg-gray-50 rounded-b-xl sm:hidden">
          <p className="text-xs text-gray-500 text-center">
            Pinch to zoom • Swipe to navigate pages
          </p>
        </div>
      </div>
    </div>
  )
}
