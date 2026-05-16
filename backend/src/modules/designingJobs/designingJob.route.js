const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth");

const {
    createDesigningJobController,
    getDesigningJobsController,
    updateDesigningJobController,
    deleteDesigningJobController,
} = require("./designingJob.controller");

router.post("/", auth, createDesigningJobController);
router.get("/", auth, getDesigningJobsController);
router.put("/:id", auth, updateDesigningJobController);
router.delete("/:id", auth, deleteDesigningJobController);

module.exports = router;