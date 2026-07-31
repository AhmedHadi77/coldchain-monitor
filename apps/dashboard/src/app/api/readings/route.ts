import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const MIN_SAFE_TEMPERATURE = 2;
const MAX_SAFE_TEMPERATURE = 8;

const sensorReadingSchema = z.object({
  sensorId: z
    .string()
    .trim()
    .min(1, "sensorId is required")
    .max(100, "sensorId must not exceed 100 characters"),
  warehouseId: z
    .string()
    .trim()
    .min(1, "warehouseId is required")
    .max(100, "warehouseId must not exceed 100 characters"),
  temperatureC: z
    .number()
    .finite("temperatureC must be a valid number")
    .min(-50, "temperatureC cannot be below -50°C")
    .max(50, "temperatureC cannot exceed 50°C"),
  humidityPercent: z
    .number()
    .finite("humidityPercent must be a valid number")
    .min(0, "humidityPercent cannot be below 0%")
    .max(100, "humidityPercent cannot exceed 100%"),
  recordedAt: z
    .string()
    .datetime({ offset: true, message: "recordedAt must be an ISO-8601 date" })
    .transform((value) => new Date(value)),
});

type TemperatureAlertPayload = {
  sensorId: string;
  warehouseId: string;
  temperatureC: number;
  humidityPercent: number;
  recordedAt: Date;
};

function isTemperatureAlert(temperatureC: number): boolean {
  return (
    temperatureC < MIN_SAFE_TEMPERATURE || temperatureC > MAX_SAFE_TEMPERATURE
  );
}

async function triggerTemperatureAlert(
  reading: TemperatureAlertPayload,
): Promise<boolean> {
  const webhookUrl = process.env.N8N_ALERT_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn(
      "Temperature alert was not sent because N8N_ALERT_WEBHOOK_URL is missing.",
    );
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reading),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        `n8n alert webhook returned ${response.status}: ${await response.text()}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unable to trigger n8n temperature alert:", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const requestedLimit = Number(
    request.nextUrl.searchParams.get("limit") ?? "50",
  );

  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 50;

  const readings = await prisma.sensorReading.findMany({
    orderBy: {
      recordedAt: "desc",
    },
    take: limit,
  });

  return NextResponse.json({
    data: readings,
    count: readings.length,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON request body",
      },
      {
        status: 400,
      },
    );
  }

  const validationResult = sensorReadingSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: "Invalid sensor reading",
        details: validationResult.error.flatten(),
      },
      {
        status: 400,
      },
    );
  }

  try {
    const reading = await prisma.sensorReading.create({
      data: validationResult.data,
    });

    const alertRequired = isTemperatureAlert(reading.temperatureC);

    const alertWorkflowTriggered = alertRequired
      ? await triggerTemperatureAlert(reading)
      : false;

    return NextResponse.json(
      {
        data: reading,
        alert: {
          required: alertRequired,
          workflowTriggered: alertWorkflowTriggered,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Failed to save sensor reading:", error);

    return NextResponse.json(
      {
        error: "Unable to save sensor reading",
      },
      {
        status: 500,
      },
    );
  }
}
