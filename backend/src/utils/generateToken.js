const jwt = require("jsonwebtoken");

const generateToken = (userId, companyId = null) => {
    return jwt.sign(
        { userId, companyId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

module.exports = generateToken;