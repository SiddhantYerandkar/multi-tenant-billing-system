const pool = require("@config/db");

// GET ALL FOR COMPANY
const getDynamicPrices = async (companyId) => {
    const result = await pool.query(
        `SELECT * FROM dynamic_pricing
         WHERE company_id = $1`,
        [companyId]
    );

    return result.rows;
};

// GET FOR PARTY
const getDynamicPricesForParty = async (companyId, partyId) => {
    const result = await pool.query(
        `SELECT * FROM dynamic_pricing
         WHERE company_id = $1 AND party_id = $2`,
        [companyId, partyId]
    );

    return result.rows;
};

// GET SINGLE
const getDynamicPrice = async (companyId, partyId, productId) => {
    const result = await pool.query(
        `SELECT * FROM dynamic_pricing
         WHERE company_id = $1 AND party_id = $2 AND product_id = $3`,
        [companyId, partyId, productId]
    );

    return result.rows[0] || null;
};

// UPSERT (BEST APPROACH 🔥)
const upsertDynamicPrice = async (data) => {
    const { company_id, party_id, product_id, price } = data;

    const result = await pool.query(
        `INSERT INTO dynamic_pricing (company_id, party_id, product_id, price)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (company_id, party_id, product_id)
         DO UPDATE SET price = EXCLUDED.price
         RETURNING *`,
        [company_id, party_id, product_id, price]
    );

    return result.rows[0];
};

// DELETE
const deleteDynamicPrice = async (companyId, partyId, productId) => {
    await pool.query(
        `DELETE FROM dynamic_pricing
         WHERE company_id = $1 AND party_id = $2 AND product_id = $3`,
        [companyId, partyId, productId]
    );
};

const getEffectivePrice = async (companyId, partyId, productId) => {
    const dynamic = await getDynamicPrice(companyId, partyId, productId);

    if (dynamic) return dynamic.price;

    const product = await pool.query(
        `SELECT base_price FROM products WHERE id = $1`,
        [productId]
    );

    return product.rows[0]?.base_price || 0;
};

module.exports = {
    getDynamicPrices,
    getDynamicPricesForParty,
    getDynamicPrice,
    upsertDynamicPrice,
    deleteDynamicPrice,
    getEffectivePrice,
};