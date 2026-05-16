const {
    createDesigner,
    getDesigners,
    updateDesigner,
    deleteDesigner,
} = require("./designer.service");

const createDesignerController = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const designer = await createDesigner({
            ...req.body,
            companyId,
        });

        res.status(201).json({ success: true, data: designer });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error creating designer" });
    }
};

const getDesignersController = async (req, res) => {
    try {
        const designers = await getDesigners(req.user.companyId);

        res.json({ success: true, data: designers });
    } catch {
        res.status(500).json({ success: false });
    }
};

const updateDesignerController = async (req, res) => {
    try {
        const updated = await updateDesigner(req.params.id, req.body);

        res.json({ success: true, data: updated });
    } catch {
        res.status(500).json({ success: false });
    }
};

const deleteDesignerController = async (req, res) => {
    try {
        await deleteDesigner(req.params.id);

        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false });
    }
};

module.exports = {
    createDesignerController,
    getDesignersController,
    updateDesignerController,
    deleteDesignerController,
};