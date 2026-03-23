const express = require('express');
const mysql = require('mysql');
const app = express();

const connection = mysql.createConnection({ host: 'localhost', user: 'root', password: 'password' });

connection.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('Connected to MySQL as id', connection.threadId);
});

app.get('/user', (req, res) => {
  const username = req.query.username;
  const query = "SELECT * FROM users WHERE username = ?"; 
  
  // The mysql library correctly handles SQL injection prevention by escaping the 'username'
  // value when passed as the second argument in an array to connection.query().
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database error:', err); // Log the error for debugging
      res.status(500).send("Error fetching user data"); // Avoid leaking internal error details to the client
    } else {
      res.json(results);
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});