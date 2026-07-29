import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MIN_SAFE_TEMPERATURE = 2;
const MAX_SAFE_TEMPERATURE = 8;

function isTemperatureAlert(temperatureC: number): boolean {
  return (
    temperatureC < MIN_SAFE_TEMPERATURE || temperatureC > MAX_SAFE_TEMPERATURE
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

export default async function Home() {
  const readings = await prisma.sensorReading.findMany({
    orderBy: {
      recordedAt: "desc",
    },
    take: 100,
  });

  const latestReadingBySensor = new Map<string, (typeof readings)[number]>();

  for (const reading of readings) {
    if (!latestReadingBySensor.has(reading.sensorId)) {
      latestReadingBySensor.set(reading.sensorId, reading);
    }
  }

  const sensors = Array.from(latestReadingBySensor.values());
  const alertCount = sensors.filter((sensor) =>
    isTemperatureAlert(sensor.temperatureC),
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col gap-4 border-b border-slate-800 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold tracking-[0.2em] text-cyan-400 uppercase">
              ColdChain Monitor
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Warehouse Operations Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              Live sensor telemetry for refrigerated warehouse environments.
              Safe operating temperature: {MIN_SAFE_TEMPERATURE}°C–
              {MAX_SAFE_TEMPERATURE}°C.
            </p>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
            ● System online
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/30">
            <p className="text-sm font-medium text-slate-400">Active sensors</p>
            <p className="mt-3 text-4xl font-bold text-white">
              {sensors.length}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Sensors with recent telemetry
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/30">
            <p className="text-sm font-medium text-slate-400">
              Temperature alerts
            </p>
            <p
              className={`mt-3 text-4xl font-bold ${
                alertCount > 0 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {alertCount}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Latest readings outside the safe range
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/30">
            <p className="text-sm font-medium text-slate-400">
              Total readings loaded
            </p>
            <p className="mt-3 text-4xl font-bold text-cyan-400">
              {readings.length}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Most recent telemetry records
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg shadow-slate-950/30">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold text-white">
              Latest sensor status
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              One most-recent reading per sensor.
            </p>
          </div>

          {sensors.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-lg font-medium text-slate-300">
                No sensor readings yet
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Start the MQTT ingestion worker and Python sensor simulator,
                then refresh this page.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-800/70 text-xs tracking-wider text-slate-400 uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Warehouse</th>
                    <th className="px-6 py-4 font-semibold">Sensor</th>
                    <th className="px-6 py-4 font-semibold">Temperature</th>
                    <th className="px-6 py-4 font-semibold">Humidity</th>
                    <th className="px-6 py-4 font-semibold">Recorded at</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {sensors.map((sensor) => {
                    const isAlert = isTemperatureAlert(sensor.temperatureC);

                    return (
                      <tr
                        className="transition-colors hover:bg-slate-800/50"
                        key={sensor.id}
                      >
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              isAlert
                                ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
                                : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                            }`}
                          >
                            {isAlert ? "Alert" : "Normal"}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-medium text-slate-200">
                          {sensor.warehouseId}
                        </td>
                        <td className="px-6 py-5 text-slate-300">
                          {sensor.sensorId}
                        </td>
                        <td
                          className={`px-6 py-5 text-lg font-bold ${
                            isAlert ? "text-red-400" : "text-cyan-300"
                          }`}
                        >
                          {sensor.temperatureC.toFixed(1)}°C
                        </td>
                        <td className="px-6 py-5 text-slate-300">
                          {sensor.humidityPercent.toFixed(1)}%
                        </td>
                        <td className="px-6 py-5 text-slate-400">
                          {formatDate(sensor.recordedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
