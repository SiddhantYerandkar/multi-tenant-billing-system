const pool = require("@config/db");

// GET PRODUCTS
const getProducts = async (companyId) => {
    const result = await pool.query(
        `SELECT * FROM products 
         WHERE company_id = $1 AND is_active = true
         ORDER BY created_at DESC`,
        [companyId]
    );

    return result.rows;
};

// CREATE PRODUCT
const createProduct = async (data) => {
    const { company_id, name, base_price, unit } = data;

    const result = await pool.query(
        `INSERT INTO products
        (company_id, name, base_price, unit)
        VALUES ($1,$2,$3,$4)
        RETURNING *`,
        [company_id, name, base_price, unit]
    );

    return result.rows[0];
};

// UPDATE PRODUCT
const updateProduct = async (id, data) => {
    const { name, base_price, unit } = data;

    const result = await pool.query(
        `UPDATE products
         SET name=$1, base_price=$2, unit=$3
         WHERE id=$4
         RETURNING *`,
        [name, base_price, unit, id]
    );

    return result.rows[0];
};

// DELETE (SOFT)
const deleteProduct = async (id) => {
    await pool.query(
        `UPDATE products SET is_active = false WHERE id = $1`,
        [id]
    );
};

module.exports = {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
};