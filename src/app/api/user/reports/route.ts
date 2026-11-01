import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Security Remediation (Task 4):
  // Completely disabled unauthenticated email-based order enumeration.
  // Email address alone must never authorize access or disclose raw report access tokens.
  return NextResponse.json(
    {
      error:
        "Unauthenticated email lookup has been disabled to protect customer confidentiality. Please access your dossier using the direct link provided upon checkout or enter your Order ID and Access Token in the dashboard.",
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    }
  );
}
