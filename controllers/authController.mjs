import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pool } from "../config/db.mjs";

dotenv.config();

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // validation
        if (!email || !password) {
            return res.status(400).json({ message: "All fields required" });
        }

        // find user
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email],
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const user = result.rows[0];

        // compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // generate token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" },
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
            },
        });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ message: err.message });
    }
};

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields required" });
        }

        // check existing user
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email],
        );

        if (result.rowCount > 0) {
            return res.status(400).json({ message: "User already exists" });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // insert user
        await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
            [name, email, hashedPassword],
        );

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.error("REGISTER ERROR:", err);
        res.status(500).json({ message: err.message });
    }
};