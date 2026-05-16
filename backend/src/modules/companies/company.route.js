const express = require("express");
const router = express.Router();
const upload = require("../../middlewares/upload");
const { createCompanyController, getMyCompany, getCompanyByIdController, updateCompanyController } = require("./company.controller");
const auth = require("../../middlewares/auth");

router.post(
    "/create",
    auth,
    upload.fields([
        { name: "logo", maxCount: 1 },
        { name: "qr", maxCount: 1 },
    ]),
    createCompanyController
);

router.get("/my", auth, getMyCompany)

router.get("/:id", auth, getCompanyByIdController)

router.put(
    "/:id",
    auth,
    upload.fields([
        { name: "logo", maxCount: 1 },
        { name: "qr", maxCount: 1 },
    ]),
    updateCompanyController
)


module.exports = router;