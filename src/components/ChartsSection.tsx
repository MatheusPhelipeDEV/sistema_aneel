import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Interruption } from "../types";

interface ChartsSectionProps {
  data: Interruption[];
  onSeverityClick?: (category: string) => void;
}

const COLORS = ["#4ade80", "#fbbf24", "#f97316", "#ef4444"];

export function ChartsSection({ data, onSeverityClick }: ChartsSectionProps) {
  const causesMap = data.reduce((acc, curr) => {
    const cause = curr.DscFatoGeradorInterrupcao || "Não informado";
    acc[cause] = (acc[cause] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const causesData = Object.entries(causesMap)
    .map(([name, value]) => ({
      name: name.length > 30 ? name.slice(0, 30) + "..." : name,
      full: name,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const timelineMap = data.reduce((acc, curr) => {
    const day = curr.dia.slice(0, 5);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const timelineData = Object.entries(timelineMap).map(([name, value]) => ({
    name,
    value,
  }));

  const durationStats = { short: 0, medium: 0, long: 0, critical: 0 };

  data.forEach((item) => {
    if (!item.DatInicioInterrupcao || !item.DatFimInterrupcao) return;
    const start = new Date(item.DatInicioInterrupcao.replace(" ", "T"));
    const end = new Date(item.DatFimInterrupcao.replace(" ", "T"));
    const diffMinutes = (end.getTime() - start.getTime()) / 1000 / 60;

    if (diffMinutes < 3) durationStats.short++;
    else if (diffMinutes < 60) durationStats.medium++;
    else if (diffMinutes < 240) durationStats.long++;
    else durationStats.critical++;
  });

  const durationData = [
    { name: "< 3 min (Momentânea)", value: durationStats.short, key: "short" },
    { name: "3 min a 1h (Curta)", value: durationStats.medium, key: "medium" },
    { name: "1h a 4h (Média)", value: durationStats.long, key: "long" },
    { name: "> 4h (Crítica)", value: durationStats.critical, key: "critical" },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-6">
          Evolução Diária
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorBlue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-6">
          Principais Causas
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={causesData} margin={{ left: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar
                dataKey="value"
                fill="#6366f1"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-8">
        <div className="w-full sm:w-1/3">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Gravidade das Interrupções
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Clique nas fatias ou legendas para filtrar a tabela.
          </p>
          <ul className="space-y-2 text-sm text-slate-600 cursor-pointer">
            {durationData.map((d, i) => (
              <li
                key={i}
                className="flex justify-between items-center hover:bg-slate-50 p-1 rounded"
                onClick={() => onSeverityClick && onSeverityClick(d.key)}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  ></span>
                  {d.name}
                </span>
                <span className="font-bold">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="h-[250px] w-full sm:w-2/3">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={durationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                cursor="pointer"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(data: any) =>
                  onSeverityClick &&
                  onSeverityClick(data.key || data.payload?.key)
                }
              >
                {durationData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(e: any) =>
                  onSeverityClick &&
                  onSeverityClick(e.payload?.payload?.key || e.payload?.key)
                }
                wrapperStyle={{ cursor: "pointer" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
