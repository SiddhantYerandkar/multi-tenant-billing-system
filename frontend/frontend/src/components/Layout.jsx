import { useState } from "react"
import Sidebar from "./Sidebar"
import Products from "../pages/Products"
import Parties from "../pages/Parties"
import Settings from "../pages/Settings"
import DynamicPricing from "../pages/DynamicPricing"
import Designing from "../pages/Designing"
import Orders from "../pages/Orders"
import Designer from "../pages/Designer"
import DesignerLedger from "../pages/DesignerLedger"
import Invoices from "../pages/Invoices"
import Transactions from "../pages/Transactions"
import Expenses from "../pages/Expenses"
import PartyLedger from "../pages/PartyLedger"

export default function Layout({ company }) {
    const [page, setPage] = useState("products")
    const [ledgerPartyId, setLedgerPartyId] = useState(null)
    const [ledgerSupplierId, setLedgerSupplierId] = useState(null)
    const [viewInvoiceId, setViewInvoiceId] = useState(null)
    const [viewJobNo, setViewJobNo] = useState(null)
    const [designerLedger, setDesignerLedger] = useState(null)
    const [invoiceDraftFromOrder, setInvoiceDraftFromOrder] = useState(null)
    const [invoiceViewIdFromOrder, setInvoiceViewIdFromOrder] = useState(null)

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar page={page} setPage={(id) => {
                setPage(id)

                // 🔥 reset all overlays
                setViewInvoiceId(null)
                setViewJobNo(null)
                setLedgerPartyId(null)
                setLedgerSupplierId(null)
                setDesignerLedger(null)
            }} />
            <div className="flex-1 overflow-hidden bg-gray-100 flex flex-col">
                {page === "designing" && (
                    <div className="h-full overflow-y-auto">
                        <Designing company={company} />
                    </div>
                )}
                {page === "orders" && (
                    <div className="h-full overflow-y-auto">
                        <Orders
                            company={company}
                            onStartInvoiceFromOrder={(draft) => {
                                setInvoiceDraftFromOrder(draft)
                                setPage("invoices")
                            }}
                            onViewInvoiceFromOrder={(invoiceId) => {
                                setInvoiceViewIdFromOrder(invoiceId)
                                setPage("invoices")
                            }}
                        />
                    </div>
                )}
                {page === "invoices" && (
                    <div className="h-full overflow-y-auto">
                        <Invoices
                            company={company}
                            draftFromOrder={invoiceDraftFromOrder}
                            onDraftConsumed={() => setInvoiceDraftFromOrder(null)}
                            viewInvoiceIdFromOrder={invoiceViewIdFromOrder}
                            onViewInvoiceConsumed={() => setInvoiceViewIdFromOrder(null)}
                        />
                    </div>
                )}
                {page === "transactions" && (
                    <div className="h-full overflow-y-auto">
                        <Transactions
                            company={company}
                            onViewLedger={setLedgerPartyId}
                        />
                    </div>
                )}
                {page === "expenses" && (
                    <div className="h-full overflow-y-auto">
                        <Expenses company={company} />
                    </div>
                )}
                {page === "products" && <div className="h-full overflow-y-auto p-6"><Products company={company} /></div>}
                {page === "parties" && (
                    <div className="h-full overflow-y-auto">
                        {ledgerPartyId ? (
                            <PartyLedger
                                company={company}
                                partyId={ledgerPartyId}
                                onBack={() => setLedgerPartyId(null)}
                            />
                        ) : (
                            <Parties
                                company={company}
                                onViewLedger={setLedgerPartyId}
                            />
                        )}
                    </div>
                )}
                {page === "pricing" && <div className="h-full overflow-y-auto"> <DynamicPricing company={company} /> </div>}
                {page === "designer" && (
                    <div className="h-full overflow-y-auto">
                        {designerLedger ? (
                            <DesignerLedger
                                company={company}
                                designer={designerLedger}
                                onBack={() => setDesignerLedger(null)}
                            />
                        ) : (
                            <Designer
                                company={company}
                                onViewLedger={setDesignerLedger}
                            />
                        )}
                    </div>
                )}
                {page === "settings" && <Settings company={company} />}
            </div>
        </div>
    )
}
