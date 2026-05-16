import template from '../assets/invoice-template.html?raw'

const INVOICE_TEMPLATE = template

export async function generateInvoicePDF(invoice, items, company, party) {
  let html = INVOICE_TEMPLATE

  const rows = items.map((item, idx) => `
  <tr>
    <td>${idx + 1}</td>
    <td style="text-align:left;">${item.productName}</td>
    <td style="text-align:right;">${item.quantity}</td>
    <td style="text-align:right;">${item.rate}</td>
    <td style="text-align:right;">${item.total}</td>
  </tr>
`).join('')

  const billAmount = Number(invoice.grandTotal || 0)
  const paidAmount = Number(invoice.paidAmount || 0)
  const outstandingAmount = Number(invoice.balanceAmount || (billAmount - paidAmount))
  const netPayable = outstandingAmount > 0 ? outstandingAmount : billAmount

  const amountInWords = invoice.amountInWords && invoice.amountInWords !== 'undefined'
    ? invoice.amountInWords
    : numberToWords(netPayable)

  html = html
    .replace('{{LOGO_URL}}', company.logoUrl || '')
    .replace('{{GPAY_QR_CODE}}', company.qrCodeUrl || '')
    .replaceAll('{{COMPANY_NAME}}', company.name || '')
    .replaceAll('{{company_address}}', company.address || '')
    .replace('{{company_phone}}', company.phone || '')
    .replace('{{company_email}}', company.email || '')
    .replace('{{BILL_NO}}', invoice.invoiceNumber || '')
    .replace('{{BILL_DATE}}', formatDate(invoice.invoiceDate))
    .replace('{{ITEMS_ROWS}}', rows)
    .replaceAll('{{BILL_AMOUNT}}', formatCurrency(billAmount))
    .replaceAll('{{OUTSTANDING_AMOUNT}}', formatCurrency(outstandingAmount))
    .replaceAll('{{NET_PAYABLE}}', formatCurrency(netPayable))
    .replace('{{AMOUNT_IN_WORDS}}', amountInWords)
    .replace('{{CUSTOMER_INFO}}', `
      <div class="customer-info">
        <strong>Bill To:</strong><br>
        ${party.name || ''}<br>
        ${party.address || ''}
      </div>
    `)

  // Hide missing images
  if (!company.logoUrl) {
    html += `<style>.logo-section{display:none}</style>`
  }
  if (!company.qrCodeUrl) {
    html += `<style>.qr-code-top-right{display:none}</style>`
  }

  // 🚀 THIS IS THE ONLY LINE THAT MATTERS NOW
  const response = await window.electronAPI.generatePDF({
    html,
    fileName: `Invoice_${invoice.invoiceNumber}`
  })

  if (!response.success) {
    throw new Error(response.error)
  }

  return response.filePath
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  } catch {
    return dateStr
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount || 0)
}

const numberToWords = (num) => {
  if (!num) return 'Zero Rupees Only'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convert = (n) => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')

    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }

  return `Rupees ${convert(Math.floor(num))} Only`
}