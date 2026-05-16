import { useEffect, useState } from "react";
import { getInvoiceItems } from "../services/invoiceService";
import { getProducts } from "../services/productService";
import { getPaymentsByInvoice } from "../services/paymentService";
import { calculateInvoiceStatus } from "../utils/invoiceStatus";
import PaymentSummary from "./PaymentSummary";
import PaymentTable from "./PaymentTable";
import AddPaymentModal from "./AddPaymentModal";
import EditPaymentModal from "./EditPaymentModal";
import ReversePaymentModal from "./ReversePaymentModal";
import AdjustPaymentModal from "./AdjustPaymentModal";
import ReceiptView from "./ReceiptView";
import { canGenerateReceipt } from "../utils/recalculateInvoiceTotals";

export default function ViewInvoiceModal({ open, onClose, invoice, company, party }) {
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [showReversePaymentModal, setShowReversePaymentModal] = useState(false);
  const [showAdjustPaymentModal, setShowAdjustPaymentModal] = useState(false);
  const [showReceiptView, setShowReceiptView] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    if (open && invoice?.$id && company?.$id) {
      loadInvoiceData();
    }
  }, [open, invoice, company]);

  async function loadInvoiceData() {
    if (!invoice?.$id || !company?.$id) return;
    
    setLoading(true);
    try {
      const [itemsRes, productsRes, paymentsRes] = await Promise.all([
        getInvoiceItems(invoice.$id),
        getProducts(company.$id),
        getPaymentsByInvoice(company.$id, invoice.$id)
      ]);
      
      setInvoiceItems(itemsRes.documents);
      setProducts(productsRes.documents);
      setPayments(paymentsRes.documents || []);
    } catch (error) {
      console.error("Error loading invoice data:", error);
      alert("Failed to load invoice details");
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
      // Trigger print after a short delay to allow modal to render
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }

  if (!open || !invoice) return null;

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#1a1c20] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col">

        {/* HEADER */}
        <div className="sticky top-0 bg-white dark:bg-[#1a1c20] z-10 px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div onClick={onClose} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </div>
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
              <button className="p-2.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 transition-colors" title="Print">
                <span className="material-symbols-outlined text-[20px]">print</span>
              </button>
              <button className="p-2.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 transition-colors" title="Download PDF">
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

        {/* CONTENT */}
        <div className="px-10 py-12 flex flex-col gap-12">
          {/* INFO GRID */}
          <div className="grid grid-cols-2 gap-16">
            {/* COMPANY DETAILS */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="size-8 bg-primary rounded flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                </div>
                <span className="text-lg font-bold text-[#121617] dark:text-white uppercase tracking-tighter">{companyName}</span>
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed space-y-1">
                {companyAddress.map((line, i) => <p key={i}>{line}</p>)}
                <div className="pt-2 flex flex-col">
                  {companyGst !== "N/A" && (
                    <span className="font-semibold text-gray-700 dark:text-gray-300">GST ID: {companyGst}</span>
                  )}
                  {companyEmail && <span>{companyEmail}</span>}
                </div>
              </div>
            </div>

            {/* ORDER NO */}
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Order No</p>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#121617] dark:text-white">{invoice.orderNo || "N/A"}</h3>
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
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-gray-500">
                      Loading items...
                    </td>
                  </tr>
                ) : invoiceItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-gray-500">
                      No items found
                    </td>
                  </tr>
                ) : (
                  invoiceItems.map((item, i) => {
                    const product = getProductDetails(item.productId);
                    const sku = product?.sku || "";
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

          {/* NOTES - Optional section, can be added to invoice schema later */}
          {/* <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Terms & Notes</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{invoice.notes || "No additional notes."}</p>
          </div> */}
        </div>

        <div className="pb-10" />
      </div>

      {/* ADD PAYMENT MODAL */}
      <AddPaymentModal
        open={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        invoice={invoice}
        company={company}
        payments={payments}
        onPaymentAdded={handlePaymentAdded}
      />

      {/* EDIT PAYMENT MODAL */}
      <EditPaymentModal
        open={showEditPaymentModal}
        onClose={() => {
          setShowEditPaymentModal(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onPaymentUpdated={handlePaymentUpdated}
      />

      {/* REVERSE PAYMENT MODAL */}
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

      {/* ADJUST PAYMENT MODAL */}
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

      {/* RECEIPT VIEW MODAL */}
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
    </div>
  );
}
