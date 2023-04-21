import { ChatServiceClientFactory } from "./chat_service_client";

describe("ChatServiceClient", () => {
    test("grpc client", (done) => {
        const chatService = ChatServiceClientFactory.create();
        const stream = chatService.chatStream({
            user_id: "1",
            message: "Hello World"
        });
        stream.on('end', () => {
            done();
        })
    })
});


// node 'node_modules/jest/bin/jest.js' 'grpc/chat_service_client.spec.ts' -c 'jest.config.ts' -t 'ChatServiceClient should connect to the server'