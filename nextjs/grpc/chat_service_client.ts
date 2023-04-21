import { Metadata } from "@grpc/grpc-js";
import { chatClient } from "./client";
import { ChatServiceClient as GrpcChatServiceClient } from "./rpc/pb/ChatService";

export class ChatServiceClient {
    private authorization = "123456";

    constructor(private chatClient: GrpcChatServiceClient) {}

    chatStream(data: {chat_id?: string | null, user_id: string, message: string}) {
        const metadata = new Metadata();
        metadata.set("authorization", this.authorization);

        // Aqui estou criando um objeto do tipo ChatRequest__Output que está em grpc/rpc/pb/ChatRequest.ts
        // Esse cara foi criado a partir da compilação do arquivo chat.proto para TS
        const stream = this.chatClient.chatStream({
            chatId: data.chat_id!, // TODO - assertion null????
            userId: data.user_id,
            userMessage: data.message
        }, metadata);
        stream.on("data", (data) => {
            console.log(data);
            
        })
        stream.on("error", (err) => {
            console.log(err);
            
        })
        stream.on("end", () => {
            console.log("end");
            
        })
        return stream;
    }
}

// Vamos criar uma factory para não precisar ficar dando "new" em
// tudo que é lugar, para instanciar nossa classe ChatServiceClient acima
export class ChatServiceClientFactory {
    static create () {
        return new ChatServiceClient(chatClient);
    }
}