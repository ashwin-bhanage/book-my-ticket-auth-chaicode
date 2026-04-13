import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No token provided" });
        }

        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({ message: "Invalid token format" });
        }

        const token = parts[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }

        return res.status(401).json({ message: "Invalid token" });
    }
};
