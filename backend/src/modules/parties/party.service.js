const pool = require("@config/db");

// GET ALL PARTIES
const getParties = async (companyId) => {
    const result = await pool.query(
        `SELECT * FROM parties 
         WHERE company_id = $1 AND is_active = true
         ORDER BY created_at DESC`,
        [companyId]
    );

    return result.rows;
};

// CREATE PARTY
const createParty = async (data) => {
    const {
        company_id,
        party_code,
        name,
        phone,
        address,
        opening_balance,
        balance_type,
    } = data;

    const result = await pool.query(
        `INSERT INTO parties
        (company_id, party_code, name, phone, address, opening_balance, balance_type)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
        [
            company_id,
            party_code,
            name,
            phone,
            address,
            opening_balance || 0,
            balance_type || null,
        ]
    );

    return result.rows[0];
};

// SOFT DELETE
const deleteParty = async (id) => {
    await pool.query(
        `UPDATE parties SET is_active = false WHERE id = $1`,
        [id]
    );
};

module.exports = {
    getParties,
    createParty,
    deleteParty,
};