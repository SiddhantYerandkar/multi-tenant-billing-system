export function generateInvoiceHTML({
    company,
    form,
    items,
    party,
    products,
    grandTotal,
    logoUrl,
    qrCodeUrl,
}) {
    const paidAmount = Number(form.paidAmount || 0)
    const previousOutstanding = Number(party?.outstanding || 0)
    const netPayable = grandTotal + previousOutstanding - paidAmount

    const rows = items.map((item, index) => {
        const product = products.find(p => p.$id === item.productId)
        return `
      <tr>
        <td style="text-align:center;">${index + 1}</td>
        <td>${product?.name || ""}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">&#8377;${Number(item.price).toFixed(2)}</td>
        <td style="text-align:right;">&#8377;${Number(item.totalAmount).toFixed(2)}</td>
      </tr>`
    }).join("")

    const logoSrc = company.logourl || logoUrl
    const qrSrc = company.qrcodeurl || qrCodeUrl

    const upiLink = company.upiid
        ? `upi://pay?pa=${company.upiid}&pn=${encodeURIComponent(company?.name || "")}&am=${netPayable.toFixed(2)}&cu=INR&tn=Invoice%20${form.invoiceNo}`
        : null

    const payButton = upiLink
        ? `<a href="${upiLink}"
              title="Open on your mobile to pay via GPay / PhonePe / Paytm"
              style="
                display: inline-block;
                margin-top: 6px;
                padding: 5px 10px;
                background: #1a73e8;
                color: #fff;
                font-size: 10px;
                font-weight: bold;
                text-decoration: none;
                border-radius: 4px;
                letter-spacing: 0.3px;
              ">Tap to Pay</a>
           <p style="font-size:9px;color:#999;margin-top:3px;">Open on mobile to pay</p>`
        : ""

    const outstandingRow = previousOutstanding > 0
        ? `<tr>
            <td class="t-label">Previous Outstanding:</td>
            <td class="t-value">&#8377;${previousOutstanding.toFixed(2)}</td>
           </tr>`
        : ""

    const paidRow = paidAmount > 0
        ? `<tr>
            <td class="t-label">Paid Amount:</td>
            <td class="t-value">- &#8377;${paidAmount.toFixed(2)}</td>
           </tr>`
        : ""

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #000;
      background: #fff;
      padding: 24px 30px;
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 2px solid #333;
    }

    .logo { width: 110px; object-fit: contain; }

    .company-info {
      text-align: center;
      flex: 1;
      padding: 0 16px;
    }

    .company-info h1 {
      font-size: 22px;
      color: #e85d00;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .company-info p {
      font-size: 12px;
      color: #333;
      line-height: 1.6;
    }

    .qr-block { text-align: center; }
    .qr-block img { width: 90px; }
    .qr-block p { font-size: 10px; color: #555; margin-top: 3px; }

    .bill-meta {
      display: flex;
      justify-content: space-between;
      margin: 12px 0 10px;
    }

    .bill-meta .bill-to p { line-height: 1.7; }
    .bill-meta .bill-to .label { font-weight: bold; }
    .bill-meta .bill-right { text-align: right; line-height: 1.9; }
    .bill-meta .bill-right b { font-size: 13.5px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }

    th {
      background: #f0f0f0;
      border: 1px solid #999;
      padding: 7px 10px;
      font-size: 13px;
      font-weight: bold;
    }

    td {
      border: 1px solid #bbb;
      padding: 7px 10px;
      font-size: 13px;
    }

    .totals {
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
    }

    .totals table { width: 300px; margin: 0; }
    .totals td { border: none; padding: 4px 6px; font-size: 13px; }
    .totals .t-label { text-align: right; font-weight: bold; }
    .totals .t-value { text-align: right; width: 120px; }

    .net-row td {
      font-size: 14px;
      font-weight: bold;
      border-top: 1.5px solid #333;
      padding-top: 6px;
    }

    .words { margin-top: 14px; font-weight: bold; font-size: 13px; }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 30px;
      font-size: 12.5px;
    }

    .footer .note { color: #444; line-height: 1.7; }
    .footer .sig { text-align: right; font-weight: bold; font-size: 13px; }
  </style>
</head>
<body>

  <div class="header">
    <img src="${logoSrc}" class="logo" alt="Logo" />

    <div class="company-info">
      <h1>${company?.name || "Company Name"}</h1>
      <p>${company?.address || ""}</p>
      <p>Tel: ${company?.phone || ""} | Email: ${company?.email || ""}</p>
      ${party?.name ? `<p style="font-size:12px;font-weight:600;color:#333;margin-top:5px;border-top:1px solid #eee;padding-top:4px;">${party?.name}</p>` : ""}
    </div>

    <div class="qr-block">
      <img src="${qrSrc}" alt="QR Code" />
      <p>Scan to pay</p>
      ${payButton}
    </div>
  </div>

  <div class="bill-meta">
    <div class="bill-to">
      <p class="label">Title:</p>
      <p style="font-weight:bold;">${form?.title || ""}</p>
    </div>
    <div class="bill-right">
      <p><b>Bill No.</b> ${form.invoiceNo}</p>
      <p><b>Date</b> ${form.date}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;text-align:center;">Sr</th>
        <th style="text-align:left;">Item</th>
        <th style="width:60px;text-align:center;">Qty</th>
        <th style="width:100px;text-align:right;">Rate</th>
        <th style="width:110px;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td class="t-label">Bill Amount:</td>
        <td class="t-value">&#8377;${grandTotal.toFixed(2)}</td>
      </tr>
      ${outstandingRow}
      ${paidRow}
      <tr class="net-row">
        <td class="t-label">Net Payable:</td>
        <td class="t-value">&#8377;${netPayable.toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <div class="words">Rs. Rupees ${numberToWords(netPayable)} Only</div>

  <div class="footer">
    <div class="note">Thank you for your business!</div>
    <div class="sig">For ${company?.name || ""}</div>
  </div>

</body>
</html>`
}

function numberToWords(num) {
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"]
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    const inWords = (n) => {
        n = Math.floor(n)
        if (n === 0) return ""
        if (n < 20) return a[n]
        if (n < 100) return (b[Math.floor(n / 10)] + " " + a[n % 10]).trim()
        if (n < 1000) return (a[Math.floor(n / 100)] + " Hundred " + inWords(n % 100)).trim()
        if (n < 100000) return (inWords(Math.floor(n / 1000)) + " Thousand " + inWords(n % 1000)).trim()
        if (n < 10000000) return (inWords(Math.floor(n / 100000)) + " Lakh " + inWords(n % 100000)).trim()
        return (inWords(Math.floor(n / 10000000)) + " Crore " + inWords(n % 10000000)).trim()
    }
    return inWords(Math.floor(num)) || "Zero"
}