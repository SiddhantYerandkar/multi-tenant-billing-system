const {
    getParties,
    createParty,
    deleteParty,
} = require("./party.service");

// GET
const getPartiesController = async (req, res) => {
    try {
        const companyId = req.companyId;

        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        const parties = await getParties(companyId, limit, offset);

        res.json({
            success: true,
            data: parties.rows,
            pagination: {
                total: parties.total,
                page,
                limit,
                totalPages: Math.ceil(parties.total / limit),
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error fetching parties",
        });
    }
};

// CREATE
const createPartyController = async (req, res) => {
    try {
        const companyId = req.companyId;

        const party = await createParty({
            ...req.body,
            company_id: companyId,
        });

        res.status(201).json({
            success: true,
            data: party,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error creating party",
        });
    }
};

// DELETE
const deletePartyController = async (req, res) => {
    try {
        const { id } = req.params;

        await deleteParty(id);

        res.json({
            success: true,
            message: "Party deleted",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error deleting party",
        });
    }
};

module.exports = {
    getPartiesController,
    createPartyController,
    deletePartyController,
};