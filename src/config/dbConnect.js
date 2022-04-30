import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import chalk from 'chalk';
dotenv.config();

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
const mongoClient = new MongoClient(mongoURI);

async function connect() {
    try {
        await mongoClient.connect();
        console.log(chalk.bold.blue('MongoDB connected'));
        return mongoClient.db(process.env.MONGO_DB);
    } catch (error) {
        console.log(chalk.red(error));
    }
}

export default connect;
