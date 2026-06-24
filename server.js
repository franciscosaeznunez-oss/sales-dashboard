import express from "express";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

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
      descripcion TEXT,
      monto INTEGER NOT NULL
    )
  `);
  // Migración: agregar columna descripcion si no existe
  await pool.query(`
    ALTER TABLE fiados ADD COLUMN IF NOT EXISTS descripcion TEXT
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS abonos (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      nombre TEXT NOT NULL,
      monto INTEGER NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gastos (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      empresa TEXT NOT NULL,
      descripcion TEXT,
      monto INTEGER NOT NULL
    )
  `);
  await pool.query(`
    ALTER TABLE gastos ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'pendiente'
  `);
  console.log("Tablas listas.");
}

// ─── API: Ventas ──────────────────────────────────────────────────────────────
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

// ─── API: Fiados ──────────────────────────────────────────────────────────────
app.get("/api/fiados", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM fiados ORDER BY fecha, id");
  res.json(rows);
});

app.post("/api/fiados", async (req, res) => {
  const { id, fecha, nombre, descripcion, monto } = req.body;
  await pool.query(
    "INSERT INTO fiados (id, fecha, nombre, descripcion, monto) VALUES ($1,$2,$3,$4,$5)",
    [id, fecha, nombre, descripcion ?? null, monto]
  );
  res.json({ ok: true });
});

app.delete("/api/fiados/:id", async (req, res) => {
  await pool.query("DELETE FROM fiados WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ─── API: Abonos ──────────────────────────────────────────────────────────────
app.get("/api/abonos", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM abonos ORDER BY fecha, id");
  res.json(rows);
});

app.post("/api/abonos", async (req, res) => {
  const { id, fecha, nombre, monto } = req.body;
  await pool.query(
    "INSERT INTO abonos (id, fecha, nombre, monto) VALUES ($1,$2,$3,$4)",
    [id, fecha, nombre, monto]
  );
  res.json({ ok: true });
});

app.delete("/api/abonos/:id", async (req, res) => {
  await pool.query("DELETE FROM abonos WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ─── API: Gastos ──────────────────────────────────────────────────────────────
app.get("/api/gastos", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM gastos ORDER BY fecha, id");
  res.json(rows);
});

app.post("/api/gastos", async (req, res) => {
  const { id, fecha, empresa, descripcion, monto, estado_pago } = req.body;
  await pool.query(
    "INSERT INTO gastos (id, fecha, empresa, descripcion, monto, estado_pago) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, fecha, empresa, descripcion ?? null, monto, estado_pago ?? "pendiente"]
  );
  res.json({ ok: true });
});

app.patch("/api/gastos/:id", async (req, res) => {
  const { fecha, empresa, descripcion, monto, estado_pago } = req.body;
  await pool.query(
    "UPDATE gastos SET fecha=$1, empresa=$2, descripcion=$3, monto=$4, estado_pago=$5 WHERE id=$6",
    [fecha, empresa, descripcion ?? null, monto, estado_pago, req.params.id]
  );
  res.json({ ok: true });
});

app.delete("/api/gastos/:id", async (req, res) => {
  await pool.query("DELETE FROM gastos WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ─── Servir React build ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB()
  .then(() => app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`)))
  .catch((err) => { console.error("Error al inicializar DB:", err); process.exit(1); });
