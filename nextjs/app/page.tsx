'use client'; // Precisa especificar que este arquivo é um Client Component (CC)
              // pois a lib swr usa o react hook useRef, que só funciona em CC

import ClientHttp, { fetcher } from "@/http/http";
import { Chat, Message } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import useSWR from "swr";
import useSWRSubscription from "swr/subscription";

// Criando um tipo que consiste em ser um Chat e um JSON que tem uma
// chave messages, cujo valor é uma lista de objetos Message do prisma
type ChatWithFirstMessage = Chat & {
    messages: [Message]
}

export default function Home() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const chatIdParam = searchParams.get('id');

    const [chatId, setChatId] = useState<string | null>(chatIdParam); 
    const [messageId, setMessageId] = useState<string | null>(null); 

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

    // Websocket para manter conexão com Server Sent Events, independente 
    // de renderização do componente
    const {data: messageLoading, error: errorMessageLoading } = 
        useSWRSubscription(
            messageId ? `/api/messages/${messageId}/events` : null,
            (path: string, { next }) => {
                console.log('init event source');
                const eventSource = new EventSource(path); // EventSource é nativo do browser
                eventSource.onmessage = (event) => {
                    console.log('data: ', event);
                    const newMessage = JSON.parse(event.data);
                    next(null, newMessage.content);
                }
                eventSource.onerror = (event) => {
                    console.log('errors: ', event);
                    // @ts-ignore
                    next(event.data, null);
                }
                // O evento end é um evento customizado, portanto
                // não há um método específico para ele
                eventSource.addEventListener('end', (event) => {
                    console.log('end: ', event);
                    eventSource.close();
                    const newMessage = JSON.parse(event.data);
                    mutateMessages((messages) => [...messages!, newMessage], false);
                    next(null, null);
                    // Como estou dentro de uma função, pode ser que o messages
                    // não seja o mais atualizado. Portanto, usando uma função,
                    // eu garanto que é o mais recente.
                    // mutateMessages([...messages!, newMessage], false);
                });

                // Sim, no final retornamos uma função que fecha o eventSource
                //  tem algo a ver com garantir que a conexão seja destruída pelo frontend
                // para evitar memory leak (mantendo a conexão aberta e consumindo recursos)
                return () => {
                    console.log('close event source');
                    eventSource.close();
                } 
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
            setMessageId(newChat.messages[0].id);
        } else {
            const newMessage: Message = await ClientHttp.post(
                `chats/${chatId}/messages`,
                { message }
            );
            mutateMessages([...messages!, newMessage], false); // Atualizando lista de mensages e renderizando componente
            setMessageId(newMessage.id);
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
                    Centro
                    {messages!.map((message, key) => (
                        <li key={key}>{message.content}</li>
                    ))}
                    {messageLoading && <li>{messageLoading}</li>}
                    {errorMessageLoading && <li>{errorMessageLoading}</li>}
                </ul>
                <form id="form" onSubmit={ onSubmit }>
                    <textarea id="message" placeholder="Digite sua pergunta" className="text-black"></textarea>
                    <button type="submit">Enviar</button>
                </form>
            </div>
        </div>
    )
}