const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        const token = authHeader?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token",
            });
        }

        const decoded = jwt.verify(token, "secretkey");

        req.user = {
            id: decoded.id, // ✅ user identity
        };

        // 🔥 company context (from header)
        req.companyId = req.headers["x-company-id"] || null;

        next();
    } catch (err) {
        console.log("AUTH ERROR:", err.message);
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }
};

module.exports = auth;