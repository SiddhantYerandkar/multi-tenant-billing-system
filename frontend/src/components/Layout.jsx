import { useState } from "react"
import Sidebar from "./Sidebar"
import Products from "../pages/Products"
import Parties from "../pages/Parties"
import Suppliers from "../pages/Suppliers"
import Jobs from "../pages/Jobs"
import JobDetails from "../pages/JobDetails"
import Purchases from "../pages/Purchases"
import Expenses from "../pages/Expenses"
import ProfitLoss from "../pages/ProfitLoss"
import Reports from "../pages/Reports"
import DynamicPricing from "../pages/DynamicPricing"
import Invoices from "../pages/Invoices"
import Outstanding from "../pages/Outstanding"
import Settings from "../pages/Settings"
import PartyLedger from "../pages/PartyLedger"
import SupplierLedger from "../pages/SupplierLedger"
import ViewInvoice from "../pages/ViewInvoice"
import Orders from "../pages/Orders"
import CreateJobModal from "./CreateJobModal"

export default function Layout({ company }) {
    const [page, setPage] = useState("products")
    const [ledgerPartyId, setLedgerPartyId] = useState(null)
    const [ledgerSupplierId, setLedgerSupplierId] = useState(null)
    const [viewInvoiceId, setViewInvoiceId] = useState(null)
    const [viewJobNo, setViewJobNo] = useState(null)
    const [createJobFromOrder, setCreateJobFromOrder] = useState(null)
    const [refreshOrders, setRefreshOrders] = useState(0)

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar page={page} setPage={(id) => {
                setPage(id)

                // 🔥 reset all overlays
                setViewInvoiceId(null)
                setViewJobNo(null)
                setLedgerPartyId(null)
                setLedgerSupplierId(null)
            }} />
            <div className="flex-1 overflow-hidden bg-gray-100 flex flex-col">
                {viewInvoiceId ? (
                    <ViewInvoice
                        company={company}
                        invoiceId={viewInvoiceId}
                        onBack={() => {
                            setViewInvoiceId(null)
                            setPage("invoices")
                        }}
                    />
                ) : viewJobNo ? (
                    <JobDetails
                        company={company}
                        jobNo={viewJobNo}
                        onBack={() => {
                            setViewJobNo(null)
                            setPage("jobs")
                        }}
                        onViewInvoice={(invoiceId) => {
                            setViewJobNo(null)
                            setViewInvoiceId(invoiceId)
                        }}
                    />
                ) : ledgerPartyId ? (
                    <PartyLedger
                        company={company}
                        partyId={ledgerPartyId}
                        onBack={() => {
                            setLedgerPartyId(null)
                            setPage("parties")
                        }}
                    />
                ) : ledgerSupplierId ? (
                    <SupplierLedger
                        company={company}
                        supplierId={ledgerSupplierId}
                        onBack={() => {
                            setLedgerSupplierId(null)
                            setPage("suppliers")
                        }}
                    />
                ) : (
                    <>
                        {page === "orders" && (
                            <div className="h-full overflow-y-auto">
                                <Orders
                                    company={company}
                                    onViewOrder={(jobNo) => setViewJobNo(jobNo)}
                                    onCreateJob={(order) => setCreateJobFromOrder(order)}
                                    refreshKey={refreshOrders}
                                />
                            </div>
                        )}
                        {page === "products" && <div className="h-full overflow-y-auto p-6"><Products company={company} /></div>}
                        {page === "parties" && <div className="h-full overflow-y-auto"><Parties company={company} onViewLedger={setLedgerPartyId} /></div>}
                        {page === "suppliers" && <div className="h-full overflow-y-auto"><Suppliers company={company} onViewLedger={setLedgerSupplierId} /></div>}
                        {page === "jobs" && <div className="h-full overflow-y-auto"><Jobs company={company} onViewJob={setViewJobNo} /></div>}
                        {page === "purchases" && <div className="h-full overflow-y-auto"><Purchases company={company} /></div>}
                        {page === "expenses" && <div className="h-full overflow-y-auto"><Expenses company={company} /></div>}
                        {page === "profitloss" && <div className="h-full overflow-y-auto"><ProfitLoss company={company} /></div>}
                        {page === "reports" && <div className="h-full overflow-y-auto"><Reports company={company} /></div>}
                        {page === "pricing" && <div className="h-full overflow-y-auto p-6"><DynamicPricing company={company} /></div>}
                        {page === "invoices" && <div className="h-full overflow-y-auto"><Invoices company={company} onViewInvoice={setViewInvoiceId} /></div>}
                        {page === "outstanding" && <div className="h-full overflow-y-auto"><Outstanding company={company} onViewLedger={setLedgerPartyId} /></div>}
                        {page === "settings" && <Settings company={company} />}
                    </>
                )}

                {/* Create Job Modal (from Order) */}
                <CreateJobModal
                    open={!!createJobFromOrder}
                    onClose={() => setCreateJobFromOrder(null)}
                    company={company}
                    orderData={createJobFromOrder}
                    onJobCreated={(jobNo) => {
                        setCreateJobFromOrder(null)
                        setRefreshOrders(prev => prev + 1)
                    }}
                />
            </div>
        </div>
    )
}
