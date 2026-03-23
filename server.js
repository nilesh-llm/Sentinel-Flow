const express = require('express');
const mysql = require('mysql');
const app = express();

const connection = mysql.createConnection({ host: 'localhost', user: 'root', password: 'password', database: 'your_database_name' }); // Add a database for queries to work

// Connect to the database
connection.connect(err => {
  if (err) {
    console.error('Error connecting to the database: ' + err.stack);
    return;
  }
  console.log('Connected to database as id ' + connection.threadId);
});

app.get('/user', (req, res) => {
  const username = req.query.username;
  
  // Use a parameterized query to prevent SQL injection
  const query = "SELECT * FROM users WHERE username = ?"; 
  
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database query error: ' + err.message);
      res.status(500).send("Error fetching user data");
    } else {
      res.json(results);
    }
  });
});

// Example of starting the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});