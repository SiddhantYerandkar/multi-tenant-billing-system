const express = require("express");
const router = express.Router();
const auth = require("@middlewares/auth");

const {
    getProductsController,
    createProductController,
    updateProductController,
    deleteProductController,
} = require("./product.controller");

router.get("/", auth, getProductsController);
router.post("/", auth, createProductController);
router.put("/:id", auth, updateProductController);
router.delete("/:id", auth, deleteProductController);

module.exports = router;