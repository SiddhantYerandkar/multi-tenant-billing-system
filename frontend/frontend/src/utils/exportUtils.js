/**
 * Export data to CSV
 */
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

export function exportToCSV(data, filename, headers) {
  if (!data || data.length === 0) {
    alert("No data to export")
    return
  }

  // Create CSV content
  let csvContent = ""

  // Add headers if provided
  if (headers && headers.length > 0) {
    csvContent += headers.map(h => `"${h}"`).join(",") + "\n"
  } else if (data.length > 0) {
    // Auto-generate headers from first object keys
    const firstRow = data[0]
    csvContent += Object.keys(firstRow).map(key => `"${key}"`).join(",") + "\n"
  }

  // Add data rows
  data.forEach(row => {
    const values = Object.values(row).map(value => {
      // Handle null/undefined
      if (value === null || value === undefined) {
        return ""
      }
      // Convert to string and escape quotes
      const str = String(value)
      return `"${str.replace(/"/g, '""')}"`
    })
    csvContent += values.join(",") + "\n"
  })

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `${filename || "export"}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function escapeHtml(value) {
  const str = String(value ?? "")
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getColumns({ rows, columns, headers }) {
  if (columns && columns.length > 0) return columns

  // `headers` can be either:
  // - array of strings (used as both key + label)
  // - array of { key, label }
  if (headers && headers.length > 0) {
    if (typeof headers[0] === "string") {
      return headers.map((h) => ({ key: h, label: h }))
    }

    return headers.map((h) => ({
      key: h.key,
      label: h.label ?? h.key,
    }))
  }

  if (rows && rows.length > 0) {
    return Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
  }

  return []
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export an array of objects as CSV.
 *
 * @param {Object} params
 * @param {Array<Object>} params.rows
 * @param {string} params.filename
 * @param {Array<string>|Array<{key:string,label?:string}>} params.headers - optional column definition
 * @param {Array<{key:string,label?:string}>} params.columns - optional column definition (takes priority)
 * @param {boolean} params.returnBlob - when true, returns the Blob instead of downloading
 */
export function exportTableToCSV({
  rows,
  filename = "export",
  headers,
  columns,
  returnBlob = false,
}) {
  if (!rows || rows.length === 0) {
    alert("No data to export")
    return
  }

  const cols = getColumns({ rows, columns, headers })
  const headerLine = cols.map((c) => `"${c.label}"`).join(",")

  let csvContent = `${headerLine}\n`
  rows.forEach((row) => {
    const values = cols.map((c) => {
      const value = row?.[c.key]
      if (value === null || value === undefined) return '""'
      const str = String(value)
      return `"${str.replace(/"/g, '""')}"`
    })

    csvContent += values.join(",") + "\n"
  })

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const outName = `${filename || "export"}.csv`

  if (returnBlob) return blob
  downloadBlob(blob, outName)
}

/**
 * Export an array of objects as an Excel-compatible `.xls` file.
 * (Uses HTML table so you can open directly in Excel without extra dependencies.)
 */
export function exportTableToExcel({
  rows,
  filename = "export",
  headers,
  columns,
  returnBlob = false,
  worksheetTitle = "Sheet1",
}) {
  if (!rows || rows.length === 0) {
    alert("No data to export")
    return
  }

  const cols = getColumns({ rows, columns, headers })

  const thead = `<tr>${cols
    .map((c) => `<th>${escapeHtml(c.label)}</th>`)
    .join("")}</tr>`

  const tbody = rows
    .map((row) => {
      const tds = cols
        .map((c) => `<td>${escapeHtml(row?.[c.key])}</td>`)
        .join("")
      return `<tr>${tds}</tr>`
    })
    .join("")

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(worksheetTitle)}</title>
  </head>
  <body>
    <table border="1">
      ${thead}
      ${tbody}
    </table>
  </body>
</html>
`.trim()

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  })
  const outName = `${filename || "export"}.xls`

  if (returnBlob) return blob
  downloadBlob(blob, outName)
}

/**
 * Export an array of objects as a real Excel `.xlsx` file.
 * (Uses `xlsx` + `file-saver`, like `Parties.jsx`.)
 */
export function exportToXLSX(rows, filename, sheetName = "Sheet1") {
  if (!rows || rows.length === 0) {
    alert("No data to export")
    return
  }

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  })

  const data = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  })

  saveAs(data, `${filename || "export"}.xlsx`)
}

/**
 * Common export entry point.
 *
 * @example
 * exportTable({ format: 'csv', rows, filename, headers: ['invoiceNo','date'] })
 */
export function exportTable({
  format = "csv",
  rows,
  filename = "export",
  headers,
  columns,
  returnBlob = false,
  worksheetTitle,
}) {
  const fmt = String(format).toLowerCase()
  if (fmt === "excel" || fmt === "xls" || fmt === "xlsx") {
    // Use real `.xlsx` export
    // Note: `headers`/`columns` mapping is best handled before calling this,
    // since `xlsx` prefers simple objects.
    if (headers || columns) {
      const cols = getColumns({ rows, columns, headers })
      const mapped = rows.map((row) => {
        const obj = {}
        cols.forEach((c) => {
          obj[c.label] = row?.[c.key]
        })
        return obj
      })
      return exportToXLSX(mapped, filename, worksheetTitle || "Sheet1")
    }

    return exportToXLSX(rows, filename, worksheetTitle || "Sheet1")
  }

  return exportTableToCSV({
    rows,
    filename,
    headers,
    columns,
    returnBlob,
  })
}

/**
 * Format currency for CSV export
 */
export function formatCurrencyForExport(amount) {
  return `₹${(amount || 0).toFixed(2)}`
}

/**
 * Format date for CSV export
 */
export function formatDateForExport(dateString) {
  if (!dateString) return ""
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  } catch {
    return dateString
  }
}
