import { produce } from 'immer';
import { create } from 'zustand';
import {
  ShownMessage,
  RecordedMessage,
  UnrecordedMessage,
  ToBeRecordedMessage,
  Chat,
  ListChatsResponse,
  Role,
} from 'generative-ai-use-cases-jp';
import { useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import useChatApi from './useChatApi';
import useConversation from './useConversation';
import { KeyedMutator } from 'swr';

const useChatState = create<{
  chats: {
    [id: string]: {
      chat?: Chat;
      messages: ShownMessage[];
    };
  };
  loading: {
    [id: string]: boolean;
  };
  setLoading: (id: string, newLoading: boolean) => void;
  init: (id: string, systemContext: string) => void;
  initFromMessages: (
    id: string,
    messages: RecordedMessage[],
    chat: Chat
  ) => void;
  updateSystemContext: (id: string, systemContext: string) => void;
  pushMessage: (id: string, role: Role, content: string) => void;
  popMessage: (id: string) => ShownMessage | undefined;
  clear: (id: string, systemContext: string) => void;
  post: (
    id: string,
    content: string,
    mutateListChat: KeyedMutator<ListChatsResponse>
  ) => void;
  sendFeedback: (
    id: string,
    createdDate: string,
    feedback: string
  ) => Promise<void>;
}>((set, get) => {
  const {
    createChat,
    createMessages,
    updateFeedback,
    predictStream,
    predictTitle,
  } = useChatApi();

  const setLoading = (id: string, newLoading: boolean) => {
    set((state) => {
      return {
        loading: {
          ...state.loading,
          [id]: newLoading,
        },
      };
    });
  };

  const initChat = (id: string, messages: UnrecordedMessage[], chat?: Chat) => {
    set((state) => {
      return {
        chats: produce(state.chats, (draft) => {
          draft[id] = {
            chat,
            messages,
          };
        }),
      };
    });
  };

  const setTitle = (id: string, title: string) => {
    set((state) => {
      return {
        chats: produce(state.chats, (draft) => {
          draft[id].chat!.title = title;
        }),
      };
    });
  };

  const setPredictedTitle = async (id: string) => {
    const title = await predictTitle({
      chat: get().chats[id].chat!,
      messages: omitUnusedMessageProperties(get().chats[id].messages),
    });
    setTitle(id, title);
  };

  const createChatIfNotExist = async (
    id: string,
    chat?: Chat
  ): Promise<string> => {
    if (chat) {
      return chat.chatId;
    }

    const { chat: newChat } = await createChat();

    set((state) => {
      const newChats = produce(state.chats, (draft) => {
        draft[id].chat = newChat;
      });

      return {
        chats: newChats,
      };
    });

    return newChat.chatId;
  };

  const addMessageIdsToUnrecordedMessages = (
    id: string
  ): ToBeRecordedMessage[] => {
    const toBeRecordedMessages: ToBeRecordedMessage[] = [];

    set((state) => {
      const newChats = produce(state.chats, (draft) => {
        for (const m of draft[id].messages) {
          if (!m.messageId) {
            m.messageId = uuid();
            // 参照が切れるとエラーになるため clone する
            toBeRecordedMessages.push(
              Object.assign({}, m as ToBeRecordedMessage)
            );
          }
        }
      });

      return {
        chats: newChats,
      };
    });

    return toBeRecordedMessages;
  };

  const replaceMessages = (id: string, messages: RecordedMessage[]) => {
    set((state) => {
      const newChats = produce(state.chats, (draft) => {
        for (const m of messages) {
          const idx = draft[id].messages
            .map((_m: ShownMessage) => _m.messageId)
            .indexOf(m.messageId);

          if (idx >= 0) {
            draft[id].messages[idx] = m;
          }
        }
      });

      return {
        chats: newChats,
      };
    });
  };

  const omitUnusedMessageProperties = (
    messages: ShownMessage[]
  ): UnrecordedMessage[] => {
    return messages.map((m) => {
      return {
        role: m.role,
        content: m.content,
      };
    });
  };

  return {
    chats: {},
    loading: {},
    setLoading,
    init: (id: string, systemContext: string) => {
      if (!get().chats[id]) {
        initChat(id, [{ role: 'system', content: systemContext }], undefined);
      }
    },
    initFromMessages: (id: string, messages: RecordedMessage[], chat: Chat) => {
      initChat(id, messages, chat);
    },
    clear: (id: string, systemContext: string) => {
      initChat(id, [{ role: 'system', content: systemContext }], undefined);
    },
    updateSystemContext: (id: string, systemContext: string) => {
      set((state) => {
        return {
          chats: produce(state.chats, (draft) => {
            const idx = draft[id].messages.findIndex(
              (m) => m.role === 'system'
            );
            if (idx > -1) {
              draft[id].messages[idx].content = systemContext;
            }
          }),
        };
      });
    },
    pushMessage: (id: string, role: Role, content: string) => {
      set((state) => {
        return {
          chats: produce(state.chats, (draft) => {
            draft[id].messages.push({
              role,
              content,
            });
          }),
        };
      });
    },
    popMessage: (id: string) => {
      let ret: ShownMessage | undefined;
      set((state) => {
        return {
          chats: produce(state.chats, (draft) => {
            ret = draft[id].messages.pop();
          }),
        };
      });
      return ret;
    },
    post: async (id: string, content: string, mutateListChat) => {
      setLoading(id, true);

      const unrecordedUserMessage: UnrecordedMessage = {
        role: 'user',
        content,
      };

      const unrecordedAssistantMessage: UnrecordedMessage = {
        role: 'assistant',
        content: '',
      };

      // User/Assistant の発言を反映
      set((state) => {
        const newChats = produce(state.chats, (draft) => {
          draft[id].messages.push(unrecordedUserMessage);
          draft[id].messages.push(unrecordedAssistantMessage);
        });

        return {
          chats: newChats,
        };
      });

      const stream = predictStream({
        // 最後のメッセージはアシスタントのメッセージなので、排除
        messages: omitUnusedMessageProperties(
          get().chats[id].messages.slice(0, -1)
        ),
      });

      // Assistant の発言を更新
      for await (const chunk of stream) {
        set((state) => {
          const newChats = produce(state.chats, (draft) => {
            const oldAssistantMessage = draft[id].messages.pop()!;
            const newAssistantMessage: UnrecordedMessage = {
              role: 'assistant',
              content: oldAssistantMessage.content + chunk,
            };

            draft[id].messages.push(newAssistantMessage);
          });

          return {
            chats: newChats,
          };
        });
      }

      setLoading(id, false);

      const chatId = await createChatIfNotExist(id, get().chats[id].chat);

      // タイトルが空文字列だった場合、タイトルを予測して設定
      if (get().chats[id].chat?.title === '') {
        setPredictedTitle(id).then(() => {
          mutateListChat();
        });
      }

      const toBeRecordedMessages = addMessageIdsToUnrecordedMessages(id);
      const { messages } = await createMessages(chatId, {
        messages: toBeRecordedMessages,
      });

      replaceMessages(id, messages);
    },

    sendFeedback: async (id: string, createdDate: string, feedback: string) => {
      const chat = get().chats[id].chat;

      if (chat) {
        const { message } = await updateFeedback(chat.chatId, {
          createdDate,
          feedback,
        });
        replaceMessages(id, [message]);
      }
    },
  };
});

/**
 * チャットを操作する Hooks
 * @param id 画面の URI（状態の識別に利用）
 * @param systemContext
 * @param chatId
 * @returns
 */
const useChat = (id: string, systemContext?: string, chatId?: string) => {
  const {
    chats,
    loading,
    setLoading,
    init,
    initFromMessages,
    clear,
    post,
    sendFeedback,
    updateSystemContext,
    pushMessage,
    popMessage,
  } = useChatState();
  const { data: messagesData, isLoading: isLoadingMessage } =
    useChatApi().listMessages(chatId);
  const { data: chatData, isLoading: isLoadingChat } =
    useChatApi().findChatById(chatId);
  const { mutate: mutateConversations } = useConversation();

  useEffect(() => {
    // 新規チャットの場合
    if (!chatId && systemContext) {
      init(id, systemContext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 登録済みのチャットの場合
    if (!isLoadingMessage && messagesData && !isLoadingChat && chatData) {
      initFromMessages(id, messagesData.messages, chatData.chat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMessage, isLoadingChat]);

  const filteredMessages = useMemo(() => {
    return chats[id]?.messages.filter((chat) => chat.role !== 'system') ?? [];
  }, [chats, id]);

  return {
    loading: loading[id] ?? false,
    setLoading: (newLoading: boolean) => {
      setLoading(id, newLoading);
    },
    loadingMessages: isLoadingMessage,
    clearChats: (systemContext: string) => clear(id, systemContext),
    updateSystemContext: (systemContext: string) => {
      updateSystemContext(id, systemContext);
    },
    pushMessage,
    popMessage,
    messages: filteredMessages,
    isEmpty: filteredMessages.length === 0,
    postChat: (content: string) => {
      post(id, content, mutateConversations);
    },
    sendFeedback: async (createdDate: string, feedback: string) => {
      await sendFeedback(id, createdDate, feedback);
    },
  };
};

export default useChat;
