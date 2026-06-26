import express from "express";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";

const { Pool } = pg;
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_in_production";
const APP_URL    = process.env.APP_URL    || "http://localhost:5173";
const resend     = new Resend(process.env.RESEND_API_KEY || "");

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      negocio_nombre TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ventas (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      turno TEXT,
      metodo_pago TEXT NOT NULL,
      monto INTEGER NOT NULL,
      negocio_id INTEGER NOT NULL DEFAULT 1
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fiados (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      monto INTEGER NOT NULL,
      negocio_id INTEGER NOT NULL DEFAULT 1
    )
  `);
  await pool.query(`ALTER TABLE fiados ADD COLUMN IF NOT EXISTS descripcion TEXT`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS abonos (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      nombre TEXT NOT NULL,
      monto INTEGER NOT NULL,
      negocio_id INTEGER NOT NULL DEFAULT 1
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gastos (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      empresa TEXT NOT NULL,
      descripcion TEXT,
      monto INTEGER NOT NULL,
      negocio_id INTEGER NOT NULL DEFAULT 1
    )
  `);
  await pool.query(`ALTER TABLE gastos ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'pendiente'`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cigarros_compras (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      descripcion TEXT,
      monto INTEGER NOT NULL,
      negocio_id INTEGER NOT NULL DEFAULT 1
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cigarros_ventas (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      monto INTEGER NOT NULL,
      negocio_id INTEGER NOT NULL DEFAULT 1
    )
  `);

  // Migraciones: agregar negocio_id a tablas existentes si no existe
  const tables = ["ventas", "fiados", "abonos", "gastos", "cigarros_compras", "cigarros_ventas"];
  for (const t of tables) {
    await pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS negocio_id INTEGER NOT NULL DEFAULT 1`);
  }

  // Migración: email en usuarios
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email TEXT`);

  // Tabla tokens de reset
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL
    )
  `);

  console.log("Tablas listas.");
}

// ─── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return res.status(401).json({ error: "No autorizado" });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// ─── API: Auth ────────────────────────────────────────────────────────────────
app.post("/api/register", async (req, res) => {
  const { username, password, negocio_nombre, email } = req.body;
  if (!username || !password || !negocio_nombre)
    return res.status(400).json({ error: "Faltan campos requeridos" });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO usuarios (username, password_hash, negocio_nombre, email) VALUES ($1,$2,$3,$4) RETURNING id, username, negocio_nombre",
      [username.trim().toLowerCase(), hash, negocio_nombre.trim(), email?.trim().toLowerCase() || null]
    );
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username, negocio_nombre: rows[0].negocio_nombre }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, negocio_nombre: rows[0].negocio_nombre });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
    throw err;
  }
});

// ─── API: Cambiar contraseña ──────────────────────────────────────────────────
app.patch("/api/me/password", requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: "Faltan campos" });
  if (new_password.length < 6) return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
  const { rows } = await pool.query("SELECT password_hash FROM usuarios WHERE id=$1", [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
  const ok = await bcrypt.compare(current_password, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: "La contraseña actual es incorrecta" });
  const hash = await bcrypt.hash(new_password, 10);
  await pool.query("UPDATE usuarios SET password_hash=$1 WHERE id=$2", [hash, req.user.id]);
  res.json({ ok: true });
});

