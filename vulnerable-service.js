const express = require('express');
const { exec } = require('child_process');
const mysql = require('mysql');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

// 🚨 VULNERABILITY 1: Hardcoded Enterprise Secrets - FIXED
// Hardcoded AWS_SECRET_KEY has been removed. If it were used, it should be loaded from process.env.
// Database credentials are now loaded from environment variables.
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database. Please ensure DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME are correctly set in your environment variables and the database server is running.', err.stack);
        // It's critical for the application to function, so exiting or showing a critical error is appropriate.
        process.exit(1); 
    }
    console.log('Connected to database as ID ' + db.threadId);
});

// Middleware for parsing request bodies (good practice, though req.query doesn't require it)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🚨 VULNERABILITY 2: SQL Injection - FIXED
app.get('/api/employee', (req, res) => {
    let email = req.query.email;

    // Validate email input rigorously before using it.
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).send('Invalid or missing email format.');
    }
    
    // Use parameterized queries (prepared statements) to prevent SQL injection.
    // The '?' placeholder is replaced by the value in the array, and the mysql library
    // automatically escapes the value, making it safe.
    let query = "SELECT * FROM employees WHERE email = ?";
    
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            // Return a generic error message to the client, avoid leaking internal details.
            return res.status(500).send('Internal server error while fetching employee data.');
        }
        res.json(results);
    });
});

// 🚨 VULNERABILITY 3: Remote Command Execution (RCE) - FIXED
app.post('/api/ping-server', (req, res) => {
    let targetIp = req.query.target; // Assuming target IP is still passed via query parameter.

    // Strict input validation is crucial to prevent RCE.
    // This regex validates IPv4 addresses.
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // This regex validates basic hostnames (e.g., example.com, localhost), disallowing special characters
    // that could be used for command injection. It allows alphanumeric, hyphens (not at start/end), and dots.
    const hostnameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!targetIp || typeof targetIp !== 'string' || (!ipv4Regex.test(targetIp) && !hostnameRegex.test(targetIp))) {
        return res.status(400).send('Invalid target IP address or hostname provided. Only valid IPv4 addresses or standard hostnames are allowed.');
    }

    // Since 'targetIp' has been strictly validated to contain only safe characters,
    // it's now safe to concatenate it into the 'ping' command.
    // For more complex commands or scenarios, using 'child_process.spawn' with arguments
    // passed as an array is generally more robust against shell injection.
    exec('ping -c 4 ' + targetIp, (error, stdout, stderr) => {
        if (error) {
            console.error(`Ping command execution error: ${error.message}. Stderr: ${stderr}`);
            // Avoid exposing raw error messages or stderr to the client.
            return res.status(500).send("Ping failed. Unable to reach the target or an internal error occurred.");
        }
        // It's good practice to sanitize any output before sending it to the client,
        // although 'ping' command output is typically benign.
        res.send(`<pre>${stdout}</pre>`);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));