const express = require('express');
const { execFile } = require('child_process'); // Use execFile for safer command execution
const mysql = require('mysql');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

// Use environment variables for sensitive data
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY; // Fetched from environment variables

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_DATABASE || 'enterprise_db'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        return;
    }
    console.log('Connected to database as id ' + db.threadId);
});

// Use middleware to parse JSON request bodies if needed for future routes
app.use(express.json());

// SQL Injection Fix: Use parameterized queries
app.get('/api/employee', (req, res) => {
    let email = req.query.email;

    if (!email) {
        return res.status(400).send('Email parameter is required.');
    }

    // Use a placeholder (?) for the email parameter, preventing SQL injection
    let query = "SELECT * FROM employees WHERE email = ?;";
    
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error fetching employee data.');
        }
        res.json(results);
    });
});

// Remote Command Execution (RCE) Fix: Input validation and safer `execFile`
app.post('/api/ping-server', (req, res) => {
    let targetIp = req.body.target; // Prefer POST body for sensitive input

    // Input validation: Ensure targetIp is a valid IP address or hostname
    // This regex checks for IPv4 addresses or simple hostnames (no special chars)
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/;

    if (!targetIp || !ipRegex.test(targetIp)) {
        return res.status(400).send('Invalid target IP or hostname provided.');
    }
    
    // Use execFile which takes command and arguments separately, preventing shell injection
    // It's inherently safer than exec when dealing with user-controlled arguments.
    execFile('ping', ['-c', '4', targetIp], { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Ping error for ${targetIp}: ${error.message}`);
            // Do not expose raw error messages to the client
            return res.status(500).send(`Ping failed for ${targetIp}.`);
        }
        if (stderr) {
            console.warn(`Ping stderr for ${targetIp}: ${stderr}`);
        }
        res.send(`<pre>${stdout}</pre>`);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));