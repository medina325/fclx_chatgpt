import * as protoLoader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';
import path from 'path';
import { ProtoGrpcType } from './rpc/chat';

const packageDefinition = protoLoader.loadSync(
    path.resolve(process.cwd(), 'proto', 'chat.proto')
);

// Dá erro dizendo que não é possível converter tipo 'GrpcObject' para 'ProtoGrpcType'
// const proto = grpc.loadPackageDefinition(packageDefinition) as ProtoGrpcType;
// Truque ;)
const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

// Comunicação da nossa REST API com o gRPC server
// 1ª solução:

// Obs.: no Windows, pelo jeito, é preciso adicionar no arquivo
// C:\Windows\System32\drivers\etc\hosts, a seguinte entrada
// 127.0.0.1 host.docker.internal
// A lógica é:
// . a requisição sai do container pelo docker gateway, que geralmente fica em 172.17.0.1
// . então ela vai para o host, que acha host.docker.internal mapeada para 127.0.0.1, ou localhost
// . conseguindo assim, finalmente, acessar a porta onde o outro container está expondo o gRPC server

// 2ª solução:
// Criar uma rede no docker, apenas para que todos os containers se conectem a ela.

export const chatClient = new proto.pb.ChatService(
    "host.docker.internal:50052",
    grpc.credentials.createInsecure()
);
