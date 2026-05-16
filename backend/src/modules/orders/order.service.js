const pool = require("../../config/db");

/**
 * Create Order with Items
 */
const createOrder = async ({
    company_id,
    party_id,
    title,
    order_no,
    job_no,
    status,
    notes,
    order_date,
    items,
}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 🔥 calculate total
        let total_amount = 0;

        items.forEach(item => {
            total_amount += item.price * item.quantity;
        });

        // 1. Create order
        const orderRes = await client.query(
            `INSERT INTO orders
            (company_id, party_id, title, order_no, job_no, status, notes, order_date, total_amount)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *`,
            [
                company_id,
                party_id,
                title,
                order_no,
                job_no,
                status,
                notes,
                order_date,
                total_amount,
            ]
        );

        const order = orderRes.rows[0];

        // 2. Insert items
        for (const item of items) {
            await client.query(
                `INSERT INTO order_items
                (order_id, product_id, price, quantity, total_amount, product_description)
                VALUES ($1,$2,$3,$4,$5,$6)`,
                [
                    order.id,
                    item.product_id,
                    item.price,
                    item.quantity,
                    item.price * item.quantity,
                    item.product_description || null,
                ]
            );
        }

        await client.query("COMMIT");

        return order;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Get all orders for company
 */
const getOrders = async (company_id) => {
    const res = await pool.query(
        `SELECT * FROM orders
         WHERE company_id = $1
         ORDER BY created_at DESC`,
        [company_id]
    );

    return res.rows;
};

/**
 * Get order with items
 */
const getOrderById = async (order_id) => {
    const orderRes = await pool.query(
        `SELECT * FROM orders WHERE id = $1`,
        [order_id]
    );

    const itemsRes = await pool.query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [order_id]
    );

    return {
        ...orderRes.rows[0],
        items: itemsRes.rows,
    };
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
};