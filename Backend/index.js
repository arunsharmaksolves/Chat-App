require('dotenv').config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
//set up mongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("Successfully connected to mongo.");
})
.catch((err) => {
    console.log("Error connecting to mongo.", err);
});
app.use(express.json()); // parse body
// routes
app.use('/api', require('./route/auth.js'));

app.use('/',(req,res)=>{
    res.json()
})

const PORT = 3000;
app.listen(PORT, () => {
     console.log("Listening on port: " + PORT);
}); 