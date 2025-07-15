const express = require ('express');
const cors = require ('cors');
const db = require ('./db');
const { exec } = require ('child_process');
const axios = require ('axios')
 
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

app.post('/reserve_parking_lot/:lot_id', (req, res) => {
    const lot_id = req.params.lot_id;
    if (!lot_id){
        return res.status(400).json({error: 'lot_id is required'});
    }

    const checkQuery = 'SELECT * FROM parking_lots WHERE lot_id = ?';
    db.query(checkQuery, [lot_id], (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({error: 'Database query failed'});
        }
        if (results.length === 0) {
            return res.status(404).json({error: 'Parking lot not found'});
        }
        if (results[0].status !== 'available'){
            return res.status(400).json({error: 'Parking lot is not available for reservation'});
        }

        const reserveQuery = 'INSERT INTO lot_reservations (lot_id, reserved_at) VALUES (?, NOW()) ';
        db.query(reserveQuery, [lot_id], (err, results) => {
            if (err){
                console.error("[ERROR] Database query failed:", err);
                return res.status(500).json({error: 'Database query failed'});
            }
            return res.json({message: 'Parking lot reserved successfully', reservation_id: results.insertId});
        });

        const updateQuery = 'UPDATE parking_lots SET status = "reserved" WHERE lot_id = ?';
        db.query(updateQuery, [lot_id], (err,results) => {
            if (err){
                console.error("[ERROR] Database query failed: ", err);
                return res.status(500).json({error: 'Database query failed'});
            }
        });
    });
});

app.get('/get_reserved_lot', (req, res) => {
    const query = 'SELECT * FROM parking_lots WHERE status = "reserved" LIMIT 1';
    db.query(query, (err,results) =>{
        if (err) {
            console.error("[ERROR] Database query failed", err);
            return res.status(500).json({error: 'Database query failed'});
        }
        return res.status(200).json(results)
    })
})

app.get('/get_map_render_data_reserved/:x/:y', async (req, res) => {
    const user_x = req.params.x;
    const user_y = req.params.y;
  try {
    const response = await axios.get('http://localhost:3000/get_reserved_lot');
    const reservedLot = response.data;
    console.log("[INFO] Reserved Lot", reservedLot);

    if (reservedLot.length === 0) {
      return res.status(404).json({ error: 'No reserved lot found' });
    }

    res.json({
      lot_id: reservedLot[0].lot_id,
      destination: {
        x: reservedLot[0].coord_x,
        y: reservedLot[0].coord_y
      },
      entry_point: { x: user_x, y: user_y }, 
      message: `Navigate to lot ${reservedLot[0].lot_id} at (${reservedLot[0].coord_x}, ${reservedLot[0].coord_y})`
    });

  } catch (error) {
    console.error('[ERROR] Axios call failed:', error.message);
    res.status(500).json({ error: 'Failed to get reserved lot info' });
  }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})