const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

const certPath = '/Users/racshanyaa/Documents/GitHub/Parkly/parkly-aws-api/certs';

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








