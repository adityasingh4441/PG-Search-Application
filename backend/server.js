import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import app from './src/app.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const port = Number(process.env.PORT || 4000);

mongoose.set('bufferCommands', false);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pg_search')
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error(`MongoDB unavailable: ${error.message}`));

app.listen(port, () => console.log(`PG Search API listening on port ${port}`));