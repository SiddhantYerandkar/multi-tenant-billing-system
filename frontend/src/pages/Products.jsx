import { useEffect, useState } from "react"
import { getProducts, addProduct, updateProduct, deleteProduct } from "../services/productService"
import CreateProductModal from "../components/CreateProductModal"
import DeleteProductModal from "../components/DeleteProductModal"
import EditProductModal from "../components/EditProductModal"
import ImportProductsModal from "../components/ImportProductsModal"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

export default function Products({ company }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  async function load() {
    const res = await getProducts(company.id)
    setProducts(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const filteredProducts = products?.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.unit?.toLowerCase().includes(search.toLowerCase())
  )

  const handleExport = () => {
    if (!products.length) {
      alert("No data to export")
      return
    }

    // ✅ Format data for Excel
    const formatted = products.map((p, index) => ({
      "Sr No": index + 1,
      "Product Name": p.name || "",
      "Base Price": p.basePrice || 0,
      "Unit": p.unit || "",
      "Created Date": p.$createdAt ? new Date(p.$createdAt).toLocaleDateString() : ""
    }))

    // ✅ Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(formatted)

    // ✅ Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products")

    // ✅ Write file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    })

    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8"
    })

    saveAs(data, `Products_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const handleCreateProduct = async (data) => {
    try {
      console.log("Creating product:", data)

      const res = await addProduct({
        companyId: company.id,
        name: data.name,
        basePrice: Number(data.price),
        unit: data.unit,
      })

      console.log("Product created:", res)

      setShowModal(false)
      await load()
    } catch (err) {
      console.error("Create product failed:", err)
      alert(err.message || "Failed to create product")
    }
  }

  const handleUpdateProduct = async (data) => {
    await updateProduct(data.id, {
      name: data.name,
      basePrice: data.basePrice,
      unit: data.unit,
    });

    setShowEditModal(false);
    setSelectedProduct(null);
    load();
  };

  const handleDeleteProduct = async (product) => {
    await deleteProduct(product.id);
    setShowDeleteModal(false);
    setSelectedProduct(null);
    load();
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b border-[#dae5e7] p-6">
        <div className="flex justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight">
              Products Management
            </h2>
            <p className="text-sm text-[#5e878d] font-medium">
              Create and manage your product catalog.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#dae5e7] bg-white text-sm font-semibold"
            >
              <span className="material-symbols-outlined">file_upload</span>
              Import
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-white font-bold shadow"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Create New Product
            </button>
          </div>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="bg-white px-6 py-4 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or unit..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#f0f4f5] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#dae5e7] bg-white text-sm font-semibold"
          >
            <span className="material-symbols-outlined">file_download</span>
            Export
          </button>
        </div>
      </div>

      {/* TABLE */}
      <section className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#f0f4f5]/60">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase">Product Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-right">Base Price</th>
                <th className="px-6 py-4 text-xs font-bold uppercase">Unit</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f4f5]">
              {!products.length && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-sm text-gray-500">
                    No products found
                  </td>
                </tr>
              )}

              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-primary/5 transition">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{p.name}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right font-mono">
                    ₹{p.base_price}
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                      {p.unit || "Unit"}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODALS */}
      <CreateProductModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleCreateProduct}
      />
      <DeleteProductModal
        open={showDeleteModal}
        product={selectedProduct}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleDeleteProduct}
      />
      <EditProductModal
        open={showEditModal}
        product={selectedProduct}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProduct(null);
        }}
        onUpdate={handleUpdateProduct}
      />
      <ImportProductsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        company={company}
        onImportComplete={load}
      />
    </main>
  )
}
