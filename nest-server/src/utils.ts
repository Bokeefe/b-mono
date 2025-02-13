import { client } from "./database/db";
import { User } from "./graphpql/schema";
client.connect();

export const createUserTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL
        )`
        try {
            await client.query(query)
            console.log('User table created successfully')
        } catch (error) {
            console.error('Error creating user table', error)
        }
        
};
export const listTables = async () => {
    const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public'
        ORDER BY table_name
    `
    try {
        const res = await client.query(query)
        console.log(res.rows)
    } catch (error) {
        console.error('Error listing tables', error)
    }
}

export const addUser = async (user: User) => {
    const query = `
        INSERT INTO users (id, name, email, password)
        VALUES ($1, $2, $3, $4)
    `
    try {
        await client.query(query, [user.id, user.name, user.email, user.password])
        console.log('User added successfully')
    } catch (error) {
        console.error('Error adding user', error)
    } finally {
        client.end()
    }
}

export const getUsers = async () => {
    const query = `
        SELECT * FROM users
    `
    try {
        const res = await client.query(query)
       return res.rows
    } catch (error) {
        console.error('Error getting users', error)
    } finally {
        client.end()
    }
}   