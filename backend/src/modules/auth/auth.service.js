const pool = require("../../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const registerUser = async ({ name, email, password }) => {
    // check if user exists
    const existingUser = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );

    if (existingUser.rows.length > 0) {
        throw new Error("User already exists");
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
        `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, name, email`,
        [name, email, hashedPassword]
    );

    return result.rows[0];
};

const loginUser = async ({ email, password }) => {
    const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );

    if (result.rows.length === 0) {
        throw new Error("Invalid credentials");
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        throw new Error("Invalid credentials");
    }

    // 🔥 Generate token
    const token = jwt.sign(
        { id: user.id, email: user.email },
        "secretkey",
        { expiresIn: "7d" }
    );

    // ❌ remove password
    delete user.password;

    return { user, token };
};

module.exports = {
    registerUser,
    loginUser,
};