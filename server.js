import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import moment from 'moment';


// Import Controllers
import * as ServerController from './controllers/ServerController';

// Create Server
const app = express();
app.use(bodyParser.urlencoded({extended: true}));   // Parses application/x-www-form-urlencoded for req.body
app.use(bodyParser.json());                         // Parses application/json for req.body
app.use(morgan('dev'));

app.set('view engine', 'ejs');

// Initialize the DB
// const dbURL = "mongodb://localhost/dfs_directoryService";
// mongoose.connect(dbURL);
// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function() {
//   console.log("Connected to Database");
// });


const router = express.Router();

// Public pages endpoints
app.get('/', (req, res) => {
  // Define some variables
  const drinks = [
    { name: 'Bloody Mary', drunkness: 3 },
    { name: 'Martini', drunkness: 5 },
    { name: 'Scotch', drunkness: 10 }
  ];
  const tagline = "Any code of your own that you haven't looked at for six or more months might as well have been written by someone else.";


  // Automatically looks for views folder
  res.render('pages/index', {drinks, tagline})
});


// API endpoints
app.post('/api/complexity', ServerController.calculateComplexity);
app.post('/api/work', ServerController.getWork);



// Initialize the Server
app.listen(5000, () => {
  console.log('Cyclomatic Complexity Server on port 5000');
});
