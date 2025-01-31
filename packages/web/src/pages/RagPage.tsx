import React, { useCallback, useEffect } from 'react';
import InputChatContent from '../components/InputChatContent';
import { create } from 'zustand';
import Alert from '../components/Alert';
import useRag from '../hooks/useRag';
import { useLocation } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import useScroll from '../hooks/useScroll';

type StateType = {
  content: string;
  setContent: (c: string) => void;
};

const useRagPageState = create<StateType>((set) => {
  return {
    content: '',
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
  };
});

const RagPage: React.FC = () => {
  const { content, setContent } = useRagPageState();
  const { state, pathname } = useLocation();
  const { postMessage, init, loading, messages, isEmpty } = useRag(pathname);
  const { scrollToBottom, scrollToTop } = useScroll();

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== null) {
      setContent(state.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const onSend = useCallback(() => {
    postMessage(content);
    setContent('');
  }, [content, postMessage, setContent]);

  const onReset = useCallback(() => {
    init();
    setContent('');
  }, [init, setContent]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    } else {
      scrollToTop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <div className={`${!isEmpty ? 'pb-36' : ''}`}>
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min">
        RAG チャット
      </div>

      {isEmpty && (
        <div className="m-3 flex justify-center">
          <Alert severity="info">
            <div>
              RAG (Retrieval Augmented Generation)
              手法のチャットを行うことができます。
            </div>
            <div>
              メッセージが入力されると Amazon Kendra
              でドキュメントを検索し、検索したドキュメントをもとに LLM
              が回答を生成します。
            </div>
          </Alert>
        </div>
      )}

      {messages.map((chat, idx) => (
        <div key={idx}>
          <ChatMessage
            chatContent={chat}
            loading={loading && idx === messages.length - 1}
          />
          <div className="w-full border-b border-gray-300"></div>
        </div>
      ))}

      <div className="absolute bottom-0 z-0 flex w-full items-end justify-center">
        <InputChatContent
          content={content}
          disabled={loading}
          onChangeContent={setContent}
          onSend={() => {
            onSend();
          }}
          onReset={onReset}
        />
      </div>
    </div>
  );
};

export default RagPage;
