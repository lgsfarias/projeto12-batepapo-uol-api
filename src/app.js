import express, { json } from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI;
const mongoClient = new MongoClient(MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db('batepapo-uol-api');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(chalk.green(`Server running on port ${PORT}`));
});
