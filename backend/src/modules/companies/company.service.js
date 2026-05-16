const pool = require("../../config/db");

const createCompany = async (data) => {
    const {
        name,
        address,
        phone,
        gst_number,
        gst_enabled,
        owner_id,
        website,
        logo_url,
        qr_code_url,
        upi_id,
        email,
    } = data;

    const result = await pool.query(
        `INSERT INTO companies 
    (name, address, phone, gst_number, gst_enabled, owner_id, website, logo_url, qr_code_url, upi_id, email)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
        [
            name,
            address,
            phone,
            gst_number,
            gst_enabled,
            owner_id,
            website,
            logo_url,
            qr_code_url,
            upi_id,
            email,
        ]
    );

    return result.rows[0];
};

async function getCompanyByOwner(ownerId) {
    const result = await pool.query(
        `SELECT * FROM companies WHERE owner_id = $1 LIMIT 1`,
        [ownerId]
    )
    return result.rows[0]
}

async function getCompanyById(id) {
    const result = await pool.query(
        `SELECT * FROM companies WHERE id = $1`,
        [id]
    )
    return result.rows[0]
}


async function updateCompany(id, data) {
    const query = `
        UPDATE companies SET
        name=$1,
        address=$2,
        phone=$3,
        gst_number=$4,
        gst_enabled=$5,
        website=$6,
        logo_url=$7,
        qr_code_url=$8,
        upi_id=$9,
        email=$10
        WHERE id=$11
        RETURNING *
    `

    const values = [
        data.name,
        data.address,
        data.phone,
        data.gst_number,
        data.gst_enabled,
        data.website,
        data.logo_url,
        data.qr_code_url,
        data.upi_id,
        data.email,
        id,
    ]

    const result = await pool.query(query, values)
    return result.rows[0]
}


module.exports = { createCompany, getCompanyByOwner, getCompanyById, updateCompany };