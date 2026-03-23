const express = require('express');
const mysql = require('mysql');
const app = express();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'your_database_name'
});

app.get('/user', (req, res) => {
  const username = req.query.username;
  const query = "SELECT * FROM users WHERE username = ?";
  
  pool.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send("Error fetching user data");
    } else {
      res.json(results);
    }
  });
});

pool.on('error', function (err) {
  console.error('MySQL Pool Error:', err.stack);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});