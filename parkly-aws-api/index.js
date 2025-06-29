const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "3.25.71.225",
  user: "parklyuser",
  password: "Racshanyaa@2006",
  database: "parkly"
});

connection.connect(err => {
  if (err) throw err;
  console.log("Connected to EC2 MySQL!");
});

module.exports = connection;
