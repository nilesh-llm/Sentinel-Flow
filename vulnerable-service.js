const express = require('express');
const { execFile } = require('child_process');
const mysql = require('mysql');
require('dotenv').config();

const app = express();

// Use environment variables for sensitive data
// AWS_SECRET_KEY is fetched but not used in this snippet.
// Its presence is not a vulnerability itself, but its usage would need to be secure.
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;

// Establish database connection using environment variables
// Omitting default values to ensure environment variables are properly set,
// forcing a clear failure if they are missing (better than insecure defaults).
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        // In a production environment, consider exiting the process or implementing a retry mechanism
        // process.exit(1); 
        return;
    }
    console.log('Connected to database as id ' + db.threadId);
});

// Use middleware to parse JSON request bodies
app.use(express.json());

// Helper function to escape HTML entities for XSS prevention
function escapeHtml(str) {
    if (typeof str !== 'string') {
        return str; // Return non-strings as-is or handle them based on context
    }
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// SQL Injection Fix: Use parameterized queries
app.get('/api/employee', (req, res) => {
    let email = req.query.email;

    if (!email) {
        return res.status(400).send('Email parameter is required.');
    }

    // Additional input validation: Basic email format check to reduce invalid queries
    // This helps prevent malformed input even before it reaches the database.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).send('Invalid email format.');
    }

    // Use a placeholder (?) for the email parameter, preventing SQL injection.
    // The mysql driver will properly escape the input.
    let query = "SELECT * FROM employees WHERE email = ?;";
    
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            // Do not expose raw database error messages to clients.
            return res.status(500).send('Error fetching employee data.');
        }
        // Ensure that data returned from the database is not inadvertently exposing sensitive information
        // or leading to XSS if rendered client-side without proper escaping (for JSON, this is usually safe).
        res.json(results);
    });
});

// Remote Command Execution (RCE) Fix: Input validation and safer `execFile`
app.post('/api/ping-server', (req, res) => {
    let targetIp = req.body.target;

    // Input validation: Ensure targetIp is a valid IP address or hostname.
    // This regex checks for valid IPv4 addresses or simple hostnames.
    // It's strict to prevent any attempts at shell metacharacter injection.
    const ipHostnameRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/;

    if (!targetIp || !ipHostnameRegex.test(targetIp)) {
        return res.status(400).send('Invalid target IP or hostname provided.');
    }
    
    // Use execFile which takes command and arguments separately.
    // This is inherently safer than `exec` because it bypasses the shell,
    // preventing shell injection vulnerabilities.
    // '-c', '4' limits the number of pings to prevent potential DoS attacks.
    execFile('ping', ['-c', '4', targetIp], { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Ping error for ${targetIp}: ${error.message}`);
            // Do not expose raw error messages (like file paths or command details) to the client.
            return res.status(500).send(`Ping failed for ${targetIp}.`);
        }
        if (stderr) {
            console.warn(`Ping stderr for ${targetIp}: ${stderr}`);
        }
        // XSS Fix: Escape stdout before sending it as HTML to the browser.
        // Even though 'ping' output is typically plain text, it's a critical practice
        // to escape any external or user-controlled input before rendering it as HTML
        // to prevent Cross-Site Scripting attacks.
        res.send(`<pre>${escapeHtml(stdout)}</pre>`);
    });
});

// General Security Best Practices (beyond the scope of this fix, but important):
// - Implement Helmet.js for setting various HTTP headers that improve security.
// - Implement rate-limiting middleware (e.g., `express-rate-limit`) to prevent brute-force attacks and DoS.
// - Implement robust authentication and authorization for sensitive routes.
// - Always use HTTPS in production environments.
// - Regularly update dependencies to patch known vulnerabilities.

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));