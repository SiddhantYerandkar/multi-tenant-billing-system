const pool = require("../../config/db");

const createDesigner = async (data) => {
    const res = await pool.query(
        `INSERT INTO designers (name, email, mobile, "companyId", rate, "sizeRates")
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
            data.name,
            data.email,
            data.mobile,
            data.companyId,
            data.rate,
            data.sizeRates || {},
        ]
    );

    return res.rows[0];
};

const getDesigners = async (companyId) => {
    const res = await pool.query(
        `SELECT * FROM designers WHERE "companyId" = $1`,
        [companyId]
    );

    return res.rows;
};

const updateDesigner = async (id, data) => {
    const res = await pool.query(
        `UPDATE designers
         SET name=$1, email=$2, mobile=$3, rate=$4, "sizeRates"=$5
         WHERE id=$6
         RETURNING *`,
        [
            data.name,
            data.email,
            data.mobile,
            data.rate,
            data.sizeRates || {},
            id,
        ]
    );

    return res.rows[0];
};

const deleteDesigner = async (id) => {
    await pool.query(`DELETE FROM designers WHERE id=$1`, [id]);
};

module.exports = {
    createDesigner,
    getDesigners,
    updateDesigner,
    deleteDesigner,
};