// ─── API: Recuperar contraseña ────────────────────────────────────────────────
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Falta el email" });
  const { rows } = await pool.query("SELECT id, negocio_nombre FROM usuarios WHERE email=$1", [email.trim().toLowerCase()]);
  if (rows.length) {
    const token = crypto.randomBytes(32).toString("hex");
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2, NOW() + INTERVAL '1 hour')",
      [rows[0].id, token]
    );
    const link = `${APP_URL}?reset=${token}`;
    await resend.emails.send({
      from: "Control de Ventas <onboarding@resend.dev>",
      to: email.trim().toLowerCase(),
      subject: "Recupera tu contraseña — Control de Ventas",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#111;color:#fff;border-radius:16px">
          <h2 style="color:#00C896;margin-bottom:8px">Recuperar contraseña</h2>
          <p style="color:#9ca3af">Hola <strong style="color:#fff">${rows[0].negocio_nombre}</strong>,</p>
          <p style="color:#9ca3af">Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para continuar:</p>
          <a href="${link}" style="display:inline-block;margin:24px 0;background:#00C896;color:#111;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none">
            Restablecer contraseña
          </a>
          <p style="color:#6b7280;font-size:12px">Este link expira en 1 hora. Si no solicitaste esto, ignora este email.</p>
        </div>
      `,
    });
  }
  // Siempre responder igual para no revelar si el email existe
  res.json({ ok: true });
});

app.post("/api/reset-password", async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) return res.status(400).json({ error: "Faltan campos" });
  if (new_password.length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  const { rows } = await pool.query(
    "SELECT * FROM password_reset_tokens WHERE token=$1 AND expires_at > NOW()",
    [token]
  );
  if (!rows.length) return res.status(400).json({ error: "El link es inválido o ya expiró. Solicita uno nuevo." });
  const hash = await bcrypt.hash(new_password, 10);
  await pool.query("UPDATE usuarios SET password_hash=$1 WHERE id=$2", [hash, rows[0].user_id]);
  await pool.query("DELETE FROM password_reset_tokens WHERE token=$1", [token]);
  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Faltan campos" });
  const { rows } = await pool.query("SELECT * FROM usuarios WHERE username = $1", [username.trim().toLowerCase()]);
  if (!rows.length) return res.status(401).json({ error: "Credenciales incorrectas" });
  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: "Credenciales incorrectas" });
  const token = jwt.sign({ id: rows[0].id, username: rows[0].username, negocio_nombre: rows[0].negocio_nombre }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, negocio_nombre: rows[0].negocio_nombre });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, negocio_nombre: req.user.negocio_nombre });
});

// ─── API: Ventas ──────────────────────────────────────────────────────────────
app.get("/api/ventas", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM ventas WHERE negocio_id=$1 ORDER BY fecha, id", [req.user.id]);
  res.json(rows.map((r) => ({ id: r.id, fecha: r.fecha, turno: r.turno, metodoPago: r.metodo_pago, monto: r.monto })));
});

app.post("/api/ventas", requireAuth, async (req, res) => {
  const { id, fecha, turno, metodoPago, monto } = req.body;
  await pool.query(
    "INSERT INTO ventas (id, fecha, turno, metodo_pago, monto, negocio_id) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, fecha, turno ?? null, metodoPago, monto, req.user.id]
  );
  res.json({ ok: true });
});

app.delete("/api/ventas/:id", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM ventas WHERE id=$1 AND negocio_id=$2", [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ─── API: Fiados ──────────────────────────────────────────────────────────────
app.get("/api/fiados", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM fiados WHERE negocio_id=$1 ORDER BY fecha, id", [req.user.id]);
  res.json(rows);
});

app.post("/api/fiados", requireAuth, async (req, res) => {
  const { id, fecha, nombre, descripcion, monto } = req.body;
  await pool.query(
    "INSERT INTO fiados (id, fecha, nombre, descripcion, monto, negocio_id) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, fecha, nombre, descripcion ?? null, monto, req.user.id]
  );
  res.json({ ok: true });
});

app.delete("/api/fiados/:id", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM fiados WHERE id=$1 AND negocio_id=$2", [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ─── API: Abonos ──────────────────────────────────────────────────────────────
app.get("/api/abonos", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM abonos WHERE negocio_id=$1 ORDER BY fecha, id", [req.user.id]);
  res.json(rows);
});

app.post("/api/abonos", requireAuth, async (req, res) => {
  const { id, fecha, nombre, monto } = req.body;
  await pool.query(
    "INSERT INTO abonos (id, fecha, nombre, monto, negocio_id) VALUES ($1,$2,$3,$4,$5)",
    [id, fecha, nombre, monto, req.user.id]
  );
  res.json({ ok: true });
});

app.delete("/api/abonos/:id", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM abonos WHERE id=$1 AND negocio_id=$2", [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ─── API: Gastos ──────────────────────────────────────────────────────────────
app.get("/api/gastos", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM gastos WHERE negocio_id=$1 ORDER BY fecha, id", [req.user.id]);
  res.json(rows);
});

app.post("/api/gastos", requireAuth, async (req, res) => {
  const { id, fecha, empresa, descripcion, monto, estado_pago } = req.body;
  await pool.query(
    "INSERT INTO gastos (id, fecha, empresa, descripcion, monto, estado_pago, negocio_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id, fecha, empresa, descripcion ?? null, monto, estado_pago ?? "pendiente", req.user.id]
  );
  res.json({ ok: true });
});

app.patch("/api/gastos/:id", requireAuth, async (req, res) => {
  const { fecha, empresa, descripcion, monto, estado_pago } = req.body;
  await pool.query(
    "UPDATE gastos SET fecha=$1, empresa=$2, descripcion=$3, monto=$4, estado_pago=$5 WHERE id=$6 AND negocio_id=$7",
    [fecha, empresa, descripcion ?? null, monto, estado_pago, req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

app.delete("/api/gastos/:id", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM gastos WHERE id=$1 AND negocio_id=$2", [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ─── API: Cigarros Compras ────────────────────────────────────────────────────
app.get("/api/cigarros/compras", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM cigarros_compras WHERE negocio_id=$1 ORDER BY fecha, id", [req.user.id]);
  res.json(rows);
});

app.post("/api/cigarros/compras", requireAuth, async (req, res) => {
  const { id, fecha, descripcion, monto } = req.body;
  await pool.query(
    "INSERT INTO cigarros_compras (id, fecha, descripcion, monto, negocio_id) VALUES ($1,$2,$3,$4,$5)",
    [id, fecha, descripcion ?? null, monto, req.user.id]
  );
  res.json({ ok: true });
});

app.delete("/api/cigarros/compras/:id", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM cigarros_compras WHERE id=$1 AND negocio_id=$2", [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ─── API: Cigarros Ventas ─────────────────────────────────────────────────────
app.get("/api/cigarros/ventas", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM cigarros_ventas WHERE negocio_id=$1 ORDER BY fecha, id", [req.user.id]);
  res.json(rows);
});

app.post("/api/cigarros/ventas", requireAuth, async (req, res) => {
  const { id, fecha, monto } = req.body;
  await pool.query(
    "INSERT INTO cigarros_ventas (id, fecha, monto, negocio_id) VALUES ($1,$2,$3,$4)",
    [id, fecha, monto, req.user.id]
  );
  res.json({ ok: true });
});

app.delete("/api/cigarros/ventas/:id", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM cigarros_ventas WHERE id=$1 AND negocio_id=$2", [req.params.id, req.user.id]);
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
