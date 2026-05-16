/**
 * Export data to CSV
 */
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
