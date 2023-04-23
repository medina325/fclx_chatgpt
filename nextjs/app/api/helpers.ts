import { JWT, getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// type Config = {params: {[key: string]: string}}
type Config = {params: any}

// Sim, o tipo que estamos criando é de uma função (sua assinatura)
type RouteHandler = (req: NextRequest, token: JWT, config: Config) => Promise<NextResponse | Response> | NextResponse | Response;

export function withAuth(routeHandler: RouteHandler) {
    return async (req: NextRequest, config: Config) => {
        const token = await getToken({req});
        
        if (!token) {
            return NextResponse.json({error: "Unauthenticated"}, {
                status: 401
            });
        }

        return routeHandler(req, token, config)
    }
}



