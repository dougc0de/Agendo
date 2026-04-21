import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 10
});

async function withTransaction(callback) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Error al hacer rollback:", rollbackError);
        }

        throw error;
    } finally {
        client.release();
    }
}

export { withTransaction };
export default pool;
