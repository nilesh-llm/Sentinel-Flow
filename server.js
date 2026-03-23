const express = require('express');
const mysql = require('mysql');
const app = express();

const connection = mysql.createConnection({ host: 'localhost', user: 'root', password: 'password' });

app.get('/user', (req, res) => {
  const username = req.query.username;
  const query = "SELECT * FROM users WHERE username = ?"; 
  
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database error:', err); // Log the error for debugging
      res.status(500).send("Error fetching user data");
    } else {
      res.json(results);
    }
  });
});

// You might also want to add a listener to start the server
// For example:
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// And handle connection errors:
// connection.connect(err => {
//   if (err) {
//     console.error('Error connecting to MySQL:', err.stack);
//     return;
//   }
//   console.log('Connected to MySQL as id', connection.threadId);
// });