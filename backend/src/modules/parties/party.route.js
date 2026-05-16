const express = require("express");
const router = express.Router();
const auth = require("@middlewares/auth");

const {
    getPartiesController,
    createPartyController,
    deletePartyController,
} = require("./party.controller");

// GET ALL
router.get("/", auth, getPartiesController);

// CREATE
router.post("/", auth, createPartyController);

// DELETE
router.delete("/:id", auth, deletePartyController);

module.exports = router;