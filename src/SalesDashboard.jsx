import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  LogOut,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  Download,
  Trash2,
  Plus,
  Award,
  AlertCircle,
  Star,
  ShoppingBag,
  Users,
  CheckCircle,
  Pencil,
} from "lucide-react";

// ─── Constantes ────────────────────────────────────────────────────────────────
const TOKEN_KEY = "ventas_token";

// ─── Helpers API ───────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
const authH  = () => ({ "Authorization": `Bearer ${getToken()}` });
const jsonH  = () => ({ "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" });
const jfetch = (url, opts = {}) => fetch(url, opts).then(async (r) => { const d = await r.json(); if (!r.ok) throw d; return d; });

const api = {
  login:   (b) => jfetch("/api/login",    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }),
  register:(b) => jfetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }),
  getMe:   () => jfetch("/api/me", { headers: authH() }),

  getVentas:   () => jfetch("/api/ventas", { headers: authH() }),
  postVenta:   (v) => jfetch("/api/ventas",  { method: "POST",   headers: jsonH(), body: JSON.stringify(v) }),
  deleteVenta: (id) => jfetch(`/api/ventas/${id}`, { method: "DELETE", headers: authH() }),

  getFiados:   () => jfetch("/api/fiados", { headers: authH() }),
  postFiado:   (f) => jfetch("/api/fiados",  { method: "POST",   headers: jsonH(), body: JSON.stringify(f) }),
  deleteFiado: (id) => jfetch(`/api/fiados/${id}`, { method: "DELETE", headers: authH() }),

  getAbonos:   () => jfetch("/api/abonos", { headers: authH() }),
  postAbono:   (a) => jfetch("/api/abonos",  { method: "POST",   headers: jsonH(), body: JSON.stringify(a) }),
  deleteAbono: (id) => jfetch(`/api/abonos/${id}`, { method: "DELETE", headers: authH() }),

  getGastos:   () => jfetch("/api/gastos", { headers: authH() }),
  postGasto:   (g) => jfetch("/api/gastos",  { method: "POST",   headers: jsonH(), body: JSON.stringify(g) }),
  patchGasto:  (id, d) => jfetch(`/api/gastos/${id}`, { method: "PATCH",  headers: jsonH(), body: JSON.stringify(d) }),
  deleteGasto: (id) => jfetch(`/api/gastos/${id}`, { method: "DELETE", headers: authH() }),

  getCigarrosCompras:  () => jfetch("/api/cigarros/compras", { headers: authH() }),
  postCigarroCompra:   (d) => jfetch("/api/cigarros/compras",  { method: "POST",   headers: jsonH(), body: JSON.stringify(d) }),
  deleteCigarroCompra: (id) => jfetch(`/api/cigarros/compras/${id}`, { method: "DELETE", headers: authH() }),

  getCigarrosVentas:   () => jfetch("/api/cigarros/ventas", { headers: authH() }),
  postCigarroVenta:    (d) => jfetch("/api/cigarros/ventas", { method: "POST",   headers: jsonH(), body: JSON.stringify(d) }),
  deleteCigarroVenta:  (id) => jfetch(`/api/cigarros/ventas/${id}`, { method: "DELETE", headers: authH() }),
};

const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const MESES_NOMBRES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// ─── Utilidades ────────────────────────────────────────────────────────────────
const formatCLP = (n) => {
  const num = Number(n) || 0;
  return "$" + num.toLocaleString("es-CL");
};

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseLocalDate = (fechaStr) => new Date(fechaStr + "T12:00:00");

const sumMonto = (arr) => arr.reduce((acc, v) => acc + v.monto, 0);

const formatAxisCLP = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

// ─── Tooltip personalizado ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl text-sm">
      <p className="text-gray-300 mb-1 font-medium">Día {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatCLP(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── LOGIN / REGISTRO ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode, setMode]     = useState("login"); // "login" | "register"
  const [user, setUser]     = useState("");
  const [pass, setPass]     = useState("");
  const [negocio, setNegocio] = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const clearErr = () => setError("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!user.trim() || !pass.trim()) { setError("Completa todos los campos."); return; }
    if (mode === "register" && !negocio.trim()) { setError("Ingresa el nombre del negocio."); return; }
    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await api.login({ username: user.trim(), password: pass });
      } else {
        data = await api.register({ username: user.trim(), password: pass, negocio_nombre: negocio.trim() });
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      onLogin(data.negocio_nombre);
    } catch (err) {
      setError(err?.error || "Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none transition";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: "rgba(0,200,150,0.15)" }}>
            <BarChart2 size={40} style={{ color: "#00C896" }} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Control de Ventas</h1>
          <p className="text-gray-500 text-sm mt-1">Dashboard Comercial Chile</p>
        </div>

        {/* Tabs login/registro */}
        <div className="flex bg-gray-900 rounded-xl p-1 mb-4 border border-gray-800">
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); clearErr(); }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition"
              style={mode === m ? { background: "#00C896", color: "#111" } : { color: "#9ca3af" }}>
              {m === "login" ? "Ingresar" : "Crear cuenta"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Nombre del negocio</label>
                <input type="text" value={negocio} autoFocus={mode === "register"}
                  onChange={(e) => { setNegocio(e.target.value); clearErr(); }}
                  className={inputCls} placeholder="Ej: Almacén Don Pedro" />
              </div>
            )}
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Usuario</label>
              <input type="text" value={user} autoComplete="username" autoFocus={mode === "login"}
                onChange={(e) => { setUser(e.target.value); clearErr(); }}
                className={inputCls} placeholder="tu_usuario" />
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Contraseña</label>
              <input type="password" value={pass} autoComplete={mode === "login" ? "current-password" : "new-password"}
                onChange={(e) => { setPass(e.target.value); clearErr(); }}
                className={inputCls} placeholder="••••••••" />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-950 border border-red-800 rounded-xl p-3">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full font-bold py-3 rounded-xl transition text-gray-950 text-base disabled:opacity-60"
              style={{ background: "#00C896" }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#00b085"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#00C896"; }}>
              {loading ? "Cargando..." : mode === "login" ? "Ingresar al Dashboard" : "Crear cuenta"}
            </button>
          </form>

          <p className="text-center text-gray-600 text-xs mt-6">
            Datos sincronizados en la nube · Accede desde cualquier dispositivo
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── REGISTRAR VENTA ───────────────────────────────────────────────────────────
function SaleForm({ onSave }) {
  const [fecha, setFecha] = useState(todayStr());
  const [turno, setTurno] = useState("Mañana");
  const [metodoPago, setMetodoPago] = useState("Tarjeta");
  const [monto, setMonto] = useState("");
  const [success, setSuccess] = useState(false);
  const [montoError, setMontoError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = Number(monto);
    if (!monto || isNaN(val) || val <= 0) {
      setMontoError(true);
      return;
    }
    const venta = {
      id: Date.now().toString(),
      fecha,
      turno: metodoPago === "Tarjeta" ? null : turno,
      metodoPago,
      monto: Math.round(val),
    };
    await api.postVenta(venta);
    await onSave();
    setMonto("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const ToggleBtn = ({ value, current, onClick, children }) => (
    <button
      type="button"
      onClick={() => onClick(value)}
      className="flex-1 py-2.5 px-3 rounded-xl font-medium text-sm transition"
      style={
        current === value
          ? { background: "#00C896", color: "#030712" }
          : { background: "#1f2937", color: "#9ca3af" }
      }
    >
      {children}
    </button>
  );

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Plus size={20} style={{ color: "#00C896" }} />
          Registrar Nueva Venta
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fecha */}
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none transition"
            />
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Método de Pago
            </label>
            <div className="flex gap-3">
              <ToggleBtn value="Efectivo" current={metodoPago} onClick={setMetodoPago}>
                💵 Efectivo
              </ToggleBtn>
              <ToggleBtn value="Tarjeta" current={metodoPago} onClick={setMetodoPago}>
                💳 Tarjeta
              </ToggleBtn>
            </div>
          </div>

          {/* Turno — solo visible para Efectivo */}
          {metodoPago === "Efectivo" && (
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Turno
              </label>
              <div className="flex gap-3">
                <ToggleBtn value="Mañana" current={turno} onClick={setTurno}>
                  🌅 Mañana
                </ToggleBtn>
                <ToggleBtn value="Tarde" current={turno} onClick={setTurno}>
                  🌆 Tarde
                </ToggleBtn>
              </div>
            </div>
          )}

          {/* Monto */}
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Monto (CLP)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold select-none">
                $
              </span>
              <input
                type="number"
                value={monto}
                min="1"
                step="1"
                onChange={(e) => {
                  setMonto(e.target.value);
                  setMontoError(false);
                }}
                className="w-full bg-gray-800 text-white rounded-xl pl-8 pr-4 py-3 border border-gray-700 focus:outline-none transition text-right text-lg font-semibold"
                style={{ borderColor: montoError ? "#ef4444" : undefined }}
                placeholder="0"
              />
            </div>
            {monto > 0 && !montoError && (
              <p className="text-right mt-1 text-sm font-medium" style={{ color: "#00C896" }}>
                {formatCLP(monto)}
              </p>
            )}
            {montoError && (
              <p className="text-red-400 text-sm mt-1">Ingresa un monto válido mayor a 0.</p>
            )}
          </div>

          {/* Feedback */}
          {success && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 border"
              style={{ background: "rgba(0,200,150,0.1)", borderColor: "rgba(0,200,150,0.3)" }}
            >
              <Star size={16} style={{ color: "#00C896" }} />
              <span className="text-sm font-medium" style={{ color: "#00C896" }}>
                ¡Venta registrada exitosamente!
              </span>
            </div>
          )}

          <button
            type="submit"
            className="w-full font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-gray-950 text-base"
            style={{ background: "#00C896" }}
            onMouseEnter={(e) => (e.target.style.background = "#00b085")}
            onMouseLeave={(e) => (e.target.style.background = "#00C896")}
          >
            <Plus size={18} />
            Registrar Venta
          </button>
        </form>
      </div>

      {/* Info card */}
      <div className="mt-4 bg-gray-900 rounded-2xl p-4 border border-gray-800 text-sm text-gray-500 flex items-start gap-3">
        <ShoppingBag size={16} className="shrink-0 mt-0.5 text-gray-600" />
        <p>
          Las ventas se guardan automáticamente en este dispositivo. Puedes ver
          el resumen del día en la pestaña <strong className="text-gray-400">Resumen del Día</strong>.
        </p>
      </div>
    </div>
  );
}

