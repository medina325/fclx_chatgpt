// A ideia desse arquivo é a seguinte, devido ao hot reload do next
// se deixássemos o código de criar a conexão lá onde ela é usada,
// toda vez que salvássemos o arquivo, essa conexão seria aberta
// de novo, sem fechar a última, causando um memory leak.
// Portanto, esse arquivo é criada uma variável globalForPrisma chamada prisma,
// do tipo PrismaClient, que é instanciada, caso globalForPrisma.prisma não exista ainda;
// caso já exista, então a existente é usada.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as { prisma?: PrismaClient};

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") globalForPrisma.prisma = prisma;