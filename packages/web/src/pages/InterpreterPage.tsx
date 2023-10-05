import React, { useCallback, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Select from '../components/Select';
import { create } from 'zustand';
import InputText from '../components/InputText';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import { useLocation } from 'react-router-dom';
import useChat from '../hooks/useChat';
import interpreterPrompt from '../prompts/interpreter-prompt';
import PromptTemplatePageBase from './PromptTemplatePageBase';
import useInterpreter from '../hooks/useInterpreter';

type StateType = {
  functionName: string;
  setFunctionName: (s: string) => void;
  roleArn: string;
  setRoleArn: (s: string) => void;
  runtime: string;
  setRuntime: (s: string) => void;
  context: string;
  setContext: (s: string) => void;
  shouldUpdate: boolean;
  setShouldUpdate: (b: boolean) => void;
};

const useInterpreterPageState = create<StateType>((set) => {
  return {
    functionName: '',
    setFunctionName: (s: string) => {
      set(() => ({
        functionName: s,
      }));
    },
    roleArn: import.meta.env.VITE_APP_CREATE_FUNCTION_ROLE_ARN,
    setRoleArn: (s: string) => {
      set(() => ({
        roleArn: s,
      }));
    },
    runtime: 'nodejs18.x',
    setRuntime: (s: string) => {
      set(() => ({
        runtime: s,
      }));
    },
    context: `## 処理の概要

## 関数のINPUT

## 関数のOUTPUT
`,
    setContext: (s: string) => {
      set(() => ({
        context: s,
      }));
    },
    shouldUpdate: true,
    setShouldUpdate: (b: boolean) => {
      set(() => ({
        shouldUpdate: b,
      }));
    },
  };
});

const runtimeOptions = [
  {
    value: 'nodejs18.x',
    label: 'nodejs18.x',
  },
  {
    value: 'python3.11',
    label: 'python3.11',
  },
];

const roleOptions = [
  {
    value: 'arn:aws:iam::290000338583:role/GenerativeAiUseCasesStack-InterpreterRoleC2EABA37-CRU00YZ4XFZ',
    label: 'デフォルトロール',
  },
];

const InterpreterPage: React.FC = () => {
  const {
    functionName,
    setFunctionName,
    roleArn,
    setRoleArn,
    runtime,
    setRuntime,
    context,
    setContext,
    shouldUpdate,
    setShouldUpdate,
  } = useInterpreterPageState();

  const { pathname } = useLocation();
  const { postChat, messages } = useChat(pathname);

  const onClickExec = useCallback(() => {
    postChat(interpreterPrompt.generationContext(context));
  }, [context, postChat]);

  const { createFunction, updateFunction, existsFunction } = useInterpreter();
  const onClickDeploy = useCallback(() => {
    const code =
      /```.*\n(?<code>(.|\n)+)\n```$/.exec(
        messages[messages.length - 1].content
      )?.groups?.code ?? '';

    if (shouldUpdate) {
      updateFunction({
        functionName: functionName,
        code: code,
      });
    } else {
      createFunction({
        functionName: functionName,
        code: code,
        role: roleArn,
        runtime: runtime,
      });
    }
  }, [
    createFunction,
    functionName,
    messages,
    roleArn,
    runtime,
    shouldUpdate,
    updateFunction,
  ]);

  const functionNameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const listener = async () => {
      setShouldUpdate(await existsFunction(functionName));
    };
    const ref = functionNameRef.current;
    ref?.addEventListener('focusout', listener);
    return () => {
      ref?.removeEventListener('focusout', listener);
    };
  });

  return (
    <PromptTemplatePageBase
      title="AWS Interpreter"
      systemContext={interpreterPrompt.systemContext(runtime)}>
      <Card>
        <InputText
          ref={functionNameRef}
          label="関数名"
          value={functionName}
          onChange={setFunctionName}
        />
        <Select
          label="ロール"
          value={roleArn}
          onChange={setRoleArn}
          options={roleOptions}
        />
        <Select
          label="Lambda ランタイム"
          options={runtimeOptions}
          value={runtime}
          onChange={setRuntime}
        />

        <Textarea
          label="関数の処理内容"
          value={context}
          hint="処理内容をできるだけ詳細に記載してください。"
          onChange={setContext}
        />

        <div className="flex justify-end gap-3">
          {/* <Button outlined onClick={onClickClear} disabled={!isEmpty}>
            クリア
          </Button> */}
          <Button onClick={onClickExec}>実行</Button>
        </div>
      </Card>

      <div className="fixed bottom-3 right-3 z-50">
        <Button onClick={onClickDeploy}>デプロイ</Button>
      </div>
    </PromptTemplatePageBase>
  );
};

export default InterpreterPage;
