import NextAuth from "next-auth";
import KeycloakProfile from "next-auth/providers/keycloak";

export const authConfig = {
    providers: [
        KeycloakProfile({
            clientId: process.env.KEYCLOAK_CLIENT_ID as string,
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET as string,
            issuer: process.env.KEYCLOAK_ISSUER as string, // validador da autenticação
        })
    ]
}

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };