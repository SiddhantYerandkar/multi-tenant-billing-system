
import { useEffect, useMemo, useState } from "react"
import { getInvoicesByParty } from "../services/invoiceService"
import { getPartyPayments } from "../services/partyPaymentService"
import { getAllParties } from "../services/partyService"

const getEntityId = (item) => item?.id || item?.$id

/**
 * Party Ledger Component - Accounting-style ledger for party transactions
 * Shows invoices and payments in debit/credit format with running balance
 */
export default function PartyLedger({ company, partyId, onBack }) {
    const [ledgerEntries, setLedgerEntries] = useState([])
    const [loading, setLoading] = useState(false)
    const [party, setParty] = useState(null)
    const [fromDate, setFromDate] = useState("")
    const [toDate, setToDate] = useState("")
    const [transactionType, setTransactionType] = useState("")

    const companyId = getEntityId(company)

    useEffect(() => {
        loadLedgerData()
    }, [companyId, partyId])

    /**
     * Load and process ledger data
     */
    const loadLedgerData = async () => {
        if (!companyId || !partyId) return

        setLoading(true)
        try {
            // Fetch party details
            const partiesRes = await getAllParties(companyId)
            const partiesList = Array.isArray(partiesRes) ? partiesRes : (partiesRes?.documents || [])
            const currentParty = partiesList.find(p => getEntityId(p) === partyId)
            setParty(currentParty)

            // Fetch invoices and payments
            const [invoicesRes, paymentsRes] = await Promise.all([
                getInvoicesByParty(companyId, partyId),
                getPartyPayments(companyId, { partyId })
            ])

            const invoices = invoicesRes.documents || []
            const payments = paymentsRes.documents || []

            // Build ledger entries
            const entries = buildLedgerEntries(invoices, payments)

            setLedgerEntries(entries)
        } catch (err) {
            console.error("Failed to load party ledger:", err)
            setLedgerEntries([])
        } finally {
            setLoading(false)
        }
    }

    /**
     * Transform invoices and payments into ledger entries
     */
    const buildLedgerEntries = (invoices, payments) => {
        const entries = []

        // Add invoice entries (debits)
        invoices.forEach(invoice => {
            entries.push({
                id: getEntityId(invoice),
                date: invoice.date,
                type: "invoice",
                refNo: invoice.invoiceNo || invoice.id,
                description: `Invoice ${invoice.invoiceNo || invoice.id}`,
                debit: Number(invoice.totalAmount || 0),
                credit: 0,
                originalData: invoice
            })
        })

        // Add payment entries (credits)
        payments.forEach(payment => {
            entries.push({
                id: getEntityId(payment),
                date: payment.paymentDate,
                type: "payment",
                refNo: payment.id,
                description: `Payment - ${payment.mode || 'Cash'}`,
                debit: 0,
                credit: Number(payment.amount || 0),
                originalData: payment
            })
        })

        // Sort by date ascending
        entries.sort((a, b) => new Date(a.date) - new Date(b.date))

        // Calculate running balance
        let runningBalance = 0
        entries.forEach(entry => {
            runningBalance = runningBalance + entry.debit - entry.credit
            entry.balance = Math.abs(runningBalance)
            entry.balanceType = runningBalance >= 0 ? "Dr" : "Cr"
        })

        return entries
    }

    /**
     * Filter entries by date range and transaction type
     */
    const filteredEntries = useMemo(() => {
        let result = ledgerEntries

        if (fromDate) {
            result = result.filter(entry => entry.date >= fromDate)
        }
        if (toDate) {
            result = result.filter(entry => entry.date <= toDate)
        }

        if (transactionType) {
            result = result.filter(entry => entry.type === transactionType)
        }

        return result
    }, [ledgerEntries, fromDate, toDate, transactionType])

    /**
     * Calculate summary totals
     */
    const summary = useMemo(() => {
        const totalDebit = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0)
        const totalCredit = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0)
        const closingBalance = totalDebit - totalCredit

        return {
            totalDebit,
            totalCredit,
            closingBalance: Math.abs(closingBalance),
            closingBalanceType: closingBalance >= 0 ? "Dr" : "Cr"
        }
    }, [filteredEntries])

    /**
     * Format date for display
     */
    const formatDate = (dateString) => {
        if (!dateString) return "-"
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
        } catch {
            return dateString
        }
    }

    /**
     * Get type color for styling
     */
    const getTypeColor = (type) => {
        switch (type) {
            case 'invoice': return 'bg-orange-100 text-orange-700'
            case 'payment': return 'bg-green-100 text-green-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <main className="flex-1 flex flex-col overflow-hidden">
            {/* HEADER */}
            <header className="bg-white border-b border-[#dae5e7] p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg border border-[#dae5e7] hover:bg-gray-50"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>

                    <div>
                        <h1 className="text-2xl font-bold">{party?.name || party?.partyName || "Party"}</h1>
                        <p className="text-sm text-gray-500">Party Ledger</p>
                    </div>
                </div>
            </header>

            {/* SUMMARY CARDS */}
            <div className="bg-white px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-[#dae5e7]">
                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                    <p className="text-sm text-gray-500">Total Debit</p>
                    <p className="text-xl font-bold text-red-600">₹{summary.totalDebit.toFixed(2)}</p>
                </div>

                <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-sm text-gray-500">Total Credit</p>
                    <p className="text-xl font-bold text-green-600">₹{summary.totalCredit.toFixed(2)}</p>
                </div>

                <div className={`p-4 rounded-xl border ${summary.closingBalanceType === "Dr" ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
                    <p className="text-sm text-gray-500">Closing Balance</p>
                    <p className={`text-xl font-bold ${summary.closingBalanceType === "Dr" ? "text-red-600" : "text-green-600"}`}>
                        ₹{summary.closingBalance.toFixed(2)} {summary.closingBalanceType}
                    </p>
                </div>
            </div>

            {/* FILTERS */}
            <div className="bg-white px-6 py-4 flex flex-wrap gap-4 items-end border-b border-[#dae5e7]">
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm"
                    />
                </div>

                <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm bg-white"
                >
                    <option value="">All Transactions</option>
                    <option value="invoice">Invoices Only</option>
                    <option value="payment">Payments Only</option>
                </select>

            </div>

            {/* TABLE */}
            <section className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-[#f0f4f5]/60">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Date</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Type</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Description</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-right">Debit</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-right">Credit</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-right">Balance</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#f0f4f5]">
                            {!loading && filteredEntries.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-sm text-gray-500">
                                        No ledger entries found for this party.
                                    </td>
                                </tr>
                            )}

                            {filteredEntries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-primary/5 transition">
                                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(entry.date)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded capitalize ${getTypeColor(entry.type)}`}>
                                            {entry.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{entry.description}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right text-red-600 font-semibold">
                                        {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "—"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right text-green-600 font-semibold">
                                        {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "—"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right font-medium">
                                        ₹{entry.balance.toFixed(2)} {entry.balanceType}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    )
}