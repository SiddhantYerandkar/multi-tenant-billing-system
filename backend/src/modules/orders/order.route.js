const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");
const {
    createOrderController,
    getOrdersController,
    getOrderController,
} = require("./order.controller");

router.post("/create", auth, createOrderController);
router.get("/", auth, getOrdersController);
router.get("/:id", auth, getOrderController);

module.exports = router;