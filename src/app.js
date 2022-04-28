import express, { json } from 'express';
import { MongoClient } from 'mongodb';

const app = express();
app.use(json());

const mongoClient = new MongoClient('mongodb://localhost:27017');
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db('batepapo-uol-api');
});

app.listen(5000, () => {
    console.log('Servidor rodando na porta 5000');
});
