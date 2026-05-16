import { useEffect, useState, useRef } from "react"
import * as XLSX from "xlsx"
import { addParty, generatePartyCode } from "../services/partyService"
import ImportSuccessModal from "./ImportSuccessModal"

export default function ImportPartiesModal({ isOpen, onClose, company, onImportComplete }) {
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
          'Party Name': ['name', 'party name', 'customer name', 'client name', 'company name'],
          'Phone Number': ['phone', 'phone number', 'mobile', 'contact', 'tel'],
          'Address': ['address', 'street', 'street address'],
          'City': ['city'],
          'Email Address': ['email', 'email address', 'e-mail'],
          'Opening Balance': ['opening balance', 'balance', 'amount', 'op balance'],
          'Balance Type': ['type', 'dr/cr', 'balance type', 'dr', 'cr']
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
    if (!columnMappings['Party Name']) {
      alert('Please map the "Party Name" field as it is required.')
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

    // Get the starting party code
    let currentPartyCode = await generatePartyCode(company.$id)
    const startingCodeNum = parseInt(currentPartyCode.substring(1)) || 0

    // Process each row with delays to avoid rate limiting
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i]

      try {
        // Map Excel columns to data fields
        const nameColIndex = excelColumns.indexOf(columnMappings['Party Name'])
        const name = nameColIndex >= 0 && row[nameColIndex] ? String(row[nameColIndex]).trim() : ''

        // Skip if name is empty (required field)
        if (!name) {
          skippedCount++
          errors.push({
            icon: 'error',
            title: `Row ${i + 2}: Missing Party Name`,
            description: 'Party name is required but was not provided.'
          })
          continue
        }

        // Get optional fields
        const phoneColIndex = excelColumns.indexOf(columnMappings['Phone Number'] || '')
        const addressColIndex = excelColumns.indexOf(columnMappings['Address'] || '')
        const cityColIndex = excelColumns.indexOf(columnMappings['City'] || '')
        const emailColIndex = excelColumns.indexOf(columnMappings['Email Address'] || '')

        const phone = phoneColIndex >= 0 && row[phoneColIndex] ? String(row[phoneColIndex]).trim() : ''
        const address = addressColIndex >= 0 && row[addressColIndex] ? String(row[addressColIndex]).trim() : ''
        const city = cityColIndex >= 0 && row[cityColIndex] ? String(row[cityColIndex]).trim() : ''
        const email = emailColIndex >= 0 && row[emailColIndex] ? String(row[emailColIndex]).trim() : ''

        const openingBalanceColIndex = excelColumns.indexOf(columnMappings['Opening Balance'] || '')
        const balanceTypeColIndex = excelColumns.indexOf(columnMappings['Balance Type'] || '')

        // parse opening balance safely
        let openingBalance = 0
        if (openingBalanceColIndex >= 0 && row[openingBalanceColIndex]) {
          const raw = String(row[openingBalanceColIndex]).replace(/[^0-9.-]/g, '')
          openingBalance = Number(raw)
        }
        if (isNaN(openingBalance)) openingBalance = 0

        // parse balance type
        let balanceType = balanceTypeColIndex >= 0 && row[balanceTypeColIndex]
          ? String(row[balanceTypeColIndex]).trim().toUpperCase()
          : 'DR'

        // normalize DR/CR
        if (['CR', 'CREDIT'].includes(balanceType)) {
          balanceType = 'CR'
        } else {
          balanceType = 'DR'
        }

        // auto-detect if negative
        if (openingBalance < 0) {
          openingBalance = Math.abs(openingBalance)
          balanceType = 'CR'
        }

        // Combine address and city if both exist
        let fullAddress = address
        if (city) {
          fullAddress = fullAddress ? `${fullAddress}, ${city}` : city
        }

        // Generate party code
        const partyCode = `P${String(startingCodeNum + i).padStart(3, '0')}`

        // Create party in database with retry logic for rate limits
        await retryWithBackoff(async () => {
          await addParty({
            name,
            phone: phone || undefined,
            address: fullAddress || undefined,
            email: email || undefined,
            openingBalance,
            balanceType,
            partyCode,
            companyId: company.$id,
            isActive: true
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
          icon: 'error',
          title: `Row ${i + 2}: Import Failed`,
          description: isRateLimit
            ? 'Rate limit exceeded. Please try importing again later or import in smaller batches.'
            : errorMessage
        })
        console.error(`Error importing row ${i + 2}:`, error)

        // If we hit a rate limit, add a longer delay before continuing
        if (isRateLimit) {
          console.log('Rate limit detected. Waiting 5 seconds before continuing...')
          await delay(5000)
        }
      }
    }

    setIsImporting(false)
    setImportStats({ success: successCount, skipped: skippedCount })
    setImportErrors(errors)

    // Call onImportComplete callback to refresh parties list
    if (onImportComplete) {
      onImportComplete()
    }

    // Close import modal and show success modal
    setShowSuccessModal(true)
  }

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false)
    onClose() // Close the import modal
  }

  const handleDownloadErrors = () => {
    // Create error log content
    const errorLog = importErrors.map((err, idx) =>
      `${idx + 1}. ${err.title}\n   ${err.description}`
    ).join('\n\n')

    const blob = new Blob([errorLog], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-errors-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Show success modal if import is complete
  if (showSuccessModal) {
    return (
      <ImportSuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        onGoToParties={handleCloseSuccessModal}
        onDownloadErrors={handleDownloadErrors}
        stats={importStats}
        errors={importErrors}
      />
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background-light dark:bg-background-dark flex flex-col text-[#121717] dark:text-white">

      {/* TOP BAR */}
      <header className="flex items-center justify-between border-b border-[#dce4e5] dark:border-[#3f4a4d] bg-white dark:bg-[#1a1f24] px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined">inventory_2</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Import Parties</h2>
        </div>

        <button
          onClick={onClose}
          className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-primary/10 transition"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-auto max-w-6xl mx-auto w-full px-8 py-8">

        {/* HEADING */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">
            {step === 1 ? 'Import Parties – Upload File' : 'Import Parties – Map Columns'}
          </h1>
          <p className="text-[#658286] dark:text-[#a1b3b5] mt-1">
            {step === 1
              ? 'Upload your Excel file to begin importing parties.'
              : 'Align your Excel columns with the software\'s internal fields.'}
          </p>
        </div>

        {/* STEPPER */}
        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl border border-[#dce4e5] dark:border-[#3f4a4d] shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-8">
              <Step label="Upload File" active={step === 1} />
              <Step label="Map Columns" active={step === 2} />
              <Step label="Validation" active={step === 3} />
              <Step label="Finish" active={step === 4} />
            </div>

            <span className="text-sm font-semibold">
              {step === 1 ? '0%' : step === 2 ? '25%' : step === 3 ? '50%' : '100%'} Complete
            </span>
          </div>

          <div className="h-2 bg-[#dce4e5] dark:bg-[#3f4a4d] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: step === 1 ? '0%' : step === 2 ? '25%' : step === 3 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {/* UPLOAD FILE STEP */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-[#dce4e5] dark:border-[#3f4a4d] shadow-sm p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-4xl">upload_file</span>
              </div>

              <h3 className="text-xl font-bold mb-2">Upload Excel File</h3>
              <p className="text-sm text-[#658286] dark:text-[#a1b3b5] mb-6 text-center max-w-md">
                Select an Excel file (.xlsx, .xls, or .csv) containing your party data
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition active:scale-[0.98] mb-4"
              >
                <span className="material-symbols-outlined">folder_open</span>
                Choose File
              </button>

              {excelFile && (
                <div className="mt-4 p-4 bg-[#f0f4f5] dark:bg-[#2d353b] rounded-lg">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                    {excelFile.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VALIDATION/IMPORTING STEP */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-[#dce4e5] dark:border-[#3f4a4d] shadow-sm p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-xl font-bold mb-2">Importing Parties...</h3>
              <p className="text-sm text-[#658286] dark:text-[#a1b3b5] text-center max-w-md">
                Please wait while we import your data. This may take a few moments.
              </p>
            </div>
          </div>
        )}

        {/* MAPPING TABLE STEP */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-[#dce4e5] dark:border-[#3f4a4d] shadow-sm overflow-hidden flex flex-col">
            <TableHeader />

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <MappingRow
                label="Party Name"
                required
                preview={previewData['Party Name'] || ''}
                excelColumns={excelColumns}
                selectedColumn={columnMappings['Party Name'] || ''}
                onMappingChange={(col) => handleMappingChange('Party Name', col)}
              />
              <MappingRow
                label="Phone Number"
                preview={previewData['Phone Number'] || ''}
                excelColumns={excelColumns}
                selectedColumn={columnMappings['Phone Number'] || ''}
                onMappingChange={(col) => handleMappingChange('Phone Number', col)}
              />
              <MappingRow
                label="Address"
                preview={previewData['Address'] || ''}
                excelColumns={excelColumns}
                selectedColumn={columnMappings['Address'] || ''}
                onMappingChange={(col) => handleMappingChange('Address', col)}
              />
              <MappingRow
                label="City"
                preview={previewData['City'] || ''}
                excelColumns={excelColumns}
                selectedColumn={columnMappings['City'] || ''}
                onMappingChange={(col) => handleMappingChange('City', col)}
              />
              <MappingRow
                label="Email Address"
                preview={previewData['Email Address'] || ''}
                excelColumns={excelColumns}
                selectedColumn={columnMappings['Email Address'] || ''}
                onMappingChange={(col) => handleMappingChange('Email Address', col)}
              />
              <MappingRow
                label="Opening Balance"
                preview={previewData['Opening Balance'] || ''}
                excelColumns={excelColumns}
                selectedColumn={columnMappings['Opening Balance'] || ''}
                onMappingChange={(col) => handleMappingChange('Opening Balance', col)}
              />

              <MappingRow
                label="Balance Type"
                preview={previewData['Balance Type'] || ''}
                excelColumns={excelColumns}
                selectedColumn={columnMappings['Balance Type'] || ''}
                onMappingChange={(col) => handleMappingChange('Balance Type', col)}
              />

            </div>

            {/* INFO BAR */}
            <div className="p-4 bg-[#fafbfc] dark:bg-[#2d353b] border-t border-[#dce4e5] dark:border-[#3f4a4d] flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              <p className="text-xs text-[#658286] dark:text-[#a1b3b5]">
                {excelFile
                  ? `We automatically matched columns from "${excelFile.name}". Please review them before proceeding.`
                  : 'We automatically matched most columns. Please review them before proceeding.'}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-[#1a1f24] border-t border-[#dce4e5] dark:border-[#3f4a4d] px-8 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={onClose}
            className="text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-4 py-2 rounded-lg transition"
          >
            Cancel
          </button>

          {step === 1 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Upload File
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleStartImport}
              disabled={isImporting}
              className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  Importing...
                </>
              ) : (
                <>
                  Start Import
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                </>
              )}
            </button>
          )}

          {step === 3 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#658286] dark:text-[#a1b3b5]">Importing data...</span>
              <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

/* ---------- Small Components ---------- */

function Step({ label, active }) {
  return (
    <div className={`flex items-center gap-2 ${!active && "opacity-40"}`}>
      <div
        className={`size-6 rounded-full flex items-center justify-center text-xs font-bold
        ${active
            ? "bg-primary text-white ring-4 ring-primary/20"
            : "bg-gray-300 dark:bg-gray-600 text-white"
          }`}
      >
        •
      </div>
      <span className={`text-sm ${active && "text-primary font-bold"}`}>
        {label}
      </span>
    </div>
  )
}

function TableHeader() {
  return (
    <div className="grid grid-cols-12 bg-[#f0f4f4] dark:bg-[#2d353b] px-6 py-4 border-b border-[#dce4e5] dark:border-[#3f4a4d] text-xs font-bold uppercase tracking-wider text-[#658286] dark:text-[#a1b3b5]">
      <div className="col-span-4">Software Field</div>
      <div className="col-span-4">Excel Column Source</div>
      <div className="col-span-4">Data Preview</div>
    </div>
  )
}

function MappingRow({ label, preview, required, excelColumns, selectedColumn, onMappingChange }) {
  return (
    <div className="grid grid-cols-12 px-6 py-5 border-b border-[#f0f4f4] dark:border-[#2d353b] items-center hover:bg-[#fafbfc] dark:hover:bg-[#21262c] transition-colors">
      <div className="col-span-4 flex flex-col">
        <span className="text-sm font-bold">{label}</span>
        <span className={`text-xs font-medium ${required ? "text-red-500" : "text-[#658286] dark:text-[#a1b3b5]"}`}>
          {required ? "Required" : "Optional"}
        </span>
      </div>

      <div className="col-span-4 pr-12">
        <select
          value={selectedColumn}
          onChange={(e) => onMappingChange(e.target.value)}
          className="w-full h-11 rounded-lg border border-[#dce4e5] dark:border-[#3f4a4d] bg-white dark:bg-[#1a1f24] text-sm focus:border-primary focus:ring-primary px-3 outline-none"
        >
          <option value="">-- Select Column --</option>
          {excelColumns.map((col, index) => (
            <option key={index} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-4 text-sm text-[#658286] dark:text-[#a1b3b5] italic">
        {preview ? `"${preview}"` : <span className="text-gray-400">No preview</span>}
      </div>
    </div>
  )
}
