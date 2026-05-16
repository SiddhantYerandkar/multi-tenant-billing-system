const {
    createDesigningJob,
    getDesigningJobs,
    updateDesigningJob,
    deleteDesigningJob,
} = require("./designingJob.service");

const createDesigningJobController = async (req, res) => {
    try {
        const company_id = req.user.companyId;

        const job = await createDesigningJob({
            ...req.body,
            company_id,
        });

        res.status(201).json({ success: true, data: job });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error creating job" });
    }
};

const getDesigningJobsController = async (req, res) => {
    try {
        const jobs = await getDesigningJobs(req.user.companyId);

        res.json({ success: true, data: jobs });
    } catch {
        res.status(500).json({ success: false });
    }
};

const updateDesigningJobController = async (req, res) => {
    try {
        const updated = await updateDesigningJob(req.params.id, req.body);

        res.json({ success: true, data: updated });
    } catch {
        res.status(500).json({ success: false });
    }
};

const deleteDesigningJobController = async (req, res) => {
    try {
        await deleteDesigningJob(req.params.id);

        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false });
    }
};

module.exports = {
    createDesigningJobController,
    getDesigningJobsController,
    updateDesigningJobController,
    deleteDesigningJobController,
};