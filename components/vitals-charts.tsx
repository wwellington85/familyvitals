"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

type Point = {
  date: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  weight?: number;
  glucose?: number;
};

export function VitalsCharts({ data }: { data: Point[] }) {
  return (
    <div className="space-y-4">
      <div className="h-80 rounded-lg border border-border bg-card p-3">
        <h3 className="mb-2 text-sm font-semibold">Blood Pressure + Heart Rate</h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="systolic" stroke="#0b5" strokeWidth={2} />
            <Line type="monotone" dataKey="diastolic" stroke="#198" strokeWidth={2} />
            <Line type="monotone" dataKey="heartRate" stroke="#f66" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-80 rounded-lg border border-border bg-card p-3">
        <h3 className="mb-2 text-sm font-semibold">Weight + Glucose</h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="weight" stroke="#a76" strokeWidth={2} />
            <Line type="monotone" dataKey="glucose" stroke="#d84" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
