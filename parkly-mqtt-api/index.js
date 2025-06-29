// Imports
const express = require ('express');
const cors = require ('cors');
const mqtt = require ('mqtt');

// Server Configuration
const app = express();
app.use(cors());
app.use(express.json());
const port = 3000;

// MQTT Configuration
const mqttHost = 'mqtt://localhost:1883';
const mqttClient = mqtt.connect(mqttHost);
mqttClient.on('connect', () => {
    console.log('Connected to MQTT Broker at ' + mqttHost);
})
mqttClient.on('error', () => {
    console.error('Error connecting to MQTT Broket at ' + mqttHost);
})


// API Routes
// GET : parkly-mqtt-api/getSensorData
app.get('/parkly-mqtt-api/getSensorData', (req,res) => {
    // Defining the MQTT topics the client is to subscribe to
    const requestTopic = 'parkly/request';
    const responseTopic = 'parkly/response';
    
    // Defining a timeout in case the MQTT Broker does not respond - client unsubscribes then provides 504 Gateway Timeout Error
    const timeout = setTimeout(() => {
        mqttClient.removeListener("message", messageHandler);
        return res.status(504).send("No response from NodeMCU (timeout)");
    }, 5000);

    // Implement the timeout in case of no response
    const messageHandler = (topic, message) => {
        if (topic === responseTopic) {
        clearTimeout(timeout);
        mqttClient.removeListener("message", messageHandler);
        return res.json({ message: message.toString() });
        }
    };

     // Client publishes a request to the request topic to send the getStatus request
    mqttClient.on("message", messageHandler);
    mqttClient.publish(requestTopic, 'getStatus');

    // Client subscribes to the response topic to get the getStatus response results
    mqttClient.subscribe(responseTopic, (err) => {
        if (err) {
            console.error('Error subscribing to ' + responseTopic);
            res.status(500).json({error: 'Subscription Error', message: 'Could not subscribe to response topic'});
        }
    });

});





// Server Startup
app.listen(port);
console.log('MQTT to HTTP Bridge Listening on Port ' + port);
