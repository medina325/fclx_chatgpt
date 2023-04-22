'use client'; // Precisa especificar que este arquivo é um Client Component (CC)
              // pois a lib swr usa o react hook useRef, que só funciona em CC

import ClientHttp, { fetcher } from "@/http/http";
import { Chat, Message } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import useSWR from "swr";

// Criando um tipo que consiste em ser um Chat e um JSON que tem uma
// chave messages, cujo valor é uma lista de objetos Message do prisma
type ChatWithFirstMessage = Chat & {
    messages: [Message]
}

export default function Home() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const chatIdParam = searchParams.get('id');

    const [chatId, setChatId] = useState(chatIdParam); 

    // data: chats -> é para eu poder dar um alias "chats" para a chave que estou
    // deconstruindo do json retornado
    const { data: chats, mutate: mutateChats } = useSWR<ChatWithFirstMessage[]>('chats', fetcher, {
        // TODO Estudar swr com calma, muito poderoso
        fallbackData: [],
        revalidateOnFocus: false,
    });
    
    const { data: messages, mutate: mutateMessages } = useSWR<Message[]>(
        chatId ? `chats/${chatId}/messages` : null, // Se o swr recebe null, ele não faz requisição alguma
        fetcher,
        {
            // TODO Estudar swr com calma, muito poderoso
            fallbackData: [],
            revalidateOnFocus: false,
        }
    );

    // TODO - Não entendi bem como que isso aqui fica vigiando o estado
    useEffect(() => {
        setChatId(chatIdParam);
    }, [chatIdParam]);

    useEffect(() => {
        const textArea = document.querySelector("#message") as HTMLTextAreaElement;
        textArea.addEventListener("keydown", (event) => {
            // Quando estou pressionando apenas enter, cancelo evento
            // de criar uma nova linha na textarea. Esse comportamento, só irá
            // funcionar se o shift estiver sendo pressionado também.
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
            }
        });
        textArea.addEventListener("keyup", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                const form = document.querySelector("#form") as HTMLFormElement;
                const submitBtn = form.querySelector("button") as HTMLButtonElement;
                form.requestSubmit(submitBtn); // Muito estranho, não seria melhor apenas clicar no botão?
                return;
            }
        });
    }, []);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // Sério, JS vanilao mesmo? kkk
        const textArea = event.currentTarget.querySelector('textarea') as HTMLTextAreaElement;
        const message = textArea.value;

        if (!chatId) {
            const newChat: ChatWithFirstMessage = await ClientHttp.post('chats', { message });
            mutateChats([newChat, ...chats!], false); // Atualizando lista de chats e renderizando componente
            setChatId(newChat.id);
        } else {
            const newMessage: Message = await ClientHttp.post(
                `chats/${chatId}/messages`,
                { message }
            );
            mutateMessages([...messages!, newMessage], false); // Atualizando lista de mensages e renderizando componente
        }
        textArea.value = '';
    }

    return (
        <div className="flex gap-5">
            <div className="flex flex-col">
                <button type="button" onClick={() => router.push("/")}>New chat</button>
                <ul>
                    {chats!.map((chat, key) => (
                        <li key={key} onClick={() => router.push(`/?id=${chat.id}`)}>
                            {chat.messages[0]?.content}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <ul>
                    {messages!.map((message, key) => (
                        <li key={key}>{message.content}</li>
                    ))}
                </ul>
                <form id="form" onSubmit={ onSubmit }>
                    <textarea id="message" placeholder="Digite sua pergunta" className="text-black"></textarea>
                    <button type="submit">Enviar</button>
                </form>
            </div>
        </div>
    )
}