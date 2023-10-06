import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  PiCheckCircleBold,
  PiLightningBold,
  PiRocketLaunchBold,
  PiSlidersBold,
  PiSpinnerGap,
  PiXCircleBold,
} from 'react-icons/pi';
import ModalDialog from '../components/ModalDialog';
import ExpandedField from '../components/ExpandedField';
import { produce } from 'immer';

type TestCaseType = {
  describe?: string;
  input: string | object;
  output: string | object;
};
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
  testData: string;
  setTestData: (s: string) => void;
  testCases: TestCaseType[];
  setTestCases: (c: TestCaseType[]) => void;
  testResults: ('pass' | 'fail' | 'testing')[];
  setTestResults: (r: ('pass' | 'fail' | 'testing')[]) => void;
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
    shouldUpdate: false,
    setShouldUpdate: (b: boolean) => {
      set(() => ({
        shouldUpdate: b,
      }));
    },
    testData: '',
    setTestData: (s: string) => {
      set(() => ({
        testData: s,
      }));
    },
    testCases: [],
    setTestCases: (c: TestCaseType[]) => {
      set(() => ({
        testCases: c,
      }));
    },
    testResults: [],
    setTestResults: (r) => {
      set(() => ({
        testResults: r,
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
    value: import.meta.env.VITE_APP_CREATE_FUNCTION_ROLE_ARN,
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
    testData,
    setTestData,
    testCases,
    setTestCases,
    testResults,
    setTestResults,
  } = useInterpreterPageState();

  const { pathname } = useLocation();
  const { postChat, messages, isEmpty } = useChat(pathname);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenTest, setIsOpenTest] = useState(false);
  const [loadingDeploy, setLoadingDeploy] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingGenerateTestData, setLoadingGenerateTestData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  const onClickExec = useCallback(() => {
    postChat(interpreterPrompt.generationContext(context));
  }, [context, postChat]);

  const {
    createFunction,
    updateFunction,
    existsFunction,
    invokeFunction,
    generateTestData,
  } = useInterpreter();
  const onClickDeploy = useCallback(() => {
    const code =
      /```.*\n(?<code>(.|\n)+)\n```$/.exec(
        messages[messages.length - 1].content
      )?.groups?.code ?? '';

    setLoadingDeploy(true);
    if (shouldUpdate) {
      updateFunction({
        functionName: functionName,
        code: code,
      }).finally(() => {
        setLoadingDeploy(false);
      });
    } else {
      createFunction({
        functionName: functionName,
        code: code,
        role: roleArn,
        runtime: runtime,
      }).finally(() => {
        setLoadingDeploy(false);
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

  useEffect(() => {
    setErrorMessage(null);
    setTestCases([]);
    if (testData === '') {
      return;
    }
    try {
      const data = JSON.parse(testData);
      if (!Array.isArray(data)) {
        setErrorMessage('配列形式になっていません。');
        return;
      }

      data.forEach((d) => {
        if (!d['input'] && d['input'] !== '') {
          setErrorMessage('各テストデータには input キーが必要です。');
          return;
        }
        if (!d['output'] && d['output'] !== '') {
          setErrorMessage('各テストデータには output キーが必要です。');
          return;
        }
      });
      setTestCases([...data]);
    } catch (e) {
      setErrorMessage('JSON形式ではありません。');
      return;
    }
  }, [setTestCases, testData]);

  const onClickGenerateTestData = useCallback(() => {
    setLoadingGenerateTestData(true);
    setTestData('');

    generateTestData(messages)
      .then((testData) => {
        setTestData(testData);
      })
      .finally(() => {
        setLoadingGenerateTestData(false);
      });
  }, [generateTestData, messages, setTestData]);

  const onClickTest = useCallback(() => {
    setLoadingTest(true);
    setIsOpenTest(true);
    setTestResults(new Array(testCases.length).fill('testing'));
    Promise.all(
      testCases.map((c, idx) => {
        invokeFunction({
          functionName,
          payload: c.input,
        })
          .then(() => {
            setTestResults(
              produce(
                useInterpreterPageState.getState().testResults,
                (draft) => {
                  draft[idx] = 'pass';
                }
              )
            );
          })
          .catch(() => {
            setTestResults(
              produce(
                useInterpreterPageState.getState().testResults,
                (draft) => {
                  draft[idx] = 'fail';
                }
              )
            );
          });
      })
    ).finally(() => {
      setLoadingTest(false);
    });
  }, [functionName, invokeFunction, setTestResults, testCases]);

  const functionNameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const listener = async () => {
      setShouldUpdate(false);
      if (functionName === '') {
        return;
      }
      setShouldUpdate(await existsFunction(functionName));
    };
    const ref = functionNameRef.current;
    ref?.addEventListener('focusout', listener);
    return () => {
      ref?.removeEventListener('focusout', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [functionName]);

  // useEffect(() => {
  //   setShouldUpdate(false);
  //   if (functionName !== '') {
  //     existsFunction(functionName).then((exists) => {
  //       setShouldUpdate(exists);
  //     });
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [functionName]);

  return (
    <div>
      {!isEmpty && (
        <div className="absolute flex w-full justify-center">
          <Card className="fixed top-0 z-50 mt-3 w-11/12 md:w-10/12 lg:w-4/6 xl:w-3/6">
            <div className="flex items-center justify-between">
              <div className="font-semibold">デプロイ／テストの実行</div>
              <Button
                onClick={() => {
                  setIsOpen(!isOpen);
                }}>
                {isOpen ? '閉じる' : '開く'}
              </Button>
            </div>
            {isOpen && <div className="my-3 border-b"></div>}
            <div
              className={`transition-height -mr-4 overflow-y-auto ${
                isOpen ? 'visible h-96 ' : 'invisible h-0 '
              }`}>
              <div className="mx-3 flex flex-col">
                <div>
                  <div className="flex items-center font-semibold">
                    <PiSlidersBold className="mr-1" />
                    Lambda 関数の基本情報
                  </div>
                </div>
                <InputText
                  ref={functionNameRef}
                  label="関数名"
                  value={functionName}
                  onChange={setFunctionName}
                />
                {functionName !== '' && shouldUpdate && (
                  <div className="-mt-2 text-sm font-semibold text-red-500">
                    既に Lambda 関数[{functionName}
                    ]が存在します。デプロイすると上書きされます。
                  </div>
                )}
                <Select
                  label="ロール"
                  value={roleArn}
                  onChange={setRoleArn}
                  options={roleOptions}
                />
              </div>
              <div className="my-3 border-b"></div>
              <div className="mx-3 flex items-end justify-between">
                <div>
                  <div className="flex items-center font-semibold">
                    <PiRocketLaunchBold className="mr-1" />
                    デプロイ
                  </div>
                  <div className="text-sm text-gray-600">
                    LLM が生成した最新のコードを Lambda
                    関数としてデプロイします。
                  </div>
                </div>
                <div className="">
                  <Button
                    disabled={functionName === ''}
                    loading={loadingDeploy}
                    onClick={onClickDeploy}>
                    デプロイ
                  </Button>
                </div>
              </div>
              <div className="my-3 border-b"></div>
              <div className="mx-3 flex items-start justify-between">
                <div className="mr-3 w-full">
                  <div className="flex items-center font-semibold">
                    <PiLightningBold className="mr-1" />
                    テスト
                  </div>
                  <div className="text-sm text-gray-600">
                    Lambda 関数のテストを行います。
                  </div>

                  {errorMessage && (
                    <div className="mt-1 text-sm font-semibold text-red-500">
                      <div>テストデータ形式に誤りがあります。</div>
                      <div>
                        詳細：
                        {errorMessage}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 text-sm font-semibold">テストデータ</div>
                  <Textarea
                    className="w-64"
                    value={testData}
                    placeholder={`以下のJSON形式で入力してください。
{
  "describe": "テストデータの説明（任意）",
  "input": "Lambda関数のINPUT",
  "output": "Lambda関数のOUTPUT"
}[] `}
                    rows={6}
                    onChange={setTestData}
                  />
                </div>
                <div className="flex flex-col items-end">
                  <Button
                    disabled={functionName === '' || loadingGenerateTestData}
                    loading={loadingTest}
                    onClick={onClickTest}>
                    テスト実行
                  </Button>
                  <Button
                    disabled={loadingTest}
                    className="mt-3 whitespace-nowrap"
                    loading={loadingGenerateTestData}
                    onClick={onClickGenerateTestData}>
                    データ生成
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
      <ModalDialog isOpen={isOpenTest} title="テスト実行">
        <>
          {testResults.filter((r) => r === 'pass').length ===
            testResults.length && (
            <div className="flex items-center font-bold text-green-600">
              <PiCheckCircleBold className="mr-1" />
              テストが全て PASS しました。
            </div>
          )}
          {testResults.includes('fail') && (
            <div className="flex items-center font-bold text-red-600">
              <PiXCircleBold className="mr-1" />
              FAIL したテストケースがあります。
            </div>
          )}
          {testCases.map((c, idx) => {
            return (
              <div>
                <div className="flex items-center">
                  <div className="mr-1">
                    {testResults[idx] === 'testing' && (
                      <PiSpinnerGap className="animate-spin" />
                    )}
                    {testResults[idx] === 'pass' && (
                      <PiCheckCircleBold className="text-green-600" />
                    )}
                    {testResults[idx] === 'fail' && (
                      <PiXCircleBold className="text-red-600" />
                    )}
                  </div>
                  <div className="mr-1">ケース {idx + 1}:</div>
                  <div>{c.describe}</div>
                </div>
                <ExpandedField label="テスト詳細" className="ml-3">
                  <div className="ml-6">
                    <div>入力データ: {JSON.stringify(c.input)}</div>
                    <div>期待値: {JSON.stringify(c.output)}</div>
                  </div>
                </ExpandedField>
              </div>
            );
          })}
          <div className="flex justify-end">
            <Button
              loading={loadingTest}
              onClick={() => {
                setIsOpenTest(false);
              }}>
              閉じる
            </Button>
          </div>
        </>
      </ModalDialog>

      <PromptTemplatePageBase
        title="AWS Interpreter"
        systemContext={interpreterPrompt.systemContext(runtime)}>
        <Card>
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
      </PromptTemplatePageBase>
    </div>
  );
};

export default InterpreterPage;
