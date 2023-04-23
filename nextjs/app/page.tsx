'use client'; // Precisa especificar que este arquivo é um Client Component (CC)
              // pois a lib swr usa o react hook useRef, que só funciona em CC

import ClientHttp, { fetcher } from "@/http/http";
import { Chat, Message } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useLayoutEffect, useState } from "react";
import useSWR from "swr";
import useSWRSubscription from "swr/subscription";
import { PlusIcon } from "./components/PlusIcon";
import { MessageIcon } from "./components/MessageIcon";
import { ArrowRightIcon } from "./components/ArrowRightIcon";
import Image from "next/image";
import { UserIcon } from "./components/UserIcon";
import { marked } from "marked";
import hljs from "highlight.js";

marked.setOptions({
    highlight: function (code: string, lang: string) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
});

// Criando um tipo que consiste em ser um Chat e um JSON que tem uma
// chave messages, cujo valor é uma lista de objetos Message do prisma
type ChatWithFirstMessage = Chat & {
    messages: [Message]
}
  
function ChatItemError({ children }: { children: any }) {
    return (
        <li className="w-full text-gray-100 bg-gray-800">
        <div className="md:max-w-2xl lg:max-w-xl xl:max-w-3xl py-6 m-auto flex flex-row items-start space-x-4">
            <Image src="/fullcycle_logo.png" width={30} height={30} alt="" />
            <div className="relative w-[calc(100%-115px)] flex flex-col gap-1">
            <span className="text-red-500">Ops! Ocorreu um erro: {children}</span>
            </div>
        </div>
        </li>
    );
}

const Loading = () => (
    <span className="animate-spin bg-white h-6 w-[5px] rounded"></span>
);

function ChatItem({
    content,
    is_from_bot,
    loading = false,
  }: {
    content: string;
    is_from_bot: boolean;
    loading?: boolean;
  }) {
    const background = is_from_bot ? "bg-gray-800" : "bg-gray-600";
  
    return (
      <li className={`w-full text-gray-100 ${background}`}>
        <div className="flex-col">
          <div className="md:max-w-2xl lg:max-w-xl xl:max-w-3xl py-6 m-auto flex flex-row items-start space-x-4">
            {is_from_bot ? (
              <Image src="/fullcycle_logo.png" width={30} height={30} alt="" />
            ) : (
              <UserIcon className="w-[30px] flex flex-col relative start" />
            )}
  
            <div
              className="relative w-[calc(100%-115px)] flex flex-col gap-1 transition duration-100 ease-linear break-words"
              dangerouslySetInnerHTML={{
                __html: marked(content, { breaks: true }), //sanitize: true
              }}
            />
          </div>
          {loading && (
            <div className="flex items-center justify-center pb-2">
              <Loading />
            </div>
          )}
        </div>
      </li>
    );
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

            if (textArea.scrollHeight >= 200) {
                textArea.style.overflowY = "scroll";
            } else {
                textArea.style.overflowY = "hidden";
                textArea.style.height = "auto";
                textArea.style.height = textArea.scrollHeight + "px";
            }
        });
    }, []);

    useLayoutEffect(() => {
        if (!messageLoading) {
          return;
        }
        const chatting = document.querySelector("#chatting") as HTMLUListElement;
        chatting.scrollTop = chatting.scrollHeight;
    }, [messageLoading]);

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
        <div className="overflow-hidden w-full h-full flex">
            <div className="bg-gray-900 w-[300px] h-screen p-2 flex flex-col">
                <button 
                    type="button" 
                    onClick={() => {router.push("/"); setChatId(null); setMessageId(null);}} 
                    className="flex p-3 gap-3 rounded hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm mb-1 border border-white/20"
                >
                    <PlusIcon className="w-5 h-5"/>
                    New chat
                </button>
                <ul className="overflox-y-auto">
                    {chats!.map((chat, key) => (
                        <li
                            key={key}
                            className="pb-2 text-gray-100 text-sm mr-2"
                        >
                            <button
                                onClick={() => router.push(`/?id=${chat.id}`)}
                                className="flex p-3 gap-3 w-full hover:bg-[#3f4679] rounded group"
                            >
                                <MessageIcon className="w-5 h-5"/>
                                <div className="overflow-hidden w-full text-left max-h-5 relative">
                                    {chat.messages[0]?.content}
                                    <div className="absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-gray-900 group-hover:from-[#3f4679]"></div>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex-1 flex-col relative">
                <ul className="h-screen overflow-y-auto bg-gray-800">
                    {messages?.map((message, key) => (
                        <ChatItem
                            key={key}
                            content={message.content}
                            is_from_bot={message.is_from_bot}
                        />
                    ))}
                    {messageLoading && (
                        <ChatItem
                            content={messageLoading}
                            is_from_bot={true}
                            loading={true}
                        />
                    )}
                    {errorMessageLoading && (
                        <ChatItemError>{errorMessageLoading}</ChatItemError>
                    )}
                    <li className="h-36 bg-gray-800"></li>
                </ul>
                <div className="absolute w-full bottom-0 bg-gradient-to-b from-gray-800 to-gray-950">
                    <div className="mb-6 mx-auto max-w-3xl">
                        <form id="form" onSubmit={ onSubmit }>
                            <div className="flex flex-col relative py-3 pl-4 text-white bg-gray-700 rounded">
                                <textarea
                                    id="message"
                                    tabIndex={0}
                                    rows={1}
                                    placeholder="Digite sua pergunta"
                                    className="resize-none pr-14 bg-transparent pl-0 outline-none"
                                ></textarea>
                                <button
                                    type="submit"
                                    className="absolute top-1 text-gray-400 bottom-2.5 rounded hover:text-gray-400 hover:bg-gray-900 md:right-4"
                                    disabled={messageLoading}
                                >
                                    <ArrowRightIcon className="text-white-500 w-8"/>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}