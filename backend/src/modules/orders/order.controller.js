const {
    createOrder,
    getOrders,
    getOrderById,
} = require("./order.service");

const createOrderController = async (req, res) => {
    try {
        const company_id = req.user.companyId;

        if (!company_id) {
            return res.status(400).json({
                success: false,
                message: "No active company selected",
            });
        }

        const order = await createOrder({
            ...req.body,
            company_id,
        });

        res.status(201).json({
            success: true,
            data: order,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error creating order",
        });
    }
};

const getOrdersController = async (req, res) => {
    try {
        const company_id = req.user.companyId;

        const orders = await getOrders(company_id);

        res.json({
            success: true,
            data: orders,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Error fetching orders",
        });
    }
};

const getOrderController = async (req, res) => {
    try {
        const order = await getOrderById(req.params.id);

        res.json({
            success: true,
            data: order,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Error fetching order",
        });
    }
};

module.exports = {
    createOrderController,
    getOrdersController,
    getOrderController,
};