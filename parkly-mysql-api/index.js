const express = require ('express');
const cors = require ('cors');
const db = require ('./db');
const { exec } = require('child_process');
 
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

app.get('/parking_lots', (req, res) => {
    const query = 'SELECT * FROM parking_lots';
    db.query(query, (err,results) => {
        if (err){
            console.error("[ERROR] ", err);
            return res.status(500).json({error : 'Database query failed'});
        }
        res.json(results);
    });
});

app.get('/available_parking_lots', (req,res) => {
    const query = 'SELECT * FROM parking_lots WHERE status = "available";';
    db.query(query, (err,results) => {
        if (err){
            console.error("[ERROR] ", err);
            return res.status(500).json({error: 'Database query failed'});
        }
        res.json(results);
    });
});

app.put('/detect_parking_lot/:lot_id', (req, res) => {
    const lotID = req.params.lot_id;

    exec(`python3 detect_parking_status.py`, (error, stdout, stderr) => {
        if (error) {
            console.error(`[ERROR] Detection with Python Script Failed: ${error.message}`);
            return res.status(500).json({ error: 'Detection failed due to unexpected server error' });
        }

        let isOccupied;
        try {
            isOccupied = JSON.parse(stdout).isOccupied;
        } catch (e) {
            console.error(`[ERROR] Failed to parse JSON from Python: ${stdout}`);
            return res.status(500).json({ error: 'Detection result in unreadable format / Unable to parse JSON' });
        }

        const status = isOccupied ? 'occupied' : 'available';
        const updateQuery = 'UPDATE parking_lots SET status = ? WHERE lot_id = ?';

        db.query(updateQuery, [status, lotID], (err, results) => {
            if (err) {
                console.error('[ERROR] Database update failed:', err);
                return res.status(500).json({ error: 'Database update failed' });
            }

            res.json({ message: 'Parking lot status updated successfully', status });
        });
    });
});

app.put('/detect_parking_lot_mqtt/:lot_id', (req, res) => {
    let lotID = req.params.lot_id.trim().replace(/^:/, '');
    console.log(`[DEBUG] Node.js is passing lot_id = ${lotID}`);
    exec(`python3 detect_and_publish.py ${lotID}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`[ERROR] Python script failed: ${error.message}`);
            return res.status(500).json({ error: 'Detection script failed' });
        }

        let detectionResult;
        try {
            detectionResult = JSON.parse(stdout); 
            console.log("[DEBUG] Python returned:", stdout);
        } catch (e) {
            console.error(`[ERROR] Failed to parse script output: ${stdout}`);
            return res.status(500).json({ error: 'Invalid JSON output from Python script' });
        }

        const status = detectionResult.isOccupied ? 'occupied' : 'available';
        const updateQuery = 'UPDATE parking_lots SET status = ? WHERE lot_id = ?';

        db.query(updateQuery, [status, lotID], (err, results) => {
            if (err) {
                console.error('[ERROR] Failed to update database:', err);
                return res.status(500).json({ error: 'Database update failed' });
            }

            if (results.affectedRows === 0) {
                console.warn('[WARN] No rows were updated. Check if lot_id exists.');
                return res.status(404).json({ error: 'Parking lot not found' });
            }

            res.json({
                message: 'Parking lot status updated and published via MQTT',
                lot_id: lotID,
                status: status
            });
        });

    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})