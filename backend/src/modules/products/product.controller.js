const {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
} = require("./product.service");

// GET
const getProductsController = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const products = await getProducts(companyId);

        res.json({
            success: true,
            data: products,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error fetching products",
        });
    }
};

// CREATE
const createProductController = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const product = await createProduct({
            company_id: companyId,
            name: req.body.name,
            base_price: req.body.basePrice,
            unit: req.body.unit,
        });

        res.status(201).json({
            success: true,
            data: product,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error creating product",
        });
    }
};

// UPDATE
const updateProductController = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await updateProduct(id, {
            name: req.body.name,
            base_price: req.body.basePrice,
            unit: req.body.unit,
        });

        res.json({
            success: true,
            data: product,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error updating product",
        });
    }
};

// DELETE
const deleteProductController = async (req, res) => {
    try {
        const { id } = req.params;

        await deleteProduct(id);

        res.json({
            success: true,
            message: "Product deleted",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error deleting product",
        });
    }
};

module.exports = {
    getProductsController,
    createProductController,
    updateProductController,
    deleteProductController,
};