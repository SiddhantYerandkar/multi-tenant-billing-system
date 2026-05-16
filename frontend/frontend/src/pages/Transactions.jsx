import { useEffect, useMemo, useState } from "react"
import { getInvoices, updateInvoice } from "../services/invoiceService"
import { getAllParties } from "../services/partyService"
import {
  createPartyPayment,
  createPartyPaymentAllocationRows,
  getPartyPaymentAllocations,
  getPartyPayments,
} from "../services/partyPaymentService"
import PartyLedger from "./PartyLedger"

function getEntityId(x) {
  return x?.$id || x?.id
}

function formatINR(amount) {
  const n = Number(amount || 0)
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n)
}

export default function Transactions({ company, onViewLedger }) {
  const [invoices, setInvoices] = useState([])
  const [parties, setParties] = useState([])
  const [partyPayments, setPartyPayments] = useState([])
  const [paymentAllocations, setPaymentAllocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("payments") // payments | outstanding | summary

  const [showInsights, setShowInsights] = useState(false)

  // Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentPartyId, setPaymentPartyId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentTypeMode, setPaymentTypeMode] = useState("Cash")

  const [quickPayPartyId, setQuickPayPartyId] = useState("")

  const companyId = getEntityId(company)
  // Add state at top of Transactions component
  const [ledgerPartyId, setLedgerPartyId] = useState(null)

  // If viewing ledger, render PartyLedger directly
  if (ledgerPartyId) {
    return (
      <PartyLedger
        company={company}
        partyId={ledgerPartyId}
        onBack={() => setLedgerPartyId(null)}
      />
    )
  }
  useEffect(() => {
    async function load() {
      if (!companyId) return
      setLoading(true)
      try {
        const [invRes, partiesRes, paymentsRes, allocationsRes] = await Promise.all([
          getInvoices(companyId),
          getAllParties(companyId),
          getPartyPayments(companyId),
          getPartyPaymentAllocations(companyId),
        ])

        setInvoices(invRes?.documents || [])
        setParties(partiesRes?.documents || [])
        setPartyPayments(paymentsRes?.documents || [])
        setPaymentAllocations(allocationsRes?.documents || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [companyId])

  const partyMap = useMemo(() => {
    const map = {}
      ; (parties || []).forEach((p) => {
        map[getEntityId(p)] = p.name || p.partyName || p.partyCode || "-"
      })
    return map
  }, [parties])

  const normalizedInvoices = useMemo(() => {
    return (invoices || [])
      .filter((inv) => String(inv.status || "unpaid").toLowerCase() !== "cancelled")
      .map((inv) => ({
        ...inv,
        totalAmount: Number(inv.totalAmount || 0),
        paidAmount: Number(inv.paidAmount || 0),
        status: inv.status || "unpaid",
      }))
  }, [invoices])

  const invoiceNoById = useMemo(() => {
    const map = {}
    normalizedInvoices.forEach((inv) => {
      map[inv.$id] = inv.invoiceNo
    })
    return map
  }, [normalizedInvoices])

  const allocationSumByPaymentId = useMemo(() => {
    const map = {}
      ; (paymentAllocations || []).forEach((a) => {
        const paymentId = a.paymentId
        if (!paymentId) return
        map[paymentId] = (map[paymentId] || 0) + Number(a.allocatedAmount || 0)
      })
    return map
  }, [paymentAllocations])

  const advanceAvailableByParty = useMemo(() => {
    const map = {}
      ; (partyPayments || [])
        .filter((p) => p.referenceType === "advance")
        .forEach((p) => {
          const paymentId = p.$id || p.id
          const partyId = p.partyId
          if (!paymentId || !partyId) return
          const used = allocationSumByPaymentId[paymentId] || 0
          const available = Math.max(0, Number(p.amount || 0) - Number(used || 0))
          map[partyId] = (map[partyId] || 0) + available
        })
    return map
  }, [partyPayments, allocationSumByPaymentId])

  const paymentRows = useMemo(() => {
    // Fallback (during rollout): if `party_payments` is empty, show what we have from invoices.
    if (!partyPayments || partyPayments.length === 0) {
      return normalizedInvoices
        .filter((inv) => Number(inv.paidAmount || 0) > 0)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .map((inv) => ({
          id: inv.$id,
          date: inv.date,
          partyId: inv.partyId,
          partyName: partyMap[inv.partyId] || "-",
          type: inv.status === "partial" ? "Partial Payment" : "Payment",
          ref: inv.invoiceNo,
          amount: Number(inv.paidAmount || 0),
          mode: "Cash",
        }))
    }

    return (partyPayments || [])
      .slice()
      .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0))
      .map((p) => {
        const partyId = p.partyId
        const refInvoiceNo =
          p.referenceType === "invoice" && p.referenceId
            ? invoiceNoById[p.referenceId]
            : ""

        const type = p.referenceType === "advance" ? "Advance" : "Payment"
        return {
          id: p.$id || p.id,
          date: p.paymentDate,
          partyId,
          partyName: partyMap[partyId] || "-",
          type,
          ref: refInvoiceNo || p.referenceId || "—",
          amount: Number(p.amount || 0),
          mode: p.mode || "Cash",
        }
      })
  }, [partyPayments, partyMap, invoiceNoById])

  const outstandingByParty = useMemo(() => {
    const acc = {}
    normalizedInvoices.forEach((inv) => {
      const pid = inv.partyId
      if (!pid) return
      const entry = acc[pid] || {
        partyId: pid,
        partyName: partyMap[pid] || "-",
        total: 0,
        paid: 0,
      }
      entry.total += inv.totalAmount
      entry.paid += inv.paidAmount
      acc[pid] = entry
    })

    return Object.values(acc)
      .map((x) => ({ ...x, outstanding: Math.max(0, x.total - x.paid) }))
      .sort((a, b) => b.outstanding - a.outstanding)
  }, [normalizedInvoices, partyMap])

  const totals = useMemo(() => {
    const totalOutstanding = outstandingByParty.reduce((s, p) => s + p.outstanding, 0)
    const totalCollected = normalizedInvoices.reduce((s, inv) => s + inv.paidAmount, 0)
    const totalInvoices = normalizedInvoices.length

    const paidCount = normalizedInvoices.filter((i) => i.status === "paid").length
    const partialCount = normalizedInvoices.filter((i) => i.status === "partial").length

    return {
      totalOutstanding,
      totalCollected,
      totalInvoices,
      paidCount,
      partialCount,
    }
  }, [outstandingByParty, normalizedInvoices])

  const openPaymentModal = (partyId = "", cashSuggested = "") => {
    setQuickPayPartyId(partyId)
    setPaymentPartyId(partyId)
    setPaymentAmount(cashSuggested)
    setPaymentModalOpen(true)
  }

  const closePaymentModal = () => {
    setPaymentModalOpen(false)
    setQuickPayPartyId("")
    setPaymentPartyId("")
    setPaymentAmount("")
  }

  const applyPaymentToPartyInvoices = async () => {
    if (!companyId) throw new Error("Company missing")

    const partyId = String(paymentPartyId || "").trim()
    const cashAmount = Math.max(0, Number(paymentAmount || 0))

    if (!partyId) throw new Error("Select party")

    const dueInvoices = normalizedInvoices
      .filter(
        (inv) =>
          inv.partyId === partyId &&
          inv.status !== "cancelled" &&
          Number(inv.paidAmount || 0) < Number(inv.totalAmount || 0)
      )
      .sort((a, b) => {
        const da = new Date(a.date || a.created_at || 0).getTime()
        const db = new Date(b.date || b.created_at || 0).getTime()
        return da - db
      })

    if (dueInvoices.length === 0) {
      // If there are no outstanding invoices, treat entered cash as a pure ADVANCE.
      if (cashAmount > 0) {
        await createPartyPayment({
          companyId,
          partyId,
          paymentDate: new Date().toISOString(),
          amount: cashAmount,
          mode: paymentTypeMode || "Cash",
          referenceType: "advance",
        })
        return { dueRemainingAfter: 0, cashRemaining: 0 }
      }
      throw new Error("No outstanding invoices for this party")
    }

    // Local “next paid” state for invoices (so we can allocate without partial persistence).
    const nextPaidByInvoiceId = {}
    dueInvoices.forEach((inv) => {
      nextPaidByInvoiceId[inv.$id] = Number(inv.paidAmount || 0)
    })

    const allocationsToPersist = []

    const localUsedByPaymentId = { ...(allocationSumByPaymentId || {}) }

    const isInvoiceSettled = (inv) =>
      Number(nextPaidByInvoiceId[inv.$id] || 0) >= Number(inv.totalAmount || 0)

    const dueRemainingAmount = () =>
      dueInvoices.reduce((sum, inv) => {
        const paidNow = Number(nextPaidByInvoiceId[inv.$id] || 0)
        return sum + Math.max(0, Number(inv.totalAmount || 0) - paidNow)
      }, 0)

    // STEP 1: apply existing ADVANCES first (FIFO by paymentDate)
    const advancePayments = (partyPayments || [])
      .filter((p) => p.partyId === partyId && p.referenceType === "advance")
      .slice()
      .sort((a, b) => new Date(a.paymentDate || 0) - new Date(b.paymentDate || 0))

    for (const adv of advancePayments) {
      if (dueRemainingAmount() <= 0) break

      const paymentId = adv.$id || adv.id
      if (!paymentId) continue

      const used = Number(localUsedByPaymentId[paymentId] || 0)
      const available = Math.max(0, Number(adv.amount || 0) - used)
      if (available <= 0) continue

      let remainingAdvance = available

      for (const inv of dueInvoices) {
        if (remainingAdvance <= 0) break
        if (isInvoiceSettled(inv)) continue

        const paidNow = Number(nextPaidByInvoiceId[inv.$id] || 0)
        const due = Math.max(0, Number(inv.totalAmount || 0) - paidNow)
        if (due <= 0) continue

        const pay = Math.min(due, remainingAdvance)
        nextPaidByInvoiceId[inv.$id] = paidNow + pay
        remainingAdvance -= pay

        allocationsToPersist.push({
          paymentId,
          invoiceId: inv.$id,
          allocatedAmount: pay,
        })
      }

      const consumed = available - remainingAdvance
      if (consumed > 0) {
        localUsedByPaymentId[paymentId] = used + consumed
      }
    }

    // STEP 2: apply CASH to remaining due (FIFO invoices)
    let cashRemaining = cashAmount
    if (cashRemaining > 0 && dueRemainingAmount() > 0) {
      const cashAllocations = []
      for (const inv of dueInvoices) {
        if (cashRemaining <= 0) break
        if (isInvoiceSettled(inv)) continue

        const paidNow = Number(nextPaidByInvoiceId[inv.$id] || 0)
        const due = Math.max(0, Number(inv.totalAmount || 0) - paidNow)
        if (due <= 0) continue

        const pay = Math.min(due, cashRemaining)
        nextPaidByInvoiceId[inv.$id] = paidNow + pay
        cashRemaining -= pay

        cashAllocations.push({
          invoiceId: inv.$id,
          allocatedAmount: pay,
        })
      }

      const cashAllocated = cashAllocations.reduce(
        (s, a) => s + Number(a.allocatedAmount || 0),
        0
      )

      if (cashAllocated > 0) {
        const paymentDate = new Date().toISOString()
        const header = await createPartyPayment({
          companyId,
          partyId,
          paymentDate,
          amount: cashAllocated,
          mode: paymentTypeMode || "Cash",
          referenceType: "invoice",
          referenceId: cashAllocations[0]?.invoiceId,
        })
        const paymentId = header.$id || header.id

        cashAllocations.forEach((a) => {
          allocationsToPersist.push({
            paymentId,
            invoiceId: a.invoiceId,
            allocatedAmount: a.allocatedAmount,
          })
        })
      }
    }

    if (dueRemainingAmount() > 0 && cashAmount <= 0) {
      throw new Error("No advance available to clear due. Enter payment amount.")
    }

    // STEP 3: leftover cash becomes a NEW advance record (unallocated)
    if (cashRemaining > 0) {
      await createPartyPayment({
        companyId,
        partyId,
        paymentDate: new Date().toISOString(),
        amount: cashRemaining,
        mode: paymentTypeMode || "Cash",
        referenceType: "advance",
      })
    }

    // Persist invoice paidAmounts
    const updatePromises = []
    for (const inv of dueInvoices) {
      const nextPaid = Number(nextPaidByInvoiceId[inv.$id] || 0)
      if (nextPaid !== Number(inv.paidAmount || 0)) {
        updatePromises.push(
          updateInvoice(inv.$id, {
            companyId,
            paidAmount: nextPaid,
            totalAmount: inv.totalAmount,
          })
        )
      }
    }
    await Promise.all(updatePromises)

    // Persist allocations (advance allocations + cash allocations)
    if (allocationsToPersist.length > 0) {
      await createPartyPaymentAllocationRows(
        allocationsToPersist.map((r) => ({
          companyId,
          paymentId: r.paymentId,
          invoiceId: r.invoiceId,
          allocatedAmount: r.allocatedAmount,
        }))
      )
    }

    return { dueRemainingAfter: dueRemainingAmount(), cashRemaining }
  }

  const [actionBusy, setActionBusy] = useState(false)
  const handleAddPayment = async () => {
    setActionBusy(true)
    try {
      const res = await applyPaymentToPartyInvoices()
      if (Number(res?.dueRemainingAfter || 0) > 0) {
        alert(`Payment recorded, but due still remains: ${formatINR(res.dueRemainingAfter)}`)
      }

      // Reload data
      const [invRes, partiesRes, paymentsRes, allocationsRes] = await Promise.all([
        getInvoices(companyId),
        getAllParties(companyId),
        getPartyPayments(companyId),
        getPartyPaymentAllocations(companyId),
      ])

      setInvoices(invRes?.documents || [])
      setParties(partiesRes?.documents || [])
      setPartyPayments(paymentsRes?.documents || [])
      setPaymentAllocations(allocationsRes?.documents || [])
      closePaymentModal()
    } catch (e) {
      console.error(e)
      alert(e?.message || "Failed to add payment")
    } finally {
      setActionBusy(false)
    }
  }

  const outstandingColor = (netOutstanding, total) => {
    const ratio = total ? netOutstanding / total : 0
    if (ratio >= 0.5) return "bg-red-50 text-red-800 border-red-200"
    if (ratio >= 0.2) return "bg-yellow-50 text-yellow-800 border-yellow-200"
    return "bg-green-50 text-green-800 border-green-200"
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* 1) Top Section */}
      <header className="bg-white border-b border-[#dae5e7] p-6 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Transactions</h2>
          <p className="text-sm text-[#5e878d] font-medium">
            Track payments and outstanding amounts
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-end">
          <button
            type="button"
            onClick={() => openPaymentModal("")}
            className="px-4 py-2.5 bg-primary text-white rounded-lg font-bold shadow-sm"
          >
            + Add Payment
          </button>
        </div>
      </header>

      {/* 2) Toggle / Tabs */}
      <div className="bg-[#f0f4f5]/60 px-6 py-4 border-b border-[#dae5e7]">
        <div className="flex gap-3 flex-wrap">
          <TabButton
            active={activeTab === "payments"}
            onClick={() => setActiveTab("payments")}
            label="Payments"
          />
          <TabButton
            active={activeTab === "outstanding"}
            onClick={() => setActiveTab("outstanding")}
            label="Outstanding"
          />
          <TabButton
            active={activeTab === "summary"}
            onClick={() => setActiveTab("summary")}
            label="Summary"
          />
        </div>
      </div>

      {/* 3/4/5) Main content */}
      <section className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">
              sync
            </span>
          </div>
        ) : activeTab === "payments" ? (
          <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#dae5e7] text-sm font-bold text-gray-700">
              Payments List
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-xs uppercase">Date</th>
                  <th className="px-4 py-3 text-xs uppercase">Party</th>
                  <th className="px-4 py-3 text-xs uppercase">Type</th>
                  <th className="px-4 py-3 text-xs uppercase">Ref</th>
                  <th className="px-4 py-3 text-xs uppercase">Amount</th>
                  <th className="px-4 py-3 text-xs uppercase">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f4f5]">
                {paymentRows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      No payments yet
                    </td>
                  </tr>
                ) : (
                  paymentRows.map((p) => (
                    <tr key={p.id} className="hover:bg-primary/5">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.date ? new Date(p.date).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{p.partyName}</td>
                      <td className="px-4 py-3 text-sm">{p.type}</td>
                      <td className="px-4 py-3 text-sm">
                        #{p.ref}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold">
                        {formatINR(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm">{p.mode}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === "outstanding" ? (
          <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#dae5e7] text-sm font-bold text-gray-700">
              Outstanding List
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-xs uppercase">Party</th>
                  <th className="px-4 py-3 text-xs uppercase">Outstanding</th>
                  <th className="px-4 py-3 text-xs uppercase">Total</th>
                  <th className="px-4 py-3 text-xs uppercase">Paid</th>
                  <th className="px-4 py-3 text-xs uppercase">Advance</th>
                  <th className="px-4 py-3 text-xs uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f4f5]">
                {outstandingByParty.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      Nothing outstanding
                    </td>
                  </tr>
                ) : (
                  outstandingByParty.map((row) => {
                    const advanceAvail = Number(
                      advanceAvailableByParty?.[row.partyId] || 0
                    )
                    const netOutstanding = Math.max(0, row.outstanding - advanceAvail)
                    const cls = outstandingColor(netOutstanding, row.total)
                    const canPay = netOutstanding > 0

                    return (
                      <tr key={row.partyId} className="hover:bg-primary/5">
                        <td className="px-4 py-3 text-sm font-medium">{row.partyName}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full border ${cls}`}
                          >
                            {formatINR(netOutstanding)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{formatINR(row.total)}</td>
                        <td className="px-4 py-3 text-sm">{formatINR(row.paid)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex px-3 py-1 rounded-full border bg-primary/5 border-primary/20 text-primary">
                            {formatINR(advanceAvail)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <button
                              type="button"
                              className="px-3 py-1.5 text-xs border border-[#dae5e7] rounded-lg hover:bg-gray-50"
                              onClick={() => {
                                if (!row.partyId) return
                                if (onViewLedger) return onViewLedger(row.partyId)
                                alert("Ledger view not implemented for Transactions yet.")
                              }}
                            >
                              View Ledger
                            </button>
                            <button
                              type="button"
                              disabled={!canPay}
                              onClick={() => {
                                const cashNeeded = Math.max(0, row.outstanding - advanceAvail)
                                openPaymentModal(row.partyId, String(cashNeeded))
                              }}
                              className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Quick Pay
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                title="Total Outstanding"
                value={formatINR(totals.totalOutstanding)}
              />
              <Card
                title="Total Collected"
                value={formatINR(totals.totalCollected)}
              />
              <Card
                title="Total Invoices"
                value={String(totals.totalInvoices)}
              />
            </div>

            <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#dae5e7] text-sm font-bold text-gray-700">
                Quick Stats
              </div>
              <div className="p-6 text-sm text-gray-700 space-y-2">
                <div>
                  <strong>Paid invoices:</strong> {totals.paidCount}
                </div>
                <div>
                  <strong>Partial invoices:</strong> {totals.partialCount}
                </div>
                <div>
                  <strong>Tip:</strong> Quick Pay will consume existing advances first, then apply cash to oldest unpaid invoices.
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Add Payment Modal */}
      {paymentModalOpen ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#dae5e7] flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {quickPayPartyId ? "Quick Pay" : "Add Payment"}
              </h3>
              <button
                type="button"
                onClick={closePaymentModal}
                className="p-2 rounded-lg hover:bg-black/5"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-500 mb-1">
                    Party
                  </label>
                  <select
                    value={paymentPartyId}
                    onChange={(e) => setPaymentPartyId(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm bg-white"
                    disabled={Boolean(quickPayPartyId)}
                  >
                    <option value="">Select party</option>
                    {(parties || []).map((p) => (
                      <option key={getEntityId(p)} value={getEntityId(p)}>
                        {p.name || p.partyName || p.partyCode}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-500 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentTypeMode}
                    onChange={(e) => setPaymentTypeMode(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm bg-white"
                  placeholder="Enter amount"
                />
              </div>

              <div className="text-xs text-gray-500">
                Existing advances for this party will be applied first (FIFO invoices). Any remaining
                cash will be applied next. Leftover cash becomes new advance.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 border border-[#dae5e7] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddPayment}
                  disabled={actionBusy}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionBusy ? "Saving..." : "Add Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-2.5 rounded-lg border text-sm font-semibold transition ${active
        ? "bg-primary text-white border-primary"
        : "bg-white border-[#dae5e7] text-[#2b5b64] hover:bg-gray-50"
        }`}
    >
      {label}
    </button>
  )
}

function Card({ title, value }) {
  return (
    <div className="bg-white rounded-xl border border-[#dae5e7] p-5">
      <div className="text-xs uppercase tracking-wide font-bold text-[#5e878d]">
        {title}
      </div>
      <div className="text-2xl font-black mt-2">{value}</div>
    </div>
  )
}
