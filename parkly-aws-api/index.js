// Run this command to connect to EC2 Instance 
// ssh -i parkly-mysql-keypair.pem ubuntu@3.107.79.165
// OpenSSL challenge password: rac@2006
// ssh -i parkly-mysql-keypair.pem -L 8883:localhost:8883 ubuntu@3.107.79.165












// mySQL connection to server
/* const mysql = require("mysql2");
const connection = mysql.createConnection({
  host: "127.0.0.1",     // tunnel address
  port: 3307,            // local forwarded port
  user: "parklyuser",
  password: "Racshanyaa@2006",
  database: "parkly"
});


connection.connect(err => {
  if (err) throw err;
  console.log("Connected to EC2 MySQL!");
});
module.exports = connection;
 */


const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

const certPath = './certs';

try {
  const key = fs.readFileSync(path.join(certPath, 'client.key'));
  const cert = fs.readFileSync(path.join(certPath, 'client.crt'));
  const ca = fs.readFileSync(path.join(certPath, 'ca.crt'));

  const options = {
    host: 'localhost',
    port: 8883,
    protocol: 'mqtts',
    key: key,
    cert: cert,
    ca: ca,
    rejectUnauthorized: true,
    reconnectPeriod: 1000,  // try to reconnect every second
    connectTimeout: 10 * 1000, // 10 seconds timeout
    clientId: `mqtt_client_${Math.random().toString(16).substr(2, 8)}`
  };

  console.log('[INFO] Attempting MQTT connection...');
  const client = mqtt.connect(options);

  client.on('connect', () => {
    console.log('[SUCCESS] MQTT connected via tunnel');
  });

  client.on('reconnect', () => {
    console.log('[INFO] Attempting to reconnect...');
  });

  client.on('error', (error) => {
    console.error('[ERROR] MQTT connection error:', error.message);
  });

  client.on('close', () => {
    console.warn('[WARN] MQTT connection closed');
  });

  client.on('offline', () => {
    console.warn('[WARN] MQTT client is offline');
  });

  // Optional: log messages received (for testing)
  client.on('message', (topic, message) => {
    console.log(`[DEBUG] Message received on topic '${topic}': ${message.toString()}`);
  });

  module.exports = client;

} catch (err) {
  console.error('[FATAL] Failed to read certificates or initialize MQTT:', err.message);
}








