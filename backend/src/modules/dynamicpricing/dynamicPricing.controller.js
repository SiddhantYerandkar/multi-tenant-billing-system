const {
    getDynamicPrices,
    getDynamicPricesForParty,
    getDynamicPrice,
    upsertDynamicPrice,
    deleteDynamicPrice,
} = require("./dynamicPricing.service");

// GET ALL
const getDynamicPricesController = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const data = await getDynamicPrices(companyId);

        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

// GET FOR PARTY
const getDynamicPricesForPartyController = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { partyId } = req.params;

        const data = await getDynamicPricesForParty(companyId, partyId);

        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

// UPSERT
const upsertDynamicPriceController = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const { partyId, productId, price } = req.body;

        const result = await upsertDynamicPrice({
            company_id: companyId,
            party_id: partyId,
            product_id: productId,
            price,
        });

        res.json({ success: true, data: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

// DELETE
const deleteDynamicPriceController = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { partyId, productId } = req.body;

        await deleteDynamicPrice(companyId, partyId, productId);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

module.exports = {
    getDynamicPricesController,
    getDynamicPricesForPartyController,
    upsertDynamicPriceController,
    deleteDynamicPriceController,
};