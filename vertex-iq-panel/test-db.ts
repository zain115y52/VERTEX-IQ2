import 'dotenv/config';
import { pool } from './server/db.js';

pool.query('SELECT * FROM servers').then(res => { console.log(res.rows); pool.end(); }).catch(e => console.error(e));
