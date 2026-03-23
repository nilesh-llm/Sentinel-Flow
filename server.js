const express = require('express');
const mysql = require('mysql');
const app = express();

const connection = mysql.createConnection({ host: 'localhost', user: 'root', password: 'password' });

// 
app.get('/user', (req, res) => {
  const username = req.query.username;
  
  connection.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).send("Error");
    }
    else {
      res.json(results);
    }
  });
});