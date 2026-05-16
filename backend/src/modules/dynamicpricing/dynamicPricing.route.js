const express = require("express");
const router = express.Router();
const auth = require("@middlewares/auth");

const {
    getDynamicPricesController,
    getDynamicPricesForPartyController,
    upsertDynamicPriceController,
    deleteDynamicPriceController,
} = require("./dynamicPricing.controller");

router.get("/", auth, getDynamicPricesController);
router.get("/party/:partyId", auth, getDynamicPricesForPartyController);

router.post("/", auth, upsertDynamicPriceController);

router.delete("/", auth, deleteDynamicPriceController);

module.exports = router;