require("module-alias/register");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("@config/db");

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/auth", require("@modules/auth/auth.route"));

app.use("/api/companies", require("@modules/companies/company.route"));

app.use("/api/products", require("@modules/products/product.route"));

app.use("/api/parties", require("@modules/parties/party.route"));

app.use("/api/dynamic-pricing", require("@modules/dynamicpricing/dynamicPricing.route"));

// health check
app.get("/", (req, res) => {
    res.send("API is running 🚀");
});


app.listen(5000, () => console.log("Server running on port 5000"));