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
} from "lucide-react";

// ─── Constantes ────────────────────────────────────────────────────────────────
const SESSION_KEY = "ventas_session";
const DATA_KEY = "ventas_data";
const FIADOS_KEY = "ventas_fiados";

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

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user === "admin" && pass === "ventas2025") {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ loggedIn: true, date: todayStr() })
      );
      onLogin();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: "rgba(0,200,150,0.15)" }}
          >
            <BarChart2 size={40} style={{ color: "#00C896" }} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Control de Ventas
          </h1>
          <p className="text-gray-500 text-sm mt-1">Dashboard Comercial Chile</p>
        </div>

        {/* Card */}
        <div
          className={`bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-800 ${shake ? "animate-pulse" : ""}`}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={user}
                autoComplete="username"
                autoFocus
                onChange={(e) => {
                  setUser(e.target.value);
                  setError(false);
                }}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none transition"
                style={{ borderColor: error ? "#ef4444" : undefined }}
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={pass}
                autoComplete="current-password"
                onChange={(e) => {
                  setPass(e.target.value);
                  setError(false);
                }}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none transition"
                style={{ borderColor: error ? "#ef4444" : undefined }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-950 border border-red-800 rounded-xl p-3">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">
                  Credenciales incorrectas. Intenta de nuevo.
                </span>
              </div>
            )}

            <button
              type="submit"
              className="w-full font-bold py-3 rounded-xl transition text-gray-950 text-base"
              style={{ background: "#00C896" }}
              onMouseEnter={(e) => (e.target.style.background = "#00b085")}
              onMouseLeave={(e) => (e.target.style.background = "#00C896")}
            >
              Ingresar al Dashboard
            </button>
          </form>

          <p className="text-center text-gray-600 text-xs mt-6">
            Datos almacenados localmente en este dispositivo
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

  const handleSubmit = (e) => {
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
    const existing = JSON.parse(localStorage.getItem(DATA_KEY) || "[]");
    const updated = [...existing, venta];
    localStorage.setItem(DATA_KEY, JSON.stringify(updated));
    onSave(updated);
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
function SalesAnalysis({ ventas, selectedMonth, selectedYear }) {
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
    const top3 = sorted.slice(0, 3);
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

  const medals = ["🥇", "🥈", "🥉"];

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
    </div>
  );
}

