const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log("Dummy NodeMCU Connected");

  client.subscribe("parkly/request", () => {
    console.log("Listening for requests...");
  });
});

client.on("message", (topic, message) => {
  if (topic === "parkly/request" && message.toString() === "getStatus") {
    console.log("Received request for status. Sending dummy data...");
    client.publish("parkly/response", JSON.stringify({ status: "Available", slot: 1 }));
  }
});
