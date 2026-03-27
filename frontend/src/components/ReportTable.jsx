export default function ReportTable({ data, columns }) {
  // Check if data is an array
  if (!data || !Array.isArray(data)) {
    return (
      <div className="bg-white rounded-xl border border-[#dae5e7] p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
          table_chart
        </span>
        <h3 className="text-xl font-bold text-gray-600 mb-2">
          No Data Available
        </h3>
        <p className="text-sm text-gray-500">
          No records found for this report.
        </p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#dae5e7] p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
          table_chart
        </span>
        <h3 className="text-xl font-bold text-gray-600 mb-2">
          No Data Available
        </h3>
        <p className="text-sm text-gray-500">
          No records found for this report.
        </p>
      </div>
    )
  }

  const getCellValue = (row, column) => {
    const value = row[column.key]
    if (column.format) {
      if (typeof column.format === "function") {
        return column.format(value, row)
      }
      return value
    }
    return value
  }

  const getCellColor = (column, value, row) => {
    if (column.color) {
      if (typeof column.color === "function") {
        return column.color(value, row)
      }
      return column.color
    }
    return null
  }

  const colorClasses = {
    green: "text-green-600",
    red: "text-red-600",
    orange: "text-orange-600",
    blue: "text-blue-600"
  }

  return (
    <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#f0f4f5]/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-xs font-bold uppercase ${
                    column.align === "right" ? "text-right" : ""
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f4f5]">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-primary/5 transition">
                {columns.map((column) => {
                  const value = getCellValue(row, column)
                  const color = getCellColor(column, value, row)
                  const alignClass = column.align === "right" ? "text-right" : ""

                  return (
                    <td
                      key={column.key}
                      className={`px-6 py-4 ${alignClass} ${
                        color ? colorClasses[color] || "" : ""
                      }`}
                    >
                      {column.badge ? (
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          value === "Customer"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}>
                          {value}
                        </span>
                      ) : (
                        <span className={column.format && typeof column.format === "function" ? "" : ""}>
                          {value || "-"}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
