const {
    getParties,
    createParty,
    deleteParty,
} = require("./party.service");

// GET
const getPartiesController = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const parties = await getParties(companyId);

        res.json({
            success: true,
            data: parties,
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
        const companyId = req.user.companyId;

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