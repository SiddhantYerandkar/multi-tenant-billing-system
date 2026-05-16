const pool = require("../../config/db");

const createDesigningJob = async (data) => {
    const res = await pool.query(
        `INSERT INTO designing_jobs
        (company_id, date_in, party, status, title, function, size, pages, order_no, designer)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
        [
            data.company_id,
            data.date_in,
            data.party,
            data.status,
            data.title,
            data.function,
            data.size,
            data.pages,
            data.order_no,
            data.designer,
        ]
    );

    return res.rows[0];
};

const getDesigningJobs = async (company_id) => {
    const res = await pool.query(
        `SELECT * FROM designing_jobs
         WHERE company_id = $1
         ORDER BY created_at DESC`,
        [company_id]
    );

    return res.rows;
};

const updateDesigningJob = async (id, data) => {
    const res = await pool.query(
        `UPDATE designing_jobs
         SET status=$1, notes=$2
         WHERE id=$3
         RETURNING *`,
        [data.status, data.notes, id]
    );

    return res.rows[0];
};

const deleteDesigningJob = async (id) => {
    await pool.query(`DELETE FROM designing_jobs WHERE id=$1`, [id]);
};

module.exports = {
    createDesigningJob,
    getDesigningJobs,
    updateDesigningJob,
    deleteDesigningJob,
};