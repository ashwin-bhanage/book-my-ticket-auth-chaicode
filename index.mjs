//  CREATE TABLE seats (
//      id SERIAL PRIMARY KEY,
//      name VARCHAR(255),
//      isbooked INT DEFAULT 0
//  );
// INSERT INTO seats (isbooked)
// SELECT 0 FROM generate_series(1, 20);

import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import { registerUser, loginUser } from "./controllers/authController.mjs";
import { authMiddleware } from "./middleware/authMiddleware.mjs";
import { pool } from "./config/db.mjs";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const port = process.env.PORT || 8080;

// Equivalent to mongoose connection
// Pool is nothing but group of connections
// If you pick one connection out of the pool and release it
// the pooler will keep that connection open for sometime to other clients to reuse

try {
    const test = await pool.query("SELECT 1");
    console.log("DB CONNECTED");
} catch (err) {
    console.error("REAL ERROR:", err);
}

const app = express();
app.use(cors());
app.use(express.json()); // to parse JSON bodies

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
//get all seats
app.get("/seats", async (req, res) => {
    const result = await pool.query("select * from seats"); // equivalent to Seats.find() in mongoose
    res.send(result.rows);
});

//book a seat give the seatId and your name
// middleware to protect routes
app.put("/book/:id", authMiddleware, async (req, res) => {
    let conn;

    try {
        const id = req.params.id;

        if (!id || isNaN(id)) {
            return res.status(400).json({ message: "Invalid seat id" });
        }

        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userEmail = req.user.email;

        conn = await pool.connect();
        await conn.query("BEGIN");

        const result = await conn.query(
            "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE",
            [id],
        );

        if (result.rowCount === 0) {
            await conn.query("ROLLBACK");
            return res.status(400).json({ message: "Seat already booked" });
        }

        // preventing double-booking
        const existingBooking = await conn.query(
            "SELECT * FROM bookings WHERE user_id = $1 AND seat_id = $2",
            [req.user.id, id],
        );

        if (existingBooking.rowCount > 0) {
            await conn.query("ROLLBACK");
            return res
                .status(400)
                .json({ message: "You already booked this seat" });
        }

        await conn.query(
            "UPDATE seats SET isbooked = 1, name = $2 WHERE id = $1",
            [id, userEmail],
        );

        // NEW: insert booking record
        await conn.query(
            "INSERT INTO bookings (user_id, seat_id) VALUES ($1, $2)",
            [req.user.id, id],
        );

        await conn.query("COMMIT");

        res.json({ message: "Seat booked successfully" });
    } catch (err) {
        console.error("BOOK ERROR:", err);

        if (conn) {
            await conn.query("ROLLBACK");
        }

        res.status(500).json({ message: err.message });
    } finally {
        if (conn) conn.release();
    }
});

// booking old route without authentication
app.put("/:id/:name", async (req, res) => {
    try {
        const id = req.params.id;
        const name = req.params.name;
        // payment integration should be here
        // verify payment
        const conn = await pool.connect(); // pick a connection from the pool
        //begin transaction
        // KEEP THE TRANSACTION AS SMALL AS POSSIBLE
        await conn.query("BEGIN");
        //getting the row to make sure it is not booked
        /// $1 is a variable which we are passing in the array as the second parameter of query function,
        // Why do we use $1? -> this is to avoid SQL INJECTION
        // (If you do ${id} directly in the query string,
        // then it can be manipulated by the user to execute malicious SQL code)
        const sql =
            "SELECT * FROM seats where id = $1 and isbooked = 0 FOR UPDATE";
        const result = await conn.query(sql, [id]);

        //if no rows found then the operation should fail can't book
        // This shows we Do not have the current seat available for booking
        if (result.rowCount === 0) {
            res.send({ error: "Seat already booked" });
            return;
        }
        //if we get the row, we are safe to update
        const sqlU = "update seats set isbooked = 1, name = $2 where id = $1";
        const updateResult = await conn.query(sqlU, [id, name]); // Again to avoid SQL INJECTION we are using $1 and $2 as placeholders

        //end transaction by committing
        await conn.query("COMMIT");
        conn.release(); // release the connection back to the pool (so we do not keep the connection open unnecessarily)
        res.send(updateResult);
    } catch (ex) {
        console.error("BOOK ERROR:", ex);
        res.status(500).json({ message: ex.message });
    }
});

// login and register routes
app.post("/login", loginUser);
app.post("/register", registerUser);

// fetch user details with booking
app.get("/bookings", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT b.id, b.created_at, s.id AS seat_id, s.name
   FROM bookings b
   JOIN seats s ON b.seat_id = s.id
   WHERE b.user_id = $1
   ORDER BY b.created_at DESC`,
            [userId],
        );

        res.json(result.rows);
    } catch (err) {
        console.error("GET BOOKINGS ERROR:", err);
        res.status(500).json({ message: err.message });
    }
});

app.listen(port, () => console.log("Server starting on port: " + port));
