import { useEffect, useState } from "react";
import { getInvoice, getInvoiceItems } from "../services/invoiceService";
import { getProducts } from "../services/productService";
import { getPaymentsByInvoice } from "../services/paymentService";
import { getParty } from "../services/partyService";
import { calculateInvoiceStatus } from "../utils/invoiceStatus";
import PaymentSummary from "../components/PaymentSummary";
import PaymentTable from "../components/PaymentTable";
import AddPaymentModal from "../components/AddPaymentModal";
import EditPaymentModal from "../components/EditPaymentModal";
import ReversePaymentModal from "../components/ReversePaymentModal";
import AdjustPaymentModal from "../components/AdjustPaymentModal";
import ReceiptView from "../components/ReceiptView";
import { canGenerateReceipt } from "../utils/recalculateInvoiceTotals";
import { generateInvoicePDF } from "../utils/pdfGenerator";

export default function ViewInvoice({ company, invoiceId, onBack }) {
  const [invoice, setInvoice] = useState(null);
  const [party, setParty] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [showReversePaymentModal, setShowReversePaymentModal] = useState(false);
  const [showAdjustPaymentModal, setShowAdjustPaymentModal] = useState(false);
  const [showReceiptView, setShowReceiptView] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    if (invoiceId && company?.$id) {
      loadInvoiceData();
    }
  }, [invoiceId, company]);

  async function loadInvoiceData() {
    if (!invoiceId || !company?.$id) return;

    setLoading(true);
    setError("");
    try {
      // Fetch invoice, items, products, payments, and party
      const [invoiceRes, itemsRes, productsRes, paymentsRes] = await Promise.all([
        getInvoice(company.$id, invoiceId),
        getInvoiceItems(invoiceId),
        getProducts(company.$id),
        getPaymentsByInvoice(company.$id, invoiceId)
      ]);

      setInvoice(invoiceRes);
      setInvoiceItems(itemsRes.documents);
      setProducts(productsRes.documents);
      setPayments(paymentsRes.documents || []);

      // Fetch party data
      if (invoiceRes.partyId) {
        try {
          const partyRes = await getParty(company.$id, invoiceRes.partyId);
          setParty(partyRes);
        } catch (err) {
          console.error("Error loading party:", err);
          // Continue without party data
        }
      }
    } catch (error) {
      console.error("Error loading invoice data:", error);
      setError("Failed to load invoice details. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const reloadPayments = () => {
    if (invoice?.$id && company?.$id) {
      getPaymentsByInvoice(company.$id, invoice.$id)
        .then(res => setPayments(res.documents || []))
        .catch(err => console.error("Error reloading payments:", err));
    }
  }

  const handlePaymentAdded = () => {
    reloadPayments();
  }

  const handlePaymentUpdated = () => {
    reloadPayments();
  }

  const handlePaymentReversed = () => {
    reloadPayments();
  }

  const handlePaymentAdjusted = () => {
    reloadPayments();
  }

  const handleEditPayment = (payment) => {
    setSelectedPayment(payment);
    setShowEditPaymentModal(true);
  }

  const handleReversePayment = (payment) => {
    setSelectedPayment(payment);
    setShowReversePaymentModal(true);
  }

  const handleAdjustPayment = (payment) => {
    setSelectedPayment(payment);
    setShowAdjustPaymentModal(true);
  }

  const handleViewReceipt = (payment) => {
    if (canGenerateReceipt(payment)) {
      setSelectedReceipt(payment);
      setShowReceiptView(true);
    }
  }

  const handlePrintReceipt = (payment) => {
    if (canGenerateReceipt(payment)) {
      setSelectedReceipt(payment);
      setShowReceiptView(true);
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoice || !party) return;
    try {
      const filePath = await generateInvoicePDF(
        invoice,
        invoiceItems,
        company,
        party
      );
  
      // Optional: show success
      alert(`PDF saved at:\n${filePath}`);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  }

  const handlePrint = () => {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
            sync
          </span>
          <p className="text-gray-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-red-500 mb-2">
            error
          </span>
          <p className="text-red-600">{error || "Invoice not found"}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Format invoice date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric" 
      });
    } catch {
      return dateString;
    }
  };

  // Format company address
  const formatAddress = (address) => {
    if (!address) return [];
    if (typeof address === "string") {
      return address.split(",").map(line => line.trim());
    }
    return Array.isArray(address) ? address : [];
  };

  // Get product details for items
  const getProductDetails = (productId) => {
    return products.find(p => p.$id === productId);
  };

  // Calculate totals
  const subtotal = invoice.subTotal || invoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const gstAmount = invoice.gstAmount || 0;
  const grandTotal = invoice.grandTotal || subtotal + gstAmount;

  // Company details
  const companyName = company?.name || "Company Name";
  const companyAddress = formatAddress(company?.address);
  const companyGst = company?.gstNumber || company?.gst || "N/A";
  const companyEmail = company?.email || "";

  // Party/Bill To details
  const partyName = party?.name || "Unknown Party";
  const partyAddress = formatAddress(party?.address);
  const partyEmail = party?.email || "";
  const partyPhone = party?.phone || "";

  // Calculate status from payments
  const calculatedStatus = calculateInvoiceStatus(invoice, payments);
  const status = calculatedStatus;
  const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-background-light">
      {/* HEADER */}
      <header className="sticky top-0 bg-white dark:bg-[#1a1c20] z-10 px-8 py-6 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[#121617] dark:text-white text-2xl font-extrabold tracking-tight">{`#${invoice.invoiceNumber || "N/A"}`}</h2>
                <div className={`flex h-7 shrink-0 items-center justify-center gap-x-2 rounded-full px-3 ${
                  status === "paid" ? "bg-green-100" : 
                  status === "pending" ? "bg-yellow-100" : 
                  status === "partial" ? "bg-blue-100" :
                  status === "overdue" ? "bg-red-100" :
                  "bg-gray-100"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    status === "paid" ? "bg-green-500" : 
                    status === "pending" ? "bg-yellow-500" : 
                    status === "partial" ? "bg-blue-500" :
                    status === "overdue" ? "bg-red-500" :
                    "bg-gray-500"
                  }`}></span>
                  <p className={`${
                    status === "paid" ? "text-green-700" : 
                    status === "pending" ? "text-yellow-700" : 
                    status === "partial" ? "text-blue-700" :
                    status === "overdue" ? "text-red-700" :
                    "text-gray-700"
                  } text-xs font-bold uppercase tracking-wider`}>{statusDisplay}</p>
                </div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Issued on {formatDate(invoice.invoiceDate)}</p>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button 
                onClick={handlePrint}
                className="p-2.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 transition-colors" 
                title="Print"
              >
                <span className="material-symbols-outlined text-[20px]">print</span>
              </button>
              <button 
                onClick={handleDownloadPDF}
                className="p-2.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 transition-colors" 
                title="Download PDF"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
              </button>
              <button className="p-2.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors" title="Email to Customer">
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </button>
            </div>
            <button className="flex items-center justify-center gap-2 h-10 px-5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-sm transition-all shadow-sm">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span>Edit Invoice</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="px-10 py-12 flex flex-col gap-12 max-w-5xl mx-auto w-full">
        {/* INFO GRID */}
        <div className="grid grid-cols-3 gap-16">
          {/* INVOICE TITLE */}
          <div className="flex flex-col gap-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Title</p>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#121617] dark:text-white">{invoice.invoiceTitle || "N/A"}</h3>
            </div>
          </div>
          {/* BILL TO */}
          <div className="flex flex-col gap-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Bill To</p>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#121617] dark:text-white">{partyName}</h3>
              <div className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {partyPhone && <p>Phone: {partyPhone}</p>}
                {partyAddress.map((line, i) => <p key={i}>{line}</p>)}
                {partyEmail && <p className="pt-2 text-primary font-medium">{partyEmail}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCT TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Description</th>
                <th className="py-4 px-4 font-bold text-xs uppercase tracking-widest text-gray-400 text-center">Qty</th>
                <th className="py-4 px-4 font-bold text-xs uppercase tracking-widest text-gray-400 text-right">Unit Price</th>
                <th className="py-4 font-bold text-xs uppercase tracking-widest text-gray-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {invoiceItems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              ) : (
                invoiceItems.map((item, i) => {
                  const product = getProductDetails(item.productId);
                  return (
                    <tr key={item.$id || i}>
                      <td className="py-6">
                        <p className="font-bold text-[#121617] dark:text-white">{item.productName || "Unknown Product"}</p>
                      </td>
                      <td className="py-6 px-4 text-center font-medium text-gray-900 dark:text-white">{item.quantity || 0}</td>
                      <td className="py-6 px-4 text-right text-gray-600 dark:text-gray-400">₹{(item.rate || 0).toFixed(2)}</td>
                      <td className="py-6 text-right font-bold text-[#121617] dark:text-white">₹{(item.total || 0).toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FINANCIAL SUMMARY */}
        <div className="flex justify-end pt-4">
          <div className="w-full max-w-xs space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Subtotal</span>
              <span className="text-[#121617] dark:text-white font-bold">₹{subtotal.toFixed(2)}</span>
            </div>
            {gstAmount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">GST Amount</span>
                <span className="text-[#121617] dark:text-white font-bold">₹{gstAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="h-px bg-gray-100 dark:bg-gray-800 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-[#121617] dark:text-white">Grand Total</span>
              <span className="text-2xl font-black text-primary">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* PAYMENT SUMMARY */}
        <PaymentSummary invoice={invoice} payments={payments} />

        {/* PAYMENTS SECTION */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
            Payments
          </h3>
          <button
            onClick={() => setShowAddPaymentModal(true)}
            disabled={invoice.isDraft === true}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
              invoice.isDraft === true
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 text-white"
            }`}
            title={invoice.isDraft === true ? "Cannot record payment for draft invoices" : "Record Payment"}
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Record Payment</span>
          </button>
        </div>

        <PaymentTable
          payments={payments}
          onViewReceipt={handleViewReceipt}
          onPrintReceipt={handlePrintReceipt}
          onEditPayment={handleEditPayment}
          onReversePayment={handleReversePayment}
          onAdjustPayment={handleAdjustPayment}
        />
      </div>

      {/* MODALS */}
      <AddPaymentModal
        open={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        invoice={invoice}
        company={company}
        payments={payments}
        onPaymentAdded={handlePaymentAdded}
      />

      <EditPaymentModal
        open={showEditPaymentModal}
        onClose={() => {
          setShowEditPaymentModal(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onPaymentUpdated={handlePaymentUpdated}
      />

      <ReversePaymentModal
        open={showReversePaymentModal}
        onClose={() => {
          setShowReversePaymentModal(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        invoice={invoice}
        payments={payments}
        onPaymentReversed={handlePaymentReversed}
      />

      <AdjustPaymentModal
        open={showAdjustPaymentModal}
        onClose={() => {
          setShowAdjustPaymentModal(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        invoice={invoice}
        payments={payments}
        onPaymentAdjusted={handlePaymentAdjusted}
      />

      <ReceiptView
        open={showReceiptView}
        payment={selectedReceipt}
        invoice={invoice}
        company={company}
        party={party}
        onClose={() => {
          setShowReceiptView(false);
          setSelectedReceipt(null);
        }}
        onPrint={() => {
          window.print();
        }}
      />
    </main>
  );
}