// ─── RESUMEN DEL DÍA ───────────────────────────────────────────────────────────
function DaySummary({ ventas, selectedDate, onDateChange, onDelete }) {
  const ventasDelDia = useMemo(
    () => ventas.filter((v) => v.fecha === selectedDate),
    [ventas, selectedDate]
  );

  const isTarjeta = (v) =>
    v.metodoPago === "Tarjeta" || v.metodoPago === "Débito" || v.metodoPago === "Crédito";

  const stats = useMemo(() => {
    const all = ventasDelDia;
    const efectivo = all.filter((v) => v.metodoPago === "Efectivo");
    return {
      total: sumMonto(all),
      manana: sumMonto(efectivo.filter((v) => v.turno === "Mañana")),
      tarde: sumMonto(efectivo.filter((v) => v.turno === "Tarde")),
      efectivo: sumMonto(efectivo),
      tarjeta: sumMonto(all.filter(isTarjeta)),
    };
  }, [ventasDelDia]);

  const fechaLabel = parseLocalDate(selectedDate).toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const cards = [
    {
      label: "Total del Día",
      value: stats.total,
      icon: <DollarSign size={18} />,
      accent: "#00C896",
      bg: "rgba(0,200,150,0.08)",
      border: "rgba(0,200,150,0.25)",
      big: true,
    },
    {
      label: "Turno Mañana",
      value: stats.manana,
      icon: "🌅",
      accent: "#60a5fa",
      bg: "rgba(96,165,250,0.08)",
      border: "rgba(96,165,250,0.2)",
    },
    {
      label: "Turno Tarde",
      value: stats.tarde,
      icon: "🌆",
      accent: "#FF6B35",
      bg: "rgba(255,107,53,0.08)",
      border: "rgba(255,107,53,0.2)",
    },
    {
      label: "Efectivo",
      value: stats.efectivo,
      icon: "💵",
      accent: "#facc15",
      bg: "rgba(250,204,21,0.08)",
      border: "rgba(250,204,21,0.2)",
    },
    {
      label: "Tarjeta",
      value: stats.tarjeta,
      icon: "💳",
      accent: "#a78bfa",
      bg: "rgba(167,139,250,0.08)",
      border: "rgba(167,139,250,0.2)",
    },
  ];

  const metodoBadge = (metodo) => {
    const map = {
      Efectivo: { bg: "rgba(250,204,21,0.15)", color: "#fde047" },
      Tarjeta: { bg: "rgba(167,139,250,0.15)", color: "#c4b5fd" },
      Débito: { bg: "rgba(167,139,250,0.15)", color: "#c4b5fd" },
      Crédito: { bg: "rgba(167,139,250,0.15)", color: "#c4b5fd" },
    };
    return map[metodo] || {};
  };

  return (
    <div className="space-y-6">
      {/* Selector de fecha */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-1">
            Fecha
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-gray-800 text-white rounded-xl px-4 py-2.5 border border-gray-700 focus:outline-none transition"
          />
        </div>
        <p className="text-gray-400 text-sm capitalize pb-0.5">{fechaLabel}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl p-4 border ${c.big ? "col-span-2 md:col-span-1" : ""}`}
            style={{ background: c.bg, borderColor: c.border }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{typeof c.icon === "string" ? c.icon : <span style={{ color: c.accent }}>{c.icon}</span>}</span>
              <span className="text-gray-400 text-xs font-medium">{c.label}</span>
            </div>
            <p
              className="text-xl font-bold tracking-tight"
              style={{ color: c.big ? c.accent : "#f3f4f6" }}
            >
              {formatCLP(c.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Lista de ventas */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">
            Ventas registradas
          </h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
            {ventasDelDia.length} registro{ventasDelDia.length !== 1 ? "s" : ""}
          </span>
        </div>

        {ventasDelDia.length === 0 ? (
          <div className="p-10 text-center text-gray-600">
            <ShoppingBag size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay ventas para este día.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {ventasDelDia.map((v, idx) => {
              const badge = metodoBadge(v.metodoPago);
              return (
                <div
                  key={v.id}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-800 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-xs w-5 text-right">
                      {idx + 1}
                    </span>
                    {v.turno ? (
                      <>
                        <span className="text-sm">
                          {v.turno === "Mañana" ? "🌅" : "🌆"}
                        </span>
                        <span className="text-gray-300 text-sm">{v.turno}</span>
                      </>
                    ) : (
                      <span className="text-gray-500 text-sm">Total día</span>
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {v.metodoPago}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className="font-bold text-sm"
                      style={{ color: "#00C896" }}
                    >
                      {formatCLP(v.monto)}
                    </span>
                    <button
                      onClick={() => onDelete(v.id)}
                      className="text-gray-600 hover:text-red-400 transition p-1 rounded-lg hover:bg-red-950"
                      title="Eliminar venta"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CONTROL MENSUAL ───────────────────────────────────────────────────────────
function MonthlyControl({
  ventas,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onExport,
}) {
  const ventasMes = useMemo(
    () =>
      ventas.filter((v) => {
        const [y, m] = v.fecha.split("-");
        return (
          parseInt(y) === selectedYear && parseInt(m) === selectedMonth
        );
      }),
    [ventas, selectedMonth, selectedYear]
  );

  const resumenPorDia = useMemo(() => {
    const map = {};
    ventasMes.forEach((v) => {
      if (!map[v.fecha]) {
        map[v.fecha] = {
          fecha: v.fecha,
          manana: 0,
          tarde: 0,
          efectivo: 0,
          tarjeta: 0,
          total: 0,
        };
      }
      const d = map[v.fecha];
      if (v.metodoPago === "Efectivo") {
        d.efectivo += v.monto;
        if (v.turno === "Mañana") d.manana += v.monto;
        else if (v.turno === "Tarde") d.tarde += v.monto;
      } else {
        d.tarjeta += v.monto;
      }
      d.total += v.monto;
    });
    return Object.values(map).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [ventasMes]);

  const totals = useMemo(
    () =>
      resumenPorDia.reduce(
        (acc, d) => ({
          manana: acc.manana + d.manana,
          tarde: acc.tarde + d.tarde,
          efectivo: acc.efectivo + d.efectivo,
          tarjeta: acc.tarjeta + d.tarjeta,
          total: acc.total + d.total,
        }),
        { manana: 0, tarde: 0, efectivo: 0, tarjeta: 0, total: 0 }
      ),
    [resumenPorDia]
  );

  const barData = resumenPorDia.map((d) => ({
    dia: parseInt(d.fecha.split("-")[2]),
    Mañana: d.manana,
    Tarde: d.tarde,
    Tarjeta: d.tarjeta,
  }));

  const lineData = resumenPorDia.map((d) => ({
    dia: parseInt(d.fecha.split("-")[2]),
    Total: d.total,
  }));

  const pieData = [
    { name: "Efectivo", value: totals.efectivo },
    { name: "Tarjeta", value: totals.tarjeta },
  ].filter((d) => d.value > 0);

  const PIE_COLORS = ["#facc15", "#a78bfa", "#f472b6"];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

  const thCell = "px-3 py-3 text-xs font-semibold uppercase tracking-wider";
  const tdCell = "px-3 py-3 text-sm";

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Selector de mes/año + export */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-gray-400 text-xs font-medium mb-1">
            Mes
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 border border-gray-700 focus:outline-none text-sm"
          >
            {MESES_NOMBRES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs font-medium mb-1">
            Año
          </label>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="bg-gray-800 text-white rounded-xl px-3 py-2.5 border border-gray-700 focus:outline-none text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onExport}
          disabled={resumenPorDia.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition disabled:opacity-40"
          style={{ background: "#1f2937", borderColor: "#374151", color: "#d1d5db" }}
          onMouseEnter={(e) => !e.target.disabled && (e.currentTarget.style.background = "#374151")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1f2937")}
        >
          <Download size={15} />
          Exportar CSV
        </button>
      </div>

      {resumenPorDia.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl p-12 text-center border border-gray-800">
          <BarChart2 size={40} className="mx-auto mb-4 text-gray-700" />
          <p className="text-gray-500">
            No hay ventas en {MESES_NOMBRES[selectedMonth - 1]} {selectedYear}.
          </p>
        </div>
      ) : (
        <>
          {/* Tabla */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className={`${thCell} text-left text-gray-500`}>Fecha</th>
                  <th className={`${thCell} text-right text-blue-400`}>Mañana</th>
                  <th className={`${thCell} text-right`} style={{ color: "#FF6B35" }}>Tarde</th>
                  <th className={`${thCell} text-right text-yellow-400`}>Efectivo</th>
                  <th className={`${thCell} text-right text-purple-400`}>Tarjeta</th>
                  <th className={`${thCell} text-right`} style={{ color: "#00C896" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {resumenPorDia.map((d) => (
                  <tr
                    key={d.fecha}
                    className="border-b border-gray-800 hover:bg-gray-800 transition"
                  >
                    <td className={`${tdCell} text-gray-300`}>
                      {parseLocalDate(d.fecha).toLocaleDateString("es-CL", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className={`${tdCell} text-right text-gray-400`}>
                      {d.manana > 0 ? formatCLP(d.manana) : "—"}
                    </td>
                    <td className={`${tdCell} text-right text-gray-400`}>
                      {d.tarde > 0 ? formatCLP(d.tarde) : "—"}
                    </td>
                    <td className={`${tdCell} text-right text-gray-400`}>
                      {d.efectivo > 0 ? formatCLP(d.efectivo) : "—"}
                    </td>
                    <td className={`${tdCell} text-right text-gray-400`}>
                      {d.tarjeta > 0 ? formatCLP(d.tarjeta) : "—"}
                    </td>
                    <td className={`${tdCell} text-right font-bold`} style={{ color: "#00C896" }}>
                      {formatCLP(d.total)}
                    </td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr className="border-t-2 border-gray-700" style={{ background: "#111827" }}>
                  <td className={`${tdCell} font-bold text-white`}>TOTALES</td>
                  <td className={`${tdCell} text-right font-bold text-blue-400`}>{formatCLP(totals.manana)}</td>
                  <td className={`${tdCell} text-right font-bold`} style={{ color: "#FF6B35" }}>{formatCLP(totals.tarde)}</td>
                  <td className={`${tdCell} text-right font-bold text-yellow-400`}>{formatCLP(totals.efectivo)}</td>
                  <td className={`${tdCell} text-right font-bold text-purple-400`}>{formatCLP(totals.tarjeta)}</td>
                  <td className={`${tdCell} text-right font-bold text-lg`} style={{ color: "#00C896" }}>{formatCLP(totals.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Gráfico de barras */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm inline-block bg-blue-400" />
              Ventas por Turno (Efectivo) y Tarjeta
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="dia"
                  stroke="#4b5563"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatAxisCLP}
                  stroke="#4b5563"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: "#9ca3af", fontSize: 12 }}
                />
                <Bar dataKey="Mañana" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tarde" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tarjeta" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de línea */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <h3 className="text-white font-semibold text-sm mb-4">
              Evolución del Total Diario
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="dia"
                  stroke="#4b5563"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatAxisCLP}
                  stroke="#4b5563"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="Total"
                  stroke="#00C896"
                  strokeWidth={2.5}
                  dot={{ fill: "#00C896", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 7, fill: "#00C896", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de dona */}
          {pieData.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <h3 className="text-white font-semibold text-sm mb-4">
                Distribución por Método de Pago
              </h3>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-64">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        labelLine={false}
                        label={renderCustomLabel}
                      >
                        {pieData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, name) => [formatCLP(v), name]}
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {pieData.map((d, i) => {
                    const pct =
                      totals.total > 0
                        ? Math.round((d.value * 100) / totals.total)
                        : 0;
                    return (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: PIE_COLORS[i] }}
                            />
                            <span className="text-gray-300 text-sm">{d.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white text-sm font-semibold">
                              {formatCLP(d.value)}
                            </span>
                            <span className="text-gray-500 text-xs ml-2">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: PIE_COLORS[i],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ANÁLISIS ─────────────────────────────────────────────────────────────────
function SalesAnalysis({ ventas, gastos, selectedMonth, selectedYear }) {
  const ventasMes = useMemo(
    () =>
      ventas.filter((v) => {
        const [y, m] = v.fecha.split("-");
        return (
          parseInt(y) === selectedYear && parseInt(m) === selectedMonth
        );
      }),
    [ventas, selectedMonth, selectedYear]
  );

  const resumenPorDia = useMemo(() => {
    const map = {};
    ventasMes.forEach((v) => {
      if (!map[v.fecha]) map[v.fecha] = { fecha: v.fecha, total: 0 };
      map[v.fecha].total += v.monto;
    });
    return Object.values(map).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [ventasMes]);

  const analysis = useMemo(() => {
    if (resumenPorDia.length === 0) return null;

    const totalMes = resumenPorDia.reduce((a, b) => a + b.total, 0);
    const promedio = Math.round(totalMes / resumenPorDia.length);

    const sorted = [...resumenPorDia].sort((a, b) => b.total - a.total);
    const top3 = sorted.slice(0, 8);
    const peorDia = sorted[sorted.length - 1];

    const porDiaSemana = {};
    resumenPorDia.forEach((d) => {
      const dow = parseLocalDate(d.fecha).getDay();
      if (!porDiaSemana[dow]) {
        porDiaSemana[dow] = { nombre: DIAS_SEMANA[dow], total: 0, count: 0 };
      }
      porDiaSemana[dow].total += d.total;
      porDiaSemana[dow].count++;
    });
    const mejorDiaSemana = Object.values(porDiaSemana).sort(
      (a, b) => b.total - a.total
    )[0];

    return { totalMes, promedio, top3, peorDia, mejorDiaSemana };
  }, [resumenPorDia]);

  // ── Nuevas métricas ──────────────────────────────────────────────────────────

  const ventasMesAnterior = useMemo(() => {
    let m = selectedMonth - 1, y = selectedYear;
    if (m === 0) { m = 12; y -= 1; }
    return ventas
      .filter((v) => { const [vy, vm] = v.fecha.split("-"); return parseInt(vy) === y && parseInt(vm) === m; })
      .reduce((s, v) => s + v.monto, 0);
  }, [ventas, selectedMonth, selectedYear]);

  const porMetodo = useMemo(() => {
    const ef  = ventasMes.filter((v) => v.metodoPago === "Efectivo").reduce((s, v) => s + v.monto, 0);
    const tar = ventasMes.filter((v) => v.metodoPago === "Tarjeta").reduce((s, v) => s + v.monto, 0);
    return { efectivo: ef, tarjeta: tar, total: ef + tar };
  }, [ventasMes]);

  const porTurno = useMemo(() => {
    const man = ventasMes.filter((v) => v.turno === "Mañana").reduce((s, v) => s + v.monto, 0);
    const tar = ventasMes.filter((v) => v.turno === "Tarde").reduce((s, v) => s + v.monto, 0);
    return { manana: man, tarde: tar, total: man + tar };
  }, [ventasMes]);

  const totalGastosMes = useMemo(() =>
    (gastos || [])
      .filter((g) => { const [y, m] = g.fecha.split("-"); return parseInt(y) === selectedYear && parseInt(m) === selectedMonth; })
      .reduce((s, g) => s + g.monto, 0),
  [gastos, selectedMonth, selectedYear]);

  if (!analysis) {
    return (
      <div className="bg-gray-900 rounded-2xl p-12 text-center border border-gray-800">
        <Award size={40} className="mx-auto mb-4 text-gray-700" />
        <p className="text-gray-500">
          No hay datos para analizar en {MESES_NOMBRES[selectedMonth - 1]}{" "}
          {selectedYear}.
        </p>
        <p className="text-gray-600 text-sm mt-1">
          Registra ventas para ver el análisis.
        </p>
      </div>
    );
  }

  const { totalMes, promedio, top3, peorDia, mejorDiaSemana } = analysis;

  const formatFecha = (f) =>
    parseLocalDate(f).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
    });

  const medals = ["🥇", "🥈", "🥉", "4°", "5°", "6°", "7°", "8°"];

  return (
    <div className="space-y-5">
      <h2 className="text-white font-bold text-lg">
        Análisis Inteligente —{" "}
        <span style={{ color: "#00C896" }}>{MESES_NOMBRES[selectedMonth - 1]}</span>{" "}
        {selectedYear}
      </h2>

      {/* Fila superior: totales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total mes */}
        <div
          className="rounded-2xl p-6 border"
          style={{
            background: "linear-gradient(135deg, rgba(0,200,150,0.12), rgba(0,200,150,0.04))",
            borderColor: "rgba(0,200,150,0.25)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={20} style={{ color: "#00C896" }} />
            <span className="text-sm font-medium" style={{ color: "#00C896" }}>
              💰 Total Acumulado del Mes
            </span>
          </div>
          <p className="text-4xl font-bold text-white tracking-tight">
            {formatCLP(totalMes)}
          </p>
        </div>

        {/* Promedio */}
        <div
          className="rounded-2xl p-6 border"
          style={{
            background: "linear-gradient(135deg, rgba(96,165,250,0.12), rgba(96,165,250,0.04))",
            borderColor: "rgba(96,165,250,0.25)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={20} className="text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">
              ⚖️ Promedio Diario del Mes
            </span>
          </div>
          <p className="text-4xl font-bold text-white tracking-tight">
            {formatCLP(promedio)}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Basado en {resumenPorDia.length} día{resumenPorDia.length !== 1 ? "s" : ""} con ventas
          </p>
        </div>
      </div>

      {/* Mejor día de la semana */}
      <div
        className="rounded-2xl p-6 border"
        style={{
          background: "linear-gradient(135deg, rgba(250,204,21,0.1), rgba(250,204,21,0.03))",
          borderColor: "rgba(250,204,21,0.25)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Award size={22} className="text-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">
            🥇 Mejor Día de la Semana
          </span>
        </div>
        <p className="text-2xl font-bold text-white">
          Los{" "}
          <span className="text-yellow-300">
            {mejorDiaSemana.nombre.toUpperCase()}
          </span>{" "}
          son tu mejor día
        </p>
        <div className="flex gap-6 mt-3">
          <div>
            <p className="text-gray-500 text-xs">Total acumulado</p>
            <p className="text-yellow-300 font-bold">{formatCLP(mejorDiaSemana.total)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Días contados</p>
            <p className="text-yellow-300 font-bold">{mejorDiaSemana.count}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Promedio por {mejorDiaSemana.nombre}</p>
            <p className="text-yellow-300 font-bold">
              {formatCLP(Math.round(mejorDiaSemana.total / mejorDiaSemana.count))}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 3 mejores días */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} style={{ color: "#00C896" }} />
            <span className="text-white font-semibold text-sm">
              📈 Top 3 Mejores Días
            </span>
          </div>
          <div className="space-y-4">
            {top3.map((d, i) => {
              const pct =
                top3[0].total > 0
                  ? Math.round((d.total * 100) / top3[0].total)
                  : 100;
              return (
                <div key={d.fecha}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{medals[i]}</span>
                      <span className="text-gray-300 text-sm capitalize">
                        {formatFecha(d.fecha)}
                      </span>
                    </div>
                    <span
                      className="font-bold text-sm"
                      style={{ color: "#00C896" }}
                    >
                      {formatCLP(d.total)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${pct}%`, background: "#00C896" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Día más bajo */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={18} className="text-red-400" />
            <span className="text-white font-semibold text-sm">
              📉 Día más Bajo del Mes
            </span>
          </div>
          <p className="text-2xl font-bold text-white capitalize">
            {formatFecha(peorDia.fecha)}
          </p>
          <p className="text-red-400 text-xl font-bold mt-1">
            {formatCLP(peorDia.total)}
          </p>
          {top3[0] && (
            <>
              <div className="mt-4 h-1.5 bg-gray-800 rounded-full">
                <div
                  className="h-1.5 rounded-full bg-red-500"
                  style={{
                    width: `${Math.round((peorDia.total * 100) / top3[0].total)}%`,
                  }}
                />
              </div>
              <p className="text-gray-600 text-xs mt-1">
                {Math.round((peorDia.total * 100) / top3[0].total)}% del mejor día del mes
              </p>
            </>
          )}

          <div
            className="mt-4 rounded-xl p-3 text-sm"
            style={{ background: "#1f2937" }}
          >
            <p className="text-gray-400">
              Diferencia con el mejor día:
            </p>
            <p className="text-red-400 font-semibold">
              -{formatCLP(top3[0].total - peorDia.total)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Comparación con mes anterior ─────────────────────────────────── */}
      {(() => {
        const totalMesActual = analysis?.totalMes || 0;
        const mesNombre = selectedMonth > 1 ? MESES_NOMBRES[selectedMonth - 2] : MESES_NOMBRES[11];
        const diff = totalMesActual - ventasMesAnterior;
        const pct = ventasMesAnterior > 0 ? Math.round((diff * 100) / ventasMesAnterior) : null;
        const subio = diff >= 0;
        return (
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              {subio ? <TrendingUp size={18} style={{ color: "#00C896" }} /> : <TrendingDown size={18} className="text-red-400" />}
              <span className="text-white font-semibold text-sm">📅 Comparación con {mesNombre}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-xs mb-1">{mesNombre}</p>
                <p className="text-xl font-bold text-gray-400">{ventasMesAnterior > 0 ? formatCLP(ventasMesAnterior) : "Sin datos"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">{MESES_NOMBRES[selectedMonth - 1]}</p>
                <p className="text-xl font-bold text-white">{formatCLP(totalMesActual)}</p>
              </div>
            </div>
            {pct !== null && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm font-bold px-2.5 py-1 rounded-full"
                  style={{ background: subio ? "rgba(0,200,150,0.15)" : "rgba(239,68,68,0.15)", color: subio ? "#00C896" : "#ef4444" }}>
                  {subio ? "+" : ""}{pct}%
                </span>
                <span className="text-gray-500 text-xs">vs mes anterior</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Efectivo vs Tarjeta ──────────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={18} style={{ color: "#00C896" }} />
          <span className="text-white font-semibold text-sm">💳 Efectivo vs Tarjeta</span>
        </div>
        {porMetodo.total === 0 ? (
          <p className="text-gray-600 text-sm">Sin ventas este mes.</p>
        ) : (
          <div className="space-y-4">
            {[
              { label: "Efectivo", value: porMetodo.efectivo, color: "#00C896" },
              { label: "Tarjeta",  value: porMetodo.tarjeta,  color: "#3b82f6" },
            ].map(({ label, value, color }) => {
              const pct = porMetodo.total > 0 ? Math.round((value * 100) / porMetodo.total) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-gray-300 text-sm font-medium">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">{pct}%</span>
                      <span className="text-sm font-bold" style={{ color }}>{formatCLP(value)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Mañana vs Tarde ─────────────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={18} style={{ color: "#F59E0B" }} />
          <span className="text-white font-semibold text-sm">🌅 Mañana vs Tarde (Efectivo)</span>
        </div>
        {porTurno.total === 0 ? (
          <p className="text-gray-600 text-sm">Sin ventas en efectivo este mes.</p>
        ) : (
          <div className="space-y-4">
            {[
              { label: "Mañana", value: porTurno.manana, color: "#F59E0B" },
              { label: "Tarde",  value: porTurno.tarde,  color: "#6366f1" },
            ].map(({ label, value, color }) => {
              const pct = porTurno.total > 0 ? Math.round((value * 100) / porTurno.total) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-gray-300 text-sm font-medium">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">{pct}%</span>
                      <span className="text-sm font-bold" style={{ color }}>{formatCLP(value)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Utilidad neta ────────────────────────────────────────────────── */}
      {(() => {
        const ingresos = analysis?.totalMes || 0;
        const utilidad = ingresos - totalGastosMes;
        const esGanancia = utilidad >= 0;
        return (
          <div className="rounded-2xl p-5 border"
            style={{ background: esGanancia ? "rgba(0,200,150,0.06)" : "rgba(239,68,68,0.06)",
                     borderColor: esGanancia ? "rgba(0,200,150,0.2)" : "rgba(239,68,68,0.2)" }}>
            <div className="flex items-center gap-2 mb-4">
              {esGanancia ? <TrendingUp size={18} style={{ color: "#00C896" }} /> : <TrendingDown size={18} className="text-red-400" />}
              <span className="text-white font-semibold text-sm">📊 Utilidad Neta del Mes</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <p className="text-gray-500 text-xs mb-1">Ingresos</p>
                <p className="text-lg font-bold" style={{ color: "#00C896" }}>{formatCLP(ingresos)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Gastos</p>
                <p className="text-lg font-bold" style={{ color: "#FF6B35" }}>{formatCLP(totalGastosMes)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Utilidad</p>
                <p className="text-lg font-bold" style={{ color: esGanancia ? "#00C896" : "#ef4444" }}>
                  {esGanancia ? "" : "-"}{formatCLP(Math.abs(utilidad))}
                </p>
              </div>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              {ingresos > 0 && (
                <div className="h-2 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((totalGastosMes * 100) / ingresos))}%`,
                           background: esGanancia ? "#FF6B35" : "#ef4444" }} />
              )}
            </div>
            <p className="text-gray-600 text-xs mt-1">
              {ingresos > 0 ? `${Math.min(100, Math.round((totalGastosMes * 100) / ingresos))}% de los ingresos se fue en gastos` : "Sin ingresos este mes"}
            </p>
          </div>
        );
      })()}

    </div>
  );
}

// ─── FIADOS EXPRESS ───────────────────────────────────────────────────────────
function FiadosExpress({ fiados, abonos, onSaveFiado, onSaveAbono }) {
  // ── Form nuevo ítem ────────────────────────────────────────────────────────
  const [fecha, setFecha] = useState(todayStr());
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Abono inline: { nombre, monto, fecha } ─────────────────────────────────
  const [abonoTarget, setAbonoTarget] = useState(null); // nombre del fiador
  const [abonoMonto, setAbonoMonto] = useState("");
  const [abonoFecha, setAbonoFecha] = useState(todayStr());
  const [abonoError, setAbonoError] = useState("");
  const [abonoSuccess, setAbonoSuccess] = useState("");

  // Nombres de fiadores pendientes para autocomplete
  const nombresPendientes = useMemo(() => {
    const totDebe = {};
    const totPago = {};
    fiados.forEach((f) => { totDebe[f.nombre] = (totDebe[f.nombre] || 0) + f.monto; });
    abonos.forEach((a) => { totPago[a.nombre] = (totPago[a.nombre] || 0) + a.monto; });
    return [...new Set(fiados.map((f) => f.nombre))].filter(
      (n) => (totDebe[n] || 0) > (totPago[n] || 0)
    );
  }, [fiados, abonos]);

  // Agrupa fiados y abonos por nombre
  const grupos = useMemo(() => {
    const map = {};
    fiados.forEach((f) => {
      if (!map[f.nombre]) map[f.nombre] = { items: [], abonos: [] };
      map[f.nombre].items.push(f);
    });
    abonos.forEach((a) => {
      if (!map[a.nombre]) map[a.nombre] = { items: [], abonos: [] };
      map[a.nombre].abonos.push(a);
    });
    // Ordena items y abonos por fecha
    Object.values(map).forEach((g) => {
      g.items.sort((a, b) => a.fecha.localeCompare(b.fecha));
      g.abonos.sort((a, b) => a.fecha.localeCompare(b.fecha));
      g.totalDebe = g.items.reduce((s, i) => s + i.monto, 0);
      g.totalPago = g.abonos.reduce((s, a) => s + a.monto, 0);
      g.balance = g.totalDebe - g.totalPago;
    });
    return map;
  }, [fiados, abonos]);

  const pendientes = Object.entries(grupos).filter(([, g]) => g.balance > 0);
  const saldados   = Object.entries(grupos).filter(([, g]) => g.balance <= 0);

  const totalGlobalPendiente = pendientes.reduce((s, [, g]) => s + g.balance, 0);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = "Ingresa el nombre del cliente.";
    const val = Number(monto);
    if (!monto || isNaN(val) || val <= 0) e.monto = "Ingresa un monto válido mayor a 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const fiado = {
      id: Date.now().toString(),
      fecha,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      monto: Math.round(Number(monto)),
    };
    await api.postFiado(fiado);
    await onSaveFiado();
    setNombre("");
    setDescripcion("");
    setMonto("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleDeleteFiado = async (id) => {
    await api.deleteFiado(id);
    await onSaveFiado();
  };

  const handleDeleteAbono = async (id) => {
    await api.deleteAbono(id);
    await onSaveAbono();
  };

  const handleAbono = async (nombreFiador) => {
    const val = Number(abonoMonto);
    if (!abonoMonto || isNaN(val) || val <= 0) {
      setAbonoError("Ingresa un monto válido.");
      return;
    }
    const abono = {
      id: Date.now().toString(),
      fecha: abonoFecha,
      nombre: nombreFiador,
      monto: Math.round(val),
    };
    await api.postAbono(abono);
    await onSaveAbono();
    setAbonoMonto("");
    setAbonoFecha(todayStr());
    setAbonoError("");
    setAbonoTarget(null);
    setAbonoSuccess(nombreFiador);
    setTimeout(() => setAbonoSuccess(""), 3000);
  };

  const fmtFecha = (f) =>
    parseLocalDate(f).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Resumen global */}
      {pendientes.length > 0 && (
        <div className="rounded-2xl p-5 border flex items-center justify-between"
          style={{ background: "rgba(255,107,53,0.08)", borderColor: "rgba(255,107,53,0.25)" }}>
          <div className="flex items-center gap-3">
            <Users size={22} style={{ color: "#FF6B35" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "#FF6B35" }}>Total pendiente</p>
              <p className="text-2xl font-bold text-white tracking-tight">{formatCLP(totalGlobalPendiente)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ color: "#FF6B35" }}>{pendientes.length}</p>
            <p className="text-xs text-gray-500">{pendientes.length === 1 ? "fiador" : "fiadores"}</p>
          </div>
        </div>
      )}

      {/* Formulario nuevo ítem */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <Users size={20} style={{ color: "#FF6B35" }} />
          Agregar Ítem Fiado
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 border border-gray-700 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1">Nombre del cliente</label>
              <input type="text" value={nombre} list="fiadores-list"
                onChange={(e) => { setNombre(e.target.value); setErrors((p) => ({ ...p, nombre: undefined })); }}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 border border-gray-700 focus:outline-none text-sm"
                style={{ borderColor: errors.nombre ? "#ef4444" : undefined }}
                placeholder="Ej: Juan Pérez" />
              <datalist id="fiadores-list">
                {nombresPendientes.map((n) => <option key={n} value={n} />)}
              </datalist>
              {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Descripción (opcional)</label>
            <input type="text" value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 border border-gray-700 focus:outline-none text-sm"
              placeholder="Ej: 2 cafés, almuerzo, etc." />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Monto (CLP)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold select-none text-sm">$</span>
              <input type="number" value={monto} min="1" step="1"
                onChange={(e) => { setMonto(e.target.value); setErrors((p) => ({ ...p, monto: undefined })); }}
                className="w-full bg-gray-800 text-white rounded-xl pl-7 pr-4 py-2.5 border border-gray-700 focus:outline-none text-right font-semibold text-sm"
                style={{ borderColor: errors.monto ? "#ef4444" : undefined }}
                placeholder="0" />
            </div>
            {monto > 0 && !errors.monto && (
              <p className="text-right mt-1 text-xs font-medium" style={{ color: "#FF6B35" }}>{formatCLP(monto)}</p>
            )}
            {errors.monto && <p className="text-red-400 text-xs mt-1">{errors.monto}</p>}
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-xl p-3 border"
              style={{ background: "rgba(0,200,150,0.1)", borderColor: "rgba(0,200,150,0.3)" }}>
              <Star size={14} style={{ color: "#00C896" }} />
              <span className="text-sm font-medium" style={{ color: "#00C896" }}>¡Ítem registrado!</span>
            </div>
          )}

          <button type="submit"
            className="w-full font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-gray-950 text-sm"
            style={{ background: "#FF6B35" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e55a25")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FF6B35")}>
            <Plus size={16} /> Agregar Ítem
          </button>
        </form>
      </div>

      {/* Fiadores pendientes */}
      {pendientes.length === 0 && saldados.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl p-10 text-center border border-gray-800">
          <Users size={32} className="mx-auto mb-3 opacity-30 text-gray-600" />
          <p className="text-gray-500 text-sm">No hay fiados registrados.</p>
        </div>
      ) : (
        <>
          {pendientes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-sm px-1">Pendientes de pago</h3>
              {pendientes.map(([nombreFiador, g]) => {
                const pct = Math.min(100, Math.round((g.totalPago / g.totalDebe) * 100));
                const isAbonoOpen = abonoTarget === nombreFiador;
                return (
                  <div key={nombreFiador} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                    {/* Header fiador */}
                    <div className="px-5 py-4 border-b border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-bold">{nombreFiador}</p>
                        <p className="font-bold text-lg" style={{ color: "#FF6B35" }}>{formatCLP(g.balance)}</p>
                      </div>
                      {g.totalPago > 0 && (
                        <>
                          <div className="h-1.5 bg-gray-800 rounded-full mb-1">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: "#00C896" }} />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Abonado: {formatCLP(g.totalPago)}</span>
                            <span>Total: {formatCLP(g.totalDebe)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Ítems */}
                    <div className="divide-y divide-gray-800">
                      {g.items.map((item) => (
                        <div key={item.id} className="px-5 py-2.5 flex items-center justify-between">
                          <div>
                            <span className="text-gray-500 text-xs">{fmtFecha(item.fecha)}</span>
                            {item.descripcion && (
                              <span className="text-gray-400 text-xs ml-2">— {item.descripcion}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300 text-sm font-medium">{formatCLP(item.monto)}</span>
                            <button onClick={() => handleDeleteFiado(item.id)}
                              className="text-gray-700 hover:text-red-400 transition p-1 rounded"
                              title="Eliminar ítem">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Abonos registrados */}
                    {g.abonos.length > 0 && (
                      <div className="border-t border-gray-800 bg-gray-950">
                        {g.abonos.map((abono) => (
                          <div key={abono.id} className="px-5 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle size={13} style={{ color: "#00C896" }} />
                              <span className="text-gray-500 text-xs">Abono {fmtFecha(abono.fecha)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: "#00C896" }}>+{formatCLP(abono.monto)}</span>
                              <button onClick={() => handleDeleteAbono(abono.id)}
                                className="text-gray-700 hover:text-red-400 transition p-1 rounded"
                                title="Eliminar abono">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Form abono inline */}
                    {isAbonoOpen && (
                      <div className="border-t border-gray-800 px-5 py-4 bg-gray-950 space-y-3">
                        <p className="text-gray-300 text-sm font-medium">Registrar abono</p>
                        <div className="flex gap-2">
                          <input type="date" value={abonoFecha}
                            onChange={(e) => setAbonoFecha(e.target.value)}
                            className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none" />
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                            <input type="number" value={abonoMonto} min="1" step="1"
                              onChange={(e) => { setAbonoMonto(e.target.value); setAbonoError(""); }}
                              className="w-full bg-gray-800 text-white rounded-lg pl-6 pr-3 py-2 border border-gray-700 text-sm focus:outline-none text-right"
                              style={{ borderColor: abonoError ? "#ef4444" : undefined }}
                              placeholder="0" />
                          </div>
                          <button onClick={() => handleAbono(nombreFiador)}
                            className="px-3 py-2 rounded-lg text-sm font-bold text-gray-950 transition"
                            style={{ background: "#00C896" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#00b085")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#00C896")}>
                            ✓
                          </button>
                          <button onClick={() => { setAbonoTarget(null); setAbonoMonto(""); setAbonoError(""); }}
                            className="px-3 py-2 rounded-lg text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 transition">
                            ✕
                          </button>
                        </div>
                        {abonoError && <p className="text-red-400 text-xs">{abonoError}</p>}
                      </div>
                    )}

                    {/* Acciones fiador */}
                    <div className="border-t border-gray-800 px-5 py-3 flex gap-2">
                      <button
                        onClick={() => { setNombre(nombreFiador); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="flex-1 text-xs font-medium py-2 rounded-lg transition"
                        style={{ background: "rgba(255,107,53,0.12)", color: "#FF6B35" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,107,53,0.22)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,107,53,0.12)")}>
                        + Agregar ítem
                      </button>
                      <button
                        onClick={() => { setAbonoTarget(isAbonoOpen ? null : nombreFiador); setAbonoMonto(""); setAbonoError(""); }}
                        className="flex-1 text-xs font-medium py-2 rounded-lg transition"
                        style={{ background: "rgba(0,200,150,0.12)", color: "#00C896" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,200,150,0.22)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,200,150,0.12)")}>
                        $ Registrar abono
                      </button>
                    </div>
                    {abonoSuccess === nombreFiador && (
                      <div className="px-5 pb-3">
                        <p className="text-xs font-medium" style={{ color: "#00C896" }}>✓ Abono registrado</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Saldados */}
          {saldados.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-gray-500 font-semibold text-sm px-1">Historial — Saldados ✓</h3>
              {saldados.map(([nombreFiador, g]) => (
                <div key={nombreFiador} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden opacity-70">
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} style={{ color: "#00C896" }} />
                      <p className="text-gray-300 font-medium text-sm">{nombreFiador}</p>
                    </div>
                    <p className="text-gray-400 text-sm">Total: {formatCLP(g.totalDebe)}</p>
                  </div>
                  <div className="border-t border-gray-800 px-5 py-2 bg-gray-950">
                    {g.abonos.map((a) => (
                      <div key={a.id} className="flex justify-between text-xs text-gray-600 py-0.5">
                        <span>Abono {fmtFecha(a.fecha)}</span>
                        <div className="flex items-center gap-2">
                          <span>{formatCLP(a.monto)}</span>
                          <button onClick={() => handleDeleteAbono(a.id)}
                            className="text-gray-700 hover:text-red-400 transition" title="Eliminar abono">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── GASTOS ───────────────────────────────────────────────────────────────────
function GastosSection({ gastos, selectedMonth, selectedYear, onMonthChange, onYearChange, onSaveGasto }) {
  // ── Form nuevo gasto ────────────────────────────────────────────────────────
  const [fecha, setFecha] = useState(todayStr());
  const [empresa, setEmpresa] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [estadoPago, setEstadoPago] = useState("pendiente");
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // ── Edición inline ──────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});

  const empresasExistentes = useMemo(
    () => [...new Set(gastos.map((g) => g.empresa))].sort(),
    [gastos]
  );

  const gastosMes = useMemo(
    () =>
      gastos.filter((g) => {
        const [y, m] = g.fecha.split("-");
        return parseInt(y) === selectedYear && parseInt(m) === selectedMonth;
      }),
    [gastos, selectedMonth, selectedYear]
  );

  const totalMes = gastosMes.reduce((s, g) => s + g.monto, 0);
  const cantidadMes = gastosMes.length;
  const totalPendiente = gastosMes
    .filter((g) => (g.estado_pago || "pendiente") === "pendiente")
    .reduce((s, g) => s + g.monto, 0);

  const porEmpresa = useMemo(() => {
    const map = {};
    gastosMes.forEach((g) => { map[g.empresa] = (map[g.empresa] || 0) + g.monto; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [gastosMes]);

  const gastoDiario = useMemo(() => {
    const diasEnMes = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: diasEnMes }, (_, i) => {
      const d = String(i + 1).padStart(2, "0");
      const fechaStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${d}`;
      const total = gastosMes.filter((g) => g.fecha === fechaStr).reduce((s, g) => s + g.monto, 0);
      return { dia: i + 1, total };
    });
  }, [gastosMes, selectedMonth, selectedYear]);

  const gastosPorDia = useMemo(() => {
    const map = {};
    gastosMes.forEach((g) => {
      if (!map[g.fecha]) map[g.fecha] = [];
      map[g.fecha].push(g);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([fecha, items]) => ({
        fecha,
        items,
        total: items.reduce((s, g) => s + g.monto, 0),
      }));
  }, [gastosMes]);

  const COLORES_GASTOS = ["#FF6B35", "#FF9F1C", "#FFBF69", "#FFE66D", "#CBF3F0", "#2EC4B6"];

  const ESTADOS = [
    { value: "pendiente",     label: "Pendiente",     color: "#FF6B35" },
    { value: "efectivo",      label: "Efectivo",      color: "#00C896" },
    { value: "transferencia", label: "Transferencia", color: "#3b82f6" },
  ];

  const badgeStyle = (estado) => {
    const e = ESTADOS.find((x) => x.value === (estado || "pendiente")) || ESTADOS[0];
    return { color: e.color, background: e.color + "1a", border: `1px solid ${e.color}40` };
  };

  // ── Handlers form nuevo ────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!empresa.trim()) e.empresa = "Ingresa el nombre de la empresa.";
    const val = Number(monto);
    if (!monto || isNaN(val) || val <= 0) e.monto = "Ingresa un monto válido.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    await api.postGasto({
      id: Date.now().toString(),
      fecha,
      empresa: empresa.trim(),
      descripcion: descripcion.trim() || null,
      monto: Math.round(Number(monto)),
      estado_pago: estadoPago,
    });
    await onSaveGasto();
    setEmpresa("");
    setDescripcion("");
    setMonto("");
    setEstadoPago("pendiente");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleDelete = async (id) => {
    await api.deleteGasto(id);
    await onSaveGasto();
  };

  // ── Handlers edición inline ────────────────────────────────────────────────
  const openEdit = (g) => {
    setEditingId(g.id);
    setEditFields({
      fecha: g.fecha,
      empresa: g.empresa,
      descripcion: g.descripcion || "",
      monto: String(g.monto),
      estado_pago: g.estado_pago || "pendiente",
    });
  };

  const handleSaveEdit = async () => {
    const val = Number(editFields.monto);
    if (!editFields.empresa.trim() || !editFields.monto || isNaN(val) || val <= 0) return;
    await api.patchGasto(editingId, {
      fecha: editFields.fecha,
      empresa: editFields.empresa.trim(),
      descripcion: editFields.descripcion.trim() || null,
      monto: Math.round(val),
      estado_pago: editFields.estado_pago,
    });
    await onSaveGasto();
    setEditingId(null);
  };

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 2; y--) years.push(y);

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Selector mes/año */}
      <div className="flex gap-2">
        <select value={selectedMonth} onChange={(e) => onMonthChange(Number(e.target.value))}
          className="bg-gray-900 text-white rounded-xl px-4 py-2.5 border border-gray-700 focus:outline-none text-sm flex-1">
          {MESES_NOMBRES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={selectedYear} onChange={(e) => onYearChange(Number(e.target.value))}
          className="bg-gray-900 text-white rounded-xl px-4 py-2.5 border border-gray-700 focus:outline-none text-sm">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Total {MESES_NOMBRES[selectedMonth - 1]}</p>
          <p className="text-xl font-bold text-white">{formatCLP(totalMes)}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Facturas</p>
          <p className="text-xl font-bold" style={{ color: "#FF6B35" }}>{cantidadMes}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Por pagar</p>
          <p className="text-xl font-bold" style={{ color: totalPendiente > 0 ? "#FF6B35" : "#00C896" }}>
            {formatCLP(totalPendiente)}
          </p>
        </div>
      </div>

      {/* Formulario nuevo gasto */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign size={18} style={{ color: "#FF6B35" }} />
          Registrar Gasto
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 border border-gray-700 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1">Empresa / Proveedor</label>
              <input type="text" value={empresa} list="empresas-list"
                onChange={(e) => { setEmpresa(e.target.value); setErrors((p) => ({ ...p, empresa: undefined })); }}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 border border-gray-700 focus:outline-none text-sm"
                style={{ borderColor: errors.empresa ? "#ef4444" : undefined }}
                placeholder="Ej: Coca-Cola, CFE, etc." />
              <datalist id="empresas-list">
                {empresasExistentes.map((n) => <option key={n} value={n} />)}
              </datalist>
              {errors.empresa && <p className="text-red-400 text-xs mt-1">{errors.empresa}</p>}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">N° Factura / Descripción (opcional)</label>
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 border border-gray-700 focus:outline-none text-sm"
              placeholder="Ej: Factura #0042, cuenta de luz mayo, etc." />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">Monto (CLP)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm select-none">$</span>
              <input type="number" value={monto} min="1" step="1"
                onChange={(e) => { setMonto(e.target.value); setErrors((p) => ({ ...p, monto: undefined })); }}
                className="w-full bg-gray-800 text-white rounded-xl pl-7 pr-4 py-2.5 border border-gray-700 focus:outline-none text-right font-semibold text-sm"
                style={{ borderColor: errors.monto ? "#ef4444" : undefined }}
                placeholder="0" />
            </div>
            {monto > 0 && !errors.monto && (
              <p className="text-right mt-1 text-xs font-medium" style={{ color: "#FF6B35" }}>{formatCLP(monto)}</p>
            )}
            {errors.monto && <p className="text-red-400 text-xs mt-1">{errors.monto}</p>}
          </div>

          {/* Selector estado de pago */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-2">Estado del pago</label>
            <div className="flex gap-2">
              {ESTADOS.map((e) => (
                <button key={e.value} type="button"
                  onClick={() => setEstadoPago(e.value)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border transition"
                  style={estadoPago === e.value
                    ? { background: e.color, color: "#0a0a0a", borderColor: e.color }
                    : { background: "transparent", color: e.color, borderColor: e.color + "50" }}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-xl p-3 border"
              style={{ background: "rgba(0,200,150,0.1)", borderColor: "rgba(0,200,150,0.3)" }}>
              <Star size={14} style={{ color: "#00C896" }} />
              <span className="text-sm font-medium" style={{ color: "#00C896" }}>¡Gasto registrado!</span>
            </div>
          )}

          <button type="submit"
            className="w-full font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-gray-950 text-sm"
            style={{ background: "#FF6B35" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e55a25")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FF6B35")}>
            <Plus size={16} /> Registrar Gasto
          </button>
        </form>
      </div>

      {/* Gráficos */}
      {gastosMes.length > 0 && (
        <>
          {porEmpresa.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <h3 className="text-white font-semibold text-sm mb-4">Gasto por empresa — {MESES_NOMBRES[selectedMonth - 1]}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porEmpresa} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} tick={{ fill: "#9ca3af", fontSize: 10 }} width={45} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "12px" }}
                    labelStyle={{ color: "#f9fafb", fontWeight: 600 }} formatter={(v) => [formatCLP(v), "Gasto"]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {porEmpresa.map((_, i) => <Cell key={i} fill={COLORES_GASTOS[i % COLORES_GASTOS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <h3 className="text-white font-semibold text-sm mb-4">Gasto diario — {MESES_NOMBRES[selectedMonth - 1]}</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={gastoDiario} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="dia" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} tick={{ fill: "#9ca3af", fontSize: 10 }} width={45} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "12px" }}
                  labelStyle={{ color: "#f9fafb", fontWeight: 600 }} formatter={(v) => [formatCLP(v), "Gasto"]} />
                <Line type="monotone" dataKey="total" stroke="#FF6B35" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Lista de facturas */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">
            Facturas — {MESES_NOMBRES[selectedMonth - 1]} {selectedYear}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
            {cantidadMes} {cantidadMes === 1 ? "factura" : "facturas"}
          </span>
        </div>

        {gastosPorDia.length === 0 ? (
          <div className="p-10 text-center text-gray-600">
            <DollarSign size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sin gastos registrados este mes.</p>
          </div>
        ) : (
          <div>
            {gastosPorDia.map(({ fecha: diaFecha, items, total: totalDia }) => (
              <div key={diaFecha} className="border-b border-gray-800 last:border-b-0">
                {/* Encabezado del día */}
                <div className="px-5 py-2.5 flex items-center justify-between bg-gray-950">
                  <span className="text-xs font-semibold text-gray-400 capitalize">
                    {parseLocalDate(diaFecha).toLocaleDateString("es-CL", {
                      weekday: "long",
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  <span className="text-xs font-bold" style={{ color: "#FF6B35" }}>
                    {formatCLP(totalDia)}
                  </span>
                </div>

                {/* Facturas del día */}
                <div className="divide-y divide-gray-800">
                  {items.map((g) => {
                    const isEditing = editingId === g.id;
                    if (isEditing) {
                      return (
                        <div key={g.id} className="px-5 py-4 bg-gray-800 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={editFields.fecha}
                              onChange={(e) => setEditFields((p) => ({ ...p, fecha: e.target.value }))}
                              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm focus:outline-none" />
                            <input type="text" value={editFields.empresa} list="empresas-edit-list"
                              onChange={(e) => setEditFields((p) => ({ ...p, empresa: e.target.value }))}
                              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm focus:outline-none"
                              placeholder="Empresa" />
                            <datalist id="empresas-edit-list">
                              {empresasExistentes.map((n) => <option key={n} value={n} />)}
                            </datalist>
                          </div>
                          <input type="text" value={editFields.descripcion}
                            onChange={(e) => setEditFields((p) => ({ ...p, descripcion: e.target.value }))}
                            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm focus:outline-none"
                            placeholder="Descripción / N° Factura (opcional)" />
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                            <input type="number" value={editFields.monto} min="1" step="1"
                              onChange={(e) => setEditFields((p) => ({ ...p, monto: e.target.value }))}
                              className="w-full bg-gray-700 text-white rounded-lg pl-7 pr-4 py-2 border border-gray-600 text-sm focus:outline-none text-right font-semibold" />
                          </div>
                          <div className="flex gap-2">
                            {ESTADOS.map((e) => (
                              <button key={e.value} type="button"
                                onClick={() => setEditFields((p) => ({ ...p, estado_pago: e.value }))}
                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition"
                                style={editFields.estado_pago === e.value
                                  ? { background: e.color, color: "#0a0a0a", borderColor: e.color }
                                  : { background: "transparent", color: e.color, borderColor: e.color + "50" }}>
                                {e.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleSaveEdit}
                              className="flex-1 py-2 rounded-lg text-xs font-bold text-gray-950 transition"
                              style={{ background: "#00C896" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#00b085")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "#00C896")}>
                              Guardar
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="flex-1 py-2 rounded-lg text-xs font-medium text-gray-400 bg-gray-700 hover:bg-gray-600 transition">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const estado = g.estado_pago || "pendiente";
                    const estadoInfo = ESTADOS.find((e) => e.value === estado) || ESTADOS[0];

                    return (
                      <div key={g.id} className="px-5 py-3 hover:bg-gray-800 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: estadoInfo.color }} />
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate">{g.empresa}</p>
                              {g.descripcion && (
                                <p className="text-gray-600 text-xs truncate">— {g.descripcion}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={badgeStyle(estado)}>
                              {estadoInfo.label}
                            </span>
                            <span className="font-bold text-sm" style={{ color: "#FF6B35" }}>{formatCLP(g.monto)}</span>
                            <button onClick={() => openEdit(g)}
                              className="text-gray-600 hover:text-blue-400 transition p-1 rounded" title="Editar">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(g.id)}
                              className="text-gray-600 hover:text-red-400 transition p-1 rounded" title="Eliminar">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CIGARROS ─────────────────────────────────────────────────────────────────
function CigarrosSection({ compras, ventas, selectedMonth, selectedYear, onMonthChange, onYearChange, onSaveCompra, onSaveVenta }) {
  const [fechaVenta, setFechaVenta] = useState(todayStr());
  const [montoVenta, setMontoVenta] = useState("");
  const [errVenta, setErrVenta] = useState("");
  const [successVenta, setSuccessVenta] = useState(false);

  const [fechaCompra, setFechaCompra] = useState(todayStr());
  const [descCompra, setDescCompra]   = useState("");
  const [montoCompra, setMontoCompra] = useState("");
  const [errCompra, setErrCompra]     = useState("");
  const [successCompra, setSuccessCompra] = useState(false);

  const filtrarMes = (arr) =>
    arr.filter((x) => {
      const [y, m] = x.fecha.split("-");
      return parseInt(y) === selectedYear && parseInt(m) === selectedMonth;
    });

  const ventasMes  = useMemo(() => filtrarMes(ventas),  [ventas,  selectedMonth, selectedYear]);
  const comprasMes = useMemo(() => filtrarMes(compras), [compras, selectedMonth, selectedYear]);

  const totalVendido  = ventasMes.reduce((s, v) => s + v.monto, 0);
  const totalInvertido = comprasMes.reduce((s, c) => s + c.monto, 0);
  const ganancia = totalVendido - totalInvertido;

  // Agrupa todos los registros del mes por día (ventas + compras mezcladas)
  const porDia = useMemo(() => {
    const map = {};
    ventasMes.forEach((v)  => { if (!map[v.fecha]) map[v.fecha] = []; map[v.fecha].push({ ...v, tipo: "venta"  }); });
    comprasMes.forEach((c) => { if (!map[c.fecha]) map[c.fecha] = []; map[c.fecha].push({ ...c, tipo: "compra" }); });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([fecha, items]) => ({
        fecha,
        items: items.sort((a, b) => a.tipo.localeCompare(b.tipo)),
        totalVenta:  items.filter((i) => i.tipo === "venta").reduce((s, i) => s + i.monto, 0),
        totalCompra: items.filter((i) => i.tipo === "compra").reduce((s, i) => s + i.monto, 0),
      }));
  }, [ventasMes, comprasMes]);

  const years = [];
  const cy = new Date().getFullYear();
  for (let y = cy; y >= cy - 2; y--) years.push(y);

  const handleVenta = async (e) => {
    e.preventDefault();
    const val = Number(montoVenta);
    if (!montoVenta || isNaN(val) || val <= 0) { setErrVenta("Ingresa un monto válido."); return; }
    await api.postCigarroVenta({ id: Date.now().toString(), fecha: fechaVenta, monto: Math.round(val) });
    await onSaveVenta();
    setMontoVenta(""); setErrVenta(""); setSuccessVenta(true);
    setTimeout(() => setSuccessVenta(false), 3000);
  };

  const handleCompra = async (e) => {
    e.preventDefault();
    const val = Number(montoCompra);
    if (!montoCompra || isNaN(val) || val <= 0) { setErrCompra("Ingresa un monto válido."); return; }
    await api.postCigarroCompra({ id: Date.now().toString(), fecha: fechaCompra, descripcion: descCompra.trim() || null, monto: Math.round(val) });
    await onSaveCompra();
    setMontoCompra(""); setDescCompra(""); setErrCompra(""); setSuccessCompra(true);
    setTimeout(() => setSuccessCompra(false), 3000);
  };

  const inputCls = "w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 border border-gray-700 focus:outline-none text-sm";

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Selector mes/año */}
      <div className="flex gap-2">
        <select value={selectedMonth} onChange={(e) => onMonthChange(Number(e.target.value))}
          className="bg-gray-900 text-white rounded-xl px-4 py-2.5 border border-gray-700 focus:outline-none text-sm flex-1">
          {MESES_NOMBRES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={selectedYear} onChange={(e) => onYearChange(Number(e.target.value))}
          className="bg-gray-900 text-white rounded-xl px-4 py-2.5 border border-gray-700 focus:outline-none text-sm">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Vendido</p>
          <p className="text-xl font-bold" style={{ color: "#00C896" }}>{formatCLP(totalVendido)}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Invertido</p>
          <p className="text-xl font-bold" style={{ color: "#FF6B35" }}>{formatCLP(totalInvertido)}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Ganancia</p>
          <p className="text-xl font-bold" style={{ color: ganancia >= 0 ? "#00C896" : "#ef4444" }}>
            {ganancia >= 0 ? "" : "-"}{formatCLP(Math.abs(ganancia))}
          </p>
        </div>
      </div>

      {/* Formularios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Venta del día */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "#00C896" }} />
            Venta del día
          </h3>
          <form onSubmit={handleVenta} className="space-y-3">
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1">Fecha</label>
              <input type="date" value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1">Total vendido (CLP)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                <input type="number" value={montoVenta} min="1" step="1"
                  onChange={(e) => { setMontoVenta(e.target.value); setErrVenta(""); }}
                  className="w-full bg-gray-800 text-white rounded-xl pl-7 pr-4 py-2.5 border border-gray-700 focus:outline-none text-right font-semibold text-sm"
                  style={{ borderColor: errVenta ? "#ef4444" : undefined }}
                  placeholder="0" />
              </div>
              {montoVenta > 0 && !errVenta && (
                <p className="text-right text-xs mt-1 font-medium" style={{ color: "#00C896" }}>{formatCLP(montoVenta)}</p>
              )}
              {errVenta && <p className="text-red-400 text-xs mt-1">{errVenta}</p>}
            </div>
            {successVenta && (
              <p className="text-xs font-medium" style={{ color: "#00C896" }}>✓ Venta registrada</p>
            )}
            <button type="submit"
              className="w-full font-bold py-2.5 rounded-xl text-sm text-gray-950 transition"
              style={{ background: "#00C896" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#00b085")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#00C896")}>
              Registrar Venta
            </button>
          </form>
        </div>

        {/* Compra de cartón */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <ShoppingBag size={16} style={{ color: "#FF6B35" }} />
            Compra de cartón
          </h3>
          <form onSubmit={handleCompra} className="space-y-3">
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1">Fecha</label>
              <input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1">Marca / Descripción (opcional)</label>
              <input type="text" value={descCompra} onChange={(e) => setDescCompra(e.target.value)}
                className={inputCls} placeholder="Ej: Marlboro, L&M..." />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1">Monto pagado (CLP)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                <input type="number" value={montoCompra} min="1" step="1"
                  onChange={(e) => { setMontoCompra(e.target.value); setErrCompra(""); }}
                  className="w-full bg-gray-800 text-white rounded-xl pl-7 pr-4 py-2.5 border border-gray-700 focus:outline-none text-right font-semibold text-sm"
                  style={{ borderColor: errCompra ? "#ef4444" : undefined }}
                  placeholder="0" />
              </div>
              {montoCompra > 0 && !errCompra && (
                <p className="text-right text-xs mt-1 font-medium" style={{ color: "#FF6B35" }}>{formatCLP(montoCompra)}</p>
              )}
              {errCompra && <p className="text-red-400 text-xs mt-1">{errCompra}</p>}
            </div>
            {successCompra && (
              <p className="text-xs font-medium" style={{ color: "#00C896" }}>✓ Compra registrada</p>
            )}
            <button type="submit"
              className="w-full font-bold py-2.5 rounded-xl text-sm text-gray-950 transition"
              style={{ background: "#FF6B35" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e55a25")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#FF6B35")}>
              Registrar Compra
            </button>
          </form>
        </div>
      </div>

      {/* Lista por día */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold text-sm">
            Registros — {MESES_NOMBRES[selectedMonth - 1]} {selectedYear}
          </h3>
        </div>

        {porDia.length === 0 ? (
          <div className="p-10 text-center text-gray-600">
            <ShoppingBag size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sin registros este mes.</p>
          </div>
        ) : (
          <div>
            {porDia.map(({ fecha, items, totalVenta, totalCompra }) => (
              <div key={fecha} className="border-b border-gray-800 last:border-b-0">
                {/* Encabezado del día */}
                <div className="px-5 py-2.5 flex items-center justify-between bg-gray-950">
                  <span className="text-xs font-semibold text-gray-400 capitalize">
                    {parseLocalDate(fecha).toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "short" })}
                  </span>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    {totalVenta > 0  && <span style={{ color: "#00C896" }}>▲ {formatCLP(totalVenta)}</span>}
                    {totalCompra > 0 && <span style={{ color: "#FF6B35" }}>▼ {formatCLP(totalCompra)}</span>}
                  </div>
                </div>
                {/* Ítems del día */}
                <div className="divide-y divide-gray-800">
                  {items.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-800 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: item.tipo === "venta" ? "#00C896" : "#FF6B35" }} />
                        <div>
                          <p className="text-white text-sm font-medium">
                            {item.tipo === "venta" ? "Venta del día" : "Compra de cartón"}
                          </p>
                          {item.descripcion && (
                            <p className="text-gray-500 text-xs">{item.descripcion}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm"
                          style={{ color: item.tipo === "venta" ? "#00C896" : "#FF6B35" }}>
                          {formatCLP(item.monto)}
                        </span>
                        <button
                          onClick={async () => {
                            if (item.tipo === "venta") { await api.deleteCigarroVenta(item.id); await onSaveVenta(); }
                            else { await api.deleteCigarroCompra(item.id); await onSaveCompra(); }
                          }}
                          className="text-gray-600 hover:text-red-400 transition p-1 rounded" title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RAÍZ: SalesDashboard ──────────────────────────────────────────────────────
export default function SalesDashboard() {
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [negocioNombre, setNegocioNombre] = useState("");
  const [ventas, setVentas]           = useState([]);
  const [fiados, setFiados]           = useState([]);
  const [abonos, setAbonos]           = useState([]);
  const [gastos, setGastos]           = useState([]);
  const [cigarrosCompras, setCigarrosCompras] = useState([]);
  const [cigarrosVentas,  setCigarrosVentas]  = useState([]);
  const [activeTab, setActiveTab]     = useState("registrar");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());

  const loadAllData = () => {
    api.getVentas().then(setVentas).catch(() => {});
    api.getFiados().then(setFiados).catch(() => {});
    api.getAbonos().then(setAbonos).catch(() => {});
    api.getGastos().then(setGastos).catch(() => {});
    api.getCigarrosCompras().then(setCigarrosCompras).catch(() => {});
    api.getCigarrosVentas().then(setCigarrosVentas).catch(() => {});
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      api.getMe()
        .then((me) => { setNegocioNombre(me.negocio_nombre); setIsLoggedIn(true); loadAllData(); })
        .catch(() => { localStorage.removeItem(TOKEN_KEY); });
    }
  }, []);

  const handleLogin = (nombre) => { setNegocioNombre(nombre); setIsLoggedIn(true); loadAllData(); };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setIsLoggedIn(false);
    setNegocioNombre("");
    setVentas([]); setFiados([]); setAbonos([]); setGastos([]);
    setCigarrosCompras([]); setCigarrosVentas([]);
  };

  const handleSave = async () => {
    const updated = await api.getVentas();
    setVentas(updated);
  };

  const handleSaveFiado = async () => {
    const updated = await api.getFiados();
    setFiados(updated);
  };

  const handleSaveAbono = async () => {
    const updated = await api.getAbonos();
    setAbonos(updated);
  };

  const handleSaveGasto = async () => {
    const updated = await api.getGastos();
    setGastos(updated);
  };

  const handleSaveCigarroCompra = async () => {
    setCigarrosCompras(await api.getCigarrosCompras());
  };

  const handleSaveCigarroVenta = async () => {
    setCigarrosVentas(await api.getCigarrosVentas());
  };

  const handleDelete = async (id) => {
    await api.deleteVenta(id);
    const updated = await api.getVentas();
    setVentas(updated);
  };

  const handleExport = () => {
    const ventasMes = ventas.filter((v) => {
      const [y, m] = v.fecha.split("-");
      return parseInt(y) === selectedYear && parseInt(m) === selectedMonth;
    });
    if (ventasMes.length === 0) return;

    const header = "Fecha,Turno,Método de Pago,Monto (CLP)\n";
    const rows = ventasMes
      .map((v) => `${v.fecha},${v.turno},${v.metodoPago},${v.monto}`)
      .join("\n");
    const blob = new Blob(["﻿" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  const tabs = [
    { id: "registrar", label: "Registrar Venta", short: "Registrar", icon: "➕" },
    { id: "resumen", label: "Resumen del Día", short: "Resumen", icon: "📊" },
    { id: "mensual", label: "Control Mensual", short: "Mensual", icon: "📅" },
    { id: "analisis", label: "Análisis", short: "Análisis", icon: "🏆" },
    { id: "fiados", label: "Fiados Express", short: "Fiados", icon: "🤝" },
    { id: "gastos", label: "Gastos", short: "Gastos", icon: "🧾" },
    { id: "cigarros", label: "Cigarros", short: "Cigarros", icon: "🚬" },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div
                className="p-1.5 rounded-lg"
                style={{ background: "rgba(0,200,150,0.15)" }}
              >
                <BarChart2 size={20} style={{ color: "#00C896" }} />
              </div>
              <div>
                <h1 className="text-white font-bold leading-none text-base">
                  {negocioNombre || "Control de Ventas"}
                </h1>
                <p className="text-gray-600 text-xs">Dashboard Comercial</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 transition text-sm px-3 py-2 rounded-xl hover:bg-gray-800"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto gap-0.5 -mb-px">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition"
                style={
                  activeTab === t.id
                    ? { borderColor: "#00C896", color: "#00C896" }
                    : {
                        borderColor: "transparent",
                        color: "#6b7280",
                      }
                }
                onMouseEnter={(e) => {
                  if (activeTab !== t.id) e.currentTarget.style.color = "#d1d5db";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== t.id) e.currentTarget.style.color = "#6b7280";
                }}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-12">
        {activeTab === "registrar" && <SaleForm onSave={handleSave} />}
        {activeTab === "resumen" && (
          <DaySummary
            ventas={ventas}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onDelete={handleDelete}
          />
        )}
        {activeTab === "mensual" && (
          <MonthlyControl
            ventas={ventas}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onExport={handleExport}
          />
        )}
        {activeTab === "analisis" && (
          <SalesAnalysis
            ventas={ventas}
            gastos={gastos}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}
        {activeTab === "fiados" && (
          <FiadosExpress
            fiados={fiados}
            abonos={abonos}
            onSaveFiado={handleSaveFiado}
            onSaveAbono={handleSaveAbono}
          />
        )}
        {activeTab === "gastos" && (
          <GastosSection
            gastos={gastos}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onSaveGasto={handleSaveGasto}
          />
        )}
        {activeTab === "cigarros" && (
          <CigarrosSection
            compras={cigarrosCompras}
            ventas={cigarrosVentas}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onSaveCompra={handleSaveCigarroCompra}
            onSaveVenta={handleSaveCigarroVenta}
          />
        )}
      </main>
    </div>
  );
}
