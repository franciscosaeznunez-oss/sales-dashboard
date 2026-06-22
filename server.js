import express from "express";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());

// ─── Conexión PostgreSQL ────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ─── Inicializar tablas ─────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ventas (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      turno TEXT,
      metodo_pago TEXT NOT NULL,
      monto INTEGER NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fiados (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      nombre TEXT NOT NULL,
      monto INTEGER NOT NULL
    )
  `);
  console.log("Tablas listas.");
}

// ─── API: Ventas ─────────────────────────────────────────────────────────────
app.get("/api/ventas", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM ventas ORDER BY fecha, id");
  res.json(rows.map((r) => ({
    id: r.id,
    fecha: r.fecha,
    turno: r.turno,
    metodoPago: r.metodo_pago,
    monto: r.monto,
  })));
});

app.post("/api/ventas", async (req, res) => {
  const { id, fecha, turno, metodoPago, monto } = req.body;
  await pool.query(
    "INSERT INTO ventas (id, fecha, turno, metodo_pago, monto) VALUES ($1,$2,$3,$4,$5)",
    [id, fecha, turno ?? null, metodoPago, monto]
  );
  res.json({ ok: true });
});

app.delete("/api/ventas/:id", async (req, res) => {
  await pool.query("DELETE FROM ventas WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ─── API: Fiados ─────────────────────────────────────────────────────────────
app.get("/api/fiados", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM fiados ORDER BY fecha, id");
  res.json(rows);
});

app.post("/api/fiados", async (req, res) => {
  const { id, fecha, nombre, monto } = req.body;
  await pool.query(
    "INSERT INTO fiados (id, fecha, nombre, monto) VALUES ($1,$2,$3,$4)",
    [id, fecha, nombre, monto]
  );
  res.json({ ok: true });
});

app.delete("/api/fiados/:id", async (req, res) => {
  await pool.query("DELETE FROM fiados WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ─── Servir React build ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ─── Arranque ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB()
  .then(() => app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`)))
  .catch((err) => { console.error("Error al inicializar DB:", err); process.exit(1); });
