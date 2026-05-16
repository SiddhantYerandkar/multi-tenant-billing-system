const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth");

const {
    createDesignerController,
    getDesignersController,
    updateDesignerController,
    deleteDesignerController,
} = require("./designer.controller");

router.post("/", auth, createDesignerController);
router.get("/", auth, getDesignersController);
router.put("/:id", auth, updateDesignerController);
router.delete("/:id", auth, deleteDesignerController);

module.exports = router;