const generateToken = require("@utils/generateToken");
const { registerUser, loginUser } = require("./auth.service");
const pool = require("@config/db");

const registerController = async (req, res) => {
    try {
        const user = await registerUser(req.body);

        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            data: { user, token },
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const loginController = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: "Request body is missing",
            });
        }

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password required",
            });
        }
        const { user, token } = await loginUser(req.body);

        res.json({
            success: true,
            data: user,
            token
        });
        
    } catch (err) {
        res.status(401).json({
            success: false,
            message: err.message,
        });
    }
};

module.exports = { registerController, loginController };