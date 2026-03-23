const express = require('express');
const mysql = require('mysql');
const app = express();

const connection = mysql.createConnection({ host: 'localhost', user: 'root', password: 'password' });

app.get('/user', (req, res) => {
  const username = req.query.username;
  const query = "SELECT * FROM users WHERE username = ?"; 
  
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      res.status(500).send("Error fetching user data");
    } else {
      res.json(results);
    }
  });
});

// Optionally, listen on a port
// app.listen(3000, () => {
//   console.log('Server running on port 3000');
// });