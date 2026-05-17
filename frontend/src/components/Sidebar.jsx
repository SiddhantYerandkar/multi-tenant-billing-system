import { useState } from "react"
import { logout } from "../services/authService"

export default function Sidebar({ page, setPage, outstandingCount = 0 }) {
  const [openSections, setOpenSections] = useState({
    billing: true,
    operations: true,
    master: false, // 👈 closed by default
  })

  const toggle = (key) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }))

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen">
      <div className="flex flex-col h-full px-4 py-6">

        {/* Branding */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined">inventory_2</span>
          </div>
          <div>
            <h1 className="text-base font-extrabold leading-tight">Billing</h1>
            <p className="text-xs text-gray-500 font-medium">Control Panel</p>
          </div>
        </div>

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto">

          {/* MASTER DATA */}
          <Section
            title="Master Data"
            open={openSections.master}
            toggle={() => toggle("master")}
          >
            <NavItem page={page} setPage={setPage} id="products" icon="package_2" label="Products" />
            <NavItem page={page} setPage={setPage} id="parties" icon="groups" label="Parties" />
            <NavItem page={page} setPage={setPage} id="pricing" icon="currency_rupee" label="Custom Pricing" />
            <NavItem page={page} setPage={setPage} id="designer" icon="brush" label="Designer" />
          </Section>

          <Section
            title="Operations"
            open={openSections.operations}
            toggle={() => toggle("operations")}
          >
            <NavItem page={page} setPage={setPage} id="designing" icon="package_2" label="Designing Job" />
            <NavItem page={page} setPage={setPage} id="orders" icon="shopping_cart" label="Orders" />
          </Section>

          <Section
            title="Billing"
            open={openSections.billing}
            toggle={() => toggle("billing")}
          >
            <NavItem page={page} setPage={setPage} id="invoices" icon="receipt_long" label="Invoices" />
            <NavItem page={page} setPage={setPage} id="transactions" icon="payments" label="Transactions" />
            <NavItem page={page} setPage={setPage} id="expenses" icon="wallet" label="Expenses" />
          </Section>

        </nav>

        {/* SYSTEM */}
        <div className="pt-4 border-t border-gray-200">
          <NavItem page={page} setPage={setPage} id="settings" icon="settings" label="Settings" />
          <button
            onClick={logout}
            className="mt-1 flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>

      </div>
    </aside>
  )
}

/* ---------- Components ---------- */

function Section({ title, open, toggle, children }) {
  return (
    <div className="mb-5">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-3 mb-2 text-xs uppercase tracking-wide text-gray-400 font-semibold"
      >
        {title}
        <span
          className={`material-symbols-outlined text-base transition-transform ${open ? "rotate-180" : ""
            }`}
        >
          expand_more
        </span>
      </button>

      {open && <div className="flex flex-col gap-1">{children}</div>}
    </div>
  )
}

function NavItem({ page, setPage, id, icon, label, badge }) {
  const active = page === id

  return (
    <button
      onClick={() => setPage(id)}
      className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all
        ${active
          ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary"
          : "text-gray-600 hover:bg-gray-50"
        }`}
    >
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined"
          style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          {icon}
        </span>
        <span className="text-sm">{label}</span>
      </div>

      {badge > 0 && (
        <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}
