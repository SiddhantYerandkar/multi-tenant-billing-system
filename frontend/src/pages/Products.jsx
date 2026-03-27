import { useEffect, useState } from "react"
import { getProducts, addProduct, updateProduct, deleteProduct } from "../services/productService"
import CreateProductModal from "../components/CreateProductModal"
import DeleteProductModal from "../components/DeleteProductModal"
import EditProductModal from "../components/EditProductModal"

export default function Products({ company }) {
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  async function load() {
    const res = await getProducts(company.$id)
    setProducts(res.documents)
  }

  useEffect(() => {
    load()
  }, [])

  // const handleCreateProduct = async (data) => {
  //   await addProduct({
  //     companyId: company.$id,
  //     name: data.name,
  //     basePrice: Number(data.price),
  //     unit: data.unit,
  //     //isActive: true,
  //   })

  //   setShowModal(false)
  //   load()
  // }

  const handleCreateProduct = async (data) => {
    try {
      console.log("Creating product:", data)

      const res = await addProduct({
        companyId: company.$id,
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
    await deleteProduct(product.$id);
    setShowDeleteModal(false);
    setSelectedProduct(null);
    load();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Action Row */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

        {/* Search */}
        <div className="w-full md:max-w-md relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition">
            search
          </span>
          <input
            type="text"
            placeholder="Search products by name, SKU, or category..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl
                       focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm shadow-sm"
          />
        </div>

        {/* Create New Product */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90
                     text-white font-bold py-3 px-6 rounded-xl
                     shadow-lg shadow-primary/20 transition"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Create New Product</span>
        </button>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Product Name
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Price
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Unit
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.$id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{p.name}</span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    ₹{p.basePrice}
                  </td>

                  <td className="px-6 py-5">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                      {p.unit || "Unit"}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
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
      </div>

      {/* Modal */}
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
    </div>
  )
}
