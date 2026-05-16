import { useEffect, useState, useRef } from "react"
import * as XLSX from "xlsx"
import { addProduct } from "../services/productService"
import ImportSuccessModal from "./ImportSuccessModal"

export default function ImportProductsModal({ isOpen, onClose, company, onImportComplete }) {
    const [step, setStep] = useState(1) // 1: Upload File, 2: Map Columns, 3: Validation, 4: Finish
    const [excelFile, setExcelFile] = useState(null)
    const [excelColumns, setExcelColumns] = useState([])
    const [excelData, setExcelData] = useState([])
    const [columnMappings, setColumnMappings] = useState({})
    const [previewData, setPreviewData] = useState({})
    const [isImporting, setIsImporting] = useState(false)
    const [importStats, setImportStats] = useState({ success: 0, skipped: 0 })
    const [importErrors, setImportErrors] = useState([])
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : ""
        return () => (document.body.style.overflow = "")
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setStep(1)
            setExcelFile(null)
            setExcelColumns([])
            setExcelData([])
            setColumnMappings({})
            setPreviewData({})
            setIsImporting(false)
            setImportStats({ success: 0, skipped: 0 })
            setImportErrors([])
            setShowSuccessModal(false)
        }
    }, [isOpen])

    const handleFileUpload = (event) => {
        const file = event.target.files[0]
        if (!file) return

        // Check if file is Excel format
        const validExtensions = ['.xlsx', '.xls', '.csv']
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

        if (!validExtensions.includes(fileExtension)) {
            alert('Please upload a valid Excel file (.xlsx, .xls, or .csv)')
            return
        }

        setExcelFile(file)

        // Read and parse Excel file
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

                if (jsonData.length === 0) {
                    alert('The Excel file appears to be empty')
                    return
                }

                // Extract column names from first row
                const columns = jsonData[0] || []
                const columnsFiltered = columns.filter(col => col !== null && col !== undefined && col !== '')

                // Get data rows (skip header)
                const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))

                setExcelColumns(columnsFiltered)
                setExcelData(dataRows)

                // Initialize column mappings with auto-detection
                const initialMappings = {}
                const fieldLabels = {
                    'Product Name': ['name', 'product name', 'product', 'item name', 'item'],
                    'Base Price': ['price', 'base price', 'cost', 'rate', 'amount'],
                    'Unit': ['unit', 'uom', 'measure', 'measurement']
                }

                columnsFiltered.forEach((col, index) => {
                    const colLower = String(col).toLowerCase().trim()
                    Object.keys(fieldLabels).forEach(field => {
                        if (fieldLabels[field].some(keyword => colLower.includes(keyword))) {
                            if (!initialMappings[field]) {
                                initialMappings[field] = col
                            }
                        }
                    })
                })

                setColumnMappings(initialMappings)

                // Set preview data from first data row
                const preview = {}
                Object.keys(fieldLabels).forEach(field => {
                    if (initialMappings[field]) {
                        const colIndex = columnsFiltered.indexOf(initialMappings[field])
                        preview[field] = dataRows[0] && dataRows[0][colIndex] ? String(dataRows[0][colIndex]) : ''
                    }
                })
                setPreviewData(preview)

                // Move to mapping step
                setStep(2)
            } catch (error) {
                console.error('Error parsing Excel file:', error)
                alert('Error reading Excel file. Please make sure it is a valid Excel file.')
            }
        }

        reader.readAsArrayBuffer(file)
    }

    const handleMappingChange = (field, excelColumn) => {
        setColumnMappings(prev => ({
            ...prev,
            [field]: excelColumn
        }))

        // Update preview
        if (excelColumn && excelData.length > 0) {
            const colIndex = excelColumns.indexOf(excelColumn)
            const previewValue = excelData[0] && excelData[0][colIndex] ? String(excelData[0][colIndex]) : ''
            setPreviewData(prev => ({
                ...prev,
                [field]: previewValue
            }))
        } else {
            setPreviewData(prev => {
                const newPrev = { ...prev }
                delete newPrev[field]
                return newPrev
            })
        }
    }

    // Helper function to delay execution
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    // Helper function to retry API calls with exponential backoff
    const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn()
            } catch (error) {
                const isRateLimit = error.message?.toLowerCase().includes('rate limit') ||
                    error.message?.toLowerCase().includes('rate_limit') ||
                    error.code === 429

                if (isRateLimit && attempt < maxRetries - 1) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delayMs = baseDelay * Math.pow(2, attempt)
                    console.log(`Rate limit hit. Retrying after ${delayMs}ms...`)
                    await delay(delayMs)
                    continue
                }
                throw error
            }
        }
    }

    const handleStartImport = async () => {
        // Validate required fields
        if (!columnMappings['Product Name']) {
            alert('Please map the "Product Name" field as it is required.')
            return
        }

        if (!company || !company.$id) {
            alert('Company information is missing.')
            return
        }

        setIsImporting(true)
        setStep(3) // Move to validation step

        const errors = []
        let successCount = 0
        let skippedCount = 0

        // Process each row with delays to avoid rate limiting
        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i]

            try {
                // Map Excel columns to data fields
                const nameColIndex = excelColumns.indexOf(columnMappings['Product Name'])
                const name = nameColIndex >= 0 && row[nameColIndex] ? String(row[nameColIndex]).trim() : ''

                // Skip if name is empty (required field)
                if (!name) {
                    skippedCount++
                    errors.push({
                        icon: 'error',
                        title: `Row ${i + 2}: Missing Product Name`,
                        description: 'Product name is required but was not provided.'
                    })
                    continue
                }

                // Get optional fields
                const priceColIndex = excelColumns.indexOf(columnMappings['Base Price'] || '')
                const unitColIndex = excelColumns.indexOf(columnMappings['Unit'] || '')

                // Parse base price safely
                let basePrice = 0
                if (priceColIndex >= 0 && row[priceColIndex]) {
                    const raw = String(row[priceColIndex]).replace(/[^0-9.-]/g, '')
                    basePrice = Number(raw)
                }
                if (isNaN(basePrice) || basePrice < 0) basePrice = 0

                const unit = unitColIndex >= 0 && row[unitColIndex] ? String(row[unitColIndex]).trim() : 'Unit'

                // Create product in database with retry logic for rate limits
                await retryWithBackoff(async () => {
                    await addProduct({
                        name,
                        basePrice,
                        unit,
                        companyId: company.$id
                    })
                })

                successCount++

                // Add delay between requests to avoid rate limiting (200ms delay)
                // This allows ~5 requests per second, which is usually safe
                if (i < excelData.length - 1) {
                    await delay(200)
                }
            } catch (error) {
                skippedCount++
                const errorMessage = error.message || 'Failed to import this row.'
                const isRateLimit = errorMessage.toLowerCase().includes('rate limit') ||
                    errorMessage.toLowerCase().includes('rate_limit') ||
                    error.code === 429

                errors.push({
                    icon: isRateLimit ? 'warning' : 'error',
                    title: `Row ${i + 2}: ${isRateLimit ? 'Rate Limited' : 'Import Failed'}`,
                    description: isRateLimit ? 'Request was rate limited. Will retry automatically.' : errorMessage
                })
            }
        }

        // Update stats
        setImportStats({ success: successCount, skipped: skippedCount })
        setImportErrors(errors)
        setIsImporting(false)
        setStep(4) // Move to finish step
    }

    const handleFinish = () => {
        setShowSuccessModal(true)
    }

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false)
        onClose()
        if (onImportComplete) {
            onImportComplete()
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}></div>

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Import Products</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                        {step === 1 && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-blue-600 text-2xl">file_upload</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Excel File</h3>
                                <p className="text-gray-600 mb-6">
                                    Upload an Excel file (.xlsx, .xls, or .csv) containing your product data.
                                    The file should have columns for Product Name, Base Price, and Unit.
                                </p>

                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition"
                                    >
                                        Choose File
                                    </button>
                                </div>

                                <div className="mt-6 text-sm text-gray-500">
                                    <p className="mb-2"><strong>Expected format:</strong></p>
                                    <ul className="text-left max-w-md mx-auto">
                                        <li>• First row should contain column headers</li>
                                        <li>• Product Name is required</li>
                                        <li>• Base Price should be numeric</li>
                                        <li>• Unit is optional (defaults to "Unit")</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Map Columns</h3>
                                <p className="text-gray-600 mb-6">
                                    Map the columns from your Excel file to the corresponding product fields.
                                </p>

                                <div className="space-y-4">
                                    {['Product Name', 'Base Price', 'Unit'].map(field => (
                                        <div key={field} className="flex items-center gap-4">
                                            <label className="w-32 text-sm font-medium text-gray-700">
                                                {field}{field === 'Product Name' && <span className="text-red-500 ml-1">*</span>}:
                                            </label>
                                            <select
                                                value={columnMappings[field] || ''}
                                                onChange={(e) => handleMappingChange(field, e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                            >
                                                <option value="">Select column...</option>
                                                {excelColumns.map(col => (
                                                    <option key={col} value={col}>{col}</option>
                                                ))}
                                            </select>
                                            {previewData[field] && (
                                                <div className="w-32 text-sm text-gray-500 truncate">
                                                    Preview: {previewData[field]}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleStartImport}
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                    >
                                        Start Import
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-blue-600 text-2xl animate-spin">sync</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Importing Products</h3>
                                <p className="text-gray-600">
                                    Please wait while we import your products. This may take a few moments...
                                </p>
                                {isImporting && (
                                    <div className="mt-4 text-sm text-gray-500">
                                        Processing {excelData.length} rows...
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 4 && (
                            <div>
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete</h3>
                                    <div className="flex justify-center gap-8 mb-6">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">{importStats.success}</div>
                                            <div className="text-sm text-gray-600">Successful</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">{importStats.skipped}</div>
                                            <div className="text-sm text-gray-600">Skipped</div>
                                        </div>
                                    </div>
                                </div>

                                {importErrors.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-semibold text-gray-900 mb-3">Import Issues:</h4>
                                        <div className="max-h-40 overflow-y-auto space-y-2">
                                            {importErrors.map((error, index) => (
                                                <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                                                    <span className="material-symbols-outlined text-red-500 mt-0.5">
                                                        {error.icon}
                                                    </span>
                                                    <div>
                                                        <div className="font-medium text-red-900">{error.title}</div>
                                                        <div className="text-sm text-red-700">{error.description}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={handleFinish}
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                    >
                                        View Products
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ImportSuccessModal
                isOpen={showSuccessModal}
                onClose={handleCloseSuccessModal}
                title="Products Imported Successfully!"
                message={`Successfully imported ${importStats.success} products. ${importStats.skipped > 0 ? `${importStats.skipped} products were skipped due to errors.` : ''}`}
            />
        </>
    )
}