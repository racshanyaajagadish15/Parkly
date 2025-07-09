const mysql = require('mysql2');

const connection_db = mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'parkly_user',
    password: 'Parkly@2025!',
    database: 'parkly_db'
});

connection_db.connect((err) => {
    if (err) {
        console.error('MySQL on EC2 connection failed', err);
        return;
    }
    console.log('Connected to MySQL on EC2 successfully!');
});

module.exports = connection_db;
