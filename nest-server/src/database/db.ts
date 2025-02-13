import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

// export const users = [
//     {
//         name: 'Gristweld Psfincter',
//         email: 'gp@zcorp.com',
//         projects: [{title:"some task", active: true, members: []}]
//     },
//     {
//         name: 'Shrerri Opterri',
//         email: 'so@zcorp.com',
//         projects: [{title:"some other task", active: false, members: []}]
//     },
// ];


export const client = new Client({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'b_mono_db',
})