import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const { username, password } = await req.json();

    const envUsername = process.env.ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD;

    if (!envUsername || !envPassword) {
        console.error("ADMIN_USERNAME or ADMIN_PASSWORD is not set in .env");
        return NextResponse.json({ success: false }, { status: 500 });
    }

    if (username === envUsername && password === envPassword) {
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false }, { status: 401 });
}