// ─── FIADOS EXPRESS ───────────────────────────────────────────────────────────
function FiadosExpress({ fiados, onSave }) {
  const [fecha, setFecha] = useState(todayStr());
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = "Ingresa el nombre del cliente.";
    const val = Number(monto);
    if (!monto || isNaN(val) || val <= 0) e.monto = "Ingresa un monto válido mayor a 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const fiado = {
      id: Date.now().toString(),
      fecha,
      nombre: nombre.trim(),
      monto: Math.round(Number(monto)),
    };
    const updated = [...fiados, fiado];
    localStorage.setItem(FIADOS_KEY, JSON.stringify(updated));
    onSave(updated);
    setNombre("");
    setMonto("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleRemove = (id) => {
    const updated = fiados.filter((f) => f.id !== id);
    localStorage.setItem(FIADOS_KEY, JSON.stringify(updated));
    onSave(updated);
  };

  const totalPendiente = fiados.reduce((acc, f) => acc + f.monto, 0);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Card resumen */}
      {fiados.length > 0 && (
        <div
          className="rounded-2xl p-5 border flex items-center justify-between"
          style={{
            background: "rgba(255,107,53,0.08)",
            borderColor: "rgba(255,107,53,0.25)",
          }}
        >
          <div className="flex items-center gap-3">
            <Users size={22} style={{ color: "#FF6B35" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "#FF6B35" }}>
                Total fiado pendiente
              </p>
              <p className="text-2xl font-bold text-white tracking-tight">
                {formatCLP(totalPendiente)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ color: "#FF6B35" }}>
              {fiados.length}
            </p>
            <p className="text-xs text-gray-500">
              {fiados.length === 1 ? "persona" : "personas"}
            </p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Users size={20} style={{ color: "#FF6B35" }} />
          Registrar Fiado
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

          {/* Nombre */}
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Nombre del cliente
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setErrors((prev) => ({ ...prev, nombre: undefined }));
              }}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none transition"
              style={{ borderColor: errors.nombre ? "#ef4444" : undefined }}
              placeholder="Ej: Juan Pérez"
            />
            {errors.nombre && (
              <p className="text-red-400 text-sm mt-1">{errors.nombre}</p>
            )}
          </div>

          {/* Monto */}
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Monto fiado (CLP)
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
                  setErrors((prev) => ({ ...prev, monto: undefined }));
                }}
                className="w-full bg-gray-800 text-white rounded-xl pl-8 pr-4 py-3 border border-gray-700 focus:outline-none transition text-right text-lg font-semibold"
                style={{ borderColor: errors.monto ? "#ef4444" : undefined }}
                placeholder="0"
              />
            </div>
            {monto > 0 && !errors.monto && (
              <p className="text-right mt-1 text-sm font-medium" style={{ color: "#FF6B35" }}>
                {formatCLP(monto)}
              </p>
            )}
            {errors.monto && (
              <p className="text-red-400 text-sm mt-1">{errors.monto}</p>
            )}
          </div>

          {success && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 border"
              style={{ background: "rgba(0,200,150,0.1)", borderColor: "rgba(0,200,150,0.3)" }}
            >
              <Star size={16} style={{ color: "#00C896" }} />
              <span className="text-sm font-medium" style={{ color: "#00C896" }}>
                ¡Fiado registrado exitosamente!
              </span>
            </div>
          )}

          <button
            type="submit"
            className="w-full font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-gray-950 text-base"
            style={{ background: "#FF6B35" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e55a25")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FF6B35")}
          >
            <Plus size={18} />
            Registrar Fiado
          </button>
        </form>
      </div>

      {/* Lista de fiados */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Fiados pendientes</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
            {fiados.length} {fiados.length === 1 ? "persona" : "personas"}
          </span>
        </div>

        {fiados.length === 0 ? (
          <div className="p-10 text-center text-gray-600">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay fiados registrados.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {fiados.map((f, idx) => (
              <div
                key={f.id}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-800 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs w-5 text-right">{idx + 1}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{f.nombre}</p>
                    <p className="text-gray-600 text-xs">
                      {parseLocalDate(f.fecha).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-sm"
                    style={{ color: "#FF6B35" }}
                  >
                    {formatCLP(f.monto)}
                  </span>
                  <button
                    onClick={() => handleRemove(f.id)}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
                    style={{ background: "rgba(0,200,150,0.12)", color: "#00C896" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,200,150,0.25)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,200,150,0.12)")}
                    title="Marcar como pagado"
                  >
                    <CheckCircle size={13} />
                    Pagar
                  </button>
                  <button
                    onClick={() => handleRemove(f.id)}
                    className="text-gray-600 hover:text-red-400 transition p-1 rounded-lg hover:bg-red-950"
                    title="Eliminar fiado"
                  >
                    <Trash2 size={15} />
                  </button>
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [fiados, setFiados] = useState([]);
  const [activeTab, setActiveTab] = useState("registrar");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (session?.loggedIn && session?.date === todayStr()) {
      setIsLoggedIn(true);
    }
    const data = JSON.parse(localStorage.getItem(DATA_KEY) || "[]");
    setVentas(data);
    const fiadosData = JSON.parse(localStorage.getItem(FIADOS_KEY) || "[]");
    setFiados(fiadosData);
  }, []);

  const handleLogin = () => setIsLoggedIn(true);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsLoggedIn(false);
  };

  const handleSave = (newVentas) => setVentas(newVentas);
  const handleSaveFiado = (newFiados) => setFiados(newFiados);

  const handleDelete = (id) => {
    const updated = ventas.filter((v) => v.id !== id);
    localStorage.setItem(DATA_KEY, JSON.stringify(updated));
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
                  Control de Ventas
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
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}
        {activeTab === "fiados" && (
          <FiadosExpress fiados={fiados} onSave={handleSaveFiado} />
        )}
      </main>
    </div>
  );
}
