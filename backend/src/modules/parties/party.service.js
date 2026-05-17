const pool = require("@config/db");

// GET ALL PARTIES
const getParties = async (companyId, limit, offset) => {
    const dataQuery = await pool.query(
        `SELECT * FROM parties 
         WHERE company_id = $1 AND is_active = true
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [companyId, limit, offset]
    );

    const countQuery = pool.query(
        `SELECT COUNT(*) FROM parties 
         WHERE company_id = $1 AND is_active = true`,
        [companyId]
    );

    const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

    return {
        rows: dataResult.rows,
        total: parseInt(countResult.rows[0].count),
    };
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

// DELETE
const deleteParty = async (id) => {
    await pool.query(
        `DELETE FROM parties WHERE id = $1`,
        [id]
    );
};

module.exports = {
    getParties,
    createParty,
    deleteParty,
};